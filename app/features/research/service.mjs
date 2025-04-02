// File: app/features/research/service.mjs

import { Service as MemoryService } from '../memory/service.mjs';
import GitHubService from '../plugins/github/service.mjs';
import VeniceAiService from '../../infrastructure/venice-api.mjs';
import { createLogger } from '../../services/logger.mjs';

const logger = createLogger('research-service');

class ResearchEngine {
  constructor(config = {}, socketNamespace = null) {
    this.config = {
      maxResults: config.maxResults || 10,
      timeout: config.timeout || 30000,
      ...config,
    };
    this.socket = socketNamespace;
    this.veniceService = new VeniceAiService();
  }

  injectSearchProviders(providers = []) {
    if (!Array.isArray(providers)) {
      providers = [providers];
    }

    this.searchProviders = providers;
    logger.info(`Injected ${providers.length} search providers`);
    return this;
  }

  async executeResearch(query, options = {}) {
    try {
      const response = await this.veniceService.standardChat(query, {
        venice_parameters: { include_venice_system_prompt: false },
        max_completion_tokens: options.maxCompletionTokens || 300,
        temperature: options.temperature || 0.7,
      });

      logger.info('Research executed successfully', { query });
      return response;
    } catch (error) {
      logger.error('Error executing research', { error: error.message });
      throw new Error('Failed to execute research.');
    }
  }

  async saveToMemory(researchData) {
    try {
      const memoryService = new MemoryService();
      await memoryService.initialize();

      return await memoryService.createMemoriesFromResearch(researchData);
    } catch (error) {
      logger.error('Failed to save research to memory:', error);
      throw error;
    }
  }

  async commitToRepo(researchData, options = {}) {
    try {
      const repoPath = options.path || 'research/';
      const fileName = options.fileName || `research_${Date.now()}.json`;
      const commitMessage = options.message || `Research: ${researchData.query}`;

      const content = JSON.stringify(researchData, null, 2);

      // Using GitHub service to commit
      return await GitHubService.commitFile({
        path: `${repoPath}${fileName}`,
        content,
        message: commitMessage
      });
    } catch (error) {
      logger.error('Failed to commit research to repo:', error);
      throw error;
    }
  }

  async _executeSearchAcrossProviders(query, options) {
    if (!this.searchProviders.length) {
      throw new Error('No search providers available');
    }

    const searchPromises = this.searchProviders.map(provider => {
      return this._executeProviderSearch(provider, query, options)
        .catch(error => {
          logger.warn(`Provider ${provider.name} failed:`, error.message);
          return { provider: provider.name, results: [], error: error.message };
        });
    });

    this._emitStatus('searching', { 
      query, 
      providers: this.searchProviders.map(p => p.name) 
    });

    // Execute all searches with timeout
    return Promise.all(searchPromises);
  }

  async _executeProviderSearch(provider, query, options) {
    const providerName = provider.name || 'unknown';

    this._emitStatus('provider_searching', { provider: providerName, query });

    try {
      // Execute with timeout
      const searchPromise = provider.search(query, options);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Search timed out after ${this.config.timeout}ms`));
        }, options.timeout || this.config.timeout);
      });

      const results = await Promise.race([searchPromise, timeoutPromise]);

      this._emitStatus('provider_completed', { 
        provider: providerName, 
        resultsCount: results.length 
      });

      return { provider: providerName, results };
    } catch (error) {
      this._emitStatus('provider_failed', { 
        provider: providerName, 
        error: error.message 
      });

      throw error;
    }
  }

  // Update method signature to remove the unused 'query' parameter
  _processResults(providerResults) {
    let allResults = [];

    for (const providerResult of providerResults) {
      if (providerResult.results && Array.isArray(providerResult.results)) {
        const processedResults = providerResult.results.map(result => ({
          ...result,
          provider: providerResult.provider
        }));
        allResults = allResults.concat(processedResults);
      }
    }

    const uniqueResults = this._deduplicateResults(allResults);
    const sortedResults = uniqueResults.sort((a, b) => {
      if (a.relevance && b.relevance) {
        return b.relevance - a.relevance;
      }
      return 0;
    });

    return sortedResults.slice(0, this.config.maxResults);
  }

  _deduplicateResults(results) {
    const uniqueUrls = new Set();
    return results.filter(result => {
      if (!result.url) return true;
      if (uniqueUrls.has(result.url)) return false;
      uniqueUrls.add(result.url);
      return true;
    });
  }

  _emitStatus(status, data = {}) {
    if (this.socket) {
      this.socket.emit('research_status', { status, ...data });
    }
  }
}

export { ResearchEngine as Engine };

export async function processResearchQuery(query) {
  try {
    const veniceService = await VeniceAiService.createInstance();
    const response = await veniceService.standardChat(query, {
      messages: [{ role: 'user', content: query }],
    });

    return response.choices[0].message.content;
  } catch (error) {
    logger.error('Error in Venice API research query', { error: error.message });
    throw new Error('Failed to process research query.');
  }
}

export default { Engine: ResearchEngine, processResearchQuery };