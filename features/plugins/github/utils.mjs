import configService from '../../../config/default.js';
const { execSync } = require('child_process'); // Added globally for reusability

export async function fetchTerminalDefaultPrompt() {
  return configService.get('terminal.default_prompt') || `
# Terminal Default Prompt Configuration Not Found!
[COREAI] How can I assist you today?
`;
}

export async function fetchResearchBasePrompt() {
  return configService.get('research.default_prompt') || `
Analyze the following query deeply using multi-step reasoning...
Include relevant sources and maintain logical flow.`;
}

export function getCurrentBranch() { // Fixed TypeScript -> JS conversion
  try {
    const branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' })
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, ''); // Added safety cleanup
    return branchName || process.env.GIT_BRANCH?.trim();
  } catch (e) {
    return process.env.GIT_BRANCH?.trim() || 'main';
  }
}