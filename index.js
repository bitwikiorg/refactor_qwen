import * as path from "path";
import * as process from "process";
import * as fs from "fs/promises";
import { join } from "path";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { fileURLToPath } from "url";

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import existing services
import { getLoggerInstance } from "./app/services/logger.mjs";
import { loadModule } from "./app/services/di-container.mjs";
import MemorySystem from "./app/features/memory/service.mjs";

// Create app and server instances
const app = express();
const server = http.createServer(app);
// Initialize logger first
const loggerInstance = getLoggerInstance({ module: "Core" });

// Create a single Socket.IO instance and prevent redundant initialization
let io = null;
function getSocketIO() {
  if (!io) {
    try {
      io = new SocketIOServer(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
        pingTimeout: 60000,
        connectTimeout: 60000,
        // Limit reconnection attempts
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000, 
        reconnectionDelayMax: 5000,
      });
      
      // Set up connection event handlers
      io.on('connection', (socket) => {
        loggerInstance.info(`Client connected: ${socket.id}`);
        
        socket.on('disconnect', (reason) => {
          loggerInstance.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        });
        
        socket.on('error', (error) => {
          loggerInstance.error(`Socket error for ${socket.id}: ${error.message}`);
        });
      });
      
      loggerInstance.info("Socket.IO initialized successfully");
    } catch (error) {
      loggerInstance.error(`Failed to initialize Socket.IO: ${error.message}`);
    }
  }
  return io;
}
io = getSocketIO();

const getVersion = () => process.env.APP_VERSION || "2.0.0";

// Apply version header middleware
app.use((req, res, next) => {
  res.setHeader("X-Core-Version", getVersion());
  next();
});

