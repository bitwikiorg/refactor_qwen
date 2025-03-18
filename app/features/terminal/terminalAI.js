
// Terminal AI message processing module
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Venice API client
let veniceClient = null;

/**
 * Initialize the Terminal AI system with Venice API
 * @returns {Promise<boolean>} Success status
 */
export async function initializeTerminalAI() {
  try {
    const veniceApiKey = process.env.VENICE_API_KEY;

    if (!veniceApiKey) {
      console.error('Venice API key is not set in environment variables');
      return false;
    }

    console.log('Initializing Venice client with API key:', veniceApiKey.substring(0, 4) + '...');
    
    // Initialize the Venice API client
    veniceClient = {
      apiKey: veniceApiKey,
      baseUrl: 'https://api.venice.ai/api/v1',
      generateText: async (prompt, options = {}) => {
        try {
          console.log('Making request to Venice API...');
          
          // Prepare messages array
          const messages = [];
          
          // Add system prompt if available
          if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
          }
          
          // Add history if provided
          if (Array.isArray(options.history) && options.history.length > 0) {
            messages.push(...options.history);
          }
          
          // Add user message
          messages.push({ role: 'user', content: prompt });
          
          // Use a model that's known to work with Venice API
          const model = options.model || 'deepseek-r1-671b';
          
          // Build request body
          const requestBody = {
            model: model,
            messages: messages,
            max_tokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7
          };
          
          // For debugging
          console.log('Using model:', model);
          console.log('Message count:', messages.length);

          try {
            const response = await axios.post(
              `${veniceClient.baseUrl}/chat/completions`, 
              requestBody, 
              {
                headers: {
                  'Authorization': `Bearer ${veniceApiKey}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
              }
            );

            console.log('Venice API response status:', response.status);
            return {
              success: true,
              text: response.data.choices[0].message.content
            };
          } catch (apiError) {
            console.error('Venice API error:', apiError.message);
            return {
              success: false,
              error: apiError.message
            };
          }
        } catch (error) {
          console.error('Error generating Venice API response:', error);
          return {
            success: false,
            error: error.message
          };
        }
      }
    };

    console.log('Terminal AI system initialized successfully with Venice API');
    return true;
  } catch (error) {
    console.error('Error initializing Terminal AI with Venice:', error);
    return false;
  }
}

/**
 * Process a message from the terminal interface
 * @param {string} message - The user's message
 * @param {Array} history - Chat history for context
 * @returns {Promise<object>} The AI response
 */
export async function processTerminalMessage(message, history = [], parameters = {}) {
  try {
    console.log(`Processing terminal AI message: "${message}"`);

    // Default system prompt for terminal
    const defaultSystemPrompt = `You are CORE AI, an advanced AI terminal assistant. 
You help users with research, programming, and general information queries.
Be concise, helpful, and accurate in your responses.
If you're not sure about something, acknowledge that fact rather than guessing.`;

    // Check if Venice client is initialized
    if (!veniceClient) {
      await initializeTerminalAI();
      if (!veniceClient) {
        return {
          success: false,
          response: "Unable to initialize AI system. Please check your API configuration."
        };
      }
    }

    // Format history for the API
    const formattedHistory = history.map(msg => {
      // Check if the message has valid content
      const content = msg.content || msg.message || '';
      if (!content.trim()) return null;
      
      return {
        role: msg.role || (msg.user === 'user' ? 'user' : 'assistant'),
        content: content
      };
    }).filter(msg => msg !== null);

    // Extract parameters from the provided options
    const {
      model = 'deepseek-r1-671b',
      temperature = 0.7,
      maxTokens = 800,
      systemPrompt = defaultSystemPrompt
    } = parameters;

    // Simulate AI response if Venice API is not available
    if (!process.env.VENICE_API_KEY) {
      console.log('Venice API key not found, using simulated response');
      return {
        success: true,
        response: `I've received your message: "${message}". I'm currently running in offline mode as the Venice API key is not configured.`
      };
    }

    try {
      // Make the actual API request
      const response = await veniceClient.generateText(message, {
        model,
        temperature,
        maxTokens,
        history: formattedHistory,
        systemPrompt
      });

      if (response.success) {
        return {
          success: true,
          response: response.text
        };
      } else {
        return {
          success: false,
          response: `Error: ${response.error || 'Unknown error from AI service'}`
        };
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        success: false,
        response: `Error: ${error.message}`
      };
    }
  } catch (error) {
    console.error('Error processing terminal message:', error);
    return {
      success: false,
      response: `Error: ${error.message}`
    };
  }
}

export default {
  processTerminalMessage,
  initializeTerminalAI
};
