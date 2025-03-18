import winston from "../../infrastructure/logger"; // Assuming centralized logging system  

const DEFAULT_HISTORY_LIMIT = 50;  
const MAX_SESSION_AGE_DAYS   = 7;  

class TerminalRepository {  
  constructor() {  
    this.commandLogDB          ??= new Map(); // Fallback memory store  
    this.sessionRegistry       ??= new WeakMap();  
  }  

  /** Persists terminal session metadata */  
  async recordNewSession(sessionID) {    
    winston.info(`Recording Session ${sessionID}`);    

    try{    
      await validateSessionIDFormat(sessionID);    
      await persistToStorage({sessionID});    
      return true;    

     } catch(err){   
      winston.error("Record Session Failed:", err);   
      throw new Error("Could not register terminal session");   
     }    

     function validateSessionIDFormat(id){     
         if(!id || typeof id !== "string")     
            throw TypeError("Invalid Session ID format");     
         return id.length >=8 && /^[a-zA-Z\d]+$/.test(id);       
     };    

     async function persistToStorage(data){       
          await Promise.resolve(); // Mock persistence call point         
          return data;            
     };    

}  

/** Retrieves historical commands issued */  
async getUserCommands(userID,options={limit : DEFAULT_HISTORY_LIMIT}){        
   options.limit ||= Math.min(options.limit || DEFAULT_HISTORY_LIMIT , MAX_HISTORY_RECORDS );       

   let results=[...this.commandLogDB.values()]                
               ?.filter(cmd => cmd.userID === userID )            
               ?.sort((a,b)=> b.timestamp -a.timestamp )           
               ?.slice(0,options.limit );               

   results.forEach(r=> delete r.sensitiveData );               

return results.map(cleanResponse);                    
};                    


/** Stores executed command details */                      
async logExecutedCmd(cmdDetails={command:"",timestamp:new Date()} ){          
if(!cmdDetails.command?.trim())throw TypeError("Missing required cmd text");         
this.commandLogDB.set(generateUID(),{...cmdDetails});          
};                    


/** Soft deletes expired sessions older than threshold days */                      
async pruneOldSessions(daysAgo=MAX_SESSION_AGE_DAYS ){             
const cutoffDate=new Date().setDate(new Date().getDate()-daysAgo*1)*1000;          
for(const [key,sess]of Object.entries(this.sessionRegistry)){             
if(sess.lastActivity < cutoffDate && !sess.isPersistent ){                
delete sess[key];                 
}                
}                
};                 


/** Helper utilities ***/                     

function generateUID(){                    
return crypto.randomUUID();             

function cleanResponse(rawEntry){            
return _.pick(rawEntry,[            
"timestamp",            
"userInput",            
"outputPreview",           
"errors","durationMs"]);           
};                   

}  

/* Export singleton instance pattern */      
const TERMINAL_REPO_INSTANCE=new TerminalRepository();  

/* Public API interface */      

export const recordNewTerminalActivity=(data)=>TERMINAL_REPO_INSTANCE.logExecutedCmd(data);      

export const fetchRecentCommands=(userId,params)=>TERMINAL_REPO_INSTANCE.getUserCommands(userId,params);      

/* Prune old entries every hour automatically*/      
setInterval(TERMINAL_REPO_INSTANCE.pruneOldSessions.bind(TERMINAL_REPO_INSTANCE),MS_PER_HOUR*24).unref();      
