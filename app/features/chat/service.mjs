/// ✅ [ ] Add rate limiting decorator/policy around high-frequency endpoints like sendMessage()


import { inject } from '../../../di-container';
import type { IMessage } from './types'; // Define interface contract
import config from '../../../config';
import sanitizeHtml from 'sanitize-html';

class ChatService {
  private readonly messageRepo = inject('ChatRepository');
  private readonly authGuard   = inject('AuthGuard');

  constructor(
    private roomIdGenerator?: () => string,
    public sanitizerOptions?: SanitizeOptions,
 ) {}

 /**
 * Process incoming message payload through core pipeline
 */
public async sendMessage(
   content:string,
   context:{ roomId:string; senderId:string },
 ):Promise<IMessage> {

   const sanitizedContent=this.sanitize(content);

   const newMsg ={
     id:this.generateUUID(),
     content:sanitizedContent,
     senderId:context.senderId,
     timestamp:new Date(),
     roomId:context.roomId,
   };

   await this.messageRepo.save(newMsg);

   return newMsg;
 }

 /**
 * Retrieve room history based on permissions
 */
public async getRoomHistory(roomId:string):Promise {
    const authorized=await this.authGuard.canAccessRoom(roomId);

    if(!authorized){
      throw new Error("Unauthorized");
    }

    return await this.messageRepo.getMessagesByRoom(roomId);
 }

 /**
 * Create new chat room entity & persist it
 */
public async createRoom(name?:string):Promise {
    const id=this.roomGenerator?.() || Date.now().toString();

    const created=await this.messageRepo.createRoom({
      id:id,
      name:name||"Untitled",
      createdAt:new Date(),
      ownerId:this.authGuard.currentUserId!,
 });

return created;
}

// --- PRIVATE METHODS ---
private generateUUID():string{
 return crypto.randomUUID(); // Requires node v17+
}

private sanitize(input:string):string{
 try{
 return sanitizeHtml(input,{
 ...config.sanitizeDefaults!,
 ...(this.sanitizerOptions || {}),
 });
 }catch(e){
 throw new InvalidInputError("Malformed HTML detected");
 }
}
}

export default ChatService;

interface IRoom extends Document {
 id:String;
 name:String;
 ownerId:String;
 members:Array;
}

interface IMessage extends Document {
 senderID:String;
 content:String;
 timestamp:Number|Date;
 roomId:String|ObjectID; // Depends on DB schema choice...
}