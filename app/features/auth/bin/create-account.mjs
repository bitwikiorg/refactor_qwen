#!/usr/bin/env node

import { exit } from 'node:process';
import LoggerSingletonFactory from '../../../infrastructure/services/logging-service'; // Ensure correct path based on infrastructure setup
import UserRepository from '../repo/user-repo'; // Adjust according to actual export names after refactoring

const loggerService = LoggerSingletonFactory.getLogger();

// Define available roles as a constant array
const USER_ROLES_ENUM = ['client', 'admin', 'public'];

// CLI argument validation helper function
function validateArgs(argvList) {
  if (argvList.length < 5) {
    loggerService.error('Usage:');
    loggerService.error('node ./bin/create-account.js [username] [role] [password]');
    loggerService.error('Available roles: client, admin, public');
    exit(1);
  }

  const [, , usernameArg, passwordArg, userRoleArg] = argvList;

  const username = usernameArg?.trim();
  const password = passwordArg?.trim();
  const userRole = userRoleArg?.toLowerCase();

  return [username, password, userRole];
}

async function main() {
  try {
    const [username, password, userRole] = validateArgs(process.argv);

    // Validate each required parameter presence and format
    if (!username || !password || !userRole) {
      throw new Error('Missing required parameters');
    }

    // Perform strict role validation against enumerated values
    if (!USER_ROLES_ENUM.includes(userRole)) {
      throw new RangeError(`Invalid role ${userRole}. Available roles are client, admin, and public.`);
    }

    // Additional validations:
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Create account via repository layer
    const userRepository = new UserRepository();
    await userRepository.createUser({
      username,
      password, // Ideally, hash the password here or in the repository method
      permissions: [userRole],
      email: '' // Optional field implementation dependent
    });

    loggerService.info(`✅ Account created successfully for ${username}`);
  } catch (error) {
    loggerService.error(
      `❌ Account creation failed:\n${error.stack || error.message}`
    );
    exit(1); // Exit with a non-zero status code to indicate failure
  }
}

main();