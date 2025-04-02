import process from 'process'; // <-- Added to fix ESLint errors about process
import axios from 'axios';
import { getLoggerInstance } from '../services/logger.mjs';

const logger = getLoggerInstance({ module: 'VeniceApiService' });

export class VeniceAiService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.VENICE_API_BASE_URL,
      headers: { Authorization: `Bearer ${process.env.VENICE_API_KEY}` },
    });
    this.endpoints = {
      CHAT_ENDPOINT: '/chat',
    };
  }

  static async createInstance() {
    return new VeniceAiService();
  }

  async standardChat(payload) {
    try {
      const response = await this.client.post(this.endpoints.CHAT_ENDPOINT, payload);
      return response.data;
    } catch (error) {
      logger.error('Error during Venice API call', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Venice API call failed: ${error.message}`);
    }
  }
}

export default VeniceAiService;