import uuidv4 from "uuid";
import sanitizeHtml from "sanitize-html";
import ChatService from './service.mjs';
import createLoggerInstance from '../../services/logger';

const chatLogger = createLoggerInstance({ module: 'chat' });

const SESSION_CLEANUP_INTERVAL = process.env.SESSION_CLEANUP_INTERVAL || 300000;

let cleanupInterval;

export const chatNamespaceHandler = async (ioContainer = {}) => {

  const aiService = await ioContainer.get('CoreAIService');
  const chatService = new ChatService();

  // Session cleanup mechanism  
  cleanupInterval && clearInterval(cleanupInterval); // prevent interval stacking

  cleanupInterval = setInterval(async () => {
    try {
      const expiredSessionsIds =
        Object.values(aiService.sessions)
          .filter(s => Date.now() - s.timestamp > SESSION_CLEANUP_INTERVAL * 1000)
          .map(s => s.sessionId);

      await Promise.all(expiredSessionsIds.map(sid =>
        saveSessionHistory(sid).catch(e => {
          chatLogger.error(`Cleanup failed session ${sid}:`, e);
          throw e;
        })
      ));
    } catch (err) {
      console.log(err); // Should log properly using our system loggers here 
    }
  }, SESSION_CLEANUP_INTERVAL);

  async function saveSessionHistory(sessionId) {
    try {
      await aiService.saveSessionHistory(sessionId);
      delete aiService.sessions[sessionId];
      chatLogger.info(`Archived session ${sessionId}`);
    } catch (e) {
      throw new Error(`Archive failure ${sessionId}: ${e.message}`);
    }
  }


};

// Primary initialization entry point  
export async function initialize(io) {

  await chatNamespaceHandler({ get: (id) => inject(id) });

  io.on("connection", mainConnectionHandler);

}

async mainConnectionHandler(socket){

}