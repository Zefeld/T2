import winston from 'winston';
import { config } from '../config/config';

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Remove sensitive data from logs (GDPR compliance)
    const sanitizedMeta = sanitizeLogMeta(meta);
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'api-gateway',
      ...sanitizedMeta
    });
  })
);

/**
 * Sanitize log metadata to remove sensitive information
 */
function sanitizeLogMeta(meta: any): any {
  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken', 'secret',
    'authorization', 'cookie', 'x-api-key', 'client_secret',
    'ssn', 'socialSecurityNumber', 'creditCard', 'bankAccount'
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
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    
    return sanitized;
  }

  return sanitizeObject(meta);
}

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'career-platform-gateway',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: config.env === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : logFormat,
      silent: config.env === 'test'
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    }),

    // File transport for combined logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    })
  ],

  // Handle exceptions and rejections
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

  // Exit on handled exceptions
  exitOnError: false,
});

/**
 * Performance logging utility
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
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    logger.info(`Performance: ${this.context}`, {
      duration: `${duration.toFixed(2)}ms`,
      context: this.context,
      ...additionalData
    });

    return duration;
  }
}

/**
 * HTTP request logger with correlation ID
 */
export function createHttpLogger(correlationId: string) {
  return logger.child({
    correlationId,
    component: 'http-request'
  });
}

/**
 * Database query logger
 */
export function createDbLogger(query: string, correlationId?: string) {
  return logger.child({
    component: 'database',
    query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
    correlationId
  });
}

/**
 * Authentication logger
 */
export function createAuthLogger(userId?: string, sessionId?: string) {
  return logger.child({
    component: 'authentication',
    userId,
    sessionId
  });
}

/**
 * Business logic logger
 */
export function createBusinessLogger(operation: string, userId?: string) {
  return logger.child({
    component: 'business-logic',
    operation,
    userId
  });
}

/**
 * Integration logger for external services
 */
export function createIntegrationLogger(service: string, operation?: string) {
  return logger.child({
    component: 'integration',
    externalService: service,
    operation
  });
}

/**
 * Security event logger
 */
export function logSecurityEvent(event: {
  type: 'authentication' | 'authorization' | 'data_access' | 'suspicious_activity' | 'system_security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  logger.warn('Security Event', {
    component: 'security',
    securityEvent: true,
    ...event,
    timestamp: new Date().toISOString()
  });

  // In production, you might want to send critical security events to a SIEM system
  if (event.severity === 'critical' && config.env === 'production') {
    // TODO: Integrate with SIEM/monitoring system
    console.error('CRITICAL SECURITY EVENT:', event);
  }
}

/**
 * GDPR compliance logger
 */
export function logGDPREvent(event: {
  type: 'data_access' | 'data_export' | 'data_deletion' | 'consent_change';
  userId: string;
  dataSubject?: string; // For cases where admin is acting on behalf of another user
  description: string;
  legalBasis?: string;
  dataTypes?: string[];
  metadata?: Record<string, any>;
}) {
  logger.info('GDPR Compliance Event', {
    component: 'gdpr-compliance',
    gdprEvent: true,
    ...event,
    timestamp: new Date().toISOString()
  });
}

/**
 * Audit logger for business operations
 */
export function logAuditEvent(event: {
  operation: string;
  resource: string;
  resourceId?: string;
  userId: string;
  changes?: Record<string, { from: any; to: any }>;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}) {
  logger.info('Audit Event', {
    component: 'audit',
    auditEvent: true,
    ...event,
    timestamp: new Date().toISOString()
  });
}

/**
 * Health check logger
 */
export function logHealthCheck(service: string, status: 'healthy' | 'unhealthy', details?: Record<string, any>) {
  const level = status === 'healthy' ? 'info' : 'error';
  
  logger[level](`Health Check: ${service}`, {
    component: 'health-check',
    service,
    status,
    ...details
  });
}

/**
 * Startup logger
 */
export function logStartup(event: string, details?: Record<string, any>) {
  logger.info(`Startup: ${event}`, {
    component: 'startup',
    event,
    ...details
  });
}

/**
 * Shutdown logger
 */
export function logShutdown(event: string, details?: Record<string, any>) {
  logger.info(`Shutdown: ${event}`, {
    component: 'shutdown',
    event,
    ...details
  });
}
