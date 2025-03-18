// app/features/brave (socket.io)
import { io } from "../../../infrastructure/socket.mjs";
import TerminalService from "./service.mjs"; 

// Initialize services
const terminalService = new TerminalService();

// Socket event handlers
export function setupSocketHandlers(socket) {
  socket.on('terminal:command', async (data) => {
    try {
      const result = await terminalService.executeCommand(data.command);
      socket.emit('terminal:response', { id: data.id, result });
    } catch (error) {
      socket.emit('terminal:error', { id: data.id, error: error.message });
    }
  });
}

// Export initialization function
export function initializeSocket(server) {
  const socketServer = io(server);

  socketServer.on('connection', (socket) => {
    console.log('Client connected to terminal service');
    setupSocketHandlers(socket);
  });

  return socketServer;
}