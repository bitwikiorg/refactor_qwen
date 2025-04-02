import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { inspect } from 'util';
import path from 'path';
import process from 'process';

// Polyfill for process if not defined
globalThis.process = globalThis.process || {
  env: {
    VENICE_API_KEY: '',
    BRAVE_API_KEY: '',
  },
  exit: (code) => {
    console.log(`Process exited with code ${code}`);
  },
  on: () => {}, // Stub for process event listeners
};

const nodeProcess = globalThis.process;

// Load environment variables
dotenv.config();
const port = process.env.PORT || 3000;
console.log(`Environment loaded. Server will run on port: ${port}`);

// Validate required environment variables
const requiredEnvVars = ['VENICE_API_KEY', 'BRAVE_API_KEY'];
const missingEnvVars = requiredEnvVars.filter((key) => !nodeProcess.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  nodeProcess.exit(1);
}

// Handle uncaught exceptions and unhandled rejections
nodeProcess.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', inspect(err, { depth: null }));
  nodeProcess.exit(1);
});

nodeProcess.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', inspect(reason, { depth: null }));
  nodeProcess.exit(1);
});

// Resolve the correct path to index.mjs
const indexPath = path.resolve('app/index.mjs');

// Spawn the ts-node process with simplified configuration
const tsNodeProcess = spawn('node', [
  '--experimental-specifier-resolution=node',
  indexPath
], {
  stdio: 'inherit',
  env: {
    ...nodeProcess.env,
    TS_NODE_PROJECT: './tsconfig.node.json'
  }
});

// Handle process errors
tsNodeProcess.on('error', (err) => {
  console.error('Failed to start ts-node process:', inspect(err, { depth: null }));
  nodeProcess.exit(1);
});

// Handle process exit
tsNodeProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`ts-node process exited with code ${code}`);
  } else {
    console.log('ts-node process exited successfully.');
  }
  nodeProcess.exit(code);
});
