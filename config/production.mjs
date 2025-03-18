// app/config/production.config.mjs
export const productionConfig = {
  debugModeEnabled:
    typeof process?.env?.DEBUG_PROD === 'string'
      ? JSON.parse(process.env.DEBUG_PROD.toLowerCase())
      : false,

  logging: {
    level:
      ['error', 'warn', 'info'].includes(process?.env?.LOGGING_LEVEL)
        ? process.env.LOGGING_LEVEL
        : "info",
    console:
      typeof process?.env?.LOG_CONSOLE === 'string'
        ? JSON.parse(process.env.LOG_CONSOLE.toLowerCase())
        : true,
    file:
      typeof process?.env?.LOG_FILE === 'string'
        ? JSON.parse(process.env.LOG_FILE.toLowerCase())
        : true,
    rotateFilesOnStartup:
      Boolean(process?.env?.ROTATE_LOG_FILES),

    // Add optional max size & retention policies later during deployment tuning phase
  },

  socketIO: {
    cors: {
      origin:
        Array.isArray(process.env.SOCKET_IO_ORIGIN)
          ? [...process.env.SOCKET_IO_ORIGIN]
          : [process.NODE_ENV !== "production"
            ? "*"
            : `${process.cwd().split("/")[2]}`],

      methods: ["GET", "POST", "OPTIONS"],

      credentialsRequired: Boolean(
        process ?
            .env ?
              .CORS_CREDENTIALS_REQUIRED === "true"
            ),

      exposedHeaders: ["X-Total-Count"]
    },
  },

  memorySystem: {
    maintenance: {
      autoConsolidate: Boolean(
        String(
          process ?
           ?.env ?
             ?.MEMORY_AUTO_CONSOLIDATE || "").toLowerCase() === ("yes" || "true")
      ),

      consolidationThreshold: Number(
        Math.max(0,
          Math.min(1,
            parseFloat(
              String(
                Number.isNaN(+process.
                 ?.env ?
                   ?.MEMORY_CONSOL_THRES) ?
                  +process.
                       ?.etc :
                  ".8"))))
      )
    }
  },

  // Additional security hardening options...
  security: {
    xssProtection: "1; mode=block",
    hstsMaxAge: Number.parseInt("31536000"),
    contentSecurityPolicy: "default-src https:"
  }
};
