import process from 'process';
import axios from 'axios';
import RateLimiter from '../../utils/rate-limiter.mjs';

class BraveWeb {
  constructor() {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey?.trim()) throw new Error('BRAVE_API_KEY environment variable must be set');

    this._apiKey = apiKey;
    this._rateLimiter = new RateLimiter({ maxRequestsPerSecond: 5 }); // Set a reasonable rate limit
  }

  name() {
    return 'Brave';
  }

  supportedTypes() {
    return ['web'];
  }

  async execute(params) {
    await this._rateLimitCheck();

    try {
      const responseRaw = await axios.get(
        'https://api.search.brave.com/res/v1/web/search',
        this.#buildRequestConfig(params)
      );

      return this.#parseResponse(responseRaw.data);
    } catch (error) {
      return this.#formatErrorResponse(error);
    }
  }

  async _rateLimitCheck() {
    await this._rateLimiter.waitForSlot();
  }

  #buildRequestConfig(params) {
    const defaults = {
      headers: { 'X-API-Key': this._apiKey },
      params: {
        q: params.query,
        count: params.pageSize || 10,
        hl: 'en', // Set language to English
      },
    };

    return defaults;
  }

  #parseResponse(data) {
    return data.webResults.map(item => ({
      title: item.title,
      url: item.url,
      summary: item.snippet,
    }));
  }

  #formatErrorResponse(err) {
    console.error('API Request Failed:', err.stack);
    const apiErrorMsg = err.response?.data?.error ?? err.message;
    throw new Error(`[BRAVE_SEARCH_FAILURE] ${apiErrorMsg}`);
  }
}

export function provideBraveClient() {
  return {
    type: 'web',
    instance: new BraveWeb(),
  };
}

export class BraveService {
  initialize() {
    import('../../../services/logger.mjs')
      .then(({ getLoggerInstance }) => getLoggerInstance({ module: 'BraveService' }))
      .then(log => log.info('BraveService initialized'));
    return this;
  }
}