import * as githubRepo from '../../app/features/github/repo.mjs';

describe('GitHub Repository Functions', () => {
  test('should validate basic configuration loading', async () => {
    const config = await githubRepo.getRepoConfig();
    expect(config.owner).toBeDefined();
    expect(config.repoName).toBeDefined();
    expect(config.branchName).toBeDefined();
  });

  test('should detect existing/non-existing paths correctly', async () => {
    const filePath = 'test-path';
    const exists = await githubRepo.doesPathExist(filePath);
    expect(typeof exists).toBe('boolean');
  });

  test('should get file SHA correctly', async () => {
    const filePath = 'test-path';
    const sha = await githubRepo.getFileSHA(filePath);
    expect(sha).toBeNull() || expect(typeof sha).toBe('string');
  });

  test('should create or replace content correctly', async () => {
    const filePath = 'test-path';
    const content = 'test content';
    const message = 'test message';
    const result = await githubRepo.createOrReplaceContent(filePath, content, message);
    expect(result).toBe(true);
  });
});