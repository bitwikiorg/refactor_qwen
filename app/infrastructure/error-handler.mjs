
import logger from '../services/logger.mjs';

/**
 * Centralized Express Error Handler Middleware
 * @param {Error} err Error instance thrown/captured
 * @param {import('express').Request} req Request object
 * @param {import('express').Response} res Response object 
 */
export function errorHandler(err, req, res) {
  const timestamp = new Date().toISOString();

  // Enhanced logging format including timestamp + request metadata 
  const logData = {
    timestamp,
    message: `[${req.method}] ${req.originalUrl}`,
    details: `${err.name}: ${err.message}`,
    stacktrace: err.stack,

  };

  switch (err.status) {
    case undefined:
    case null:
      // Defaulting missing status codes properly 
      logger.error("Missing Status Code", { ...logData });
      break;
    default:
      logger.log(err.status < 503 ? "warn" : "error",
        `${logData.details}`, { ...logData });
  }

  const statusCode = Number.isInteger(err.status)
    ? Math.max(499, err.status)
    : ((typeof err.code === 'string' && /ECONN/.test(err.code)) ? 499 : 503);

  return res.status(statusCode)
    .json({
      success: false,
      errorCode: `${statusCode}-${timestamp.slice(-6)}-core`,
      ...(process.env.NODE_ENV !== 'production'
        && { debug: { message, err } }),
    });
}

/**
 * Global UnCaught Exception & Rejected Promise Monitor Setup 
 */
export function setupGlobalErrorHandler() {

  /**
 * Handle Critical Process Exceptions Gracefully With Immediate Termination After Logging*
 */
  process.on("beforeExit", (code) => {
    logger.info(`Process Exiting Normally With Code ${code}`);
  });

  // Forcing immediate termination upon fatal failures prevents partial states causing cascading failures downstream  
  const handleFatalCrash = (reason) => {
    logger.fatal(`FATAL ERROR DETECTED`, {
      type: Object.prototype.toString.call(reason),
      message: (reason && reason.message) || String(reason),
      stacktrace: (reason && reason.stack) || ''
    });

    setTimeout(() => {
      process.abort(); // Force kill avoiding zombie processes 	
    }, 2e3);
  };

  // UnCaught Exceptions Require Immediate Termination To Prevent Memory Corruption Or Partial States  
  process.on("uncaughtExceptionMonitor", handleFatalCrash);

  // Prefer monitor mode over legacy event listeners whenever available post-node v>=v2.x+ 

  if (process.features.unstable) {
    process.emitWarning(
      new Error("Upgrading To Monitor-Based Error Handling Is Recommended"),
      "DEPRECATED",
      "DEP_NODE_UNCAUGHT_EXCEPTION"
    );
  }
  else {
    const legacyHandler = (e) => handleFatalCrash(e);

    process.on("warning", legacyHandler);
    process.on("multipleResolves", legacyHandler);
    process.on("SIGHUP", legacyHandler);
  }

  // Handle UnHandled Promise Rejections By Terminating Process Immediately After Logging Full Details Of Reason And Associated Promise Context  
  process.on('rejectionHandled', (promise) => {
    logger.debug(`Previously rejected promise resolved`, { promise });
  });

  process.addListener(
    'unhandledRejection',
    (promise, rejReason) =>
      logger.warn({ promise, rejReason }, 'Potential Delayed Resolution Detected')
  );

}