// File Path: features/scheduler/service.mjs  
import process from 'process';
import { EventEmitter } from "events";  
import cron from 'node-cron';  
import { inject } from "../../services/di-container.mjs";  
import { v4 } from "uuid";  
// Removed unused import from './routes.mjs'

// Validate required dependencies at import time  
const taskRepository = inject("TaskRepository"); // Throws error immediately if missing  

export default class SchedulerService extends EventEmitter {  

    constructor() {  
        super();  
        this.jobs = new Map(); // Active scheduled tasks keyed by ID string uuidv4 format only!   
        this.runningTasks = new WeakMap(); // Tracks currently executing tasks preventing memory leaks    
        this.status = "initialized_but_not_started"; // Explicit state tracking improves observability    
        this.concurrencyLimit = Number(process.env.SCHEDULER_CONCURRENCY_LIMIT || 5);    
        this.retryPolicy = Object.freeze({        
            maxRetries:Number(process.env.MAX_RETRIES || 3),        
            retryInterval:Number(process.env.RETRY_INTERVAL_MS || 1000),        
            backoffFactor:Number(process.env.BACKOFF_FACTOR || 1.5)    
         });    
        Object.freeze(this); // Prevent accidental property mutations post-initialization except observable states      
    }

    async initialize() {
        // Simulated startup delay
        await new Promise((resolve) => setTimeout(resolve, 0));
        /* 
           * Simulated startup delay - replace with actual initialization steps such as connecting databases etc       
           * Ensure only runs once even after multiple calls via singleton pattern implementation elsewhere     
        */
        const storedJobs = await taskRepository.listAllValidTasks();

        try {
            const parsedJobs = await Promise.all(
                storedJobs.map(async (j) => {
                    const content = await taskRepository.readContent(j.id);
                    return JSON.parse(content);
                })
            );
            await this.start({ cronJobs: parsedJobs, concurrencyLimit: this.concurrencyLimit }); // Pass parsed jobs
            console.log(`Scheduler initialized successfully. Status: ${this.status}`);
        } catch (initializeError) {
            console.error(`Initialization failed: ${initializeError.message}`);
            throw new Error(`Initialization failed: ${initializeError.message}`);
        }
    }

    // Schedule a new cron job
    schedule(expression, jobFunction, options = {}) {
        const jobId = options.id || v4();

        if (this.jobs.has(jobId)) {
            throw new Error(`Job with ID ${jobId} already exists`);
        }

        const job = cron.schedule(expression, () => {
            try {
                jobFunction();
                this.emit('job:success', { id: jobId });
            } catch (error) {
                this.emit('job:error', { id: jobId, error });
            }
        }, {
            scheduled: options.autoStart !== false
        });

        this.jobs.set(jobId, job);
        return jobId;
    }

    // Cancel a scheduled job
    cancel(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return false;
        }

