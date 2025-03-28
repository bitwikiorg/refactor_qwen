import { getLoggerInstance } from './logger.mjs';

const logger = getLoggerInstance({ module: 'DIContainer' });

/**
 * Load a module dynamically with improved error handling
 * @param {string} modulePath - Path to the module
 * @returns {Promise<object|null>} - The loaded module or null if it failed to load
 */
export async function loadModule(modulePath) {
  try {
    const module = await import(modulePath);
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

    if (modulePath.includes('/brave/')) {
      return {
        default: {
          init: (_app) => logger.info('Mock Brave module initialized')
        }
      };
    }

    // Return null for non-critical modules
    return null;
  }
}

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

// Default configuration for AI providers with fallbacks to environment variables
const defaultAiConfig = {
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
  // Simple logger implementation
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
    saveData: async (key, _data) => {
      // Implementation for saving data
      logger.info(`Saving data for key: ${key}`, 'DataStore');
      return { success: true };
    },
    getData: async (key) => {
      // Implementation for retrieving data
      logger.info(`Getting data for key: ${key}`, 'DataStore');
      return { data: {} };
    }
  };
});

// Register the research service
container.bindSingleton('researchService', () => {
  const dataStore = container.resolve('dataStore');
  const logger = container.resolve('logger');

  // Import the ResearchService from the features directory
  const { ResearchService } = loadModule('../features/research/index.mjs');

  // Create and return a new instance of the ResearchService
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

  // Ensure config.aiProviders exists
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
        generateText: async (prompt, _options = {}) => {
          logger.info(`Generating text with ${providerName}`, 'AIService');
          // Implementation for generating text with the AI provider
          return { text: 'AI generated response would go here' };
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
    // Initialize all services that need to be started at application boot
    container.resolve('logger').info('Initializing DI container', 'DIContainer');
    container.resolve('dataStore');
    container.resolve('researchService');
    container.resolve('aiService');
    return container;
  } catch (error) {
    console.error(`FATAL INITIALIZATION ERROR: ${error}`);
    throw error;
  }
};

export default {
  loadModule,
  container
};