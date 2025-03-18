// File Path: features/scheduler/service.mjs  
import { EventEmitter } from "events";  
import cron from "node-cron";  
import { inject } from "../../services/di-container.mjs";  
import { v4 } from "uuid";  

// Validate required dependencies at import time  
const taskRepository = inject("TaskRepository"); // Throws error immediately if missing  

class SchedulerService extends EventEmitter {  

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

    async initialize(): Promise<void> {        
       await new Promise((resolve)=>setTimeout(resolve)); 
       /* 
          * Simulated startup delay - replace with actual initialization steps such as connecting databases etc       
          * Ensure only runs once even after multiple calls via singleton pattern implementation elsewhere     
       */    

       const storedJobs=await taskRepository.listAllValidTasks();    

       try{            
           await Promise.all( storedJobs.map(async(j)=>{                
               const content=await taskRepository.readContent(j.id);                
               return JSON.parse(content);            
           }) );            
           await this.start({concurrencyLimit:this.concurrencyLimit});         
           console.log(`Scheduler initialized successfully ${this.status}`);          
      }catch(initializeError){            
          throw new Error(`Initialization failed ${initializeError.message}`);     
      } finally{         
          resolve(true);
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

    async start(options={}):Promise{    
        const self=this;    

        /* Validate configuration parameters */     
        validateOptions(options,['cronJobs','concurrencyLimit']);     

        /* Update instance state atomically */
        [this.concurrencyLimit,this.retryPolicy]=[
            options?.concurrencyLimit??this.concurrencyLimit,
            {...self.retryPolicy,...options?.retryPolicy}
        ];    

        /* Begin scheduling process */
        try{
            await Promise.all(
                options.cronJobs.map(async(jobDef)=>{
                    validateJobDefinition(jobDef);

                    const expr=cron.validate(jobDef.schedule)
                        ?jobDef.schedule : throwInvalidCron(expr);

                    const priority=jobDef.priority||"normal";
                    let currentJob;

                   currentJob=cron.schedule(expr,{
                       scheduled:false,
                       context:{...jobDef,priority}
                   });

                   currentJob.name=jobDef.id;
                   currentJob.start();

                   self.jobs.set(currentJob.name,currentJob);
                })
            );

            self.emit('scheduler:start',self.getStatus());
            self.status="active";

       }catch(startupError){
           self.emit('scheduler:error',{
               message:"Startup failure",
               details:startupError.stack||startupError.toString()
           });
       }

       return Object.seal(this);
    }
    stop():void{    
       Array.from(this.jobs.values()).forEach(j=>j.stop());      
       Array.from(this.runningTasks.keys()).forEach(t=>t.abort());      
       this.status="stopped";      
       Object.freeze(this.jobs.clear());   
    }

    executeResearchWorkflow(params):Promise{ 
    /* Delegate workflow execution through injected services */   
    return import('../research/service.mjs').then(m=>m.executeResearchWorkflow(params)); 
    } 
    async scheduleNewMission(config):Promise<{id:string}>{
    /* Implement robust mission scheduling logic */
    validateMissionConfiguration(config);

    const generatedUUID=v4();
    const enrichedConfig={
    ...config,
    id:checkedUUID(generatedUUID),
    created:new Date(),
    enabled:Boolean(config.enabled),
    handler:async()=>{
    try{
    return await executeResearchWorkflow({...config.params});
    }catch(err){
    throw new MissionExecutionFailure(err);
    }
    }
    };

    try{
    const savedPath=await taskRepository.save(enrichedConfig);
    return {"taskId":savedPath};
    }catch(persistenceErr){
    throw persistenceErr;
    }finally{
    enrichedConfig.handler=null;
    } 
    }
    async unscheduleMission(taskId:string):Promise{
    if(!isValidUUID(taskId))throw InvalidInput("Invalid UUID format");
    if(!this.jobs.has(taskId))return false;

    try{
    const target=this.jobs.get(taskId)!;
    target.stop();
    await taskRepository.deleteOneById(taskId);
    this.jobs.delete(target.name);// cleanup reference after deletion successfullly completed
    return true;
    }catch(deleteErr){
    console.error(`Failed deleting ${taskId}`,deleteErr.stack||deleteErr.message)
    return false; }
    }
    toggleEnabledStatus(id:string,bool:boolean):boolean {
    if(!isValidUUID(id))throw InvalidInput('Bad ID');
    let found=this.findActiveOrStored(id);

    if(found===null)return false;

    found.config.enabled=bool;
    try{
    taskRepository.update(found.config);// assumes update persists changes synchronously ?
    }catch(updateFailed){}
    finally{return true;}
    }
    private findActiveOrStored(id:string)=>
    Array.from([...this.jobs.values()], [...this.runningTasks.entries()])
    .find(([k,v])=>v.id===id)?.[1] ?? null;

    private isValidStateTransition(from,to)=>
    ["initialized","starting","active"].includes(from)&&to==="stopped";

    /** Other helper functions omitted for brevity **/

}


function validateOptions(options,paramNames:Array){...}  

function isValidUUID(str:String){...}  

export default SchedulerService;