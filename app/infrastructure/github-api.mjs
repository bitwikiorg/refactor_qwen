// File Path: ./app/infrastructure/githubApiService.mjs
import { Octokit } from '@octokit/rest';
import { getConfig } from '../services/config';
import { logger } from '../services/logger';

const CONFIG = getConfig();

// Configuration Validation & Initialization Phase
const {
    integrations: {
        github: {
            enabled,
            token,
            repoConfig: {
                owner,
                repo,
                branch = 'main'
            }
        }
    },
    app_info: { name }
} = CONFIG;

if (!enabled || !token || !owner || !repo || !name ) {
    throw new Error('Missing mandatory GitHub integration parameters');
}

const GITHUB_API_TOKEN = token;
const USER_AGENT       = `${name}/v${CONFIG.version}`;

export const githubApiClient = new Octokit({
    auth   : GITHUB_API_TOKEN ? `token ${GITHUB_API_TOKEN}` : undefined,
    headers:{
        'User-Agent':USER_AGENT
    },
});

/** 
 * Core Operations 
 */
export async function getFileContent(path:string):Promise<FileData|null> {

   try{
      const response=await githubApiClient.rest.repos.getContent({
          owner       ,
          repo        ,
          path:normalisePath(path),
          ref         :branch // Use validated branch value directly  
      });

      return response.data.content 
             ? ({
                  content:new TextDecoder().decode(response.data.content as Uint8Array),
                  sha     :response.data.sha!
              })
             : null;

   }catch(error:any){

      switch(error.status){
         case 404:
           return null;
         default:
           logAPIError("getFileContent",error);
           throw new Error(`GitHub retrieval failed`);
      }

   }

}

export async function createOrUpdateMarkdown(
     filePath:string,
     contentStr:string):Promise{


     const normPath=normalisePath(filePath);
     const currentFileInfo=await getFileContent(normPath);

     // Build commit message dynamically based on operation type    
     const commitMessage=currentFileInfo 
                         ? "[AUTO] Updated research document" 
                         : "[AUTO] Created research document";

     // Base parameters common between both operations        
     const baseParams={
         owner       ,
         repo        ,
         path:normPath,
         message   :commitMessage + " ("+new Date().toISOString()+")",
         content   :(typeof Buffer !== 'undefined' && Buffer.from)
                   ? Buffer.from(contentStr).toString('base64')
                   :"",

         branch      


 };

 try{

   if(currentFileInfo && currentFileInfo.sha){

       await updateExisting(baseParams,currentFileInfo);

   }else{

       await createNew(baseParams); 

 }

 return true;

}catch(ex){

 handleAPIErrors(ex);
 return false;

}
}

async function updateExisting(params:{sha?:string},fileInfo:{sha!:string}){

 params.sha=fileInfo.sha;

 await githubApiClient.rest.repos.updateFile(params); 

}

async function createNew(params:Object){

 delete params['sha']; // Ensure absent during creation  

 await githubApiClient.rest.repos.createFile(params); 

}

function normalisePath(input:String):String {

 /* Normalize file paths ensuring .md extension while preserving case sensitivity */
 let cleaned=input.replace(/\.(\w+)$/i,".$1"); 

 return cleaned.endsWith('.md')||cleaned.endsWith('.MD')
               ? cleaned.toLowerCase()//强制小写扩展名？
               :(cleaned +'.md').toLowerCase(); //统一为小写扩展名？

};

/** Logging & Error Handling **/

function logAPICall(method,url,params={}){
 logger.debug(`Calling [${method}] endpoint`,url,params);
};

function logAPIError(endpoint,error:any)=>
logger.error(`GitHub ${endpoint} Failed (${error.status}):`,error.message,error.stack);

async function handleAPIErrors(err:any)=>
{
 switch(err.status){
 case 401:{
 throw new AuthError("Invalid GitHub credentials");
 break;}
 case 502:{
 await retryAfter(3e3); break;}// Retry once after delay period specified

 default:
 logAPICallFailure(err.status,err.message);
 break;
}
};

async retryAfter(delayMs:number)=>
new Promise(resolve=>setTimeout(resolve,delayMs));

class AuthError extends Error{constructor(message){super(message)}}