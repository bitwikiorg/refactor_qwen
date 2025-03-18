// /app/config/provider.mjs

import fs from "node:fs/promises";
import path from "node:path";

export async function getConfig() {
  const configFile = await fs.readFile(
    path.resolve(__dirname, './default.json'),
    'utf8'
  );
  return JSON.parse(configFile);
}
/**
 * ConfigProvider - Centralized configuration management
 */
export class ConfigProvider {
  static getString(key, defaultValue = '') {
    return process.env[key] || defaultValue;
  }

  static getNumber(key, defaultValue = 0) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  static getBoolean(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }
}

export default ConfigProvider;
