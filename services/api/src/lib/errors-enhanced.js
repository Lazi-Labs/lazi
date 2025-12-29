/**
 * Enhanced Error Classes for LAZI Application
 * Provides consistent error handling across all layers
 */

/**
 * Base LAZI Error Class
 * All custom errors extend this
 */
export class LaziError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Resource Not Found Error
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends LaziError {
  constructor(entity, id) {
    super(
      `${entity} not found: ${id}`,
      'NOT_FOUND',
      404,
      { entity, id }
    );
  }
}

/**
 * Validation Error
 * Used when request validation fails
 */
export class ValidationError extends LaziError {
  constructor(message, validationDetails) {
    super(
      message || 'Validation failed',
      'VALIDATION_ERROR',
      400,
      validationDetails
    );
  }
}

/**
 * Authentication Error
 * Used when authentication fails
 */
export class AuthenticationError extends LaziError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

/**
 * Authorization Error
 * Used when user lacks permissions
 */
export class AuthorizationError extends LaziError {
  constructor(message = 'Insufficient permissions', requiredPermission = null) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      { requiredPermission }
    );
  }
}

/**
 * ServiceTitan API Error
 * Used when ServiceTitan API calls fail
 */
export class ServiceTitanError extends LaziError {
  constructor(message, stError = null) {
    const details = stError ? {
      originalError: stError.message || stError,
      status: stError.status,
      data: stError.data,
    } : null;

    super(
      message || 'ServiceTitan API error',
      'ST_API_ERROR',
      502,
      details
    );
  }
}

/**
 * Database Error
 * Used when database operations fail
 */
export class DatabaseError extends LaziError {
  constructor(message, dbError = null) {
    const details = dbError ? {
      originalError: dbError.message,
      code: dbError.code,
      constraint: dbError.constraint,
    } : null;

    super(
      message || 'Database operation failed',
      'DATABASE_ERROR',
      500,
      details
    );
  }
}

/**
 * Rate Limit Error
 * Used when rate limits are exceeded
 */
export class RateLimitError extends LaziError {
  constructor(retryAfter = 60) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfter }
    );
  }
}

/**
 * Conflict Error
 * Used when there's a conflict (e.g., duplicate resource)
 */
export class ConflictError extends LaziError {
  constructor(message, conflictDetails = null) {
    super(
      message || 'Resource conflict',
      'CONFLICT',
      409,
      conflictDetails
    );
  }
}

/**
 * Sync Error
 * Used when data synchronization fails
 */
export class SyncError extends LaziError {
  constructor(message, syncDetails = null) {
    super(
      message || 'Synchronization failed',
      'SYNC_ERROR',
      500,
      syncDetails
    );
  }
}

/**
 * Provider Error
 * Used when provider operations fail
 */
export class ProviderError extends LaziError {
  constructor(providerName, operation, originalError = null) {
    const details = {
      provider: providerName,
      operation,
      originalError: originalError?.message || originalError,
    };

    super(
      `Provider ${providerName} failed during ${operation}`,
      'PROVIDER_ERROR',
      500,
      details
    );
  }
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

  // Handle LAZI errors
  if (err instanceof LaziError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: {
        name: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        statusCode: 400,
        details: err.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
        timestamp: new Date().toISOString(),
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
      name: 'InternalError',
      code: 'INTERNAL_ERROR',
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
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
 * Error Factory
 * Helper to create errors with context
 */
export const ErrorFactory = {
  notFound: (entity, id) => new NotFoundError(entity, id),
  validation: (message, details) => new ValidationError(message, details),
  unauthorized: (message) => new AuthenticationError(message),
  forbidden: (message, permission) => new AuthorizationError(message, permission),
  serviceTitan: (message, error) => new ServiceTitanError(message, error),
  database: (message, error) => new DatabaseError(message, error),
  rateLimit: (retryAfter) => new RateLimitError(retryAfter),
  conflict: (message, details) => new ConflictError(message, details),
  sync: (message, details) => new SyncError(message, details),
  provider: (provider, operation, error) => new ProviderError(provider, operation, error),
};
