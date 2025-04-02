import { Octokit } from "@octokit/rest";
import configService from "../../../config/default.mjs";
import child_process from "child_process";

const GITHUB_TOKEN = configService.get("GITHUB_TOKEN");
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --- Get Repo Configuration ---
/**
 * Fetches the repository configuration from the config service.
 * @returns {Promise<Object>} - An object containing the owner, repoName, and branchName.
 */
export async function getRepoConfig() {
  const defaultConfig =
    configService.get("integrations.github.repoConfig") || {};

  return {
    owner: defaultConfig.owner || "",
    repoName: defaultConfig.repo || "",
    branchName: process.env.GIT_BRANCH
      ? process.env.GIT_BRANCH.trim()
      : defaultConfig.branch
        ? defaultConfig.branch.trim()
        : "main",
  };
}

// --- Check Path Existence ---
/**
 * Checks if a specific path exists in the repository.
 * @param {string} filePath - The path to check.
 * @returns {Promise<boolean>} - True if the path exists, false otherwise.
 */
export async function doesPathExist(filePath) {
  try {
    const { owner, repoName } = await getRepoConfig();

    await octokit.repos.getContent({
      owner,
      repo: repoName,
      path: filePath,
      ref: `heads/${await getCurrentBranch()}`,
    });

    return true;
  } catch (error) {
    if (error.status === 404) return false;

    throw new Error(`GitHub Path Check Failed (${error.message})`);
  }
}

// --- Get Current Branch ---
/**
 * Determines the current branch name.
 * @returns {Promise<string>} - The current branch name.
 */
async function getCurrentBranch() {
  try {
    const envValue = process.env.GIT_BRANCH?.trim();

    // Fallback implementation using git CLI
    const execResult = child_process.execSync(
      "git rev-parse --abbrev-ref HEAD",
      { encoding: "utf8", stdio: "pipe", timeout: 1500 },
    );

    return execResult.replace(/\s+/g, "").toLowerCase() || "main";
  } catch (_) {
    return process.env.GIT_BRANCH?.trim() ?? "main";
  }
}

// --- Get File SHA ---
/**
 * Retrieves the SHA of a specific file in the repository.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<string|null>} - The SHA of the file or null if not found.
 */
export async function getFileSHA(filePath) {
  try {
    const { owner, repoName } = await getRepoConfig();

    const response = await octokit.repos.getContent({
      owner,
      repo: repoName,
      path: filePath,
      ref: `heads/${await getCurrentBranch()}`,
    });

    return response.data.sha;
  } catch (error) {
    if (error.status === 404) return null;

    throw new Error(`Failed to get file SHA (${error.message})`);
  }
}

// --- Create or Replace Content ---
/**
 * Creates or replaces the content of a file in the repository.
 * @param {string} filePath - The path to the file.
 * @param {string} contentString - The content to write.
 * @param {string} message - The commit message.
 * @returns {Promise<boolean>} - True if the operation was successful.
 */
export async function createOrReplaceContent(
  filePath,
  contentString,
  message = "Update via COREAI",
) {
  try {
    let sha = null;

    if (await doesPathExist(filePath)) {
      sha = await getFileSHA(filePath);
    } else {
      // New file - no SHA required
      sha = null;
    }

    const { owner, repoName, branchName } = await getRepoConfig();

    const payload = {
      content: Buffer.from(contentString).toString("base64"),
      message: message || "Auto update",
      branch: branchName,
    };

    if (sha) {
      // Update existing file
      payload.sha = sha;

      const response = await octokit.repos.updateFile({
        owner,
        repo: repoName,
        path: filePath,
        ...payload,
      });

      console.log(`Success: ${response.data.commit.message}`);
      return true;
    } else {
      // Create new file
      const response = await octokit.repos.createFile({
        owner,
        repo: repoName,
        path: filePath,
        ...payload,
      });

      console.log(`Success: ${response.data.commit.message}`);
      return true;
    }
  } catch (error) {
    throw new Error(`Git Operation Failed: ${error.message}`);
  }
}
