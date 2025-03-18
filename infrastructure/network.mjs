
// File: ./infrastructure/network.mjs

import { getLoggerInstance } from '../services/logger.mjs';
import axios from 'axios';

const logger = getLoggerInstance({ module: 'Network' });

export class NetworkService {
  constructor(baseConfig = {}) {
    this.axiosInstance = axios.create({
      timeout: baseConfig.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...baseConfig.headers
      }
    });
    
    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug(`Outgoing request: ${config.method} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`Request error: ${error.message}`);
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`Response received: ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`Response error: ${error.response.status} from ${error.config.url}`);
        } else {
          logger.error(`Network error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }
  
  async get(url, config = {}) {
    try {
      return await this.axiosInstance.get(url, config);
    } catch (error) {
      logger.error(`GET request failed: ${error.message}`);
      throw error;
    }
  }
  
  async post(url, data, config = {}) {
    try {
      return await this.axiosInstance.post(url, data, config);
    } catch (error) {
      logger.error(`POST request failed: ${error.message}`);
      throw error;
    }
  }
  
  async put(url, data, config = {}) {
    try {
      return await this.axiosInstance.put(url, data, config);
    } catch (error) {
      logger.error(`PUT request failed: ${error.message}`);
      throw error;
    }
  }
  
  async delete(url, config = {}) {
    try {
      return await this.axiosInstance.delete(url, config);
    } catch (error) {
      logger.error(`DELETE request failed: ${error.message}`);
      throw error;
    }
  }
}

export default NetworkService;
