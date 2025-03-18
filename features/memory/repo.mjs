import path from 'path';
import { promises as fsp } from 'fs';
import logger from '../../services/logger';

// Constants & Types  
const DEFAULT_STORAGE_ROOT = './data/memories/';
const LAYER_DIRECTORIES = [
  'short-term',
  'long-term',
  'episodic',
  'semantic',
  // ... others mapped consistently...
];

/** Memory Repository Class */
export default class MemoryRepository {
  #basePath;
  #initialized = false;
  #cache = new Map();

 /**
 * @param {{storageRoot:string}} config Configuration Options
 */
constructor(config={}) {
 const validatedStorageRoot =
    config?.storageRoot ??
    process.env.MEMORY_STORAGE_PATH ??
    DEFAULT_STORAGE_ROOT;

 this.#basePath =
   path.isAbsolute(validatedStorageRoot)
     ? validatedStorageRoot
     : path.join(process.cwd(), validatedStorageRoot);
}

/** Initialize Storage Structure */
async initialize() {
 try {

 const dirsToCreate = LAYER_DIRECTORIES.map(
   dir => path.join(this.#basePath!, dir)
 );

 await Promise.all(
   dirsToCreate.map(async dir => {
     await fsp.mkdir(dir!, { recursive: true });
 })
 );

 // Preload caches explicitly requested layers
 await Promise.all([
    this.preloadLayer('short-term'),
 ]);

 return true;

 } catch(err){
 throw new Error(`Initialization Failed ${err.message}`);
 }
}

/** Save Memory Entry */
async saveEntry(entry:{type:string}, opts={}) {

 const validationErrors=[];
 ['type','content'].forEach(key=>{
      if(!entry[key]) validationErrors.push(key);
 });

 if(validationErrors.length>0){
 throw new Error(`Missing required fields ${validationErrors}`);
 }

 const targetDirectory =
      entry.type.replace(/-/g,'_').toLowerCase();

 const filePath=
      `${this.#basePath}/${targetDirectory}/` +
      `${Date.now()}_${Math.random().toString(36).slice(2)}.json`;

 try{

    await fsp.writeFile(filePath,
       JSON.stringify(entry,null,'\t')
       ,{flag:'wx'}); // fail silently prevents overwrites

    return filePath;

}catch(e){

 switch(e.code){
 case'EEXIST':
 case'EACCES': return false; // handle gracefully...
 default:
 throw e;
 }

}
}

/** Load All Entries For A Layer */
async loadEntries(type='short-term'){

 let results=[];
 const targetFolder=
        `${this.#basePath}/${type.replace(/-/g,'_')}`;

 try{

 results=await Promise.all(
          (
            await fsp.readdir(targetFolder,{
              encoding:'utf8',withFileTypes:true})
          )
          .filter(dirent=>dirent.isFile())
          .map(async dirent=>{
             return JSON.parse(
               await fsp.readFile(
                 dirent.path!,
                 {encoding:'utf8'}
               )
             );
           })
         );

 }catch(err){
 logger.error('Failed loading:',err);
 }

 return results.filter(r=>r!==null);
}

/** Cleanup Old Entries */
async cleanup(daysOld=7){

 const cutoff=new Date();
 cutoff.setDate(cutoff.getDate()-daysOld);

 let deletedCount=0;

 for(const layerName of LAYER_DIRECTORIES){

 const layerPath=path.resolve(this.#basePath!,layerName);

 try{

     const entries=(await fsp.readdir(layerPath,{
       encoding:"utf-8",
       withFileTypes:true,
     })).filter(dirent=>dirent.isFile());

     deletedCount += (
         await Promise.all(entries.map(async dirent=>{
           let stats='';
           try{ stats=await dirent.stat(); }
           catch(e){return false;}

           if(stats.mtime < cutoff ){
              deleteFromCache(dirent.name); 
              return Boolean(await deleteFile(dirent.path));
            }
            else{return false;}
         }))
        ).filter(Boolean).length;

 }catch(err){}
 }

 return deletedCount;
}

// Helper Methods /////////////////////////////////
#deleteFromCache(filename:string):void{
// implement cache eviction logic based on filename key pattern...
}
#deleteFile(filePath:string):Promise<boolean>{
return new Promise((resolve,reject)=>{
fsp.unlink(filePath)
.then(()=>{
 resolve(true);
}).catch(reject);
});
}
//////////////////////////////////////////////////

get initialized(){return Boolean(this.#initialized);}
};
