// app/config/development.config.mjs
export const developmentConfig = {
  debug: process.env.DEBUG_MODE !== undefined ? process.env.DEBUG_MODE : true,

  logging: {
    level:
      process.env.LOGGING_LEVEL && ['silly', 'debug', 'info'].includes(process.env.LOGGING_LEVEL)
        ? process.env.LOGGING_LEVEL
        : 'verbose',
    console:
      typeof process.env.LOG_CONSOLE === 'string'
        ? JSON.parse(process.env.LOG_CONSOLE.toLowerCase())
        : true,
    file:
      typeof process.env.LOG_FILE === 'string'
        ? JSON.parse(process.env.LOG_FILE.toLowerCase())
        : true,
  },

  socketIO: {
    cors: {
      origin:
        typeof process.env.SOCKET_IO_ORIGIN === 'string'
          ? [process.env.SOCKET_IO_ORIGIN]
          : ['*'],
      methods:
        ['GET', 'POST', 'OPTIONS'], // Added OPTION required for CORS preflights
      credentialsRequired:
        typeof process.env.CORS_CREDENTIALS_REQUIRED === 'boolean'
          ? !!process.env.CORS_CREDENTIALS_REQUIRED
          : false,
    },
  },
};
