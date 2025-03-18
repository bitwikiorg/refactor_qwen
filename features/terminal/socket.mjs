import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as logger from '../../services/logger'; // Use ES6 import syntax

// Type definitions
export type CommandResult = {
  output?: string;
  exitCode?: number;
  error?: Error;
};

// Centralized constants
const MAX_COMMAND_HISTORY = 1000;
const PROCESS_KILL_TIMEOUT_MS = 2000;

class TerminalSocketManager {
    private ioNamespace!: SocketIO.Namespace;

    constructor(
        private io: SocketIO.Server | SocketIO.Namespace,
        private diContainer?: Record<string, any>
    ) {}

    public async initialize() {
        const namespacePath = '/terminal';
        const namespace = this.io.of(namespacePath);

        // Configure heartbeat monitoring
        namespace.adapter.set('heartbeat interval', 30_000);

        // Setup error handling middleware
        namespace.use((socket:any,next)=>{
            try{
                validateSession(socket.handshake.auth);
                next();
            }catch(e){
                next(new Error("Unauthorized terminal access"));
            }
         });

         this.ioNamespace=namespace;

         // Event binding happens here 
         await this.bindEventHandlers();

         return namespacePath;
    }

    protected bindEventHandlers() {
         const log=this.getContainerLogger();

         this.ioNamespace.on('connection', (socket) => {

             const sessionId=uuidv4();
             log.info(`Connection established`,{sid:sessionId});

             // Per-connection state management 
             const sessionState={
                 activeProcesses:new Map<string,PtyProcess>(),
                 lastCommandTime:new Date(),
                 sessionID:sessionId,
                 maxConcurrentCmds:this.diContainer?.maxConcurrentCommands ||5,
             };

            /* Command Execution Pipeline */
            socket.on('exec',async(data)=>{
                try{
                    await validateCommandRequest(data); 

                    if(sessionState.activeProcesses.size >= sessionState.maxConcurrentCmds){
                        throw new Error("Too many concurrent executions");
                    }

                    await executeShellCommand({
                        ...data,
                        sid:data.sessionId||sessionID,
                        cmdId:data.cmdId||uuidv4()
                     },sessionState);
                }catch(err){
                   sendError(socket,err,data?.cmdId||"unknown");
                   log.error(`Execution failed ${data?.cmd}`,err);
                }
            });

            /* Process Cancellation */
            socket.on('cancel',(data)=>{
                const pid=data.pid;

                if(!pid || !sessionState.activeProcesses.has(pid)){
                   return sendError(socket,new Error("Invalid PID"),data.cmdId)
                }

               killProcess(pid).then(()=>{
                  sendResponse(socket,{
                      type:'cancelled',
                      pid:data.pid!,
                      cmd:data.command!,
                  });
              }).catch(log.error);
          });

          /* Cleanup routines */
          ['disconnect','error'].forEach(event=>{
              socket.on(event,(reason)=>{
                  cleanupSession(sessionState); 
                  log.info(`Session terminated ${event} (${reason})`);
              });
          });  
      });
  }

  private async executeShellCommand(cmdData:{command:string,pid:string},state):Promise<void>{
      return new Promise((resolve,reject)=>{    
          try{
              validateExecutable(cmdData.command);

              const process=spawn(cmdData.command,{
                  shell:true,
                  stdio:['pipe','pipe','pipe'],
                  env:{
                      ...process.env,
                      TERM:"xterm-256color",
                      FORCE_COLOR:"1"
                  },
              });

              state.activeProcesses.set(cmdData.pid!,process);

              process.stdout.pipe(createStreamTransformer(
                   data=>sendOutputUpdate(socket,'stdout',{...cmdData,output:data}),
                   {encoding:'utf8'}
               ));

               process.stderr.pipe(createStreamTransformer(
                   data=>sendOutputUpdate(socket,'stderr',{...cmdData,output:data}),
                   {encoding:'utf8'}
               ));

               let timeout=null;

               process.once('exit',(code)=>{
                     clearTimeout(timeout); 
                     cleanupProcess(state,pid); 

                     sendCompletionMessage(code,{
                         sid:parsed.sid!,
                         cid:parsed.cid!
                     });

                     resolve();
                 });

                 timeout=setTimeout(()=>{
                       killProcess(process.pid!).then(()=>{
                           reject(new TimeoutError("Command execution exceeded allowed duration"));
                       })
                 },this.diContainer?.executionTimeoutMS ||3_6e5)

          }catch(err){
            reject(err)
          }
      })
  }

