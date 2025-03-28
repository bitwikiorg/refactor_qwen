import { Octokit } from '@octokit/rest';
import { getLoggerInstance } from './logger.mjs';
import { getConfig } from '../config/provider.mjs';

export class GitSyncError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GitSyncError';
  }
}

let __gitSingleton__; // Singleton reference

export default class AuthenticatedGitAdapter {
  constructor() {
    this.config = null;
    this.loggerRef = null;
    this.octoClient = null;
    this.configRef = null;
  }

  // Get singleton instance safely
  static get Instance() {
    return !__gitSingleton__
      ? new Promise((resolve) => resolve(new AuthenticatedGitAdapter().init()))
      : Promise.resolve(__gitSingleton__);
  }

  // Initialize only once
  async init() {
    try {
      this.config = await getConfig();
      this.loggerRef = getLoggerInstance({ module: 'GitSync' });

      // Validate GitHub config first
      const githubConfig = this.config.get('integrations.github');
      if (!githubConfig.enabled || !githubConfig.token)
        throw new Error('GitHub Integration Not Configured');

      this._setupOctokit(githubConfig); // Setup client first

      await this.validateAuth(); // Check connection

      __gitSingleton__ ||= this; // Assign singleton only after success

      return __gitSingleton__;
    } catch (err) {
      throw new GitSyncError(`Initialization failed (${err.message})`);
    }
  }

  _setupOctokit(configData) {
    this.octoClient = new Octokit({
      auth: configData.token,
      userAgent: 'COREAI-Memory-Sync/v2',
      baseUrl: configData.base_url || 'https://api.github.com'
    });

    this.configRef = configData;
  }

  // Validate authentication by testing repo access
  async validateAuth() {
    const repoDetails = {
      owner: this.configRef.repo_config.owner,
      repo: this.configRef.repo_config.repo
    };
    const res = await this.octoClient.repos.get(repoDetails);
    return res.data.full_name;
  }

  // Push changes with safety checks
  pushChange({ path = 'memory/', content = '', message = 'Auto sync' }) {
    return new Promise((resolve, reject) => {
      (async () => {
        path = normalizePath(path);
        content ??= '';
        message ??= 'Auto sync commit';

        // Resolve branch name safely:
        const branch = this.configRef?.repo_config?.branch || 'main';

        // Atomic operation sequence:
        const blobSha = await this.createFileBlob(content);
        const commitParentSha = await this.getCurrentCommitSha(branch);
        const treeSha = await this.createTree(commitParentSha, path, blobSha);
        const newCommitObj = await this.makeNewCommit(treeSha, message);
        await this.updateBranchPointer(newCommitObj.sha, branch);

        resolve(true);
      })().catch((error) => {
        reject(new GitSyncError(`Push failed (${error.message})`));
      });
    });
  }

  // Helper functions implemented as class methods
  async getCurrentCommitSha(branch) {
    try {
      const response = await this.octoClient.git.getRef({
        owner: this.configRef.repo_config.owner,
        repo: this.configRef.repo_config.repo,
        ref: `heads/${branch}`
      });
      return response.data.object.sha;
    } catch (error) {
      throw new GitSyncError(`Failed to get current commit SHA: ${error.message}`);
    }
  }

  async createFileBlob(contentStr) {
    contentStr ??= '\n';
    try {
      const resp = await this.octoClient.git.createBlob({
        owner: this.configRef.repo_config.owner,
        repo: this.configRef.repo_config.repo,
        content: Buffer.from(contentStr).toString('base64'),
        encoding: 'base64'
      });
      return resp.data.sha;
    } catch (error) {
      throw new GitSyncError(`Failed to create blob: ${error.message}`);
    }
  }

  async createTree(commitParentSha, path, blobSha) {
    try {
      const response = await this.octoClient.git.createTree({
        owner: this.configRef.repo_config.owner,
        repo: this.configRef.repo_config.repo,
        base_tree: commitParentSha,
        tree: [{
          path: path,
          mode: '100644',
          type: 'blob',
          sha: blobSha
        }]
      });
      return response.data.sha;
    } catch (error) {
      throw new GitSyncError(`Failed to create tree: ${error.message}`);
    }
  }

  async makeNewCommit(treeSha, message) {
    try {
      const currentCommit = await this.octoClient.git.getCommit({
        owner: this.configRef.repo_config.owner,
        repo: this.configRef.repo_config.repo,
        commit_sha: await this.getCurrentCommitSha(this.configRef.repo_config.branch || 'main')
      });

      const response = await this.octoClient.git.createCommit({
        owner: this.configRef.repo_config.owner,
        repo: this.configRef.repo_config.repo,
        message: message,
        tree: treeSha,
        parents: [currentCommit.data.sha]
      });
      
      return response.data;
    } catch (error) {
      throw new GitSyncError(`Failed to create commit: ${error.message}`);
    }
  }

  async updateBranchPointer(commitSHA, branchName = 'main') {
    try {
      const response = await this.octoClient.git.updateRef({
        owner: this.configRef.repo_config.owner,
        repo: this.configRef.repo_config.repo,
        ref: `heads/${branchName}`,
        sha: commitSHA,
        force: true
      });

      if (response.data.object.sha === commitSHA) {
        this.loggerRef.info(`Updated ${branchName} branch successfully`);
        return true;
      } else {
        throw new GitSyncError('Failed to update branch: SHA mismatch');
      }
    } catch (error) {
      throw new GitSyncError(`Failed to update branch pointer: ${error.message}`);
    }
  }
}

function normalizePath(pth) {
  return pth.replace(/\/+/g, '/').replace(/^\//, '');
}
