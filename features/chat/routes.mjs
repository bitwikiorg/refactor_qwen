import { Router } from 'express';
import type { RequestHandler } from 'express'; // For typing middlewares
import logger from '../../../services/logger';

// --- EXPORTED ROUTER INSTANCE ---
const chatRouter = Router();

// --- HELPER MIDDLEWARES ---
const validateMessageBody: RequestHandler = async (req,res,next)=>{
 try{
   const content=req.body?.content;
   if(!content || typeof content!=='string') throw new Error("Invalid message format");

   res.locals.sanitizedContent= sanitizeInput(content);

 }catch(e){
   next(e); // Handled downstream through global error handler later 
 }
};

function sanitizeInput(input:string):string{
 return input.replace(/<script>/gi,''); // Basic XSS mitigation example - replace w/full library implementation!
}

// --- ENDPOINTS ---

chatRouter.get('/chat', async (_req,_res)=>{
 _res.render('chat');
});

chatRouter.post('/meta',async(req,res)=>{
 try{
    const metadata= await req.container?.chatService.getMetadata();
    res.json({ success:true,data:Object.fromEntries(metadata)});
 }catch(err){
    next(err); // Assume global error handler exists now - remove custom local handlers!
 }
});

/* Message sending */
chatRouter.post(
 '/send',
 validateMessageBody,
 async(req,res,next)=>{ 
 try{
    await req.container!.chatService.sendMessage({
      content:req.locals.sanitizedContent,
      userId:req.user?.id || 'anonymous',
      timestamp:new Date()
     });

     res.sendStatus(204);
 }catch(error){
     next(error);
 }
});

/* Message retrieval */
chatRouter.get(
 '/', 
 async(req,res,next)=>{  
 try{
    const query=req.query.q||'';  
    const messages=await req.container!.chatService.findMessages(query.toString());

    res.json(messages.map(m=>({...m,id:m._id.toHexString()})));
}catch(err){next(err)}
}
);

export default chatRouter;