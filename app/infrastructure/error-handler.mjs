import logger from '../services/logger.mjs';

export function errorHandler(err, req, res) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    message: `[${req.method}] ${req.originalUrl}`,
    details: `${err.name}: ${err.message}`,
    stacktrace: err.stack,
  };

  if (err.status == null) {
    logger.error('Missing Status Code', { ...logData });
  } else {
    logger[err.status < 503 ? 'warn' : 'error'](`${logData.details}`, { ...logData });
  }

  let statusCode;
  if (Number.isInteger(err.status)) {
    statusCode = Math.max(499, err.status);
  } else if (typeof err.code === 'string' && /ECONN/.test(err.code)) {
    statusCode = 499;
  } else {
    statusCode = 503;
  }

  return res.status(statusCode).json({
    success: false,
    errorCode: `${statusCode}-${timestamp.slice(-6)}-core`,
    ...(process.env.NODE_ENV !== 'production' && { debug: { message: logData.message, err } }),
  });
}

export function setupGlobalErrorHandler() {
  process.on('beforeExit', (code) => {
    logger.info(`Process Exiting Normally With Code ${code}`);
  });

  const handleFatalCrash = (reason) => {
    logger.fatal('FATAL ERROR DETECTED', {
      type: Object.prototype.toString.call(reason),
      message: (reason && reason.message) || String(reason),
      stacktrace: (reason && reason.stack) || '',
    });

    setTimeout(() => {
      process.abort();
    }, 2000);
  };

  process.on('uncaughtExceptionMonitor', handleFatalCrash);

  if (process.features.unstable) {
    process.emitWarning(
      new Error('Upgrading To Monitor-Based Error Handling Is Recommended'),
      'DEPRECATED',
      'DEP_NODE_UNCAUGHT_EXCEPTION'
    );
  } else {
    const legacyHandler = (e) => handleFatalCrash(e);
    process.on('warning', legacyHandler);
    process.on('multipleResolves', legacyHandler);
    process.on('SIGHUP', legacyHandler);
  }

  process.on('rejectionHandled', (promise) => {
    logger.debug('Previously rejected promise resolved', { promise: promise });
  });

  process.addListener('unhandledRejection', (promise, rejReason) => {
    logger.warn(
      { promise: promise, rejReason: rejReason },
      'Potential Delayed Resolution Detected'
    );
  });
}

export function handleErrors(err, req, res, _next) {
  logger.error('Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

export default handleErrors;