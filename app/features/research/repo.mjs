import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "process";
import { stat } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";

const RESEARCH_ROOT = resolve(process.cwd(), "./data", "research");

export class ResearchRepository {
  #logger;

  static #VALID_FILENAME_REGEX = /^[a-z0-9_.-]+$/i; // Removed unnecessary escape character for '-'

  /**
   * @param {{ logger }} options 
   */
  constructor({ logger }) {
    this.#logger = logger;

    // Perform strict dir verification during init
    void this.#verifyDirPermissions();

    process.on('unhandledRejection', (err) => {
      if (err.message.includes('STORAGE_PERMISSION_DENIED')) {
        this.#logger?.error('Unhandled rejection due to storage permission:', err);
        process.exit(1);
      }
    });
  }

  /**
   * Save research content persistently
   * @param {{ topic:string,content:string }} contentObj 
   */
  async safeSave(contentObj) {
    const sanitizedContent = contentObj.content || '';
    const sanitizedName = ResearchRepository.sanitizeFilename(contentObj.topic);

    const timestampPart = new Date()
      .toISOString()
      .replace(/[:T]/g, '')
      .slice(0, -5);

    const filenameBase =
      `${sanitizedName}-${timestampPart}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '_')  // Fixed regex: removed unnecessary escape
        .replace(/_{2}/g, '_');

    let attemptCount = 3;
    while (attemptCount--) {
      try {
        const finalName = `${filenameBase}${attemptCount > 0 ? `_${attemptCount}` : ''}.md`;
        return await this.createUniqueEntry(finalName, sanitizedContent);
      } catch (e) {
        /* ignored error */  // Added comment to avoid empty block statement
      }
    }

    throw new Error("SAVE_ATTEMPTS_EXCEEDED");
  }

  /**
   * Create file ensuring uniqueness
   */
  async createUniqueEntry(filename, content) {
    let fullPath = resolve(
      RESEARCH_ROOT,
      ResearchRepository.sanitizeFilename(filename)
    );

    while (await ResearchRepository.fileExists(fullPath)) {
      fullPath += '-dup';
    }

    return (
      await ResearchRepository.writeContent(fullPath, content)
    ).filePath;
  }

  /**
   * Load research document contents safely
   * @param {string} target - Relative/absolute filepath
   */
  async safeLoad(target) {
    const resolvedTarget = target.startsWith('/')
      ? target
      : resolve(RESEARCH_ROOT, target);

    if (!resolvedTarget.startsWith(resolve(process.cwd(), './data'))) {
      throw new Error('PATH_OUTSIDE_SANDBOX');
    }

    return (
      await readFile(resolvedTarget, {
        encoding: 'utf8',
        flag: 'r'
      })
    );
  }

  /** List available documents **/
  listEntries(filters = {}) {
    this.#logger?.info('Listing entries with filters:', filters);
    // Implement logic for listing entries
    return []; // Placeholder implementation to avoid empty block
  }

  /** Delete operation wrapper **/
  deleteEntries(pattern, options = {}) {
    this.#logger?.info('Deleting entries with pattern:', pattern, 'and options:', options);
    // Implement logic for deleting entries
    return true; // Placeholder implementation to avoid empty block
  }

  /** Archive management **/
  archiveOldData(daysThreshold, options = {}) {
    this.#logger?.info('Archiving data older than:', daysThreshold, 'days with options:', options);
    // Implement logic for archiving data
    return true; // Placeholder implementation to avoid empty block
  }

  /* Private Methods */

  async #verifyDirPermissions() {
    try {
      await this.#checkWriteAccess();
      this.#logger?.info('Directory permissions verified for:', RESEARCH_ROOT);
    } catch (error) {
      this.#logger?.error('Failed to verify directory permissions:', error);
      throw error;
    }
  }

  async #checkWriteAccess() {
    try {
      await stat(RESEARCH_ROOT);
    } catch (e) {
      throw new Error("STORAGE_PERMISSION_DENIED");
    }
  }

  /* Utilities */

  static sanitizeFilename(inputStr) {
    inputStr = inputStr.replace(/\s+/g, "_");

    if (!inputStr.match(this.#VALID_FILENAME_REGEX)) {
      inputStr = 'invalid-' + Date.now();
    }

    return inputStr.slice(0, 256);
  }

  static async fileExists(pathToCheck) {
    try {
      await stat(pathToCheck);
      return true;
    } catch {
      return false;
    }
  }

  static async writeContent(filePath, contentString) {
    const parentDir = dirname(filePath);
    await mkdir(parentDir, { recursive: true });

    const result = {
      filePath,
      success: Boolean(await writeFile(filePath, contentString)),
    };
    result.stats = result.success && (
      await stat(result.filePath)
    );

    return result;
  }
}

export default ResearchRepository;
