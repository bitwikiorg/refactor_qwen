
import { getLoggerInstance } from './logger.mjs';

const logger = getLoggerInstance({ module: 'Scheduler' });

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.running = false;
    this.retryPolicy = {
      maxRetries: 3,
      initialDelay: 1000,
    };
  }

  initialize() {
    logger.info('Initializing Scheduler service');
    return this;
  }

  getRetryPolicyFromEnv() {
    return {
      maxRetries: Number(process.env.RETRY_MAX || 3),
      initialDelay: Number(process.env.RETRY_DELAY || 1000),
    };
  }

  addJob(name, fn, schedule, options = {}) {
    logger.debug(`Adding job: ${name}`);
    this.jobs.set(name, { fn, schedule, options });
    return this;
  }

  start(options = {}) {
    logger.info('Starting scheduler with options:', options);
    this.running = true;
    
    // Process cron jobs
    if (options.cronJobs && Array.isArray(options.cronJobs)) {
      for (const cronJob of options.cronJobs) {
        if (typeof cronJob === 'object') {
          for (const [schedule, fn] of Object.entries(cronJob)) {
            if (typeof fn === 'function' && schedule !== 'priority') {
              const priority = cronJob.priority || 'normal';
              this.addJob(`cron-${schedule}-${Math.random().toString(36).substring(2, 9)}`, fn, schedule, { priority });
            }
          }
        }
      }
    }
    
    return this;
  }

  stop() {
    logger.info('Stopping scheduler');
    this.running = false;
    return this;
  }
}

// Singleton instance
const scheduler = new Scheduler();

export default {
  getSchedulerInstance: () => scheduler
};
