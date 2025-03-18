
import os from 'os';
import { execSync } from 'child_process';

export function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
}

export function getSystemStats() {
  // Get actual CPU usage by sampling load averages
  const cpuUsage = (os.loadavg()[0] * 100) / os.cpus().length;

  // For disk, we'll use a simple check of the current directory
  let diskUsage = 0;
  try {
    const diskData = execSync('df -k . | tail -1').toString();
    const diskParts = diskData.trim().split(/\s+/);
    if (diskParts.length >= 5) {
      diskUsage = parseInt(diskParts[4].replace('%', ''), 10);
    }
  } catch (error) {
    console.error('Error getting disk usage:', error);
  }

  return {
    memory: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
    cpu: Math.round(cpuUsage),
    disk: diskUsage,
    uptime: formatUptime(os.uptime()),
  };
}

export function checkAPIStatus() {
  const veniceApiKey = process.env.VENICE_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const githubConfig = {
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH,
    path: process.env.GITHUB_PATH,
  };
  const githubConfigured = !!githubToken && !!githubConfig.owner && !!githubConfig.repo;
  
  return {
    venice: !!veniceApiKey,
    brave: !!braveKey,
    github: githubConfigured,
  };
}
