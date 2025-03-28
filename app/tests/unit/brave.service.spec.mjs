import { BraveWeb, BraveSearchEngine } from '../app/features/brave/service.mjs';
import axios from 'axios';

describe('BraveWeb Class', () => {
  it('should throw an error if BRAVE_API_KEY is not set', () => {
    process.env.BRAVE_API_KEY = '';
    expect(() => new BraveWeb()).toThrow(/BRAVE_API_KEY/i);
  });

  it('should format response correctly', async () => {
    const braveWeb = new BraveWeb();
    const mockResponse = {
      webResults: [
        { title: 'Test Title', url: 'http://example.com', snippet: 'Test snippet' },
      ],
    };

    jest.spyOn(axios, 'get').mockResolvedValue({ data: mockResponse });

    const result = await braveWeb.execute({ query: 'test' });
    expect(result).toEqual([
      { title: 'Test Title', url: 'http://example.com', summary: 'Test snippet' },
    ]);
  });

  it('should handle API errors', async () => {
    const braveWeb = new BraveWeb();
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('Mocked Network Failure'));

    expect.assertions(1);
    try {
      await braveWeb.execute({ query: 'test' });
    } catch (error) {
      expect(error.message).toMatch(/\[BRAVE_SEARCH_FAILURE\]/i);
    }
  });
});

describe('BraveSearchEngine Class', () => {
  it('should throw an error if API key is not set', () => {
    expect(() => new BraveSearchEngine({})).toThrow(/API key is required/i);
  });

  it('should execute search with depth and breadth', async () => {
    const braveSearchEngine = new BraveSearchEngine({ apiKey: 'test-key' });
    const mockResponse = { content: 'Mock Content' };

    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await braveSearchEngine.execute('test');
    expect(result).toEqual(['Mock Content']);
  });
});