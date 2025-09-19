import { Request, Response, NextFunction } from 'express';
import { logger, logSecurityEvent } from '../utils/logger';
import { config } from '../config/config';

/**
 * Custom error types for better error handling
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    context?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.context = context;

    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, 'CONFLICT_ERROR', context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`External service error: ${service} - ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      ...context
    });
  }
}

export class GDPRComplianceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 451, 'GDPR_COMPLIANCE_ERROR', context);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  timestamp: string;
  path: string;
  correlationId?: string;
  details?: any;
  stack?: string;
}

/**
 * Determine if error should include stack trace
 */
function shouldIncludeStack(err: Error, env: string): boolean {
  return env === 'development' || (err instanceof AppError && !err.isOperational);
}

/**
 * Generate correlation ID for error tracking
 */
function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Sanitize error for client response (security consideration)
 */
function sanitizeErrorForClient(error: Error, env: string): Partial<ErrorResponse> {
  if (error instanceof AppError) {
    return {
      error: error.constructor.name.replace('Error', ''),
      message: error.message,
      code: error.code,
      details: env === 'development' ? error.context : undefined
    };
  }

  // For non-operational errors, don't expose internal details in production
  if (env === 'production') {
    return {
      error: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_SERVER_ERROR'
    };
  }

  return {
    error: error.constructor.name,
    message: error.message,
    code: 'INTERNAL_SERVER_ERROR'
  };
}

/**
 * Log error with appropriate level and context
 */
function logError(err: Error, req: Request, correlationId: string) {
  const errorContext = {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    sessionId: req.user?.sessionId,
  };

  if (err instanceof AppError) {
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    
    logger[logLevel](`Application Error: ${err.message}`, {
      ...errorContext,
      statusCode: err.statusCode,
      code: err.code,
      context: err.context,
      isOperational: err.isOperational,
      stack: err.stack
    });

    // Log security events for authentication/authorization errors
    if (err instanceof AuthenticationError || err instanceof AuthorizationError) {
      logSecurityEvent({
        type: err instanceof AuthenticationError ? 'authentication' : 'authorization',
        severity: 'medium',
        userId: req.user?.id,
        sessionId: req.user?.sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: err.message,
        metadata: { code: err.code, path: req.path }
      });
    }
  } else {
    // Log unexpected errors as critical
    logger.error(`Unexpected Error: ${err.message}`, {
      ...errorContext,
      stack: err.stack,
      name: err.name
    });

    // Log potential security issues
    logSecurityEvent({
      type: 'system_security',
      severity: 'high',
      userId: req.user?.id,
      sessionId: req.user?.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Unexpected error: ${err.name}`,
      metadata: { message: err.message, path: req.path }
    });
  }
}

/**
 * Main error handling middleware (OWASP ASVS V7.4.1)
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate correlation ID for error tracking
  const correlationId = generateCorrelationId();
  
  // Log the error
  logError(err, req, correlationId);

  // Determine status code
  let statusCode = 500;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  }

  // Sanitize error for client
  const sanitizedError = sanitizeErrorForClient(err, config.env);

  // Build error response
  const errorResponse: ErrorResponse = {
    ...sanitizedError,
    error: sanitizedError.error || 'InternalServerError',
    message: sanitizedError.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    correlationId
  };

  // Include stack trace in development or for non-operational errors
  if (shouldIncludeStack(err, config.env)) {
    errorResponse.stack = err.stack;
  }

  // Set security headers for error responses
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'no-referrer'
  });

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<void>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Database error mapper
 */
export function mapDatabaseError(error: any): AppError {
  // PostgreSQL errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return new ConflictError('Resource already exists', {
          constraint: error.constraint,
          detail: error.detail
        });
      case '23503': // Foreign key violation
        return new ValidationError('Referenced resource does not exist', {
          constraint: error.constraint,
          detail: error.detail
        });
      case '23502': // Not null violation
        return new ValidationError('Required field is missing', {
          column: error.column,
          detail: error.detail
        });
      case '23514': // Check violation
        return new ValidationError('Invalid data format', {
          constraint: error.constraint,
          detail: error.detail
        });
      case '42P01': // Undefined table
      case '42703': // Undefined column
        return new DatabaseError('Database schema error', {
          code: error.code,
          message: error.message
        });
      case '53300': // Too many connections
        return new DatabaseError('Database connection limit reached', {
          code: error.code
        });
      default:
        return new DatabaseError(`Database error: ${error.message}`, {
          code: error.code,
          detail: error.detail
        });
    }
  }

  // Connection errors
  if (error.code === 'ECONNREFUSED') {
    return new DatabaseError('Database connection refused');
  }

  if (error.code === 'ETIMEDOUT') {
    return new DatabaseError('Database connection timeout');
  }

  return new DatabaseError(`Unknown database error: ${error.message}`);
}

/**
 * Validation error mapper for request validation
 */
export function mapValidationError(errors: any[]): ValidationError {
  const details = errors.map(error => ({
    field: error.path || error.param,
    message: error.message || error.msg,
    value: error.value
  }));

  return new ValidationError('Request validation failed', { details });
}

/**
 * GDPR compliance error handler
 */
export function handleGDPRError(operation: string, userId: string): GDPRComplianceError {
  return new GDPRComplianceError(
    `Operation ${operation} is not permitted due to GDPR compliance requirements`,
    { operation, userId }
  );
}

/**
 * Rate limiting error handler
 */
export function handleRateLimit(req: Request): RateLimitError {
  logSecurityEvent({
    type: 'suspicious_activity',
    severity: 'medium',
    userId: req.user?.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    description: 'Rate limit exceeded',
    metadata: { path: req.path, method: req.method }
  });

  return new RateLimitError();
}

/**
 * External service error mapper
 */
export function mapExternalServiceError(serviceName: string, error: any): ExternalServiceError {
  let message = 'Service unavailable';
  let context: Record<string, any> = {};

  if (error.response) {
    message = `HTTP ${error.response.status}: ${error.response.statusText}`;
    context = {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    };
  } else if (error.code) {
    switch (error.code) {
      case 'ECONNREFUSED':
        message = 'Connection refused';
        break;
      case 'ETIMEDOUT':
        message = 'Request timeout';
        break;
      case 'ENOTFOUND':
        message = 'Service not found';
        break;
      default:
        message = error.message || 'Unknown error';
    }
    context = { code: error.code };
  }

  return new ExternalServiceError(serviceName, message, context);
}
