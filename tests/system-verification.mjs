/**
 * System Verification Test
 * Validates that all core system components are working correctly
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { promisify } from 'util';

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Import core services for verification
import logger from '../services/logger.js';
import container from '../services/di-container.js';
import config from '../services/config.js';

/**
 * Run system verification tests
 */
async function runVerification() {
  logger.info('Starting system verification...');
  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  try {
    // Verify config loads correctly
    if (config && config.appInfo) {
      results.passed.push('Configuration loading');
      logger.info(`Verified config: ${config.appInfo.name} v${config.appInfo.version}`);
    } else {
      results.failed.push('Configuration loading');
      logger.error('Failed to load configuration');
    }

    // Verify logger works
    try {
      logger.info('Verifying logger functionality');
      logger.debug('Debug message test');
      logger.warn('Warning message test');
      logger.error('Error message test', { test: true });
      results.passed.push('Logging system');
    } catch (error) {
      results.failed.push('Logging system');
      console.error('Logger verification failed:', error);
    }

    // Verify DI container
    try {
      container.bind('test-value', 'test-successful');
      const value = container.resolve('test-value');
      if (value === 'test-successful') {
        results.passed.push('Dependency injection');
        logger.info('Verified dependency injection system');
      } else {
        results.failed.push('Dependency injection');
        logger.error('Dependency injection verification failed');
      }
    } catch (error) {
      results.failed.push('Dependency injection');
      logger.error('Dependency injection verification failed:', error);
    }

    // Verify file system access
    try {
      const testFile = path.join(rootDir, 'test-file.txt');
      await promisify(fs.writeFile)(testFile, 'test', 'utf8');
      const content = await promisify(fs.readFile)(testFile, 'utf8');
      await promisify(fs.unlink)(testFile);

      if (content === 'test') {
        results.passed.push('File system access');
        logger.info('Verified file system access');
      } else {
        results.failed.push('File system access');
        logger.error('File system verification failed');
      }
    } catch (error) {
      results.failed.push('File system access');
      logger.error('File system verification failed:', error);
    }

    // Generate summary
    const totalTests = results.passed.length + results.failed.length + results.skipped.length;
    const summary = {
      total: totalTests,
      passed: results.passed.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      success: results.failed.length === 0
    };

    logger.info('System verification complete', summary);

    if (results.failed.length > 0) {
      logger.error('System verification failed tests:', results.failed);
      process.exit(1);
    }

    return summary;
  } catch (error) {
    logger.error('System verification encountered an unexpected error:', error);
    process.exit(1);
  }
}

// Run verification if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runVerification().catch(error => {
    console.error('Verification failed with error:', error);
    process.exit(1);
  });
}

export default runVerification;