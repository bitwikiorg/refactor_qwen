// File: app/features/research/service.mjs

import { getLoggerInstance } from '../../services/logger.mjs';
import { Service as MemoryService } from '../memory/service.mjs';
import GitHubService from '../plugins/github/service.mjs';

const logger = getLoggerInstance({ module: 'ResearchService' });

class ResearchEngine {
  constructor(config = {}, socketNamespace = null) {
    this.config = {
      maxResults: config.maxResults || 10,
      timeout: config.timeout || 30000,
      ...config
    };

    this.searchProviders = [];
    this.socket = socketNamespace;

    logger.info('Research engine initialized');
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
    if (!query) {
      throw new Error('Research query cannot be empty');
    }

    logger.info(`Executing research: "${query}"`);
    this._emitStatus('started', { query });

    try {
      // Execute search across all providers
      const results = await this._executeSearchAcrossProviders(query, options);

      // Process and organize results
      const processedResults = this._processResults(results, query);

      this._emitStatus('completed', { 
        query, 
        resultsCount: processedResults.length,
        timestamp: new Date().toISOString()
      });

      const researchData = {
        query,
        timestamp: new Date().toISOString(),
        results: processedResults
      };

      // Save to memory if specified
      if (options.storeInMemory) {
        await this.saveToMemory(researchData);
      }

      // Commit to repo if specified
      if (options.commitToRepo) {
        await this.commitToRepo(researchData, options.repoOptions);
      }


      return researchData;
    } catch (error) {
      logger.error(`Research failed: ${error.message}`);
      this._emitStatus('failed', { query, error: error.message });
      throw error;
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

  _processResults(providerResults, query) {
    // Flatten results from all providers
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

    // Deduplicate results based on URL or content hash
    const uniqueResults = this._deduplicateResults(allResults);

    // Sort by relevance if available
    const sortedResults = uniqueResults.sort((a, b) => {
      if (a.relevance && b.relevance) {
        return b.relevance - a.relevance;
      }
      return 0;
    });

    // Limit results
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
export default { Engine: ResearchEngine };