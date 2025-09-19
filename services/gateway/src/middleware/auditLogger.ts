import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, logAuditEvent, logGDPREvent } from '../utils/logger';
import { AuditService } from '../services/AuditService';

/**
 * Audit event types
 */
export enum AuditEventType {
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  USER_ACTION = 'user_action',
  ADMIN_ACTION = 'admin_action',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SYSTEM_EVENT = 'system_event'
}

/**
 * Extract sensitive paths that require detailed auditing
 */
const SENSITIVE_PATHS = [
  '/api/users',
  '/api/profiles',
  '/api/analytics',
  '/api/voice/transcripts',
  '/api/admin'
];

const GDPR_RELEVANT_PATHS = [
  '/api/users',
  '/api/profiles',
  '/api/voice',
  '/api/data-export',
  '/api/data-deletion'
];

/**
 * Determine audit level based on request
 */
function getAuditLevel(req: Request): 'minimal' | 'standard' | 'detailed' {
  const path = req.path.toLowerCase();
  
  // Admin operations require detailed auditing
  if (req.user?.role === 'admin' || path.includes('/admin')) {
    return 'detailed';
  }

  // Sensitive data operations
  if (SENSITIVE_PATHS.some(p => path.startsWith(p.toLowerCase()))) {
    return 'standard';
  }

  // All other operations
  return 'minimal';
}

/**
 * Determine if request involves GDPR-relevant data
 */
function isGDPRRelevant(req: Request): boolean {
  const path = req.path.toLowerCase();
  return GDPR_RELEVANT_PATHS.some(p => path.startsWith(p.toLowerCase()));
}

/**
 * Extract meaningful changes from request/response
 */
function extractChanges(req: Request, res: Response): Record<string, any> | undefined {
  // Only track changes for modification operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return undefined;
  }

  const changes: Record<string, any> = {};

  // Store original request body (sanitized)
  if (req.body && Object.keys(req.body).length > 0) {
    changes.requestBody = sanitizeForAudit(req.body);
  }

  // Store query parameters for operations like bulk updates
  if (req.query && Object.keys(req.query).length > 0) {
    changes.queryParams = sanitizeForAudit(req.query);
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}

/**
 * Sanitize data for audit logging (remove sensitive information)
 */
function sanitizeForAudit(data: any): any {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'ssn', 'creditCard', 'bankAccount', 'passport'
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

  return sanitizeObject(data);
}

/**
 * Get audit event type based on request
 */
function getAuditEventType(req: Request): AuditEventType {
  const method = req.method;
  const path = req.path.toLowerCase();

  if (path.includes('/auth')) {
    return AuditEventType.AUTHENTICATION;
  }

  if (req.user?.role === 'admin' || path.includes('/admin')) {
    return AuditEventType.ADMIN_ACTION;
  }

  switch (method) {
    case 'GET':
      return AuditEventType.DATA_ACCESS;
    case 'DELETE':
      return AuditEventType.DATA_DELETION;
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return AuditEventType.DATA_MODIFICATION;
    default:
      return AuditEventType.USER_ACTION;
  }
}

/**
 * Extract resource information from request
 */
function extractResourceInfo(req: Request): { resource: string; resourceId?: string } {
  const pathParts = req.path.split('/').filter(part => part.length > 0);
  
  if (pathParts.length >= 2) {
    const resource = pathParts[1]; // e.g., 'users', 'profiles'
    const resourceId = pathParts[2] || req.params.id || req.body.id;
    
    return { resource, resourceId };
  }
  
  return { resource: 'unknown' };
}

/**
 * Audit logging middleware
 */
