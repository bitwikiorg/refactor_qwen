import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getLoggerInstance } from '../../services/logger.mjs'; // Fixed import path
import ChatRoutes from './routes.mjs';
import initializeSockets from './socket.mjs';

const log = getLoggerInstance({ module: 'ChatModule' }); // Fixed logger instance

async function bootstrap(app) {
  if (app.get('CHAT_MODULE_INITIALIZED')) {
    log.info('Chat module already initialized.');
    return;
  }
  app.set('CHAT_MODULE_INITIALIZED', true);

  const config = {}; // Replace with actual config loading

  app.set('CHAT_CONFIG', config);

  // Ensure sockets are initialized only once.
  if (app.io && !app.get('SOCKET_INITIALIZED')) {
    initializeSockets(app.io);
    app.set('SOCKET_INITIALIZED', true);
  }

  app.use('/api/v1/chats', ChatRoutes);

  return {
    service: {},
    router: ChatRoutes,
  };
}

function initializeCoreAI(app) {
  const router = Router();
  router.post('/api/chat', (req, res) => {
    res.json({ status: 'success', message: 'Chat request received' });
  });
  app.use(router);
  log.info('Chat module initialized');
  return true;
}

export default {
  initializeCoreAI,
  bootstrap,
  getDefaultRoomId: () => randomUUID(),
  configure: () => { /* Configure implementation */ } // Removed unused `options` parameter
};

export { bootstrap, initializeCoreAI };