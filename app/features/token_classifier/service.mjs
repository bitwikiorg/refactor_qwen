import { createLogger } from '../../services/logger.mjs';
import VeniceAiService from '../../infrastructure/venice-api.mjs';

const logger = createLogger('token-classifier');

export async function classifyToken(input) {
  try {
    const veniceService = await VeniceAiService.createInstance();
    const response = await veniceService.standardChat(input);
    return response;
  } catch (error) {
    logger.error('Failed to classify token:', { error: error.message });
    throw new Error(`Failed to classify token: ${error.message}`);
  }
}
