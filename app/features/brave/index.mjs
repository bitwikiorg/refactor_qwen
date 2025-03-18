
import { getLoggerInstance } from '../../services/logger.mjs';

const logger = getLoggerInstance({ module: 'Brave' });

class BraveService {
  constructor() {
    this.isInitialized = false;
  }

  initialize() {
    logger.debug('Initializing Brave service');
    this.isInitialized = true;
    return this;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      version: '1.0.0'
    };
  }
}

const service = new BraveService();

const init = (app, io) => {
  logger.info('Initializing Brave module');

  // Register routes
  app.get('/api/brave/status', (req, res) => {
    res.json(service.getStatus());
  });

  service.initialize();
  
  return service;
};

export default {
  init,
  service
};
