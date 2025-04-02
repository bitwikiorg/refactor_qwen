import { inject } from "../../services/di-container.mjs"; // Updated relative path
import { getLoggerInstance } from '../../services/logger.mjs';
import ChatService from './service.mjs';

const logger = getLoggerInstance({ module: 'ChatSocket' });
const chatService = new ChatService();

// Inject ChatService and CoreAIService
const aiService = inject("CoreAIService");

export const researchSocketHandler = (io) => {
  io.of("/research").on("connection", (researchSocket) => {
    aiService.researchProgress$.subscribe((progress) => {
      try {
        const payload = {
          stage: Number(progress.stage),
          message: String(progress.message),
        };
        researchSocket.emit("research:update", payload);

        if (progress.error?.level === "critical")
          io.emit("system-alert", progress.error);

        logger.debug(`Research update emitted ${payload.stage}`);
      } catch (err) {
        logger.error("Failed processing progress update:", err);
      }
    });

    researchSocket.on("disconnect", () =>
      aiService.abortActiveResearch(researchSocket.id),
    );
  });
};

export function initChatSocket(io) {
  const chatNamespace = io.of('/chat');
  chatNamespace.on('connection', (socket) => {
    logger.info(`Chat client connected: ${socket.id}`);

    socket.on('chat-message', async (data, callback) => {
      try {
        const response = await chatService.processChatMessage(data.message, { senderId: data.userId || 'anonymous' });
        callback({ success: true, text: response });
      } catch (error) {
        logger.error('Chat message processing error', { error: error.message });
        callback({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Chat client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}