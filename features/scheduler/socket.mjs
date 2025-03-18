// File Path: features/scheduler/socket.mjs  
import { io } from '../../infrastructure/socket';  
import { createLogger } from '../../services/logger';  
import { inject } from '../services/di-container';  

const logger = createLogger('scheduler.socket');  

const schedulerService = inject('SchedulerService');  
if (!schedulerService || !schedulerService.runMissionImmediately || !schedulerService.getActiveTasksSnapshot || !scheduler.service.taskUpdates$ ) {  
  throw new Error("Missing required Scheduler Service dependencies"); // Explicit dependency validation at startup time  
}  

const SCHEDULER_NS = '/scheduler-realtime';  
const ioNamespace = io.of(SCHEDULER_NS);  

ioNamespace.on('connection', (socket) => {  
  const connectionLogEntry = `Client ${socket.id} connected`; // Precompute common log strings once per connection lifecycle  

  /* Connection Lifecycle Management */  

  // Track subscriptions for cleanup later during disconnection phase  
  let taskUpdateSubscription;  

  const emitTaskStatusUpdate = async(taskIdOrData)=>{    
    try{      
      const taskId=typeof taskIdOrData==='string'?taskIdOrData : taskIdOrData.id;      

      const statusType=taskIdOrData.status||'unknown';      

      const taskDetails=await scheduler.service.getTaskDetails(taskId);      

      return socket.emit(        
        `task:${taskId}:update`,        
        statusType===undefined ? new Error("Invalid status type"):statusType,
        taskDetails ?? {}      
      );    
    }catch(err){      
      emitSystemError(socket,err,"Failed_to_emit_task_update");    
    }    
};  

function emitSystemError(socket,error,eventName="generic_error"){    
    return socket.emit(        
        eventName,
        {
            message:error?.message||"Internal server error",
            stack:error?.stack||"",
            timestamp:new Date().toISOString()
        }
    );   
};  

/* Event Handlers */  

socket.on('run_mission_now', async(payload)=>{    
try{      
// Input Validation Phase       
if(!payload?.missionId){        
throw new TypeError("Mission ID required");     
}      

// Validate Mission ID format matches UUID v3/5 standard     
if(!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(payload.missionId)){         
throw new RangeError(`Invalid Mission ID format ${payload.missionId}`);     
}      

// Execute action       
const result=await scheduler.service.runMissionImmediately(payload.missionId);       
emitTaskStatusUpdate({id:result.taskInstanceId,status:'queued'});   

}catch(error){        
emitSystemError(socket,error,'mission_run_error');     
}});

/* Subscription Management */  

async function initializeSubscriptions(){   
taskUpdateSubscription=scheduler.service.taskUpdates$.subscribe({     // Assumes observable pattern here meets rx.Observable interface requirements   
next:(delta)=>{         
switch(delta.type){             
case 'status':                
emitTaskStatusUpdate(delta.task.id).catch(e=>logger.error(e));                
break;             
case 'structural_change':                
syncFullState();                
break;             
default:                
logger.warn(`Unhandled update type ${delta.type}`);         
}}}); };  

async function syncFullState(){   
try{      
const currentState=await scheduler.service.getActiveTasksSnapshot();           
socket.emit('full_state',currentState);     // Send current state snapshot whenever structural changes occur after initial load   

}catch(err){          
logger.error(`Sync failed`,err.stack||err.toString());          
emitSystemError(socket,err,'state_sync_failure');     }};

/* Initial Sync & Setup */
initializeSubscriptions();            
syncFullState();

/* Disconnection Cleanup */
socket.on('disconnect',(reason)=>{
logger.info(`${connectionLogEntry} disconnected (${reason})`));    

// Unsubscribe observables immediately upon disconnect prevent memory leaks   
taskUpdateSubscription?.unsubscribe();    

});

}); // End connection handler closure


export default () => {}; // Empty placeholder maintained due existing design patterns elsewhere - consider removing if unused elsewhere