import fs from 'node:fs/promises';
import path from 'node:path';
import AjvCore from 'ajv';

const ajv = new AjvCore({ allErrors: true });

/**
 * @typedef {Object} ChatConfig
 * @property {Object<string, string>} [sanitizeOptions]
 * @property {{ windowMs: number, maxRequestsPerWindow?: number, delayAfter?: number }} [rateLimit]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string[]} [errors]
 * @property {ChatConfig|null} [data]
 */

/**
 * Custom error class for configuration validation errors
 */
class ConfigValidationError extends Error {
  /**
   * @param {string} message
   * @param {string[]} [errors=[]]
   */
  constructor(message, errors = []) {
    super(message);
    this.name = 'ConfigValidationError';
    this.errors = errors;
  }
}

/**
 * Load and parse JSON schema from a file
 * @param {string} schemaPath - Path to the schema file
 * @returns {Promise<Object>} - Parsed schema object
 * @throws {Error} - If the schema file cannot be read or parsed
 */
async function _loadSchema(schemaPath) {
  try {
    const schemaContent = await fs.readFile(schemaPath, { encoding: 'utf8' });
    return JSON.parse(schemaContent);
  } catch (err) {
    throw new Error(`Failed to load schema (${schemaPath}): ${err.message}`);
  }
}

/**
 * Validate and normalize chat configuration
 * @param {*} data - Raw chat configuration data
 * @returns {Promise<ValidationResult>} - Validation result
 */
async function _validateAndNormalize(data) {
  const schemaPath = path.join(__dirname, '../', 'schema', 'chat-schema.schema.json');
  let schema;

  try {
    schema = await _loadSchema(schemaPath);
  } catch (err) {
    return { isValid: false, errors: [err.message] };
  }

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
export async function loadValidatedChatSettings() {
  // Resolve Configuration Paths
  const rootDir = process.env.NODE_ENV === 'production'
    ? __dirname.split('/app')[0]
    : __dirname.replace('/app/config/loaders', '');

  const mainConfigPath = path.join(rootDir, 'config', 'default.conf');

  try {
    // Load Base Configuration
    const rawConfigStr = await fs.readFile(mainConfigPath, { encoding: 'utf8' });
    const parsedMainConf = JSON.parse(rawConfigStr);

    // Extract Chat Settings Object
    const candidateData = parsedMainConf.ai_providers?.venice?.models?.chat?.parameters || {};

    // Validate Against Schema
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