/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass to Express error handler
 */

/**
 * Wraps async route handlers to catch errors and pass to Express error handler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
