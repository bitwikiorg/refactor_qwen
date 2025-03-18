// File: app/features/scheduler/repo.mjs
import * as path from 'node:path';
import * as fsPromise from 'node:fs/promises';
import { logger } from '../../services/logger'; // Assuming centralized logging service added elsewhere

const TASK_STORAGE_ROOT = path.resolve(__dirname, '../../../data/tasks');

class TaskStorageService {

  #storageRoot;

  /**
   * Creates storage layer instance ensuring root validity upfront 
   */
  constructor(storageRootOverride?) {

    const resolvedRoot = storageRootOverride || TASK_STORAGE_ROOT;

    try {
      const statResult = fsPromise.stat(resolvedRoot)
        .then(() => true)
        .catch(() => false);

      // Synchronously verify initial state - critical safety measure!
      process.nextTick(async () => { 
        const validExistenceCheckResult 
          ?= await statResult;  

        !validExistenceCheckResult && 
          logger.error("Critical failure validating storage root", resolvedRoot);  

        !validExistenceCheckResult && 
          throw new Error("Storage root invalid");

       });

       Object.freeze(this.#storageRoot);  

     } finally{ /* ... */ }


 }

 /**
 * Ensures target subdirectory structure existence recursively
 */
 static async guaranteeSubdir(...subdirs): Promise {

   let fullPathCandidate;

   while(subdirs.length >0 ){

     fullPathCandidate=path.join(fullPathCandidate || '', subdirs.shift());

     try{
       await promiseFs.access(fullPathCandidate); continue;

     }catch(error){
         switch(error.code){
           case "ENOENT":
             logger.info(`Creating ${fullPathCandidate}`);
             return promiseFs.mkdir(fullPathCandidate,{ recursive:true });
           default:
             throw error;
         };

       };




 }

// Core Storage Operations

/**
* Lists all valid markdown documents within primary tasks collection area excluding metadata artifacts
*/
async getAllStoredDocuments(filterOptions?:{ includeNonMd:boolean }): Promise<Array<{ name:string,contentLength:number }> >{

try{

const rawEntries=(await promiseFs.readdir(this.#storageRoot,{
withFileTypes:true,
encoding:"utf8"
})).filter(entry=>entry.isFile());

return rawEntries.map(entry=>{
 return ({
 name: entry.name,
 contentLength:Number(entry.size),
 lastModified:new Date(entry.birthtimeMs || entry.atimeMs )
 })
}).filter(docEntry=>{
 return filterOptions?.includeNonMd || docEntry.name.match(/\.(?:markdown|mkdn|mkd|mk|ron)?(?:down)?\.(?:txt)?/i)?.length>0 ;
});

}catch(error){

logger.error("Failed enumerating stored documents",error.message,error.stack);

throw Object.assign(new Error(`Document listing failed`),{ cause:error });

};

}


/** @throws {Error} On non-existent resource */
async fetchDocumentContent(documentId:string | number ):Promise{

const normalizedId=documentId.toString();

try{

// Resolve canonical document identifier format handling variations

let candidatePaths=[
path.join(this.#storageRoot,normalizedId+".json"),
path.join(this.#storageRoot,normalizedId+".yaml"),
path.join(this.#storageRoot,normalizedId+".yml"),
];

for(const candidateLocation of candidatePaths){

try{

if(await promiseFs.exists(candidateLocation)){

return JSON.parse(
await promiseFs.readFile(candidateLocation,"utf-8")
);

}else continue;

}catch{}

};

throw new FileNotFoundError(`No document found matching ${normalizedId}`);

}catch(error){

logger.error("Failed fetching document",error.message,error.stack);

throw Object.assign(new DocumentRetrievalError(normalizedId),{cause:error});

};

};


/** @throws Write failures */
async persistDocument(content:any,options:{id:string,filenameSuffix?:string}):void{

options.filenameSuffix=options.filenameSuffix||".json";

try{


const sanitizedFilename=
options.id.replace(/[\\/:*?"<>|\x00-\x1F]/g,"_")+
options.filenameSuffix;

await guaranteeSubdir(sanitizedFilename.split(path.sep));

await promiseFs.writeFile(
path.join(
this.#documentStoreBase,sanitizedFilename),
JSON.stringify(content,null,"\t")
);


}catch(error){

logger.error("Write failure encountered",error.message,error.stack);

throw Object.assign(new DocumentPersistenceError(options.id,{
attemptedFile:sanitizedFilename,
contentPreview:Object.keys(content).slice(0,5)
}),{cause:error});

};
};



/** @returns True iff successfully removed */
async removeDocument(documentRef:string | number ):boolean{


try{


// Attempt deletion based on known formats

for(const suffixExtension of [".json","",""]){


const target=path.join(

this.#documentStoreBase,

String(documentRef)+suffixExtension,

);


if(await promiseFs.exists(target)){

await promiseFs.unlink(target);

return true;

};


};


}catch{}



};

}


export default class SchedulerRepo extends TaskStorageService {


constructor(){

super();

Object.freeze({
MAX_FILESIZE_LIMIT_BYTES:Number(process.env.MAX_TASK_SIZE)||5e6,
CONCURRENCY_LIMIT:Number(process.env.TASK_CONCURRENCY)||5,

});


}




/* Scheduler-specific overrides */

public scheduleNewMission(missionSpec:MissionDefinition):void {


this.guaranteeSubdir(missionSpec.folder||"missions");


}



/* Accessors */


static get systemConfig(){


return process.env.SCHEDULER_CONFIG?.split(',') ?? [];

};



}

