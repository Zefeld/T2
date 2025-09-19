import { Request, Response, NextFunction } from 'express';
import { logger, logError, logSecurityEvent } from '../utils/logger';
import { config } from '../config/config';

/**
 * Custom error types
 */
export class LLMError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly type: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'internal_error',
    type: string = 'api_error'
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.type = type;
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

export class ValidationError extends LLMError {
  constructor(message: string, details?: any) {
    super(message, 400, 'invalid_request_error', 'invalid_request_error');
    if (details) {
      (this as any).details = details;
    }
  }
}

export class AuthenticationError extends LLMError {
  constructor(message: string = 'Invalid authentication') {
    super(message, 401, 'invalid_api_key', 'authentication_error');
  }
}

export class RateLimitError extends LLMError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'rate_limit_exceeded', 'rate_limit_error');
  }
}

export class ModelError extends LLMError {
  constructor(message: string, modelName?: string) {
    super(message, 400, 'model_error', 'invalid_request_error');
    if (modelName) {
      (this as any).model = modelName;
    }
  }
}

export class SciBoxError extends LLMError {
  constructor(message: string, statusCode: number = 502, originalError?: any) {
    super(`SciBox API error: ${message}`, statusCode, 'upstream_error', 'api_error');
    if (originalError) {
      (this as any).originalError = originalError;
    }
  }
}

export class StreamingError extends LLMError {
  constructor(message: string) {
    super(message, 500, 'streaming_error', 'api_error');
  }
}

/**
 * OpenAI-compatible error response format
 */
interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

/**
 * Generate correlation ID
 */
function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Map HTTP status codes to OpenAI error types
 */
function mapStatusToType(status: number): string {
  switch (status) {
    case 400:
      return 'invalid_request_error';
    case 401:
      return 'authentication_error';
    case 403:
      return 'permission_error';
    case 404:
      return 'not_found_error';
    case 429:
      return 'rate_limit_error';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'api_error';
    default:
      return 'api_error';
  }
}

/**
 * Create OpenAI-compatible error response
 */
function createErrorResponse(
  error: Error,
  statusCode: number,
  correlationId: string
): OpenAIErrorResponse {
  const errorType = error instanceof LLMError ? 
    error.type : 
    mapStatusToType(statusCode);

  const errorCode = error instanceof LLMError ? error.code : undefined;

  return {
    error: {
      message: config.env === 'production' && statusCode >= 500 ? 
        'Internal server error' : 
        error.message,
      type: errorType,
      code: errorCode,
      ...(correlationId && { correlation_id: correlationId })
    }
  };
}

/**
 * Log error with context
 */
function logErrorContext(
  error: Error,
  req: Request,
  correlationId: string,
  statusCode: number
) {
  const context = {
    correlationId,
    method: req.method,
    path: req.path,
    statusCode,
    userId: req.get('X-User-ID'),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined
  };

  if (error instanceof LLMError) {
    if (statusCode >= 500) {
      logError(error, context);
    } else {
      logger.warn('Client error', {
        error: error.message,
        code: error.code,
        type: error.type,
        ...context
      });
    }
  } else {
    logError(error, context);
  }

  // Log security events for certain error types
  if (error instanceof AuthenticationError) {
    logSecurityEvent({
      type: 'unauthorized',
      severity: 'medium',
      userId: req.get('X-User-ID'),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Authentication failed',
      metadata: { path: req.path, method: req.method }
    });
  } else if (error instanceof RateLimitError) {
    logSecurityEvent({
      type: 'rate_limit',
      severity: 'low',
      userId: req.get('X-User-ID'),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Rate limit exceeded',
      metadata: { path: req.path, method: req.method }
    });
  }
}

/**
 * Main error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = req.get('X-Correlation-ID') || generateCorrelationId();
  
  let statusCode = 500;
  
  if (err instanceof LLMError) {
    statusCode = err.statusCode;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.message.includes('timeout')) {
    statusCode = 504;
  } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
    statusCode = 502;
  }

  // Log error
  logErrorContext(err, req, correlationId, statusCode);

  // Create OpenAI-compatible error response
  const errorResponse = createErrorResponse(err, statusCode, correlationId);

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'X-Correlation-ID': correlationId
  });

  // Add retry-after header for rate limits
  if (statusCode === 429) {
    res.set('Retry-After', '60');
  }

  res.status(statusCode).json(errorResponse);
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
 * Map Axios errors to LLM errors
 */
export function mapAxiosError(error: any): LLMError {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.error?.message || 
                   error.response.data?.message || 
                   error.message;

    switch (status) {
      case 400:
        return new ValidationError(message);
      case 401:
        return new AuthenticationError(message);
      case 429:
        return new RateLimitError(message);
      case 500:
      case 502:
      case 503:
      case 504:
        return new SciBoxError(message, status, error.response.data);
      default:
        return new SciBoxError(message, status);
    }
  } else if (error.request) {
    // Request was made but no response received
    if (error.code === 'ECONNREFUSED') {
      return new SciBoxError('Service unavailable - connection refused', 503);
    } else if (error.code === 'ETIMEDOUT') {
      return new SciBoxError('Service timeout', 504);
    } else if (error.code === 'ENOTFOUND') {
      return new SciBoxError('Service not found', 502);
    } else {
      return new SciBoxError('Network error', 502);
    }
  } else {
    // Something else happened
    return new LLMError(error.message || 'Unknown error', 500);
  }
}

/**
 * Validate request middleware
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const details = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        throw new ValidationError('Request validation failed', details);
      }

      req.body = value;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Rate limit handler
 */
export function handleRateLimit(req: Request, res: Response) {
  const error = new RateLimitError('API rate limit exceeded. Please try again later.');
  
  logSecurityEvent({
    type: 'rate_limit',
    severity: 'medium',
    userId: req.get('X-User-ID'),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    description: 'Rate limit exceeded',
    metadata: { path: req.path, method: req.method }
  });

  const correlationId = req.get('X-Correlation-ID') || generateCorrelationId();
  const errorResponse = createErrorResponse(error, 429, correlationId);

  res.set('Retry-After', '60');
  res.status(429).json(errorResponse);
}