        job.stop();
        this.jobs.delete(jobId);
        return true;
    }

    // Get all scheduled jobs
    getJobs() {
        return Array.from(this.jobs.keys());
    }

    async start(options = {}) {
        const self = this;

        /* Validate configuration parameters */
        validateOptions(options, ["cronJobs", "concurrencyLimit"]);

        /* Update instance state atomically */
        [this.concurrencyLimit, this.retryPolicy] = [
            options.concurrencyLimit !== undefined ? options.concurrencyLimit : this.concurrencyLimit,
            { ...self.retryPolicy, ...options.retryPolicy }
        ];

        /* Begin scheduling process */
        try {
            await Promise.all(
                options.cronJobs.map(async (jobDef) => {
                    validateJobDefinition(jobDef);
                    const expr = cron.validate(jobDef.schedule)
                        ? jobDef.schedule
                        : throwInvalidCron(jobDef.schedule);
                    const priority = jobDef.priority || "normal";
                    let currentJob = cron.schedule(expr, {
                        scheduled: false,
                        context: { ...jobDef, priority }
                    });
                    currentJob.name = jobDef.id;
                    currentJob.start();
                    self.jobs.set(currentJob.name, currentJob);
                })
            );

            self.emit("scheduler:start", self.getStatus());
            self.status = "active";
        } catch (startupError) {
            self.emit("scheduler:error", {
                message: "Startup failure",
                details: startupError.stack || startupError.toString()
            });
        }

        return Object.seal(this);
    }

    stop() {
        Array.from(this.jobs.values()).forEach((j) => j.stop());
        Array.from(this.runningTasks.keys()).forEach((t) => t.abort());
        this.status = "stopped";
        this.jobs.clear();
        Object.freeze(this.jobs);
    }

    executeResearchWorkflow(params) {
        /* Delegate workflow execution through injected services */   
        return import('../research/service.mjs').then(m => m.executeResearchWorkflow(params)); 
    } 

    async scheduleNewMission(config) {
        /* Implement robust mission scheduling logic */
        validateMissionConfiguration(config);

        const generatedUUID = v4();
        const enrichedConfig = {
            ...config,
            id: checkedUUID(generatedUUID),
            created: new Date(),
            enabled: Boolean(config.enabled),
            handler: async () => {
                try {
                    return await this.executeResearchWorkflow({ ...config.params }); // Use `this.executeResearchWorkflow`
                } catch (err) {
                    throw new MissionExecutionFailure(err);
                }
            }
        };

        try {
            const savedPath = await taskRepository.save(enrichedConfig);
            return { taskId: savedPath };
        } catch (persistenceErr) {
            console.error(`Failed to save mission: ${persistenceErr.message}`);
            throw persistenceErr;
        } finally {
            enrichedConfig.handler = null; // Clear handler to avoid memory leaks
        } 
    }

    async unscheduleMission(taskId) {
        if (!isValidUUID(taskId)) throw new InvalidInput("Invalid UUID format"); // Fixed `InvalidInput` instantiation
        if (!this.jobs.has(taskId)) return false;

        try {
            const target = this.jobs.get(taskId);
            target.stop();
            await taskRepository.deleteOneById(taskId); // Ensure `deleteOneById` exists in `taskRepository`
            this.jobs.delete(taskId); // Cleanup reference after deletion successfully completed
            return true;
        } catch (deleteErr) {
            console.error(`Failed deleting ${taskId}`, deleteErr.stack || deleteErr.message);
            return false;
        }
    }

    toggleEnabledStatus(id, bool) {
        if (!isValidUUID(id)) throw new InvalidInput("Invalid UUID format"); // Fixed `InvalidInput` instantiation
        const found = this.findActiveOrStored(id);

        if (!found) return false;

        found.config.enabled = bool;
        try {
            taskRepository.update(found.config); // Ensure this persists changes
        } catch (updateFailed) {
            console.error(`Failed to update enabled status for ${id}: ${updateFailed.message}`);
        }
        return true;
    }

    findActiveOrStored(id) {
        const foundInJobs = [...this.jobs.values()].find((job) => job.name === id);
        if (foundInJobs) return { config: foundInJobs }; // Ensure consistent return structure
        const foundInRunning = [...this.runningTasks.entries()].find(([, task]) => task.id === id);
        return foundInRunning ? { config: foundInRunning[1] } : null;
    }

    isValidStateTransition(from, to) {
        return ["initialized_but_not_started", "starting", "active"].includes(from) && to === "stopped"; // Fixed state name
    }

    /** Other helper functions omitted for brevity **/

    // Example method
    scheduleTask(task) {
        console.log(`Task scheduled: ${task}`);
    }
}


function validateOptions(options, paramNames) {
    if (!options || typeof options !== "object") {
        throw new Error("Options must be a valid object.");
    }
    paramNames.forEach((param) => {
        if (!(param in options)) {
            throw new Error(`Missing required option: ${param}`);
        }
    });
}

function isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

function validateJobDefinition(jobDef) {
    if (!jobDef || typeof jobDef !== "object") {
        throw new Error("Job definition must be a valid object.");
    }
    if (!jobDef.schedule || typeof jobDef.schedule !== "string") {
        throw new Error("Job definition must include a valid schedule string.");
    }
    if (!jobDef.id || !isValidUUID(jobDef.id)) {
        throw new Error("Job definition must include a valid UUID as id.");
    }
}

function throwInvalidCron(schedule) {
    throw new Error(`Invalid cron schedule: ${schedule}`);
}

function validateMissionConfiguration(config) {
    if (!config || typeof config !== "object") {
        throw new Error("Mission configuration must be a valid object.");
    }
    if (!config.params || typeof config.params !== "object") {
        throw new Error("Mission configuration must include valid params.");
    }
}

function checkedUUID(uuid) {
    if (!isValidUUID(uuid)) {
        throw new Error("Invalid UUID format.");
    }
    return uuid;
}

class MissionExecutionFailure extends Error {
    constructor(originalError) {
        super(`Mission execution failed: ${originalError.message}`);
        this.name = "MissionExecutionFailure";
        this.stack = originalError.stack;
    }
}

class InvalidInput extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidInput";
    }
}