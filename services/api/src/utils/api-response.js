/**
 * Unified API Response Helpers
 * Consistent response format across all endpoints
 */

/**
 * Success response
 */
export function success(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    ...data,
  });
}

/**
 * Created response (201)
 */
export function created(res, data = {}) {
  return success(res, data, 201);
}

/**
 * No content response (204)
 */
export function noContent(res) {
  return res.status(204).send();
}

/**
 * Error response
 */
export function error(res, message, statusCode = 500, details = null) {
  const response = {
    success: false,
    error: message,
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Bad request (400)
 */
export function badRequest(res, message = 'Bad request', details = null) {
  return error(res, message, 400, details);
}

/**
 * Unauthorized (401)
 */
export function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

/**
 * Forbidden (403)
 */
export function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

/**
 * Not found (404)
 */
export function notFound(res, message = 'Not found') {
  return error(res, message, 404);
}

/**
 * Conflict (409)
 */
export function conflict(res, message = 'Conflict') {
  return error(res, message, 409);
}

/**
 * Too many requests (429)
 */
export function tooManyRequests(res, message = 'Too many requests', retryAfter = null) {
  if (retryAfter) {
    res.set('Retry-After', retryAfter);
  }
  return error(res, message, 429);
}

/**
 * Internal server error (500)
 */
export function serverError(res, message = 'Internal server error') {
  return error(res, message, 500);
}

/**
 * Paginated response
 */
export function paginated(res, data, total, limit, offset) {
  return success(res, {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  });
}

/**
 * Async handler wrapper - catches errors and passes to error handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  success,
  created,
  noContent,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  serverError,
  paginated,
  asyncHandler,
};
