/**
 * Custom Error Classes
 * Standardized error types for consistent error handling
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter = null) {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ServiceTitanError extends AppError {
  constructor(message, statusCode, stResponse = null) {
    super(message, statusCode, 'SERVICE_TITAN_ERROR', stResponse);
    this.name = 'ServiceTitanError';
  }
}

export class TokenError extends AppError {
  constructor(message = 'Failed to obtain access token') {
    super(message, 500, 'TOKEN_ERROR');
    this.name = 'TokenError';
  }
}

export class DatabaseError extends AppError {
  constructor(message, dbError = null) {
    const details = dbError ? {
      originalError: dbError.message,
      code: dbError.code,
      constraint: dbError.constraint,
    } : null;
    super(message || 'Database operation failed', 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class ConflictError extends AppError {
  constructor(message, conflictDetails = null) {
    super(message || 'Resource conflict', 409, 'CONFLICT', conflictDetails);
    this.name = 'ConflictError';
  }
}

export class SyncError extends AppError {
  constructor(message, syncDetails = null) {
    super(message || 'Synchronization failed', 500, 'SYNC_ERROR', syncDetails);
    this.name = 'SyncError';
  }
}

export class ProviderError extends AppError {
  constructor(providerName, operation, originalError = null) {
    const details = {
      provider: providerName,
      operation,
      originalError: originalError?.message || originalError,
    };
    super(`Provider ${providerName} failed during ${operation}`, 500, 'PROVIDER_ERROR', details);
    this.name = 'ProviderError';
  }
}

// Error factory for ServiceTitan API responses
export function fromServiceTitanResponse(status, data) {
  const message = data?.message || data?.error?.message || 'ServiceTitan API error';

  switch (status) {
    case 400:
      return new ValidationError(message, data);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError('ServiceTitan resource');
    case 429:
      return new RateLimitError(data?.retryAfter);
    default:
      return new ServiceTitanError(message, status, data);
  }
}

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error Handler Middleware
 * Catches all errors and formats responses consistently
 */
export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error
  const logger = req.logger || console;
  logger.error({
    error: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
    tenantId: req.tenantId,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors?.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Handle unknown errors
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}