export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const correlationId = uuidv4();
  
  // Add correlation ID to request
  req.correlationId = correlationId;
  
  // Store original response.json to capture response data
  const originalJson = res.json;
  let responseBody: any;
  
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Continue with request processing
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const auditLevel = getAuditLevel(req);
      const eventType = getAuditEventType(req);
      const { resource, resourceId } = extractResourceInfo(req);
      const changes = extractChanges(req, res);
      
      // Basic audit data
      const auditData = {
        correlationId,
        operation: `${req.method} ${req.path}`,
        resource,
        resourceId,
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role,
        sessionId: req.user?.sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration,
        success: res.statusCode < 400,
        timestamp: new Date().toISOString(),
        eventType,
        auditLevel,
        changes
      };

      // Add detailed information for higher audit levels
      if (auditLevel === 'standard' || auditLevel === 'detailed') {
        Object.assign(auditData, {
          queryParams: sanitizeForAudit(req.query),
          headers: sanitizeForAudit(req.headers),
        });
      }

      if (auditLevel === 'detailed') {
        Object.assign(auditData, {
          requestBody: sanitizeForAudit(req.body),
          responseBody: sanitizeForAudit(responseBody),
        });
      }

      // Log to application logger
      logAuditEvent({
        operation: auditData.operation,
        resource: auditData.resource,
        resourceId: auditData.resourceId,
        userId: auditData.userId,
        changes,
        success: auditData.success,
        error: !auditData.success ? responseBody?.message : undefined,
        metadata: {
          correlationId,
          duration,
          statusCode: auditData.statusCode,
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent
        }
      });

      // Store in audit database for compliance
      await AuditService.logEvent(auditData);

      // GDPR-specific logging
      if (isGDPRRelevant(req)) {
        const gdprEventType = mapToGDPREventType(req.method, req.path);
        if (gdprEventType) {
          logGDPREvent({
            type: gdprEventType,
            userId: auditData.userId,
            dataSubject: resourceId && resource === 'users' ? resourceId : undefined,
            description: `${req.method} operation on ${resource}`,
            dataTypes: extractDataTypes(req.path),
            metadata: {
              correlationId,
              statusCode: auditData.statusCode,
              duration
            }
          });
        }
      }

    } catch (error) {
      logger.error('Audit logging failed', {
        error: error instanceof Error ? error.message : error,
        correlationId,
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });
    }
  });

  next();
}

/**
 * Map HTTP operations to GDPR event types
 */
function mapToGDPREventType(method: string, path: string): 'data_access' | 'data_export' | 'data_deletion' | 'consent_change' | null {
  const lowerPath = path.toLowerCase();

  if (method === 'DELETE') {
    return 'data_deletion';
  }

  if (lowerPath.includes('/export')) {
    return 'data_export';
  }

  if (lowerPath.includes('/consent')) {
    return 'consent_change';
  }

  if (method === 'GET' && GDPR_RELEVANT_PATHS.some(p => lowerPath.startsWith(p.toLowerCase()))) {
    return 'data_access';
  }

  return null;
}

/**
 * Extract data types from request path
 */
function extractDataTypes(path: string): string[] {
  const dataTypeMap: Record<string, string[]> = {
    '/api/users': ['personal_data', 'contact_info', 'authentication_data'],
    '/api/profiles': ['personal_data', 'professional_data', 'preferences'],
    '/api/voice': ['audio_data', 'biometric_data', 'transcripts'],
    '/api/analytics': ['usage_data', 'behavior_data']
  };

  const lowerPath = path.toLowerCase();
  
  for (const [pathPrefix, types] of Object.entries(dataTypeMap)) {
    if (lowerPath.startsWith(pathPrefix.toLowerCase())) {
      return types;
    }
  }

  return ['general_data'];
}

/**
 * Enhanced audit logger for sensitive operations
 */
export function auditSensitiveOperation(operation: string, details: Record<string, any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log operation start
    logger.info(`Sensitive operation started: ${operation}`, {
      userId: req.user?.id,
      sessionId: req.user?.sessionId,
      operation,
      details: sanitizeForAudit(details),
      ipAddress: req.ip
    });

    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      // Log operation completion
      logger.info(`Sensitive operation completed: ${operation}`, {
        userId: req.user?.id,
        sessionId: req.user?.sessionId,
        operation,
        success,
        duration,
        statusCode: res.statusCode,
        ipAddress: req.ip
      });

      // Store detailed audit record
      try {
        await AuditService.logSensitiveOperation({
          operation,
          userId: req.user?.id || 'unknown',
          details: sanitizeForAudit(details),
          success,
          duration,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Failed to log sensitive operation', {
          error: error instanceof Error ? error.message : error,
          operation,
          userId: req.user?.id
        });
      }
    });

    next();
  };
}

/**
 * Declare module augmentation for Express Request
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
