import { classifyToken } from './service.js';
import { classifyTokens } from './utils.js';

export { classifyToken, classifyTokens };

// Verify that this file contains logic for token classification.
// If any logic is missing from src/token_classifier.js or src/token_classifier.py, migrate it here.
export function classifyToken(token) {
    if (!token) return 'Invalid';
    return token.length > 5 ? 'LongToken' : 'ShortToken';
}
