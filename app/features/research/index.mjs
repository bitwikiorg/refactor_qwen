import process from 'process';
import fs from 'fs';
import fsPromises from 'fs/promises';
import express from 'express';
import { getLoggerInstance } from '../../services/logger.mjs';

const logger = getLoggerInstance({ module: 'Research' });

class ResearchRepository {
  constructor(config) {
    const storagePath = process.env.RESEARCH_DATA_DIR || (() => {
      throw new Error("RESEARCH_DATA_DIR env var required");
    })();

    this.storagePath = storagePath;
    this.logger = config.logger || logger;

    // Validate path existence
    try {
      fs.accessSync(storagePath);
    } catch (e) {
      throw new Error(`Invalid research data directory ${storagePath}`);
    }
  }

  async saveData(id, data) {
    try {
      await fsPromises.writeFile(
        `${this.storagePath}/${id}.json`,
        JSON.stringify(data)
      );
      return { success: true };
    } catch (e) {
      this.logger.error(`Failed saving ${id}:`, e);
      return { success: false };
    }
  }

  async getData(id) {
    try {
      const data = await fsPromises.readFile(
        `${this.storagePath}/${id}.json`,
        'utf8'
      );
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  async checkStorageAccess() {
    try {
      await fsPromises.access(this.storagePath);
      return { status: 'ok' };
    } catch {
      return { status: 'error', message: 'Storage inaccessible' };
    }
  }
}

// Change the default export of ResearchService class to a named export
export class ResearchService {
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
  }

  initialize() {
    logger.debug('Initializing Research service with config:', this.config);
    this.initialized = true;
    return this;
  }

  async search(query) {
    logger.debug(`Searching for: ${query}`);
    // Implementation
    return { results: [], query };
  }
}

const service = new ResearchService();

// Export the initialization function - removed second parameter
export const initResearchModule = async (app) => {
  logger.info('Initializing Research module');

  // Register routes
  app.get('/api/research/status', (req, res) => {
    res.json({ status: 'operational', initialized: service.initialized });
  });

  service.initialize();

  return service;
};

// Change the default export of the service object to a named export
export const researchService = service;

// Keep a single default export for the module initialization
export default {
  initResearchModule,
  service: researchService
};

// Update registerRoutes to accept a simple prefix parameter (default '/api/v2/research')
function registerRoutes(app, prefix = '/api/v2/research') {
  const router = express.Router();

  router.post('/query', (req, res) => {
    res.status(501).send("Not implemented");
  });

  router.get('/status', (req, res) => {
    res.json({
      status: "operational",
      version: "v2",
    });
  });

  app.use(prefix, router);
  logger.info(`Registered routes under ${prefix}`);
}

function initSocketHandlers(io = {}) {
  if (!io.of) throw new TypeError("Invalid SocketIO instance");

  const namespace = io.of("/research");

  namespace.on('connection', (socket) => {
    socket.on('progress:update', () => {
      // Placeholder for progress tracking
    });

    socket.on('query-cancel', () => {
      // Placeholder for cancellation logic
    });
  });
}

export async function initResearchModuleOriginal(
  app,
  socketIo,
  config = {},
  diContainer = {}
) {
  try {
    const repository = new ResearchRepository({
      logger: getLoggerFromDI(diContainer), // Assuming getLoggerFromDI is defined elsewhere
    });

    await repository.checkStorageAccess();

    const service = new ResearchService({
      aiProvidersConfig: (config.ai_providers || {}),
      dataStore: {
        saveData: async (...args) => repository.saveData(...args),
        getData: async (...args) => repository.getData(...args)
      },
    });

    // Pass prefix as a simple string
    registerRoutes(app, '/api/v2/research');

    if (socketIo) {
      initSocketHandlers(socketIo);
    };

    diContainer.bindSingleton(service, 'research-service'); //Assuming bindSingleton is defined elsewhere

    return Object.freeze({
      name: 'coreai-research',
      version: 'v2',
      healthCheck: async () => service.verifyAiConnection(),
    });

  } catch (err) {

    logger.error("Initialization failed:", err.stack);

    throw err;

  }
};

// In install, call initResearchModule with one argument only
export function install(diRoot, applicationContext) {
  initResearchModule(applicationContext.expressApp)
    .then((modInfo) =>
      diRoot.registerFeature(modInfo.name, {
        version: checkedVersion(modInfo.version), // Assuming checkedVersion is defined elsewhere
        componentMap: { service: 'research-service' }
      })
    )
    .catch(err => {
      console.error("CRITICAL ERROR:", err.stack);
      process.exit(1);
    });
};

// Placeholder - needs actual implementation
const getLoggerFromDI = (diContainer) => diContainer.resolve('logger') || console;

// Placeholder - needs actual implementation
const checkedVersion = (version) => version;