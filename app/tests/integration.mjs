
/**
 * Integration Tests
 * 
 * Verifies that the refactored components work together correctly
 */

import { createApp } from '../infrastructure/express.mjs';
import { socketService } from '../infrastructure/socket.mjs';
import config from '../services/config.mjs';
import logger from '../services/logger.mjs';

// Import feature modules
import terminalFeature from '../features/terminal/index.mjs';
import memoryFeature from '../features/memory/index.mjs';
import researchFeature from '../features/research/index.mjs';

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
