// app/config/production.config.mjs
export const productionConfig = {
  debugModeEnabled:
    typeof process.env.DEBUG_PROD === 'string'
      ? JSON.parse(process.env.DEBUG_PROD.toLowerCase())
      : false,

  logging: {
    level:
      ['error', 'warn', 'info'].includes(process.env.LOGGING_LEVEL)
        ? process.env.LOGGING_LEVEL
        : 'info',
    console:
      typeof process.env.LOG_CONSOLE === 'string'
        ? JSON.parse(process.env.LOG_CONSOLE.toLowerCase())
        : true,
    file:
      typeof process.env.LOG_FILE === 'string'
        ? JSON.parse(process.env.LOG_FILE.toLowerCase())
        : true,
    rotateFilesOnStartup: Boolean(process.env.ROTATE_LOG_FILES),

    // Add optional max size & retention policies later during deployment tuning phase
  },

  socketIO: {
    cors: {
      origin:
        Array.isArray(process.env.SOCKET_IO_ORIGIN)
          ? JSON.parse(process.env.SOCKET_IO_ORIGIN)
          : [process.env.NODE_ENV !== 'production'
            ? '*'
            : `${process.cwd().split('/')[2]}`],

      methods: ['GET', 'POST', 'OPTIONS'],

      credentialsRequired:
        process.env.CORS_CREDENTIALS_REQUIRED === 'true',

      exposedHeaders: ['X-Total-Count']
    },
  },

  memorySystem: {
    maintenance: {
      autoConsolidate:
        ['yes', 'true'].includes(
          String(process.env.MEMORY_AUTO_CONSOLIDATE || '').toLowerCase()
        ),

      consolidationThreshold: Number(
        Math.max(
          0,
          Math.min(
            1,
            parseFloat(process.env.MEMORY_CONSOL_THRES || '0.8')
          )
        )
      )
    }
  },

  // Additional security hardening options...
  security: {
    xssProtection: '1; mode=block',
    hstsMaxAge: Number.parseInt('31536000', 10),
    contentSecurityPolicy: 'default-src https:'
  }
};
