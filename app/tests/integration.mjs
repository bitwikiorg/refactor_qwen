
/**
 * Integration Tests
 * 
 * Verifies that the refactored components work together correctly
 */

import { createApp } from '../infrastructure/express.js';
import { socketService } from '../infrastructure/socket.js';
import config from '../services/config.js';
import logger from '../services/logger.js';

// Import feature modules
import terminalFeature from '../features/terminal/index.js';
import memoryFeature from '../features/memory/index.js';
import researchFeature from '../features/research/index.js';

async function testIntegration() {
  try {
    logger.info('Starting integration test...');
    
    // Create Express app and HTTP server
    const { app, httpServer } = createApp();
    
    // Initialize socket.io
    const io = socketService.init(httpServer);
    
    // Initialize memory system
    const memorySystem = memoryFeature.init(app, io, config);
    
    // Initialize terminal and research features
    terminalFeature.init(app, io);
    researchFeature.init(app, io, config, memorySystem);
    
    logger.info('All components initialized successfully');
    logger.info('Integration test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Integration test failed:', error);
    process.exit(1);
  }
}

testIntegration();
