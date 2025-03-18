import { getLoggerInstance } from '../../services/logger.mjs';

const logger = getLoggerInstance({ module: 'Terminal' });

class TerminalService {
  constructor() {
    this.sessions = new Map();
  }

  createSession(id) {
    logger.debug(`Creating terminal session: ${id}`);
    // Implementation for creating terminal session
    return { id, created: new Date() };
  }

  closeSession(id) {
    logger.debug(`Closing terminal session: ${id}`);
    // Implementation for closing session
    return true;
  }

  async processCommand(data) {
    logger.info(`Processing command: ${data.cmd}`);
    //Implementation to process command
    return { result: 'Command processed' };
  }
}

const service = new TerminalService();

const init = (app, io) => {
  logger.info('Initializing Terminal service');

  // Register routes
  app.get('/api/terminal/status', (req, res) => {
    res.json({ status: 'operational' });
  });

  app.get("/api/v1/console", (_, res) => {
    res.render("views/partials/console.e js", 
                { page_title: "Advanced Terminal Interface",
                  system_version: process.env.SYSTEM_VERSION || "2.x" });
  });

  const terminalNamespace = io?.of("/console") ?? null;

  terminalNamespace?.on("connection", socket => {
    logger.info(`[CONNECTION] Terminal client ${socket.id} connected`);

    socket.on("command_received", async data => {
        try {
            const result = await service.processCommand(data);
            socket.emit("response", result);
        } catch(err){
            logger.error(`Command Error ${data.cmd}:`, err.message);
            socket.emit("error_response", err.message);
        }
    });

    // Graceful disconnection handler    
    socket.on('disconnect', () => 
        logger.info(`[DISCONNECT] Client ${socket.id}`));
  });

  return service;
};

export default {
  init,
  service
};