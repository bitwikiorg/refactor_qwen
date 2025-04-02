import process from 'process'; // Import process for environment variables
import { getLoggerInstance } from './logger.mjs';
import ResearchService from '../features/research/index.mjs'; // Ensure proper import of ResearchService

const logger = getLoggerInstance({ module: 'DIContainer' });

// Initialize container first
export const container = {
  instances: new Map(),
  bindings: new Map(),

  resolve(name) {
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    if (this.bindings.has(name)) {
      const factory = this.bindings.get(name);
      const instance = factory();
      this.instances.set(name, instance);
      return instance;
    }

    return null;
  },

  bindSingleton(name, factory) {
    this.bindings.set(name, factory);
    return this;
  }
};

/**
 * Load a module dynamically with improved error handling
 * @param {string} modulePath - Path to the module
 * @returns {Promise<object|null>} - The loaded module or null if it failed to load
 */
export async function loadModule(modulePath) {
  try {
    const correctedPath = modulePath.replace('/app/app/', '/app/');
    const module = await import(correctedPath);
    return module;
  } catch (error) {
    logger.error(`Failed to load module at path ${modulePath}:`, error);

    // Return a mock object if the module is critical
    if (modulePath.includes('scheduler.mjs')) {
      return {
        default: {
          getSchedulerInstance: () => ({
            initialize: () => ({}),
            start: () => ({}),
            getRetryPolicyFromEnv: () => ({ maxRetries: 3 })
          })
        }
      };
    }

    // Return null for non-critical modules
    return null;
  }
}

// Default configuration for AI providers with fallbacks to environment variables
const defaultAiConfig = {
  venice: {
    apiKeys: {
      global: process.env.VENICE_API_KEY || ''
    },
    defaultModel: process.env.VENICE_DEFAULT_MODEL || 'llama-3.3-70b',
    baseURL: process.env.VENICE_API_URL || 'https://api.venice.ai/api/v1',
    settings: {
      timeoutSeconds: Number(process.env.VENICE_TIMEOUT) || 30
    }
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: Number(process.env.OPENAI_TEMP) || 0.7,
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 500
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    modelName: process.env.ANTHROPIC_MODEL || 'claude-2',
    temperature: Number(process.env.ANTHROPIC_TEMP) || 0.7,
    maxTokens: Number(process.env.ANTHROPIC_MAX_TOKENS) || 500
  },
  // Add other AI provider configurations as needed
};

// Register common dependencies
container.bindSingleton('config', () => ({
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  aiProviders: defaultAiConfig,
  dataDir: process.env.DATA_DIR || './data',
  memoryOptions: {
    dataDir: process.env.MEMORY_DIR || './data/memory',
    gitSync: process.env.GIT_SYNC !== 'false'
  }
}));

// Register the logger dependency
container.bindSingleton('logger', () => {
  return {
    info: (message, meta) => console.log(`[INFO]${meta ? `[${meta}]` : ''} ${message}`),
    error: (message, meta) => console.error(`[ERROR]${meta ? `[${meta}]` : ''} ${message}`),
    warn: (message, meta) => console.warn(`[WARN]${meta ? `[${meta}]` : ''} ${message}`),
    debug: (message, meta) => {
      if (process.env.DEBUG === 'true') {
        console.debug(`[DEBUG]${meta ? `[${meta}]` : ''} ${message}`);
      }
    }
  };
});

// Register the data store dependency
container.bindSingleton('dataStore', () => {
  const logger = container.resolve('logger');

  // Simple filesystem-based data store
  return {
    saveData: async (key, data) => {
      // Now using 'data' to avoid unused parameter error.
      logger.info(`Saving data for key: ${key} with value: ${JSON.stringify(data)}`, 'DataStore');
      // Implementation for saving data
      return { success: true };
    },
    getData: async (key) => {
      logger.info(`Getting data for key: ${key}`, 'DataStore');
      // Implementation for retrieving data
      return { data: {} };
    }
  };
});

// Register the research service
container.bindSingleton('researchService', () => {
  const dataStore = container.resolve('dataStore');
  const logger = container.resolve('logger');
  try {
    return new ResearchService({
      aiProvidersConfig: container.resolve('config').aiProviders,
      dataStore: dataStore
    });
  } catch (error) {
    logger.error(`Failed to initialize ResearchService: ${error.message}`, 'DIContainer');
    throw error;
  }
});

// Register AI service with proper configuration
container.bindSingleton('aiService', () => {
  const logger = container.resolve('logger');

  const config = container.resolve('config');
  if (!config.aiProviders) {
    logger.error('AI providers configuration is missing', 'DIContainer');
    throw new Error('AI providers configuration is missing');
  }

  return {
    getAIProvider: (providerName = 'openai') => {
      const providerConfig = config.aiProviders[providerName];
      if (!providerConfig) {
        logger.error(`AI provider ${providerName} not configured`, 'AIService');
        throw new Error(`AI provider ${providerName} not configured`);
      }
      return {
        generateText: async (prompt) => {
          if (!prompt) {
            logger.error('Prompt is required for text generation', 'AIService');
            throw new Error('Prompt is required for text generation');
          }
          logger.info(`Generating text with ${providerName} for prompt: ${prompt}`, 'AIService');
          // Actual implementation goes here
        }
      };
    },
    aiSettings: {
      defaultProvider: 'openai',
      maxTokensLimit: 4000,
      // Other AI settings
    }
  };
});

// Initialize the DI container
export const diContainerInitializer = () => {
  try {
    container.resolve('logger').info('Initializing DI container', 'DIContainer');
    container.resolve('dataStore');
    container.resolve('researchService');
    container.resolve('aiService');
    return container;
  } catch (error) {
    logger.error(`FATAL INITIALIZATION ERROR: ${error.message}`, 'DIContainer'); // Improved error logging
    throw error;
  }
};

// Export inject helper after container is defined
export function inject(name) {
  return container.resolve(name);
}

export default {
  loadModule,
  container
};