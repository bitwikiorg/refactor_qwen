import logger from "../../services/logger.mjs";
import { inject } from "../../../di-container";

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

export default function initializeSockets(io) {
  io.on('connection', (socket) => {
    logger.info('Client connected:', {
      id: socket.id,
      headers: socket.handshake.headers,
      address: socket.handshake.address
    });
    
    socket.on('disconnect', () => {
      logger.info('Client disconnected:', socket.id);
    });
  });
}