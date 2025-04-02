/**
 * Logger module - Production-ready logging utilities
 */

const _process = globalThis.process || { env: {}, cwd: () => '/' };

import { inspect } from 'util';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const LOG_LEVELS = {
  'error': 0,
  'warn': 1,
  'info': 2,
  'debug': 3
};

const LOG_SEVERITY_MAP = new Map([
  ['error', 'ERROR'],
  ['warn', 'WARN'],
  ['info', 'INFO'],
  ['debug', 'DEBUG']
]);

class ProductionReadyLogger {
  constructor(options = {}) {
    const validLevels = Object.keys(LOG_LEVELS);
    const validatedOptions = { ...options };

    validatedOptions.module =
      options.module && typeof options.module !== 'string'
        ? '[UNNAMED_LOGGER_INSTANCE]'
        : options.module || '[DEFAULT_MODULE]';

    validatedOptions.level =
      validLevels.includes(options?.level || '')
        ? options.level
        : validLevels[0];

    Object.defineProperty(this, '_lastLogged', {
      value: new Map(),
      writable: false
    });

    globalThis.LOGGER_INSTANCE ??= this;

    this.configure({
      initialSettings:
        _process.env.NODE_ENV === 'development'
          ? { enabled: true }
          : undefined,

      overrides:
        typeof options === 'object'
          ? options
          : {},
    });

    // Initialize properties
    this.options = validatedOptions;
    
    // Ensure currentLogLevel is set
    this.currentLogLevel = this.options.currentLogLevel || 'info';
    this.module = this.options.module;
    this.logLevels = LOG_LEVELS;
  }

  static validateConfig(config) {
    if (!config.module || typeof config.module !== 'string') {
      throw new Error('Invalid module name in logger config');
    }
    
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(config.currentLogLevel)) {
      throw new Error(`Invalid log level: ${config.currentLogLevel}`);
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.log(`[INFO][${this.module}] ${message}`, meta);
    }
  }

  error(message, error = null) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR][${this.module}] ${message}`, {
        error: error?.message,
        stack: error?.stack,
      });
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN][${this.module}] ${message}`, meta);
    }
  }

  debug(message, meta = {}) {
    if (_process.env.DEBUG === 'true') {
      console.debug(`[DEBUG][${this.module}] ${message}`, meta);
    }
  }

  fatal(...args) {
    if (this.shouldLog('error')) {
      console.error(`[FATAL][${this.module}]`, ...args);
      
      // Ensure logs directory exists
      const logsDir = path.join(_process.cwd(), 'logs');
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
      }
      
      // Write to emergency log
      try {
        const logMessage = `[FATAL][${this.module}] ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : arg
        ).join(' ')}`;
        
        writeFileSync(
          path.join(logsDir, 'fatal.log'), 
          `${new Date().toISOString()} - ${logMessage}\n`, 
          { flag: 'a+' }
        );
      } catch (e) {
        console.error('Failed to write to fatal log:', e);
      }
    }
  }

  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.currentLogLevel];
  }

  emit(levelStringArg, ...args) {
    let currentLevelValue;
    try {
      currentLevelValue = LOG_LEVELS[levelStringArg];
    } catch (e) {
      console.error('Unknown log level:', levelStringArg);
      return;
    }

    const severityThresholdVal = LOG_LEVELS[this.options.level] || Infinity;

    if (currentLevelValue > severityThresholdVal) return;

    const formattedMessageParts = [
      `[${new Date().toISOString()}]`,
      `[${LOG_SEVERITY_MAP.get(levelStringArg) || '?'}]`,
      ...(args.length > 0 ? args.map(v => inspect(v, { depth: null })) : [])
    ];

    try {
      globalThis.console.log(formattedMessageParts.join(' | '));
      
      // Ensure logs directory exists
      const logsDir = path.join(_process.cwd(), 'logs');
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
      }
      
      // Write to log file based on level
      const logFile = levelStringArg === 'error' ? 'error.log' : 'combined.log';
      writeFileSync(
        path.join(logsDir, logFile), 
        `${formattedMessageParts.join(' | ')}\n`, 
        { flag: 'a+' }
      );
    }
    catch (e) {
      writeFileSync('/tmp/emergency.log', formattedMessageParts.join('\n'), { flag: 'a+' });
    }
  }

  configure(settings = {}) {
    // Implementation preserved
    const { initialSettings = {}, overrides = {} } = settings;
    
    // Merge settings
    const mergedSettings = {
      ...initialSettings,
      ...overrides
    };
    
    // Apply settings to options
    if (mergedSettings) {
      this.options = {
        ...this.options,
        ...mergedSettings
      };
    }
  }
}

// Fixed getLoggerInstance function
export function getLoggerInstance(options = {}) {
  try {
    // Set default values to ensure required fields are present
    const defaultConfig = {
      module: '[DEFAULT_MODULE]',
      currentLogLevel: 'info'
    };
    
    // Merge defaults with provided options
    const mergedConfig = {
      ...defaultConfig,
      ...options
    };
    
    // Validate merged config
    ProductionReadyLogger.validateConfig(mergedConfig);
    
    // Create logger instance with validated config
    const instance = new ProductionReadyLogger(mergedConfig);

    return instance;
  } catch (err) {
    console.error('Logger initialization error:', err.message);
    // Provide a fallback logger that won't throw errors but will log the issue
    const fallbackLogger = new ProductionReadyLogger({
      module: '[FALLBACK_LOGGER]',
      currentLogLevel: 'info'
    });
    return fallbackLogger;
  }
}

// Create default logger instance
const defaultLogger = getLoggerInstance({ 
  module: 'App', 
  currentLogLevel: _process.env.LOG_LEVEL || 'info' 
});

/**
 * Logger - Centralized logging service
 */
export class Logger {
  static info(message, meta = {}) {
    defaultLogger.info(message, meta);
  }

  static error(message, error = null) {
    defaultLogger.error(message, error);
  }

  static warn(message, meta = {}) {
    defaultLogger.warn(message, meta);
  }

  static debug(message, meta = {}) {
    defaultLogger.debug(message, meta);
  }
  
  static fatal(...args) {
    defaultLogger.fatal(...args);
  }
}

// Export the default logger instance
export default defaultLogger;

// Export the ProductionReadyLogger class for external use
export { ProductionReadyLogger };

// NEW: Provide createLogger named export for compatibility
export const createLogger = (moduleName) => getLoggerInstance({ module: moduleName });
