// File: app/features/plugins/github/service.mjs

import { getLoggerInstance } from '../../../services/logger.mjs';
import AuthenticatedGitAdapter from '../../../services/git-sync.mjs';

const logger = getLoggerInstance({ module: 'GitHubService' });

class GitHubService {
  constructor() {
    this.gitAdapter = null;
  }

  async initialize() {
    try {
      this.gitAdapter = await AuthenticatedGitAdapter.Instance;
      return true;
    } catch (error) {
      logger.error('Failed to initialize GitHub service:', error);
      throw error;
    }
  }

  async commitFile(options = {}) {
    try {
      if (!this.gitAdapter) {
        await this.initialize();
      }

      const { path, content, message } = options;

      if (!path) {
        throw new Error('File path is required');
      }

      await this.gitAdapter.pushChange({
        path,
        content: content || '',
        message: message || `Update ${path}`
      });

      logger.info(`Successfully committed file: ${path}`);
      return { success: true, path };
    } catch (error) {
      logger.error('Failed to commit file:', error);
      throw error;
    }
  }

  async searchRepo(query, options = {}) {
    try {
      if (!this.gitAdapter) {
        await this.initialize();
      }

      // Implementation depends on actual GitHub API usage
      logger.info(`Searching repo for: ${query}`);

      // Placeholder for actual implementation
      return [];
    } catch (error) {
      logger.error('Failed to search repo:', error);
      throw error;
    }
  }

  // Placeholder implementations for other methods.  These need to be
  // implemented using the gitAdapter.  The specifics depend on the
  // AuthenticatedGitAdapter's API.

  async getFile(filePath) {
    if (!this.gitAdapter) await this.initialize();
    try {
      return await this.gitAdapter.getFile(filePath);
    } catch (error) {
      logger.error(`Failed to get file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async listDirectory(dirPath) {
    if (!this.gitAdapter) await this.initialize();
    try {
      return await this.gitAdapter.listDirectory(dirPath);
    } catch (error) {
      logger.error(`Failed to list directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(filePath, commitMessage) {
    if (!this.gitAdapter) await this.initialize();
    try {
      return await this.gitAdapter.deleteFile(filePath, commitMessage);
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}: ${error.message}`);
      throw error;
    }
  }
}

// Create a singleton instance
const githubServiceInstance = new GitHubService();

// Export the service methods directly
export const commitFileToRepo = async (options) => {
  return await githubServiceInstance.commitFile(options);
};

export const searchRepository = async (query, options) => {
  return await githubServiceInstance.searchRepo(query, options);
};

// Export the service class
export { GitHubService };

// Export default for direct usage
export default {
  commitFile: commitFileToRepo,
  search: searchRepository,
  Service: GitHubService
};