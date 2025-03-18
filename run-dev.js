
// Execute TypeScript files directly in ESM mode
import { spawn } from 'child_process';

// Run ts-node with modern loader configuration
const tsNodeProcess = spawn('node', [
  '--import', 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));',
  '--experimental-specifier-resolution=node',
  'index.js'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TS_NODE_PROJECT: './tsconfig.node.json'
  }
});

tsNodeProcess.on('close', (code) => {
  process.exit(code);
});
