// app/features/brave/service.mjs

import axios from 'axios';
import RateLimiter from '../../utils/rate-limiter';

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

class BraveSearchEngine {
  constructor({ apiKey }) {
    if (!apiKey?.trim()) throw new Error('API key is required');

    Object.assign(this, {
      apiKey,
      baseUrl: 'https://api.bravesearch.com/v1',
    });

    Object.freeze(this.baseUrl);
  }

  async execute(topic, options = { depth: 2, breadth: 3 }) {
    const results = [];

    for (let d = options.depth; d > 0; d--) {
      const batchResults = [];

      await Promise.all(
        Array(options.breadth)
          .fill()
          .map(async () => {
            try {
              const res = await fetch(`${this.baseUrl}/web?query=${encodeURIComponent(topic)}&key=${this.apiKey}`);
              const data = await res.json();
              batchResults.push(data);
            } catch (err) {
              console.error('Fetch error:', err);
            }
          })
      );

      results.push(...batchResults);

      await new Promise(resolve => setTimeout(resolve, 500)); // Sleep for 500ms between depth layers
    }

    return results.map(r => r.content || 'No result').filter(Boolean);
  }
}

export function provideBraveClient() {
  return {
    type: 'web',
    instance: new BraveWeb(),
  };
}