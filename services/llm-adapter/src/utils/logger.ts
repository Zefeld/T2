import winston from 'winston';
import { config } from '../config/config';

/**
 * Sanitize sensitive data from logs
 */
function sanitizeLogData(data: any): any {
  const sensitiveFields = [
    'authorization', 'api_key', 'apikey', 'token', 'password', 'secret',
    'x-api-key', 'bearer', 'auth', 'credential'
  ];

  function sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (key === 'headers' && typeof value === 'object') {
        // Special handling for headers object
        sanitized[key] = sanitizeObject(value);
      } else if (key === 'messages' && Array.isArray(value)) {
        // Truncate long message content for readability
        sanitized[key] = value.map((msg: any) => ({
          ...msg,
          content: typeof msg.content === 'string' && msg.content.length > 200 
            ? msg.content.substring(0, 200) + '...[truncated]'
            : msg.content
        }));
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    
    return sanitized;
  }

  return sanitizeObject(data);
}

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const sanitizedMeta = sanitizeLogData(meta);
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'llm-adapter',
      ...sanitizedMeta
    });
  })
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'career-platform-llm-adapter',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    pid: process.pid
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.env === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : logFormat,
      silent: config.env === 'test'
    }),

    // File transports
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    })
  ],

  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      maxsize: 10485760,
      maxFiles: 3
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      maxsize: 10485760,
      maxFiles: 3
    })
  ],

  exitOnError: false
});

/**
 * Request logger
 */
export function logRequest(req: any, res: any, responseTime: number) {
  const userId = req.get('X-User-ID');
  const correlationId = req.get('X-Correlation-ID');
  
  logger.info('Request processed', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId,
    correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestSize: req.get('Content-Length'),
    responseSize: res.get('Content-Length')
  });
}

/**
 * SciBox API interaction logger
 */
export function logSciBoxRequest(
  endpoint: string,
  method: string,
  requestData: any,
  responseData: any,
  responseTime: number,
  userId?: string,
  correlationId?: string
) {
  logger.info('SciBox API request', {
    component: 'scibox-integration',
    endpoint,
    method,
    responseTime: `${responseTime}ms`,
    requestTokens: requestData?.max_tokens,
    responseTokens: responseData?.usage?.total_tokens,
    model: requestData?.model,
    userId,
    correlationId,
    success: !!responseData
  });
}

/**
 * Error logger with context
 */
export function logError(
  error: Error,
  context: {
    operation?: string;
    userId?: string;
    correlationId?: string;
    requestData?: any;
    [key: string]: any;
  }
) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
}

/**
 * Performance logger
 */
export class PerformanceLogger {
  private startTime: [number, number];
  private context: string;

  constructor(context: string) {
    this.context = context;
    this.startTime = process.hrtime();
  }

  end(additionalData?: Record<string, any>) {
    const [seconds, nanoseconds] = process.hrtime(this.startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    logger.info(`Performance: ${this.context}`, {
      component: 'performance',
      operation: this.context,
      duration: `${duration.toFixed(2)}ms`,
      ...additionalData
    });

    return duration;
  }
}

/**
 * Streaming logger
 */
export function logStreamingEvent(
  event: 'start' | 'chunk' | 'end' | 'error',
  data: {
    userId?: string;
    correlationId?: string;
    model?: string;
    chunkCount?: number;
    totalTokens?: number;
    duration?: number;
    error?: string;
  }
) {
  logger.info(`Streaming ${event}`, {
    component: 'streaming',
    event,
    ...data
  });
}

/**
 * Model usage logger for analytics
 */
export function logModelUsage(usage: {
  userId: string;
  model: string;
  endpoint: 'chat' | 'embeddings';
  inputTokens: number;
  outputTokens?: number;
  totalTokens: number;
  responseTime: number;
  success: boolean;
  errorType?: string;
}) {
  logger.info('Model usage', {
    component: 'usage-analytics',
    ...usage,
    timestamp: new Date().toISOString()
  });
}

/**
 * Security event logger
 */
export function logSecurityEvent(event: {
  type: 'rate_limit' | 'invalid_request' | 'unauthorized' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high';
  userId?: string;
  ip?: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  logger.warn('Security event', {
    component: 'security',
    securityEvent: true,
    ...event,
    timestamp: new Date().toISOString()
  });
}
