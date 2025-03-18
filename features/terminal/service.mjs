import { Logger } from '../../services/logger.mjs';
import { ConfigProvider } from '../../config/provider.mjs';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const DEFAULT_SYSTEM_PROMPT = "You are a helpful terminal assistant that responds to user commands.";

const MS_PER_HOUR = 60 * 60 * 1000;
const MIN_RESP_LENGTH_TO_STORE = 5;
const CAP_IMPORTANCE_LEVEL = 5;

// Explicitly import terminal-specific prompts
try {
  const terminalPrompts = await import('../../data/prompts/chat_prompt.mjs');
  const DEFAULT_SYSTEM_PROMPT = terminalPrompts.defaultTerminal;
} catch (err) {
  Logger.error("Missing required terminal prompts file", err); // Changed from Logger.fatal to Logger.error
  process.exit(1); // Fail fast during startup if critical assets missing
}


class Session {
  constructor() {
    this.id = uuidv4();
    this.creationTime = new Date();
    this.lastInteractionTime = new Date();
    this.messagesHistory = [];
    this.importance = [];
    this.age = 0;
  }

  get age() {
    return Math.floor((new Date().getTime() - this.creationTime.getTime()) / MS_PER_HOUR);
  }

  logMessage(msg) {
    this.messagesHistory.push(msg);
  }
}

export default class TerminalService {
  constructor(container) {
    const conf = (container?.config?.terminal || {});

    Object.defineProperty(this, 'config', {
      value: Object.freeze({
        sessionTTLHours: ConfigProvider.getNumber('TERMINAL_SESSION_TTL_HOURS', 24),
        maxMessageHistorySize: ConfigProvider.getNumber('MAX_MESSAGE_HISTORY_SIZE', 8),
        model: ConfigProvider.getString('VENICE_DEFAULT_MODEL', 'venus-chat-v4'),
        timeoutMsPerRequest: ConfigProvider.getNumber('API_TIMEOUT_MS', 8999),
        systemPrompt: DEFAULT_SYSTEM_PROMPT || (() => { throw new Error("Missing required terminal prompt") })()
      }),
      writable: false,
      enumerable: false
    });

    Object.defineProperties(this, {
      research: {
        value: container.get('ResearchManager'),
        writable: false,
        enumerable: true
      },
      memory: {
        value: container.get('MemoryService'),
        writable: false,
        enumerable: true
      }
    });

    Object.defineProperty(this, 'activeSessions', {
      value: new Map(),
      writable: false,
      enumerable: true
    });

    setInterval(() => {
      Array.from(this.activeSessions.entries())
        .filter(([id, sess]) => sess.age >= this.config.sessionTTLHours)
        .forEach(([id]) => { this.activeSessions.delete(id) });
    }, MS_PER_HOUR);
  }

  async handleTerminalInput(inputData = {}) {
    const sessionId = inputData.sessionId || uuidv4();

    try {
      const sanitizedInput = inputData.message.trim();

      let session = this.getSessionOrCreateNew(sessionId);

      try {
        await validateSessionIntegrity(session);

        return sanitizedInput.startsWith('/')
          ? await this.handleTerminalCommands(sanitizedInput.slice(1), session)
          : await this.handleGeneralQuery(sanitizedInput.trim(), session);
      } catch (validErr) {
        return buildErrorResponse(`Validation Failed ${validErr}`);
      } finally {
        session.lastInteractionTime = new Date();
      }
    } catch (err) {
      Logger.error(`Critical handler failure`, err);
      return buildErrorResponse("Internal Service Error");
    }
  }

  async handleGeneralQuery(userQuery, currentSession) {
    try {
      const validatedContext = await this.prepareContext(currentSession);
      let aiResponse = '';

      try {
        aiResponse = await this.executeAiRequest(validatedContext, userQuery);
        const responseText = aiResponse.choices[0].message.content;

        await this.logUserInteractionSession(currentSession, userQuery, responseText);

        currentSession.logMessage({ role: 'assistant', content: responseText });

        return buildSuccessResponse(responseText);
      } catch (apiErr) {
        throw new Error(`API Request Failed (${apiErr.response?.status}): ${apiErr.message}`);
      }
    } catch (err) {
      return buildErrorResponse(getUserFriendlyError(err));
    }
  }

  async prepareContext(currentSession) {
    const validatedHistory = currentSession.messagesHistory.slice(-this.config.maxMessageHistorySize)
      .filter(msg => typeof msg === 'object');

    return [
      ...(this.config.systemPrompt ? [{ role: 'system', content: this.config.systemPrompt }] : []),
      ...validatedHistory,
    ];
  }

  async executeAiRequest(context, userQ) {
    validateNonEmpty(userQ, "User query cannot be empty");

    return timeoutPromise(
      () => axios.post(ConfigProvider.getStringRequired("VENICE_API_URL"), {
        model: this.config.model,
        messages: [...context, { role: 'user', content: userQ }],
        temperature: this.temperature
      }, {
        headers: { Authorization: `Bearer ${process.env.VENICE_API_KEY}` }
      }),
      this.config.timeoutMsPerRequest);
  }

  async logUserInteractionSession(sessionObj, userInput, aiReply) {
    sessionObj.logMessage({ role: "user", content: userInput });

    try {
      const score = await this.calculateImportanceScore();
      sessionObj.importance.push(score);
    } catch (e) {
      Logger.error("Failed calculating importance", e);
    }
  }

  async calculateImportanceScore() {
    // Placeholder logic; replace with actual implementation
    return Math.random();
  }

  getSessionOrCreateNew(sessionId) {
    let session = this.activeSessions.get(sessionId);
    if (!session) {
      session = new Session();
      this.activeSessions.set(sessionId, session);
    }
    return session;
  }

  // Add other methods as needed
}

function validateNonEmpty(value, errorMessage) {
  if (!value || value.trim() === '') {
    throw new Error(errorMessage);
  }
}

function timeoutPromise(promiseFn, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Promise timed out'));
    }, timeout);

    promiseFn().then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

function buildSuccessResponse(content) {
  return { success: true, content };
}

function buildErrorResponse(message) {
  return { success: false, message };
}

function getUserFriendlyError(err) {
  return err.message || 'An unexpected error occurred';
}

function validateSessionIntegrity(session) {
  // Placeholder for session integrity validation logic
  return Promise.resolve();
}

function handleTerminalCommands(command, session) {
  // Placeholder for terminal command handling logic
  return Promise.resolve('Command executed');
}