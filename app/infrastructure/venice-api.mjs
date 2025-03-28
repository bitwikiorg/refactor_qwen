// File path: ./infrastructure/venice-api.mjs

import axios from 'axios';
import { getConfig } from '../config/provider.mjs';
// Removed unused logger import
// import { getLoggerInstance } from '../services/logger.mjs';

class VeniceAiError extends Error {
  constructor(message = 'Venice AI Service Failed', details = {}) {
    super(message);
    this.details = details;
    this.name = 'VeniceAiError';
  }
}

export class VeniceAiService {
  constructor() {
    const conf = getConfig();

    // Configuration validation checks
    const aiConfig = conf.aiProviders?.venice;

    if (!aiConfig || !conf.integrations?.venice?.enabled)
      throw new Error('VENICE_INTEGRATION_DISABLED');

    // Setup client instance    
    this.client = axios.create({
      baseURL: aiConfig.baseURL,
      timeout: aiConfig.settings.timeoutSeconds * 1000 || 30_000,
      headers: {
        Authorization: `Bearer ${this.getApiKey(aiConfig.apiKeys)}`
      }
    });

    // Endpoint paths stored centrally    
    this.endpoints = {
      CHAT_ENDPOINT: '/api/v1/chat/completions',
      IMAGE_ENDPOINT: '/api/v1/image/generate',
      MODELS_LISTING: '/api/v1/models'
    };
    this.config = conf; // Added to make this.config accessible in getModelName
  }

  async sendChatRequest(payload) {
    if (!payload) throw new Error('Payload is required for sendChatRequest');
    try {
      const resp = await this.client.post(this.endpoints.CHAT_ENDPOINT, payload);
      return resp.data.choices[0].message.content.trim();
    } catch (err) {
      throw new VeniceAiError('CHAT_FAILURE', {
        errorType: 'API_ERROR',
        response: err.response?.data || {}
      });
    }
  }

  async sendImageRequest(params) {
    if (!params || !params.prompt)
      throw new Error('Params with a prompt are required for sendImageRequest');
    let payload;
    try {
      payload = {
        prompt: params.prompt,
        style: params.style || 'photographic',
        size: params.size || '512x512'
      };
      const response = await this.client.post(
        params.endpoint || this.endpoints.IMAGE_ENDPOINT,
        payload
      );
      return response.data.url;
    } catch (e) {
      throw new VeniceAiError('IMAGE_GEN_FAILED', { payload });
    }
  }

  async standardChat(prompt, options = {}) {
    return this.sendChatRequest({
      model: this.getModelName('chat'),
      messages: [
        { role: 'system', content: this.getSystemPrompt('default') },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
      ...options.additionalParams
    });
  }

  async researchMode(prompt, options = {}) {
    return this.sendChatRequest({
      model: this.getModelName('research'),
      messages: [
        { role: 'system', content: 'You are an exhaustive researcher providing organized insights' },
        ...options.messages ?? [],
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 256,
      ...options
    });
  }

  async memorySemanticAnalysis(prompt, options = {}) {
    const basePayload = {
      model: this.getModelName('memory'),
      messages: [
        { role: 'system', content: 'Focus on semantic connections between concepts' },
        ...options.messages
      ],
      temperature: 0.4,
      max_tokens: options.maxTokens ?? 384
    };

    return this.sendChatRequest(basePayload);
  }

  getModelName(type = 'chat') {
    let modelName;

    switch (type.toLowerCase()) {
    case 'research':
      modelName = this.config.aiProviders.research.defaultModel;
      break;
    case 'memory':
      modelName = this.config.memorySystem.aiSettings.model;
      break;
    default:
      modelName = this.config.aiProviders.chat.defaultModel;
    }

    if (!modelName)
      throw new Error(`MISSING_MODEL_CONFIG:type=${type}`);
    return modelName;
  }

  getApiKey(keysObj = null) {
    const apiKeySource = keysObj ?
      keysObj[this.getCurrentContext()] || keysObj['global'] :
      process.env.VENICE_API_KEY;

    if (!apiKeySource)
      throw new Error('NO_API_KEY_FOUND');

    return apiKeySource.trim();
  }

  getCurrentContext() {
    return process.env.NODE_ENV || 'default';
  }

  async listAvailableModels() {
    try {
      const response = await this.client.get(this.endpoints.MODELS_LISTING);
      return response.data.models;
    } catch (e) {
      throw new VeniceAiError('MODELS_LISTING_FAILED', { response: e.response?.data });
    }
  }

  async generateResearchImage(query, params = {}) {
    const baseParams = {
      prompt: `Create visual representation showing ${query}`,
      style: params.style || 'scientific'
    };

    return this.sendImageRequest(baseParams);
  }

  getSystemPrompt(_type) {
    return 'Default system prompt';
  }

  static createInstance() {
    return new VeniceAiService();
  }

  static standardQueries = {
    basic: (_p, _o) => new StandardQueries(_p, _o),
    terminal: (_msgs) => terminalInteraction(_msgs),
  };

  static advanced = {
    async generateResearchVisuals(query) {
      return `Generated visuals for ${query}`;
    },
  };

  static getLastErrorDetails() {
    return null;
  }
}

// Placeholder functions - Actual implementation needed.
function StandardQueries(_p, _o) { }
function terminalInteraction(_msgs) { }

export default VeniceAiService;