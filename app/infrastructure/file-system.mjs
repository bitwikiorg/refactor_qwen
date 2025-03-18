/**
 * File System Abstraction Layer
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for getting __dirname equivalent in ESM
const getDirname = (importMetaUrl) => {
  return path.dirname(fileURLToPath(importMetaUrl));
};

/**
 * File System Service
 */
class FileSystemService {
  /**
   * Read a file and return its contents
   * @param {string} filePath - Path to the file
   * @param {string} [encoding='utf8'] - File encoding
   * @returns {Promise<string|Buffer>} File contents
   */
  async readFile(filePath, encoding = 'utf8') {
    try {
      return await fs.promises.readFile(filePath, { encoding });
    } catch (error) {
      throw new Error(`Failed to read file "${filePath}": ${error.message}`);
    }
  }

  /**
   * Write data to a file
   * @param {string} filePath - Path to the file
   * @param {string|Buffer} data - Data to write
   * @param {string} [encoding='utf8'] - File encoding
   * @returns {Promise<void>}
   */
  async writeFile(filePath, data, encoding = 'utf8') {
    try {
      // Ensure the directory exists
      await this.ensureDir(path.dirname(filePath));

      // Write the file
      await fs.promises.writeFile(filePath, data, { encoding });
    } catch (error) {
      throw new Error(`Failed to write file "${filePath}": ${error.message}`);
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param {string} dirPath - Path to the directory
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create directory "${dirPath}": ${error.message}`);
      }
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} True if the file exists, false otherwise
   */
  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file "${filePath}": ${error.message}`);
    }
  }

  /**
   * Get a list of files in a directory
   * @param {string} dirPath - Path to the directory
   * @param {Object} [options] - Options
   * @param {boolean} [options.recursive=false] - Recursively list files
   * @param {RegExp} [options.filter] - Filter files by name
   * @returns {Promise<string[]>} Array of file paths
   */
  async listFiles(dirPath, options = {}) {
    const { recursive = false, filter = null } = options;

    try {
      // Read directory entries
      const entries = await fs.promises.readdir(dirPath);
      let files = [];

      // Process each entry
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const stats = await fs.promises.stat(entryPath);

        // If it's a file, add it to the list if it passes the filter
        if (stats.isFile()) {
          if (!filter || filter.test(entry)) {
            files.push(entryPath);
          }
        }
        // If it's a directory and recursive is true, get its files too
        else if (stats.isDirectory() && recursive) {
          const subFiles = await this.listFiles(entryPath, options);
          files = files.concat(subFiles);
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to list files in "${dirPath}": ${error.message});
    }
  }

  /**
   * Read a JSON file and parse its contents
   * @param {string} filePath - Path to the JSON file
   * @returns {Promise<Object>} Parsed JSON data
   */
  async readJSON(filePath) {
    try {
      const data = await this.readFile(filePath);
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to read JSON file "${filePath}": ${error.message});
    }
  }

  /**
   * Write JSON data to a file
   * @param {string} filePath - Path to the JSON file
   * @param {Object} data - Data to write
   * @param {boolean} [pretty=true] - Whether to pretty-print the JSON
   * @returns {Promise<void>}
   */
  async writeJSON(filePath, data, pretty = true) {
    try {
      const jsonData = pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
      await this.writeFile(filePath, jsonData);
    } catch (error) {
      throw new Error(`Failed to write JSON file "${filePath}": ${error.message});
    }
  }
}

// Export singleton instance
export default new FileSystemService();

// Export helper functions
export { getDirname };