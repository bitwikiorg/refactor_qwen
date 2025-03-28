import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import configService from '../services/config.mjs';
import fs from 'fs'; // Import fs module
import logger from '../services/logger.mjs'; // Import logger module

const DEFAULT_PORT = process.env.SERVER_PORT || 3000;

export const initExpress = async () => {
  const app = express();
  const httpServer = createServer(app);
  let io;

  configureSecurityHeaders(app);

  configureBodyParsers(app);

  await configureCorsMiddleware(app);

  await configureStaticAssets(app);

  initializeViewEngine(app);

  initializeRoutes(app);

  io = new Server(httpServer, {
    serveClient: false,
    pingInterval: 25e3,
    pingTimeout: 5e3,
    maxHttpBufferSize: (configService.get('socket.maxPayload') || 1e7),
  });

  initializeSocketHandlers(io, httpServer);

  return Object.freeze({
    start: async (portOverride) => {
      return new Promise((resolve, reject) => {
        const port = Number.parseInt(
          portOverride || configService.get('server.port') || DEFAULT_PORT
        );

        httpServer.listen(port, err => {
          if (err) return reject(err);

          logger.info(`🚀 Server online @ ${port}`);
          resolve({ io, port });
        });
      });
    },

    getIo: () => io,

    getHttp: () => httpServer,

    use: middleware => registerMiddleware(app, middleware)
  });
};

async function configureSecurityHeaders(_app) {
  _app.disable('x-powered-by');
  _app.use((_req, _res, next) => {
    _res.setHeader('X-DNS-Prefetch-Control', 'off');
    _res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

function configureBodyParsers(_app) {
  _app.use(
    express.json({ limit: '5mb' }),
    express.urlencoded({ extended: true })
  );
}

async function configureCorsMiddleware(_app) {
  const CorsLib = await import('cors');
  const options = {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ['Content-Type'],
  };

  _app.use(CorsLib.default(options));
}

async function configureStaticAssets(_app) {
  try {
    const publicDirPath = `${process.cwd()}/public`;
    if (!fs.existsSync(publicDirPath)) {
      throw new Error(`Public asset directory missing:${publicDirPath}`);
    }

    _app.use('/static',
      express.static(publicDirPath, {
        maxAge: '7d',
        etag: true,
        lastModified: true
      }));
  } catch (e) {
    logger.error(e.message);
    throw e;
  }
}

function initializeViewEngine(app) {
  app.set('view engine', 'ejs');
  app.set('views', `${process.cwd()}/views`);
}

function initializeRoutes(app) {
  try {
    // Explicitly load route definitions early
    require('./routes-loader').loadRoutes(app);
  } catch (e) {
    logger.fatal(`Failed loading application routes:${e.stack}`);
    process.exit(69); // EX_DATAERR exit status
  }
}

function initializeSocketHandlers(ioInstance, httpServer) {
  /**@type {{setupRealtime:(...args)=>void}} */
  const coreAi = require('../features/coreai/service');

  /**@type {{setupMemoryUpdates:(...args)=>void}} */
  const memory = require('../features/memory/service');

  coreAi.setupRealtime(ioInstance);
  memory.setupMemoryUpdates(); // assumes singleton pattern

  ioInstance.on('connection', (socket) => {
    logger.info(`Client connected - ${socket.id}`);

    socket.onAny((event, ...data) => {
      logger.debug(`${socket.id}: Event received '${event}'`, { payload: data.length > 0 ? data[0] : null });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`${socket.id}: Disconnected (${reason})`);
    });
  });

  process.once('SIGTERM', () => {
    ioInstance.close(() => {
      httpServer.close(() => {
        console.log('\nGracefully terminating...');
      });
    }, 6e4);
  });
}

function registerMiddleware(app, middleware) {
  app.use(middleware);
}