// File: app/features/memory/service.mjs

import { getLoggerInstance } from '../../services/logger.mjs';
import VeniceAiService from '../../infrastructure/venice-api.mjs';
import AuthenticatedGitAdapter from '../../services/git-sync.mjs';

const logger = getLoggerInstance({ module: 'MemoryService' });

class MemoryService {
  constructor(options = {}) {
    this.options = {
      dataDir: options.dataDir || './data/memory',
      gitSync: options.gitSync !== false,
      ...options
    };
    
    this.aiClient = null;
    this.gitAdapter = null;
    
    logger.info('Memory service initialized with options:', this.options);
  }
  
  async initialize() {
    try {
      // Initialize AI client if not already set
      if (!this.aiClient) {
        this.aiClient = VeniceAiService.createInstance();
        logger.info('AI client initialized');
      }
      
      // Setup Git adapter if git sync is enabled
      if (this.options.gitSync) {
        try {
          this.gitAdapter = await AuthenticatedGitAdapter.Instance;
          logger.info('Git sync adapter initialized');
        } catch (error) {
          logger.warn('Git sync disabled due to initialization error:', error.message);
          this.options.gitSync = false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize memory service:', error);
      throw error;
    }
  }
  
  async createMemory(content, metadata = {}) {
    try {
      if (!content) {
        throw new Error('Memory content cannot be empty');
      }
      
      const memoryId = generateUniqueId();
      const timestamp = new Date().toISOString();
      
      const memoryObject = {
        id: memoryId,
        content,
        metadata: {
          ...metadata,
          created_at: timestamp,
          updated_at: timestamp
        }
      };
      
      // Process memory with AI for semantic analysis if available
      if (this.aiClient) {
        try {
          memoryObject.analysis = await this.aiClient.memorySemanticAnalysis(
            content, 
            { messages: [{ role: 'user', content }] }
          );
        } catch (error) {
          logger.warn('AI analysis failed, continuing without analysis:', error.message);
        }
      }
      
      // Store memory
      await this.saveMemoryToStorage(memoryObject);
      
      return memoryObject;
    } catch (error) {
      logger.error('Failed to create memory:', error);
      throw error;
    }
  }
  
  async createMemoriesFromResearch(researchData) {
    try {
      if (!researchData || !researchData.results || !Array.isArray(researchData.results)) {
        throw new Error('Invalid research data format');
      }
      
      const createdMemories = [];
      
      for (const result of researchData.results) {
        if (!result.content) continue;
        
        const memoryObject = await this.createMemory(
          result.content,
          {
            source: result.source || 'research',
            topic: researchData.topic || 'unknown',
            query: researchData.query || '',
            type: 'research_finding'
          }
        );
        
        createdMemories.push(memoryObject);
      }
      
      logger.info(`Created ${createdMemories.length} memories from research data`);
      return createdMemories;
    } catch (error) {
      logger.error('Failed to create memories from research:', error);
      throw error;
    }
  }
  
  async saveMemoryToStorage(memoryObject) {
    try {
      // Local file storage
      const filePath = `${this.options.dataDir}/${memoryObject.id}.json`;
      const fileContent = JSON.stringify(memoryObject, null, 2);
      
      // Ensure directory exists
      const fs = await import('fs/promises');
      await fs.mkdir(this.options.dataDir, { recursive: true });
      
      // Write to file
      await fs.writeFile(filePath, fileContent, 'utf8');
      
      // Git sync if enabled
      if (this.options.gitSync && this.gitAdapter) {
        try {
          await this.gitAdapter.pushChange({
            path: `memory/${memoryObject.id}.json`,
            content: fileContent,
            message: `Add memory: ${memoryObject.id}`
          });
          logger.info(`Synced memory ${memoryObject.id} to git repository`);
        } catch (error) {
          logger.warn(`Git sync failed for memory ${memoryObject.id}:`, error.message);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to save memory to storage:', error);
      throw error;
    }
  }
  
  async retrieveMemory(memoryId) {
    try {
      const fs = await import('fs/promises');
      const filePath = `${this.options.dataDir}/${memoryId}.json`;
      
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      logger.error(`Failed to retrieve memory ${memoryId}:`, error);
      throw error;
    }
  }
  
  async updateMemory(memoryId, updatedContent, updatedMetadata = {}) {
    try {
      const existingMemory = await this.retrieveMemory(memoryId);
      
      if (!existingMemory) {
        throw new Error(`Memory with ID ${memoryId} not found`);
      }
      
      const updatedMemory = {
        ...existingMemory,
        content: updatedContent || existingMemory.content,
        metadata: {
          ...existingMemory.metadata,
          ...updatedMetadata,
          updated_at: new Date().toISOString()
        }
      };
      
      // Process updated memory with AI for semantic analysis if available
      if (this.aiClient && updatedContent) {
        try {
          updatedMemory.analysis = await this.aiClient.memorySemanticAnalysis(
            updatedContent,
            { messages: [{ role: 'user', content: updatedContent }] }
          );
        } catch (error) {
          logger.warn('AI analysis update failed:', error.message);
        }
      }
      
      // Save updated memory
      await this.saveMemoryToStorage(updatedMemory);
      
      return updatedMemory;
    } catch (error) {
      logger.error(`Failed to update memory ${memoryId}:`, error);
      throw error;
    }
  }
  
  async deleteMemory(memoryId) {
    try {
      const fs = await import('fs/promises');
      const filePath = `${this.options.dataDir}/${memoryId}.json`;
      
      await fs.unlink(filePath);
      
      // Git sync if enabled
      if (this.options.gitSync && this.gitAdapter) {
        try {
          // Note: This is a simplified approach. Actual deletion in git would require a different approach.
          await this.gitAdapter.pushChange({
            path: `memory/${memoryId}.json`,
            content: '',
            message: `Delete memory: ${memoryId}`
          });
          logger.info(`Synced deletion of memory ${memoryId} to git repository`);
        } catch (error) {
          logger.warn(`Git sync failed for memory deletion ${memoryId}:`, error.message);
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete memory ${memoryId}:`, error);
      throw error;
    }
  }
  
  async searchMemories(query, options = {}) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // List all memory files
      const files = await fs.readdir(this.options.dataDir);
      const memoryFiles = files.filter(file => file.endsWith('.json'));
      
      const memories = [];
      
      // Read and filter memories
      for (const file of memoryFiles) {
        try {
          const fileContent = await fs.readFile(path.join(this.options.dataDir, file), 'utf8');
          const memory = JSON.parse(fileContent);
          
          // Simple text search
          if (!query || 
              memory.content.toLowerCase().includes(query.toLowerCase()) ||
              (memory.analysis && memory.analysis.toLowerCase().includes(query.toLowerCase()))) {
            memories.push(memory);
          }
        } catch (error) {
          logger.warn(`Failed to process memory file ${file}:`, error.message);
        }
      }
      
      // Sort and limit results
      const sortedMemories = memories.sort((a, b) => {
        const dateA = new Date(a.metadata.updated_at || a.metadata.created_at);
        const dateB = new Date(b.metadata.updated_at || b.metadata.created_at);
        return options.sortAsc ? dateA - dateB : dateB - dateA;
      });
      
      const limit = options.limit || 10;
      const offset = options.offset || 0;
      
      return {
        total: sortedMemories.length,
        results: sortedMemories.slice(offset, offset + limit)
      };
    } catch (error) {
      logger.error('Failed to search memories:', error);
      throw error;
    }
  }
}

// Helper function for generating unique IDs
function generateUniqueId() {
  return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export the Service class and utility functions
export { MemoryService as Service, generateUniqueId };

// Export default for direct usage
export default { Service: MemoryService, generateUniqueId };

export class MemoryManager {
    constructor() {
        this.cache = new Map();
    }

    set(key, value) {
        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key);
    }

    delete(key) {
        this.cache.delete(key);
    }
}