  private getContainerLogger():logger.LoggerInstance{
     return (
         this.diContainer?.logger ??
         logger.getLogger('TerminalSocket',{
             tags:['component']
         })
     );
  }
}

/* Exported API */
export default class TerminalSocketInitializer extends TerminalSocketManager {
    constructor(...args) { super(...args) }

    static async create(io,options={}){        
       return new TerminalSocketInitializer(io,options.container).initialize();
    }
}

/* Utility Functions */

function createStreamTransformer(handler,options={encoding:'utf8'}):NodeJS.WritableStream{
return new stream.Writable({
    write(chunk,_enc,callback){        
      handler(chunk.toString(options.encoding));
      callback();
    },
});
}

async function killProcess(pid:number|string):Promise{
try{
await promisify(process.kill)(pid,'SIGTERM');
return true;
}catch(e){
try{await promisify(process.kill)(pid,'SIGKILL');}
finally{return false;}
}
}

function cleanupSession(state:ObjectLiteral){    
 Object.values(state.activeProcesses.values()).forEach(p=>p.kill());
 state.activeProceses.clear(); 
}

function validateExecutable(command:string):void|never{    
if(!/[a-zA-Z]/i.test(command.split(/\s+/)[1])){
throw new SyntaxError("Invalid executable format");
}
if(command.includes('|') || command.includes(';')){
throw new SecurityError("Disallowed shell operators detected")
}
}


/** Validation Middlewares **/

interface ICommandRequest extends Partial<Record<string,string>>{}

async function validateCommandRequest(req:ICommandRequest):Promise{

const requiredFields=['command','cid'];
requiredFields.forEach(f=>{
if(!req[f]) throw new TypeError(`Missing required field ${f}`);
});

// Rate limiting check example hook point:
/*
if(await rateLimiter.checkExceedsLimit(req.clientIP)){
throw new TooManyRequestsError()
}*/

validateSecurityConstraints(req.command!);
}

function validateSecurityConstraints(input:string):void|never{   
input=input.trim().toLowerCase();

// Basic regex blacklisting patterns:
for(const pattern of [/<\?php/, /rm -rf/, /sudo /]){
if(pattern.test(input)){
throw new SecurityError(`Disallowed pattern detected`);
}
}   
}  
import { getLogger } from '../../services/logger.mjs';

const log = getLogger('TerminalSocket');

export function initTerminalSocket(io) {
  // Check if namespace already exists to prevent multiple initializations
  if (io._nsps && io._nsps.has("/terminal")) {
    return io.of("/terminal");
  }

  const terminalNamespace = io.of("/terminal");

  terminalNamespace.on('connection', (socket) => {
    log.info(`Terminal client connected: ${socket.id}`);

    // Handle terminal command execution
    socket.on('terminal:command', (data) => {
      log.debug(`Received terminal command: ${data.command}`);

      // Process command and send response
      socket.emit('terminal:response', {
        id: data.id,
        output: `Executed: ${data.command}`,
        status: 'success'
      });
    });

    // Handle system messages
    socket.on('terminal:system', (message) => {
      log.debug(`System message: ${message}`);
      socket.broadcast.emit('terminal:system', message);
    });

    socket.on('disconnect', () => {
      log.info(`Terminal client disconnected: ${socket.id}`);
    });
  });

  log.info('Terminal socket handlers initialized');
}

export default {
  initTerminalSocket
};