import fs from "fs/promises";
import path from "path";
import { config } from "../../config";
import logger from "../../services/logger";

// --- PROMPT MANAGEMENT PERSISTENCE ---
export async function savePrompt(type, content) {
  const basePath = config.dataPath || "./data/";
  const promptDir = path.join(basePath.trim(), "prompts");

  try {
    await fs.mkdir(promptDir, { recursive: true });
    const filePath = path.join(promptDir, `${type}.json`);

    // Validate content structure before saving
    if (typeof content !== "object" || Array.isArray(content)) {
      throw new TypeError("Invalid prompt format");
    }

    await fs.writeFile(filePath, JSON.stringify(content), { flag: "w+" });

    return { success: true };
  } catch (e) {
    logger.error(`Failed saving ${type} prompt`, e);
    return { success: false };
  }
}

export async function loadPrompt(type) {
  const basePath = config.dataPath || "./data/";

  try {
    const filePath = path.join(basePath.trim(), "prompts", `${type}.json`);

    // Add timeout protection against stuck reads
    const readResult = await Promise.race([
      fs.readFile(filePath, "utf8"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Read timeout")), 5000),
      ),
    ]);

    return JSON.parse(readResult);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    logger.error(`Load error ${type} prompt`, err);
    throw err;
  }
}

// --- CONFIGURATION PERSISTENCE ---
export class ConfigPersistenceError extends Error {}

export async function persistSystemConfig(configData) {
  throw new ConfigPersistenceError(
    "Not implemented per architectural decisions",
  );
}

// --- EXPORTED REPOSITORY API ---------------------------
const RepositoryAPI = {
  getPromptsDirectory() {
    return path.resolve(config.dataPath ?? process.cwd(), "data/prompts");
  },

  async listStoredPrompts() {
    try {
      const dirContent = await fs.readdir(RepositoryAPI.getPromptsDirectory());

      // Filter only valid JSON files
      return dirContent
        .filter((f) => f.endsWith(".json") && !f.startsWith("."))
        .map((f) => f.replace(/\.json$/, ""));
    } catch {
      logger.warn("Failed listing prompts directory");
      return [];
    }
  },

  validateStoragePaths() {
    // Ensure critical directories exist before startup
    let requiredPaths = [
      RepositoryAPI.getPromptsDirectory(),
      ...["memory", "research"].map((d) =>
        path.resolve(config?.dataPath ?? ".", d),
      ),
      process.cwd(),
    ];

    let promises = [];
    requiredPaths.forEach((p) => {
      let resolved = path.normalize(p);
      promises.push(
        fs
          .mkdir(resolved, { recursive: true })
          .then(() => logger.debug(`Validated ${resolved}`))
          .catch((e) => {
            logger.error(`Validation failed ${resolved}: `, e);
            throw e;
          }),
      );
    });

    return Promise.all(promises)
      .then(() => true)
      .catch((err) => {
        throw new Error("Storage validation failed", { cause: err });
      });
  },
};

// Simplified initialization pattern --------
RepositoryAPI.initializeAsync = async () => {
  if (RepositoryAPI.initialized) return;

  await RepositoryAPI.validateStoragePaths();
  RepositoryAPI.initialized = true;
  logger.info("CoreAI repository initialized");
};

Object.defineProperty(RepositoryAPI, {
  initialized: {
    value: false,
    writable: true,
    configurable: true,
  },
});

export default Object.freeze({
  ...RepositoryAPI,

  savePrompt,
  loadPrompt,

  get PromptsRoot() {
    return RepositoryAPI.getPromptsDirectory();
  },
});
