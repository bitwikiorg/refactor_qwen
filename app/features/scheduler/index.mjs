import process from 'process';
import { getLoggerInstance } from '../../services/logger.mjs';
import SchedulerService from './service.mjs';

const logger = getLoggerInstance({ module: 'Scheduler' });

const schedulerInstance = new SchedulerService();

let _instance;

export const getSchedulerInstance = () => {
  return _instance ??= (() => {
    const retryPolicy = {
      maxRetries: Number(process.env.MAX_RETRIES) || 3,
      retryBackoffMs: Number(process.env.RETRY_BACKOFF_MS) || 1000,
    };

    const validateEnvVariables = () => {
      const requiredVars = ['CRON_ENVIRONMENT', 'TASK_DIRECTORY', 'CONCURRENCY_LIMIT'];
      
      requiredVars.forEach(varName => {
        if (!process.env[varName]) {
          switch (varName) {
            case 'CRON_ENVIRONMENT':
              process.env[varName] = 'production'; // Default value
              break;
            case 'TASK_DIRECTORY':
              process.env[varName] = '/tasks'; // Default value
              break;
            case 'CONCURRENCY_LIMIT':
              process.env[varName] = '5'; // Default value
              break;
            default:
              throw new Error(`Missing required env var: ${varName}`);
          }
        }
      });
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

      async initialize() {
        if (this.#initialized) return;

        logger.info("Initializing task scheduler", {
          concurrencyLimit: process.env.CONCURRENCY_LIMIT,
        });

        try {
          await this.loadExistingJobsFromStorage();

          this.#initialized = true;
          return this;
        } catch (err) {
          logger.error("Initialization failed", err);
          throw err;
        }
      }

      async start(config) {
        try {
          await this.initialize();

          if (config && config.cronJobs) {
            for (const job of config.cronJobs) {
              const { name } = job;
              const existingJobHandle = this.findExistingScheduledTask(name);

              if (!existingJobHandle) {
                this.scheduleNewTask({ ...this.configDefaults(), ...job });
              }
            }
          }
        } catch (errorDetails) {
          this.handleStartupError(errorDetails);
        }
      }

      getRetryPolicy() {
        return Object.freeze(retryPolicy);
      }

      async loadExistingJobsFromStorage() {
        // Placeholder for loading jobs from storage
        logger.info("Loading existing jobs from storage...");
      }

      findExistingScheduledTask(name) {
        // Placeholder for finding an existing task
        return this.#jobsMap.get(name);
      }

      scheduleNewTask(jobConfig) {
        // Placeholder for scheduling a new task
        logger.info("Scheduling new task", jobConfig);
      }

      handleStartupError(errorDetails) {
        logger.error("Error during startup", errorDetails);
      }

      configDefaults() {
        return {
          // Default configuration for tasks
        };
      }
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
    this.tasks = this.tasks.filter((taskId) => taskId !== id);
  }
}

export * from './service.mjs'; // Re-export service layer components explicitly
export * as RoutesNamespace from './routes.mjs';

export default {
  getSchedulerInstance,
  init: () => {
    logger.info('Initializing scheduler module');
    return schedulerInstance;
  }
};