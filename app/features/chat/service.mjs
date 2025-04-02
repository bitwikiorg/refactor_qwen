import sanitizeHtml from 'sanitize-html';
import { getLoggerInstance } from '../../services/logger.mjs';
import VeniceAiService from '../../infrastructure/venice-api.mjs';

const logger = getLoggerInstance({ module: 'ChatService' });

class ChatService {
  constructor() {
    // Initialize veniceService as null to defer its creation
    this.veniceService = null;
  }

  /**
   * Process a user message by generating a response using Venice AI.
   * @param {string} userMessage - The user's input message.
   * @param {object} context - Additional context for the chat (e.g., roomId, senderId).
   * @returns {Promise<string>} - The AI-generated response.
   */
  async processChatMessage(userMessage, context = {}) {
    try {
      logger.info(`Processing message from sender: ${context.senderId}`);

      // Sanitize user input
      const sanitizedContent = this.sanitize(userMessage);

      // Ensure VeniceAiService is initialized
      if (!this.veniceService) {
        this.veniceService = await VeniceAiService.createInstance();
      }

      // Prepare payload
      const messages = [
        { role: 'system', content: 'Default system prompt' },
        { role: 'user', content: sanitizedContent }
      ];
      const payload = {
        model: 'llama-3.3-70b',
        messages,
        venice_parameters: {
          enable_web_search: 'auto',
          include_venice_system_prompt: false,
          character_slug: 'archon-01v',
        },
        temperature: 0.7,
        top_k: 40,
        top_p: 0.9,
        min_p: 0.05,
      };

      // Send payload to Venice AI
      const response = await this.veniceService.standardChat(payload);
      const aiResponse = response.choices[0]?.message?.content || 'No response from Venice AI.';

      logger.info('Chat processed successfully', { userMessage, aiResponse });
      return aiResponse;
    } catch (error) {
      logger.error('Error processing chat message:', { error: error.message });
      throw new Error('Failed to process chat message.');
    }
  }

  /**
   * Sanitize user input to prevent XSS attacks.
   */
  sanitize(input) {
    try {
      return sanitizeHtml(input);
    } catch (e) {
      logger.error('Malformed HTML detected');
      throw new Error('Malformed HTML detected');
    }
  }
}

// Export the ChatService class and the processChatMessage function
const chatService = new ChatService();
export const processChatMessage = chatService.processChatMessage.bind(chatService);
export default ChatService;