// Start server function
async function startServer() {
  // Initialize main application routes
  const { default: routes } = await import("./app/routes.js");
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use(express.static(path.join(__dirname, "app/public")));

  // Setup view engine if using templates
  app.set("views", path.join(__dirname, "app/views"));
  app.set("view engine", "ejs"); // Assuming EJS as the template engine

  // Use routes from routes.js
  app.use(routes);

  loggerInstance.info("Main application routes initialized");

  // Load modules dynamically
  const AuthModulePath = path.join(
    __dirname,
    "app",
    "features",
    "auth",
    "index.mjs",
  );
  const ChatModulePath = path.join(
    __dirname,
    "app",
    "features",
    "chat",
    "index.mjs",
  );
  const TerminalModulePath = path.join(
    __dirname,
    "app",
    "features",
    "terminal",
    "index.mjs",
  );
  const BraveModulePath = path.join(
    __dirname,
    "app",
    "features",
    "brave",
    "index.mjs",
  );
  const ResearchAPIPath = path.join(
    __dirname,
    "app",
    "features",
    "research",
    "index.mjs",
  );
  const SchedulerPath = path.join(
    __dirname,
    "app",
    "services",
    "scheduler.mjs",
  );

  // Load modules with error handling
  let AuthModule,
    ChatModule,
    TerminalModule,
    BraveModule,
    ResearchAPI,
    Scheduler;

  try {
    AuthModule = await loadModule(AuthModulePath);
    loggerInstance.info("Auth module loaded successfully");
  } catch (err) {
    loggerInstance.error(`Failed to load Auth module: ${err.message}`);
  }

  try {
    ChatModule = await loadModule(ChatModulePath);
    loggerInstance.info("Chat module loaded successfully");
  } catch (err) {
    loggerInstance.error(`Failed to load Chat module: ${err.message}`);
  }

  try {
    TerminalModule = await loadModule(TerminalModulePath);
    loggerInstance.info("Terminal module loaded successfully");
  } catch (err) {
    loggerInstance.error(`Failed to load Terminal module: ${err.message}`);
  }

  try {
    BraveModule = await loadModule(BraveModulePath);
    loggerInstance.info("Brave module loaded successfully");
  } catch (err) {
    loggerInstance.error(`Failed to load Brave module: ${err.message}`);
  }

  try {
    ResearchAPI = await loadModule(ResearchAPIPath);
    loggerInstance.info("Research API module loaded successfully");
  } catch (err) {
    loggerInstance.error(`Failed to load Research API module: ${err.message}`);
  }

  try {
    Scheduler = await loadModule(SchedulerPath);
    loggerInstance.info("Scheduler module loaded successfully");
  } catch (err) {
    loggerInstance.error(`Failed to load Scheduler module: ${err.message}`);
  }

  // Initialize core modules
  if (AuthModule?.default) {
    loggerInstance.info("Initializing Auth module");
    AuthModule.default.init(app);
  }

  if (ChatModule) {
    loggerInstance.info("Initializing Chat module");
    ChatModule.initializeCoreAI(app);

    if (io) {
      // Initialize chat sockets if available
      try {
        const chatSocketPath = join(
          __dirname,
          "app",
          "features",
          "chat",
          "socket.mjs",
        );
        const ChatSocket = await loadModule(chatSocketPath);
        if ((ChatSocket?.default?.init || ChatSocket?.init) && io) {
          const initFn = ChatSocket?.default?.init || ChatSocket?.init;
          if (typeof initFn === "function") {
            initFn(io.of("/chat"));
            loggerInstance.info("Chat sockets initialized");
          }
        } else if (!io) {
          loggerInstance.warn(
            "Chat socket initialization skipped - Socket.IO not available",
          );
        }
      } catch (error) {
        loggerInstance.error(
          `Failed to initialize Chat socket handlers: ${error.message}`,
        );
      }
    }
  }

  // Initialize optional modules if available
  if (TerminalModule?.default) {
    loggerInstance.info("Initializing Terminal module");
    TerminalModule.default.init(app, io);

    // Initialize Terminal socket handlers
    try {
      const terminalSocketPath = join(
        __dirname,
        "app",
        "features",
        "terminal",
        "socket.mjs",
      );
      const TerminalSocket = await loadModule(terminalSocketPath);
      if (TerminalSocket?.initTerminalSocket && io) {
        TerminalSocket.initTerminalSocket(io);
        loggerInstance.info("Terminal socket handlers initialized");
      } else if (!io) {
        loggerInstance.warn(
          "Terminal socket initialization skipped - Socket.IO not available",
        );
      } else {
        loggerInstance.warn(
          "Terminal socket initialization function not found",
        );
      }
    } catch (error) {
      loggerInstance.error(
        `Failed to initialize Terminal socket handlers: ${error.message}`,
        error,
      );
    }
  }

  if (BraveModule?.default) {
    loggerInstance.info("Initializing Brave module");
    BraveModule.default.init(app, io);
  }

  if (ResearchAPI?.initResearchModule) {
    loggerInstance.info("Initializing Research module");
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
            // Simple DI container
            if (name === "logger") return loggerInstance;
            return null;
          },
          bindSingleton: () => {},
        },
      );
    } catch (err) {
      loggerInstance.error("Failed to initialize Research module:", err);
    }
  }

  if (MemorySystem) {
    loggerInstance.info("Initializing Memory System");
    const memoryInit = MemorySystem.default?.init || MemorySystem.init;

    // Define the getCoreMemoryAi function
    const getCoreMemoryAi = (opts = {}) => {
      return {
        model_id: opts.model_id || "mem_short_terminator_9000",
        parameters: {
          temperature: Number(process.env.MEM_TEMP) || 0.7,
          max_tokens: Number(process.env.SHORT_TERM_TOKENS) || Math.floor(266),
          ...opts.parameters,
        },
      };
    };

    if (typeof memoryInit === "function") {
      memoryInit({
        layers: [
          {
            key: "shortTerm",
            maxSize: (2 * 5) ** 2,
            iOptionsResolver: {
              ["ai-settings"]: getCoreMemoryAi({
                model_id: "mem_short_terminator_9000",
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
            autoConsolidate: process.env.AUTO_CONSOLIDATE === "true",
            consolidationThreshold: Number(
              process.env.CONSOLIDATION_THRESHOLD || 0.8,
            ),
          },
          typeof window !== "object"
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

  if (Scheduler?.default) {
    loggerInstance.info("Initializing Scheduler");
    const schedulerInstance = Scheduler.default.getSchedulerInstance();
    if (schedulerInstance && schedulerInstance.initialize) {
      schedulerInstance.initialize();

      // Setup basic heartbeat job
      if (schedulerInstance.start) {
        schedulerInstance.start({
          cronJobs: [
            {
              "* * * *": () => loggerInstance.info("Heartbeat"),
              priority: "critical",
            },
            ...(process?.env.EXTRA_CRONS?.split(",").map((c) => c.trim()) ??
              []),
          ],
          concurrencyLimit: Number(process?.env.MAX_CONCURRENT_JOBS || 5),
          retryPolicy: schedulerInstance.getRetryPolicyFromEnv?.() || {
            maxRetries: 3,
          },
        });
      }
    }
  }

  // Set up basic error handler
  app.use((err, req, res, next) => {
    loggerInstance.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  });

  // Start the server
  try {
    const port = Number(process?.env.PORT || 3000);
    server.listen(port, () => {
      loggerInstance.info(
        `\x1b[36mCOREAI v${getVersion()} operational\x1b[0m`,
        `[PID:${process.pid}]`,
        `[NODE_ENV:${process.env.NODE_ENV || "development"}]`,
        `[PORT:${port}]`,
        `[MEM-LAYERS:${MemorySystem?.layers ? Object.keys(MemorySystem.layers).join(",") : "none"}]`,
      );
    });

    // Simple performance monitoring
    setImmediate(() => {
      loggerInstance.info("Performance monitoring started");
      const memUsage = process.memoryUsage();
      loggerInstance.debug(
        `Memory usage: RSS=${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      );
    });
  } catch (startErr) {
    loggerInstance.fatal(startErr.stack || startErr.message);
    // Use setTimeout to allow logging to complete before exiting
    setTimeout(() => process.exit(1), 100);
  }
}

// Bootstrap the application
startServer().catch((err) => {
  if (err.code === "MODULE_NOT_FOUND") {
    console.error("MISSING DEPENDENCY:", err.message.split("\n")[0]);
  } else {
    console.error("FATAL STARTUP ERROR:", err);
  }
  // Use process.exit instead of setting exitCode
  setTimeout(() => process.exit(err.status ?? 2), 100);
});
