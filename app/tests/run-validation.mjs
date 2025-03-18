
// Validation runner - executes all validation checks
import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Running complete validation suite');

const commands = [
  { cmd: 'npm', args: ['run', 'lint'], name: 'Lint Check' },
  { cmd: 'npm', args: ['audit'], name: 'Security Audit' },
  { cmd: 'node', args: ['app/tests/system-verification.js'], name: 'System Verification' },
  // Add more validation commands as needed
];

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Running ${command.name}...`);
    
    const proc = spawn(command.cmd, command.args, { 
      stdio: 'inherit',
      shell: true
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${command.name} passed`);
        resolve();
      } else {
        console.error(`❌ ${command.name} failed with code ${code}`);
        reject(new Error(`${command.name} failed`));
      }
    });
  });
}

async function runValidation() {
  let success = true;
  
  for (const command of commands) {
    try {
      await runCommand(command);
    } catch (err) {
      success = false;
      // Continue with other checks even if one fails
    }
  }
  
  if (success) {
    console.log('\n✅ All validation checks passed! Ready for production.');
  } else {
    console.error('\n❌ Some validation checks failed. Please address the issues above.');
    process.exit(1);
  }
}

runValidation();
