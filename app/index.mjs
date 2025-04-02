/* global process */
import * as path from 'path';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { classifyToken } from './features/token_classifier/index.mjs';
import { processChatMessage } from './features/chat/service.mjs';
import { processResearchQuery } from './features/research/service.mjs';
// import { retrieveMemory, storeMemory } from './features/memory/service.mjs'; // Fix missing imports
import { handleErrors } from './infrastructure/error-handler.mjs'; // Fix missing import

dotenv.config();

// Ensure process is defined
if (typeof process === 'undefined') {
  globalThis.process = {
    env: {
      PORT: 3000,
      NODE_ENV: 'development',
    },
    exit: (code) => console.log(`Process exited with code ${code}`),
  };
}

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import existing services
import { getLoggerInstance } from './services/logger.mjs';
import { loadModule } from './services/di-container.mjs';
import MemorySystem from './features/memory/service.mjs';

// Fix missing import for `join`
const { join } = path;

// Create app and server instances
const app = express();
const server = http.createServer(app);
// Initialize logger first
const loggerInstance = getLoggerInstance({ module: 'Core' });

// Ensure static files are served correctly
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/js', express.static(__dirname + '/public/js'));

// Create a single Socket.IO instance and prevent redundant initialization
let io = null;
const socketMaxPayload = Number(process.env.SOCKET_MAX_PAYLOAD || 1e7);
function getSocketIO() {
  if (!io) {
    try {
      io = new SocketIOServer(server, {
        cors: {
          origin: ['https://trusted-domain.com'], // Restrict to trusted domains
          methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        connectTimeout: 60000,
        // Limit reconnection attempts
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000, 
        reconnectionDelayMax: 5000,
        maxHttpBufferSize: socketMaxPayload, // Use socketMaxPayload here
      });
      
      // Set up connection event handlers
      io.on('connection', (socket) => {
        loggerInstance.info('Client connected', { socketId: socket.id });
        
        socket.on('disconnect', (reason) => {
          loggerInstance.info('Client disconnected', { socketId: socket.id, reason });
        });
        
        socket.on('error', (error) => {
          loggerInstance.error('Socket error', { socketId: socket.id, error: error.message });
        });
      });
      
      loggerInstance.info('Socket.IO initialized');
    } catch (error) {
      loggerInstance.error('Socket.IO initialization failed', { error: error.message });
      throw error; // Ensure the error propagates to prevent silent failures
    }
  }
  return io;
}
io = getSocketIO();

const getVersion = () => (typeof process !== 'undefined' && process.env.APP_VERSION) || '2.0.0';

// Apply version header middleware
app.use((req, res, next) => {
  res.setHeader('X-Core-Version', getVersion());
  next();
});

app.post('/api/token/classify', express.json(), async (req, res) => {
  const { input } = req.body;
  if (!input) {
    loggerInstance.warn('Missing input in /api/token/classify');
    return res.status(400).json({ success: false, error: 'Input is required' });
  }
  try {
    const result = await classifyToken(input);
    res.json({ success: true, classification: result });
  } catch (error) {
    loggerInstance.error('Error in /api/token/classify', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/token/classify/single', express.json(), async (req, res) => {
  const { token } = req.body;
  if (!token) {
    loggerInstance.warn('Missing token in /api/token/classify/single');
    return res.status(400).json({ success: false, error: 'Token is required' });
  }
  try {
    const result = await classifyToken(token);
    res.json({ success: true, classification: result });
  } catch (error) {
    loggerInstance.error(`Error in /api/token/classify/single: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/chat', express.json(), async (req, res) => {
  const { message } = req.body;
  try {
    const response = await processChatMessage(message);
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/research', express.json(), async (req, res) => {
  const { query } = req.body;
  try {
    const response = await processResearchQuery(query);
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update the /self route to render the appropriate view (e.g., self.ejs)
app.get('/self', (req, res) => {
  res.render('self', { title: 'Self-Management' });
});

app.use(handleErrors);

// Start server function
async function startServer() {
  // Initialize main application routes
  const { default: routes } = await import('./routes.mjs');
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use(express.static(path.join(__dirname, 'app/public')));

  // Setup view engine if using templates
  app.set('views', path.join(__dirname, 'views')); // Corrected views directory path
  app.set('view engine', 'ejs'); // Assuming EJS as the template engine

  // Use routes from routes.js
  app.use(routes);

  loggerInstance.info('Main application routes initialized');

  // Load modules dynamically
  const AuthModulePath = path.join(
    __dirname,
    'features',
    'auth',
    'index.mjs',
  );
  const ChatModulePath = path.join(
    __dirname,
    'features',
    'chat',
    'index.mjs',
  );
  const TerminalModulePath = path.join(
    __dirname,
    'features',
    'terminal',
    'index.mjs',
  );
  const BraveModulePath = path.join(
    __dirname,
    'features',
    'plugins',
    'brave',
    'index.mjs',
  );
  const ResearchAPIPath = path.join(
    __dirname,
    'features',
    'research',
    'index.mjs',
  );
  const SchedulerPath = path.join(
    __dirname,
    'features',
    'scheduler',
    'index.mjs',
  );

  // Load modules with error handling
  let AuthModule,
    ChatModule,
    TerminalModule,
    BraveModule,
    ResearchAPI,
    Scheduler;

  // Add utility for module loading with logging
  async function loadModuleWithLogging(modulePath, moduleName) {
    try {
      const module = await loadModule(modulePath);
      loggerInstance.info(`${moduleName} module loaded successfully`);
      return module;
    } catch (err) {
      loggerInstance.error(`Failed to load ${moduleName} module: ${err.message}`, {
        stack: err.stack,
        code: err.code,
      });
      throw err; // Ensure the error propagates to prevent partial initialization
    }
  }

  // Example usage for loading modules
  AuthModule = await loadModuleWithLogging(AuthModulePath, 'Auth');
  ChatModule = await loadModuleWithLogging(ChatModulePath, 'Chat');
  TerminalModule = await loadModuleWithLogging(TerminalModulePath, 'Terminal');
  BraveModule = await loadModuleWithLogging(BraveModulePath, 'Brave');
  ResearchAPI = await loadModuleWithLogging(ResearchAPIPath, 'Research');
  Scheduler = await loadModuleWithLogging(SchedulerPath, 'Scheduler');

  if (ResearchAPI?.initResearchModule) {
    loggerInstance.info('Initializing Research module');
    try {
      await ResearchAPI.initResearchModule(
        app,
        io,
        {
          reSearch: {
            defaultDepth: 2,
            defaultBreadth: 2,
          },
        },
        {
          resolve: (name) => {
            if (name === 'logger') return loggerInstance;
            return null;
          },
          bindSingleton: () => {},
        },
      );
    } catch (err) {
      loggerInstance.error('Failed to initialize Research module:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
      });
    }
  }

  if (BraveModule?.default) {
    loggerInstance.info('Initializing Brave module');
    try {
      BraveModule.default.init(app, io);
    } catch (err) {
      loggerInstance.error('Failed to initialize Brave module:', {
        message: err.message,
        stack: err.stack,
      });
    }
  }

  if (ChatModule) {
    loggerInstance.info('Initializing Chat module');
    if (typeof ChatModule.initializeCoreAI === 'function') {
      try {
        ChatModule.initializeCoreAI(app);
      } catch (err) {
        loggerInstance.error('Failed to initialize Chat module:', {
          message: err.message,
          stack: err.stack,
        });
      }
    } else {
      loggerInstance.warn('ChatModule.initializeCoreAI is not a function');
    }

    if (io) {
      try {
        const chatSocketPath = join(__dirname, 'app', 'features', 'chat', 'socket.mjs');
        const ChatSocket = await loadModule(chatSocketPath);
        if ((ChatSocket?.default?.init || ChatSocket?.init) && io) {
          const initFn = ChatSocket?.default?.init || ChatSocket?.init;
          if (typeof initFn === 'function') {
            initFn(io.of('/chat'));
            loggerInstance.info('Chat sockets initialized');
          }
        } else {
          loggerInstance.warn('Chat socket initialization skipped - Socket.IO not available');
        }
      } catch (error) {
        loggerInstance.error(`Failed to initialize Chat socket handlers: ${error.message}`, {
          stack: error.stack,
        });
      }
    }
  }

  if (TerminalModule?.default) {
    loggerInstance.info('Initializing Terminal module');
    try {
      TerminalModule.default.init(app, io);
    } catch (err) {
      loggerInstance.error('Failed to initialize Terminal module:', {
        message: err.message,
        stack: err.stack,
      });
    }

    try {
      const terminalSocketPath = join(__dirname, 'app', 'features', 'terminal', 'socket.mjs');
      const TerminalSocket = await loadModule(terminalSocketPath);
      if (TerminalSocket?.initTerminalSocket && io) {
        TerminalSocket.initTerminalSocket(io);
        loggerInstance.info('Terminal socket handlers initialized');
      } else {
        loggerInstance.warn('Terminal socket initialization skipped - Socket.IO not available');
      }
    } catch (error) {
      loggerInstance.error(`Failed to initialize Terminal socket handlers: ${error.message}`, {
        stack: error.stack,
      });
    }
  }

  // Initialize core modules
  if (AuthModule?.default) {
    loggerInstance.info('Initializing Auth module');
    AuthModule.default.init(app);
  }

  if (MemorySystem) {
    loggerInstance.info('Initializing Memory System');
    const memoryInit = MemorySystem.default?.init || MemorySystem.init;

    // Define the getCoreMemoryAi function
    const getCoreMemoryAi = (opts = {}) => {
      return {
        model_id: opts.model_id || 'mem_short_terminator_9000',
        parameters: {
          temperature: Number(process.env.MEM_TEMP) || 0.7,
          max_tokens: Number(process.env.SHORT_TERM_TOKENS) || Math.floor(266),
          ...opts.parameters,
        },
      };
    };

    if (typeof memoryInit === 'function') {
      memoryInit({
        layers: [
          {
            key: 'shortTerm',
            maxSize: (2 * 5) ** 2,
            iOptionsResolver: {
              ['ai-settings']: getCoreMemoryAi({
                model_id: 'mem_short_terminator_9000',
                parameters: {
                  temperature: Number(process.env.MEM_TEMP) || 0.7,
                  max_tokens:
                    Number(process.env.SHORT_TERM_TOKENS) || Math.floor(266),
                },
              }),
            },
          },
        ],
        maintenance: Object.assign(
          {
            autoConsolidate: process.env.AUTO_CONSOLIDATE === 'true',
            consolidationThreshold: Number(
              process.env.CONSOLIDATION_THRESHOLD || 0.8,
            ),
          },
          typeof window !== 'object'
            ? {
              databaseSyncInterval: Number(
                process.env.MEM_DB_SYNC_INTERVAL || 3e5,
              ),
            }
            : {},
        ),
      });
    }
  }

  if (typeof process !== 'undefined') {
    const port = Number(process.env.PORT || 3000);
    const maxConcurrentJobs = Number(process.env.MAX_CONCURRENT_JOBS || 5);
    const extraCrons = process.env.EXTRA_CRONS?.split(',').map((c) => c.trim()) || [];

    // Use these variables where needed
    // Example: Fixing Scheduler initialization
    if (Scheduler?.default) {
      loggerInstance.info('Initializing Scheduler');
      const schedulerInstance = Scheduler.default.getSchedulerInstance();
      if (schedulerInstance && schedulerInstance.initialize) {
        schedulerInstance.initialize();

        if (schedulerInstance.start) {
          schedulerInstance.start({
            cronJobs: [
              {
                '* * * *': () => loggerInstance.info('Heartbeat'),
                priority: 'critical',
              },
              ...(typeof process !== 'undefined' ? extraCrons : []),
            ],
            concurrencyLimit: typeof process !== 'undefined' ? maxConcurrentJobs : 5,
            retryPolicy: schedulerInstance.getRetryPolicyFromEnv?.() ?? { maxRetries: 3 },
          });
        }
      }
    }

    // Set up basic error handler
    app.use((err, req, res, next) => {
      if (res && typeof res.status === 'function' && !res.headersSent) {
        res.status(err.status || 500).json({
          error: err.message || 'Internal Server Error',
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        });
      } else {
        loggerInstance.error('Error handler failed:', {
          error: err.message,
          stack: err.stack,
          resExists: !!res,
          resHasStatusMethod: res && typeof res.status === 'function',
        });

        if (next && typeof next === 'function') {
          next(err);
        }
      }
    });

    // Start the server
    try {
      server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        loggerInstance.info(
          `\x1b[36mCOREAI v${getVersion()} operational\x1b[0m at http://localhost:${port}`
        );
      });

      loggerInstance.info('Server started', {
        port,
        environment: (typeof process !== 'undefined' && process.env.NODE_ENV) || 'development',
      });
    } catch (startErr) {
      loggerInstance.fatal('Failed to start server', { error: startErr.message });
      // Use setTimeout to allow logging to complete before exiting
      setTimeout(() => process.exit(1), 100);
    }
  }
}

// Bootstrap the application
startServer().catch((err) => {
  loggerInstance.fatal(`FATAL STARTUP ERROR: ${err.message}`, {
    stack: err.stack,
    code: err.code || 'UNKNOWN',
    details: err,
  });
  if (typeof process !== 'undefined') {
    setTimeout(() => process.exit(err.status ?? 2), 100);
  }
});

// Add global error handlers
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    loggerInstance.fatal('Uncaught Exception:', {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    loggerInstance.error('Unhandled Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : null,
      promise,
    });
  });
}

// Enhance Socket.IO error logging
io.on('error', (error) => {
  loggerInstance.error('Socket.IO Error:', {
    message: error.message,
    stack: error.stack,
  });
});

async function testVeniceIntegration() {
  try {
    const veniceService = await import('./infrastructure/venice-api.mjs').then(mod => mod.default.createInstance());
    const response = await veniceService.standardChat('Test prompt');
    loggerInstance.info(`Test response from Venice: ${response}`);
  } catch (error) {
    loggerInstance.error('Error during Venice test call:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

testVeniceIntegration();

// Export app and io for external use to prevent unused variable warnings
export { app, io };
