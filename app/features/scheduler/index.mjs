// File: app/features/scheduler/index.mjs

import { createLogger } from '../../services/logger.mjs';
import type { ConfigType } from '../../config/schema.mjs';

const logger = createLogger('scheduler');
const SchedulerRepo = await import('./repo.mjs'); // Use dynamic import due to circular dependency potential
const { default: SchedulerRoutes } = await import('./routes.mts'); // Note TS extension if applicable
const { default: SchedulerService } = await import('./service.cjs'); // Adjust based on target format

let _instance;

export const getSchedulerInstance = () => {
  return _instance ??= (() => {
    const retryPolicy = {
      maxRetries: Number(process.env.MAX_RETRIES) || 3,
      retryBackoffMs: Number(process.env.RETRY_BACKOFF_MS) || 1000,
    };

    const validateEnvVariables = () => {
      const requiredKeysPresent =
        process.env.CRON_ENVIRONMENT &&
        process.env.TASK_DIRECTORY &&
        process.env.CONCURRENCY_LIMIT;
      if (!requiredKeysPresent) throw new Error("Missing required env vars");
    };

    class CronManager {
      #initialized;
      #jobsMap;

      constructor() {
        this.#initialized = false;
        this.#jobsMap = new Map();
        validateEnvVariables();

        Object.freeze(this.getRetryPolicy);
      }

      initialize() {
        if (this.#initialized) return;

        logger.info("Initializing task scheduler",
          { concurrencyLimit: process.env.CONCURRENCY_LIMIT });

        try {
          // Load persisted jobs from storage repository before initialization completes?
          await loadExistingJobsFromStorage();

          this.#initialized = true;
          return Promise.resolve(this);

        } catch (err) {
          logger.error("Initialization failed", err);
          throw err;
        }
      }

      async start(config?: Partial<ConfigType>) {

        try {

          await this.initialize();

          config?.cronJobs?.forEach(async ({ name }) => {

            const existingJobHandle 
               ?= findExistingScheduledTask(name);

          !existingJobHandle &&
            scheduleNewTask({ ...configDefaults(), ...jobConfig });

        });

      } catch(errorDetails) {
        handleStartupError(errorDetails);
      }

    }

    getRetryPolicy() { return Object.freeze(retryPolicy); }

  }

     return new CronManager();
})();
};

export class TaskScheduler {
    constructor() {
        this.tasks = [];
    }

    schedule(task, interval) {
        const id = setInterval(task, interval);
        this.tasks.push(id);
        return id;
    }

    cancel(id) {
        clearInterval(id);
        this.tasks = this.tasks.filter(taskId => taskId !== id);
    }
}

// Export types explicitly instead of object literals:
export type ScheduleResultType 
  extends Record < 'scheduledAt', Date > {}

export * from './service'; // Re-export service layer components explicitly
export * as RoutesNamespace from './routes';

// Deprecate direct repo exports - use through service layers:
// export * as RepoLayer from './repo';
