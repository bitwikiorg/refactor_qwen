import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
import process from 'process'; // Added to ensure `process` is defined

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure process is defined
if (typeof process === 'undefined') {
  throw new Error("The 'process' object is not available in this environment.");
}

// New function to load and resolve the configuration
export async function loadConfig() {
  const configPath = path.join(__dirname, 'config.json'); // __dirname is /workspaces/refactor_qwen/app/config
  const rawConfig = await fs.readFile(configPath, 'utf-8');
  let config = JSON.parse(rawConfig);
  config = JSON.parse(JSON.stringify(config, (key, value) =>
    typeof value === 'string' && value.startsWith('${') && value.endsWith('}')
      ? process.env[value.slice(2, -1)] || value
      : value
  ));
  return config;
}

// Modify getConfig to use loadConfig
export async function getConfig() {
  const config = await loadConfig();
  const veniceConfig = config.aiProviders?.venice || {};
  const integrationsConfig = config.integrations?.venice || {};

  if (!process.env.VENICE_API_KEY || !integrationsConfig.enabled) {
    throw new Error(
      "Venice API configuration is missing. Ensure VENICE_API_KEY is set in .env and integrations.venice.enabled is true in config.json."
    );
  }

  return {
    ...config,
    aiProviders: {
      ...config.aiProviders,
      venice: {
        ...veniceConfig,
        apiKeys: {
          global: process.env.VENICE_API_KEY,
        },
        baseURL: process.env.VENICE_API_URL || veniceConfig.baseURL,
      },
    },
  };
}

export class ConfigProvider {
  static async getConfig() {
    return getConfig();
  }

  static async getString(key, defaultValue = '') {
    const config = await getConfig();
    // Support dot-notation for nested keys
    const value = key.split('.').reduce((o, k) => (o || {})[k], config);
    return value !== undefined ? value : defaultValue;
  }

  static async getNumber(key, defaultValue = 0) {
    const value = await this.getString(key);
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  static async getBoolean(key, defaultValue = false) {
    const value = await this.getString(key);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string')
      return ['true', '1', 'yes'].includes(value.toLowerCase());
    return defaultValue;
  }
}

export default ConfigProvider;
