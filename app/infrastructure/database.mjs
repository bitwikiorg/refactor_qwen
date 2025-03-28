import * as fsExtra from 'fs-extra';
import { join } from 'path';
import { strict as assert, deepEqual } from 'node:assert';

const __dirname = join(import.meta.url.match(/^(.*)\/[^/]+$/)[1]);

const BASE_DATA_DIRS = {
  memory: join(__dirname, '..', '..', 'data', 'memory'),
  research: join(__dirname, '..', '..', 'data', 'research'),
  tasks: join(__dirname, '..', '..', 'data', 'tasks'),
};

// Validation Utilities
function resolveDataFilePath(segment, pathStr) {
  const basePath = BASE_DATA_DIRS[segment];
  const sanitizedPath = normalizeSlashes(pathStr).replace(/^\.?\//, '');
  const fullPath = join(basePath, sanitizedPath);
  assert(
    isWithinDirectory(fullPath, basePath),
    `Invalid access attempt beyond ${basePath}`
  );
  return fullPath;
}

function normalizeSlashes(pathStr) {
  return process.platform === 'win32'
    ? pathStr.replace(/\//g, '\\')
    : pathStr.replace(/\\/g, '/');
}

function isWithinDirectory(fullpath, parentDir) {
  parentDir = parentDir.replace(/\/$/, '');
  fullpath = fullpath.replace(/\/$/, '');
  return fullpath.startsWith(parentDir);
}

export async function readData(filePath, options = { encoding: 'utf8' }) {
  let [segment, filePart] = parseFileSegment(filePath);
  assert(
    segment && Object.hasOwn(BASE_DATA_DIRS, segment),
    `Invalid data segment '${segment}'`
  );
  const resolvedFullPath = resolveDataFilePath(segment, filePart || '');
  try {
    const rawData = await fsExtra.readJSON(resolvedFullPath, options);
    console.log(`Read ${resolvedFullPath}`);
    return rawData;
  } catch (err) {
    throw new DataReadError(`Failed reading ${filePath} (${err.code})`);
  }
}

export async function writeData(
  filePath,
  data,
  options = { encoding: 'utf8', spaces: '\t' }
) {
  let [segment, filePart] = parseFileSegment(filePath);
  assert(
    segment && Object.hasOwn(BASE_DATA_DIRS, segment),
    `Invalid target segment '${segment}'`
  );
  const resolvedFullPath = resolveDataFilePath(segment, filePart || '');
  try {
    await fsExtra.outputJSON(resolvedFullPath, data, {
      ...options,
      spaces:
        typeof options.spaces === 'number'
          ? options.spaces
          : Array.isArray(options.spaces)
            ? null
            : typeof options.spaces === 'string'
              ? options.spaces.slice(0)
              : '\t',
    });
    console.log(`Wrote ${resolvedFullPath}`);
    // Verify post-write integrity
    await verifyFileIntegrity(resolvedFullPath, data);
    return true;
  } catch (err) {
    throw new DataWriteError(`
      Write failed at ${filePath}:
      ${err.message}
    `);
  }
}

async function verifyFileIntegrity(file, data, retries = 3) {
  if (retries <= 0) return;
  try {
    let storedContent = await fsExtra.readJSON(file);
    if (!deepEqual(storedContent, data)) {
      throw new IntegrityMismatchError(`
        Stored content differs from written data after writing:
        ${file}
      `);
    }
  } catch (e) {
    if (retries > 0) {
      return verifyFileIntegrity(file, data, retries - 1);
    } else {
      throw e;
    }
  }
}

/* Utility Functions */
function parseFileSegment(filePath) {
  let parts = [];
  try {
    parts = (filePath || '').split('/').filter(Boolean);
  } catch (e) {
    // Ignore errors during splitting filePath
  }
  return [
    parts.length > 0 ? parts[0].toLowerCase() : '',
    parts.slice(1).join('/'),
  ];
}

/* Error Hierarchy */
class DatabaseError extends Error {
  constructor(message) {
    super(message);
  }
}

class DataReadError extends DatabaseError {}
class DataWriteError extends DatabaseError {}
class IntegrityMismatchError extends DatabaseError {}

export default class BaseDatabaseManager {
  // Placeholder for common DB operations
  performOperation() {
    // Implement database operations here
    console.log('Performing a database operation...');
  }
}
