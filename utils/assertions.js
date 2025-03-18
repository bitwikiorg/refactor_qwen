
/**
 * Assert that a condition is true, throw an error if not
 * @param {boolean} condition - The condition to test
 * @param {string} message - Error message if condition fails
 * @throws {Error} If condition is false
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}
