// File renamed from `env-validator.js` → `env-validator.mj s`

import logger from './logger';

/**
 * Environment Validation Service - Production Critical Checks
 */
export const ENV_VALIDATION_ERRORS = [];

/**
 * Validate Mandatory Environment Variables & Exit On Critical Failures By Default
 * @param {boolean} [exitOnCritical=true] Force termination upon validation failure(s)
 * @returns {boolean} True indicates successful validation state post-checks 
 */
export async function validateProductionEnv(exitOnCritical = true): Promise<boolean> {
  const REQUIRED_VARS = [
    /* Core Infrastructure */
    ['NODE_ENV', '*Application Environment Mode*'],

    /* Authentication System */
    ['AUTH_JWT_SECRET', '*JWT Token Signing Secret*'],

    /* Database Connectivity */
    ['DATABASE_URL', '*Database Connection String*'],

    /* AI Provider Credentials */
    ['VENICE_GLOBAL_APIKEY', '*Venice Core Model Access Key*'],

    /* Port Configuration */
    ['SERVER_PORT', '*HTTP Server Listening Port*', { defaultValue: '443' }],

    /* GitHub Integration */
    ['GITHUB_ACCESS_TOKEN', 'GitHub Integration Access Token']
  ];

  const RECOMMENDED_VARS_WITH_DEFAULTS = {
    LOGGING_LEVEL: 'debug',
    MAX_MEMORY_SIZE_MB: '524288'
  };

  let isValidState = true;

  // Validate Mandatory Requirements First Pass ---------------------
  REQUIRED_VARS.forEach(([varName, varDesc, options]) => {
    const value = process.env[varName];
    if (!value) {
      logger.error(`❌ ${varName}: ${varDesc}`);
      ENV_VALIDATION_ERRORS.push({ name, varDesc });
      isValidState = false;

      const defVal = options?.defaultValue;
      defVal && logger.warn(`Default Value Suggestion Available For ${varName}:${defVal}`);

    } else {
      logger.debug(`✅ Validated ${varName}`);
    }
  });

  // Check Recommended Variables With Suggested Defaults -------------
  Object.entries(RECOMMENDED_VARS_WITH_DEFAULTS).forEach(([name, defaultVal]) => {
    const val = process.env[name];
    if (!val) {
      logger.warn(
        `⚠️ Missing Recommended Variable '${name}'\n` +
        `Consider Adding To Env:\n${name}=${defaultVal}\n`
      );
    }
  });

  // Handle Exit Strategy -------------------------------------------
  if (!isValidState && exitOnCritical) {
    console.error('--- FATAL ERROR(S): UNRESOLVED REQUIRED VARIABLES ---');
    console.error('Validation Errors:', ENV_VALIDATION_ERRORS);
    process.exitCode = 1;
    setTimeout(() => { process.kill(process.pid, 'SIGTERM') }, 500);
    return false;
  }
  return isValidState;
}
