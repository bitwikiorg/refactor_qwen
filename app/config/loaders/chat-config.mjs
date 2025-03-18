// File Path:
// app/
// └───config/
//     └───loaders/
//         └───chat-config.loader.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import AjvCore from 'ajv';

const ajv = new AjvCore({ allErrors: true });

/**
 * Interface for Chat Configuration
 */
export interface ChatConfig {
  sanitizeOptions?: Record<string, string>;
  rateLimit?: {
    windowMs: number;
    maxRequestsPerWindow?: number;
    delayAfter?: number;
  };
}

/**
 * Interface for Validation Result
 */
interface ValidationResult<T> {
  isValid: boolean;
  errors?: string[];
  data?: T | null;
}

/**
 * Custom error class for configuration validation errors
 */
class ConfigValidationError extends Error {
  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'ConfigValidationError';
    this.errors = errors;
  }
}

/**
 * Validate and normalize chat configuration
 * @param {any} data - Raw chat configuration data
 * @returns {ValidationResult<ChatConfig>} - Validation result
 */
async function _validateAndNormalize(data: any): Promise<ValidationResult<ChatConfig>> {
  // Load schema file
  const schemaPath = path.join(__dirname, '../', 'schema', 'chat-schema.schema.json');
  let schemaContent: string;

  try {
    schemaContent = await fs.readFile(schemaPath, { encoding: 'utf8' });
  } catch (err) {
    return { isValid: false, errors: [`Failed to read schema file (${schemaPath}): ${err}`] };
  }

  const schema = JSON.parse(schemaContent);
  const validate = ajv.compile(schema);

  // Validate data
  const valid = validate(data);

  if (!valid) {
    const errors = validate.errors ? validate.errors.map((e) => e.message) : [];
    return { isValid: false, errors };
  }

  return { isValid: true, data };
}

/**
 * Load and validate chat settings
 * @returns {Promise<ChatConfig>} - Validated chat configuration
 */
export async function loadValidatedChatSettings(): Promise<ChatConfig> {
  // 🛠️ STEP #1 - Resolve Configuration Paths
  const rootDir = process.env.NODE_ENV === 'production'
    ? __dirname.split('/app')[0]
    : __dirname.replace('/app/config/loaders', '');

  const mainConfigPath = path.join(rootDir, 'config', 'default.conf');
  const schemaPath = path.join(rootDir, 'schema', 'chat-schema.schema.json');

  try {
    // 📄 STEP #2 - Load Base Configuration
    const rawConfigStr = await fs.readFile(mainConfigPath, { encoding: 'utf8' });
    const parsedMainConf = JSON.parse(rawConfigStr);

    // 🔍 STEP #3 - Extract Chat Settings Object
    const candidateData = parsedMainConf.ai_providers?.venice?.models?.chat?.parameters || {};

    // 📝 STEP #4 - Validate Against Schema
    const validationResult = await _validateAndNormalize(candidateData);

    if (!validationResult.isValid) {
      throw new ConfigValidationError('Invalid Chat Configuration', validationResult.errors || []);
    }

    return validationResult.data || {};
  } catch (err) {
    console.error('%c FATAL CHAT SETTINGS ERROR', 'color:red;font-weight:bold;', err.stack || err.message);
    process.exit(-500);
  }
}