
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import loggerService from '../services/logger.mjs';
import configService from '../services/config.mjs';

const DEFAULT_PORT = process.env.SERVER_PORT || 3000;

export const initExpress = () => {
    const app = express();
    const httpServer = createServer(app);
    let io;

    // Core Security Headers & Middleware Stack -------------------------------
    configureSecurityHeaders(app);

    // Body Parsing With Limits -----------------------------------------------
    configureBodyParsers(app);

    // CORS Configuration -----------------------------------------------------
    configureCorsMiddleware(app);

    // Static Assets Handling --------------------------------------------------
    await configureStaticAssets(app);

    // View Engine Setup -------------------------------------------------------
    await configureViewEngine();

    //--------------------------------------------------------------------------

    const healthCheckRouteHandler = () =>
        res.status(200).json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: httpServer?.uptime() ?? null,
        });

    //--------------------------------------------------------------------------

    initializeRoutes();

    //--------------------------------------------------------------------------
    // Socket.IO Initialization Phase
    //--------------------------------------------------------------------------
    io = new Server(httpServer, {
        serveClient: false,
        pingInterval: 25e3,
        pingTimeout: 5e3,
        maxHttpBufferSize: (configService.get("socket.maxPayload") || 1e7),
    });

    initializeSocketHandlers(io);

    //--------------------------------------------------------------------------

    return Object.freeze({
        start: async (portOverride) => {
            return new Promise((resolve, reject) => {
                const port = Number.parseInt(
                    portOverride || configService.get("server.port") || DEFAULT_PORT
                );

                httpServer.listen(port, err => {
                    if (err) return reject(err);

                    logger.info(`🚀 Server online @ ${port}`);
                    resolve({ io, port });
                });
            });
        },

        getIo()=> io,

            getHttp()=> httpServer,

                use: majware => registerMiddleware(middleware)
});
};

async function configureSecurityHeaders(_app) {
    _app.disable("x-powered-by");
    _app.use((_req, _res, next) => {
        _res.setHeader("X-DNS-Prefetch-Control", "off");
        _res.setHeader("X-XSS-Protection", "1; mode=block");
        next();
    });
}

function configureBodyParsers(_app) {
    _app.use(
        express.json({ limit: "5mb" }),
        express.urlencoded({ extended: true })
    );
}

async function configureCorsMiddleware(_app) {
    const allowedOrigins =
        process.env.NODE_ENV === "production"
            ? [process.env.FRONTEND_ORIGIN]
            : ["*"];

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

function initializeViewEngine() {
    // Configure EJS delimiters based env vars
    let delimiters = ['${', '}'];
    if (process.env.EJS_DELIMITERS && Array.isArray(JSON.parse(process.env.EJS_DELIMITERS))) {
        delimiters = JSON.parse(process.env.EJS_DELIMITERS).map(d => d.value || d)
    } else {
        logger.warn("Falling back default delimiters due invalid EJS_DELIMITERS format")
    }
    ejs.delimiters(delimiters[0], delimiters[1]);

    // Set view engine configurations
    express.set('view engine', 'ejs');
    express.set('views', `${process.cwd()}/views`);
}

function initializeRoutes() {
    try {
        // Explicitly load route definitions early 
        require('./routes-loader').loadRoutes(express);
    } catch (e) {
        logger.fatal(`Failed loading application routes:${e.stack}`);
        process.exit(69); // EX_DATAERR exit status
    }
}

function initializeSocketHandlers(ioInstance) {

    /**@type {{setupRealtime:(...args)=>void}} */
    const coreAi = require('../features/coreai/service');

    /**@type {{setupMemoryUpdates:(...args)=>void}} */
    const memory = require('../features/memory/service');

    coreAi.setupRealtime(ioInstance);
    memory.setupMemoryUpdates(); // assumes singleton pattern

    ioInstance.on('connection', (socket) => {
        logger.info(`Client connected - ${socket.id}`);

        socket.onAny((event, ...data) => {
            logger.debug(`${socket.id}: Event received '${event}'`, { payload: data.length > 0 ? data[0] : null })
        });

        socket.on('disconnect', (reason) => {
            logger.info(`${socket.id}: Disconnected (${reason})`);
        });
    });

    // Graceful shutdown handler 
    process.once('SIGTERM', () => {
        io.close(() => {
            http.close(() => {
                console.log('\nGracefully terminating...');
            });
        }, 6e4); // allow up-to 6sec cleanup period  
    });
};