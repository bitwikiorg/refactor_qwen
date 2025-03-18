
// Validation test runner for the application
const path = require('path');
const fs = require('fs');

console.log('Running validation tests...');

// Define the root directory
const rootDir = path.resolve(__dirname, '..');

// Function to validate the existence of required files and directories
function validateFileStructure() {
  const requiredPaths = [
    'features/research/index.mjs',
    'services/di-container.mjs',
    'data',
    'config'
  ];

  let valid = true;
  for (const reqPath of requiredPaths) {
    const fullPath = path.join(rootDir, reqPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Required path not found: ${reqPath}`);
      valid = false;
    }
  }

  return valid;
}

// Function to validate the DI container
async function validateDIContainer() {
  try {
    // Dynamic import for ESM modules
    const { diContainerInitializer } = await import('../services/di-container.mjs');
    const container = diContainerInitializer();
    
    // Validate key services
    const services = ['config', 'logger', 'dataStore', 'researchService', 'aiService'];
    let valid = true;
    
    for (const service of services) {
      try {
        const instance = container.resolve(service);
        if (!instance) {
          console.error(`Service ${service} resolved to undefined/null`);
          valid = false;
        } else {
          console.log(`Service ${service} validated successfully`);
        }
      } catch (error) {
        console.error(`Error resolving service ${service}: ${error.message}`);
        valid = false;
      }
    }
    
    return valid;
  } catch (error) {
    console.error(`DI container validation failed: ${error.message}`);
    return false;
  }
}

// Run all validations
async function runValidation() {
  const structureValid = validateFileStructure();
  console.log(`File structure validation: ${structureValid ? 'PASSED' : 'FAILED'}`);
  
  const diValid = await validateDIContainer();
  console.log(`DI container validation: ${diValid ? 'PASSED' : 'FAILED'}`);
  
  if (structureValid && diValid) {
    console.log('All validation tests passed!');
    process.exit(0);
  } else {
    console.error('Some validation tests failed. See above for details.');
    process.exit(1);
  }
}

// Run the validation
runValidation().catch(error => {
  console.error('Unexpected error during validation:', error);
  process.exit(1);
});
