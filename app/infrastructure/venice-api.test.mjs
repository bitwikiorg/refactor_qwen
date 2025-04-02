import { describe, it, beforeEach, afterEach, expect } from '@jest/globals'; // Import Jest globals
import process from 'process'; // Import process for Node.js environment
import VeniceAiService from './venice-api.mjs'; // Import the module to test

// Mock process.env if necessary
beforeEach(() => {
  process.env.VENICE_API_KEY = 'test-api-key';
  process.env.VENICE_API_URL = 'https://test.api.venice.ai';
});

afterEach(() => {
  delete process.env.VENICE_API_KEY;
  delete process.env.VENICE_API_URL;
});

// Example test case
describe('VeniceAiService', () => {
  it('should initialize with the correct configuration', async () => {
    const config = {
      aiProviders: {
        venice: {
          apiKeys: { global: 'test-api-key' },
          baseURL: 'https://test.api.venice.ai',
          settings: { timeoutSeconds: 30 },
        },
      },
      integrations: { venice: { enabled: true } },
    };

    const service = new VeniceAiService(config);
    expect(service.client.defaults.baseURL).toBe('https://test.api.venice.ai');
    expect(service.client.defaults.headers.Authorization).toBe('Bearer test-api-key');
  });

  // Add more test cases as needed
});
