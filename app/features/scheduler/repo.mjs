// File: app/features/scheduler/repo.mjs
import * as path from 'node:path';
import * as fsPromise from 'node:fs/promises';
import { logger } from '../../services/logger'; // Assuming centralized logging service added elsewhere

const TASK_STORAGE_ROOT = path.resolve(__dirname, '../../../data/tasks');

class TaskStorageService {
  #storageRoot;

  constructor(storageRootOverride) {
    const resolvedRoot = storageRootOverride || TASK_STORAGE_ROOT;

    try {
      const statResult = fsPromise
        .stat(resolvedRoot)
        .then(() => true)
        .catch(() => false);

      process.nextTick(async () => {
        const validExistenceCheckResult = await statResult;

        if (!validExistenceCheckResult) {
          logger.error("Critical failure validating storage root", resolvedRoot);
          throw new Error("Storage root invalid");
        }
      });

      this.#storageRoot = resolvedRoot;
      Object.freeze(this.#storageRoot);
    } catch (error) {
      logger.error("Error initializing TaskStorageService", error.message);
      throw error;
    }
  }

  static async guaranteeSubdir(...subdirs) {
    let fullPathCandidate = '';

    while (subdirs.length > 0) {
      fullPathCandidate = path.join(fullPathCandidate, subdirs.shift());

      try {
        await fsPromise.access(fullPathCandidate);
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.info(`Creating ${fullPathCandidate}`);
          await fsPromise.mkdir(fullPathCandidate, { recursive: true });
        } else {
          throw error;
        }
      }
    }
  }

  async getAllStoredDocuments(filterOptions) {
    try {
      const rawEntries = (
        await fsPromise.readdir(this.#storageRoot, {
          withFileTypes: true,
          encoding: 'utf8',
        })
      ).filter((entry) => entry.isFile());

      return rawEntries
        .map((entry) => ({
          name: entry.name,
          contentLength: entry.size || 0,
          lastModified: new Date(entry.birthtimeMs || entry.atimeMs),
        }))
        .filter((docEntry) => {
          return (
            filterOptions?.includeNonMd ||
            /\.(markdown|mkdn|mkd|mk|ron|down|txt)$/i.test(docEntry.name)
          );
        });
    } catch (error) {
      logger.error("Failed enumerating stored documents", error.message, error.stack);
      throw new Error("Document listing failed");
    }
  }

  async fetchDocumentContent(documentId) {
    const normalizedId = documentId.toString();

    try {
      const candidatePaths = [
        path.join(this.#storageRoot, normalizedId + '.json'),
        path.join(this.#storageRoot, normalizedId + '.yaml'),
        path.join(this.#storageRoot, normalizedId + '.yml'),
      ];

      for (const candidateLocation of candidatePaths) {
        try {
          await fsPromise.access(candidateLocation);
          return JSON.parse(await fsPromise.readFile(candidateLocation, 'utf-8'));
        } catch {
          continue;
        }
      }

      throw new Error(`No document found matching ${normalizedId}`);
    } catch (error) {
      logger.error("Failed fetching document", error.message, error.stack);
      throw new Error(`Document retrieval failed for ID: ${normalizedId}`);
    }
  }

  async persistDocument(content, options) {
    const sanitizedFilename = options.id.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_') + (options.filenameSuffix || '.json');

    try {
      await TaskStorageService.guaranteeSubdir(...sanitizedFilename.split(path.sep));

      await fsPromise.writeFile(
        path.join(this.#storageRoot, sanitizedFilename),
        JSON.stringify(content, null, '\t')
      );
    } catch (error) {
      logger.error("Write failure encountered", error.message, error.stack);
      throw new Error(`Document persistence failed for ID: ${options.id}`);
    }
  }

  async removeDocument(documentRef) {
    try {
      for (const suffixExtension of ['.json', '.yaml', '.yml']) {
        const target = path.join(this.#storageRoot, String(documentRef) + suffixExtension);

        try {
          await fsPromise.access(target);
          await fsPromise.unlink(target);
          return true;
        } catch {
          continue;
        }
      }

      return false;
    } catch (error) {
      logger.error("Failed to remove document", error.message, error.stack);
      throw error;
    }
  }
}

export default class SchedulerRepo extends TaskStorageService {
  constructor() {
    super();

    this.config = Object.freeze({
      MAX_FILESIZE_LIMIT_BYTES: Number(process.env.MAX_TASK_SIZE) || 5e6,
      CONCURRENCY_LIMIT: Number(process.env.TASK_CONCURRENCY) || 5,
    });
  }

  scheduleNewMission(missionSpec) {
    TaskStorageService.guaranteeSubdir(missionSpec.folder || 'missions');
  }

  static get systemConfig() {
    return process.env.SCHEDULER_CONFIG?.split(',') || [];
  }
}

