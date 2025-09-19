import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * Audit event interface
 */
export interface AuditEvent {
  id?: string;
  correlationId?: string;
  operation: string;
  resource: string;
  resourceId?: string;
  userId: string;
  userRole?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  duration?: number;
  success: boolean;
  error?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  eventType?: string;
  auditLevel?: string;
  timestamp: Date;
}

/**
 * Auth audit event interface
 */
export interface AuthAuditEvent {
  userId?: string;
  eventType: 'login_success' | 'login_failed' | 'logout' | 'token_refresh' | 'session_expired' | 'password_reset' | 'account_locked' | 'suspicious_activity';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

/**
 * Sensitive operation audit interface
 */
export interface SensitiveOperationAudit {
  operation: string;
  userId: string;
  details: Record<string, any>;
  success: boolean;
  duration: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Audit query filters
 */
export interface AuditFilters {
  userId?: string;
  resource?: string;
  operation?: string;
  eventType?: string;
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  correlationId?: string;
}

/**
 * Audit service class
 */
export class AuditService {
  private static readonly BATCH_SIZE = 1000;
  private static readonly MAX_RETENTION_DAYS = config.gdpr.dataRetentionDays.auditLogs;

  /**
   * Log audit event
   */
  static async logEvent(event: AuditEvent): Promise<void> {
    try {
      await DatabaseService.query(
        `INSERT INTO audit_events (
          correlation_id, operation, resource, resource_id, user_id, user_role,
          session_id, ip_address, user_agent, status_code, duration,
          success, error, changes, metadata, event_type, audit_level,
          timestamp
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )`,
        [
          event.correlationId,
          event.operation,
          event.resource,
          event.resourceId,
          event.userId,
          event.userRole,
          event.sessionId,
          event.ipAddress,
          event.userAgent,
          event.statusCode,
          event.duration,
          event.success,
          event.error,
          event.changes ? JSON.stringify(event.changes) : null,
          event.metadata ? JSON.stringify(event.metadata) : null,
          event.eventType,
          event.auditLevel,
          event.timestamp
        ]
      );
    } catch (error) {
      logger.error('Failed to log audit event', {
        error: error instanceof Error ? error.message : error,
        event: {
          ...event,
          changes: event.changes ? '[OBJECT]' : undefined,
          metadata: event.metadata ? '[OBJECT]' : undefined
        }
      });
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Log authentication event
   */
  static async logAuthEvent(event: AuthAuditEvent): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.gdpr.dataRetentionDays.logs);

      await DatabaseService.query(
        `INSERT INTO auth_audit_log (
          user_id, event_type, ip_address, user_agent, details, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.userId,
          event.eventType,
          event.ipAddress,
          event.userAgent,
          event.details ? JSON.stringify(event.details) : null,
          expiresAt
        ]
      );

      logger.debug('Auth event logged', {
        userId: event.userId,
        eventType: event.eventType,
        ipAddress: event.ipAddress
      });
    } catch (error) {
      logger.error('Failed to log auth event', {
        error: error instanceof Error ? error.message : error,
        event
      });
    }
  }

  /**
   * Log sensitive operation
   */
  static async logSensitiveOperation(operation: SensitiveOperationAudit): Promise<void> {
    try {
      await DatabaseService.query(
        `INSERT INTO sensitive_operations_audit (
          operation, user_id, details, success, duration,
          ip_address, user_agent, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          operation.operation,
          operation.userId,
          JSON.stringify(operation.details),
          operation.success,
          operation.duration,
          operation.ipAddress,
          operation.userAgent,
          operation.timestamp
        ]
      );

      logger.info('Sensitive operation logged', {
        operation: operation.operation,
        userId: operation.userId,
        success: operation.success,
        duration: operation.duration
      });
    } catch (error) {
      logger.error('Failed to log sensitive operation', {
        error: error instanceof Error ? error.message : error,
        operation: {
          ...operation,
          details: '[OBJECT]'
        }
      });
    }
  }

  /**
   * Get audit events with filtering and pagination
   */
  static async getAuditEvents(
    filters: AuditFilters = {},
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'timestamp',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    events: AuditEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const validSortFields = ['timestamp', 'operation', 'resource', 'user_id', 'success', 'duration'];
      if (!validSortFields.includes(sortBy)) {
        sortBy = 'timestamp';
      }

      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        whereClause += ` AND user_id = $${paramIndex++}`;
        values.push(filters.userId);
      }

      if (filters.resource) {
        whereClause += ` AND resource = $${paramIndex++}`;
        values.push(filters.resource);
      }

      if (filters.operation) {
        whereClause += ` AND operation ILIKE $${paramIndex++}`;
        values.push(`%${filters.operation}%`);
      }

      if (filters.eventType) {
        whereClause += ` AND event_type = $${paramIndex++}`;
        values.push(filters.eventType);
      }

      if (filters.success !== undefined) {
        whereClause += ` AND success = $${paramIndex++}`;
        values.push(filters.success);
      }

      if (filters.dateFrom) {
        whereClause += ` AND timestamp >= $${paramIndex++}`;
        values.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereClause += ` AND timestamp <= $${paramIndex++}`;
        values.push(filters.dateTo);
      }

      if (filters.ipAddress) {
        whereClause += ` AND ip_address = $${paramIndex++}`;
        values.push(filters.ipAddress);
      }

      if (filters.correlationId) {
        whereClause += ` AND correlation_id = $${paramIndex++}`;
        values.push(filters.correlationId);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*)::int as total FROM audit_events ${whereClause}`;
      const countResult = await DatabaseService.query<{ total: number }>(countQuery, values);
      const total = countResult.rows[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      values.push(limit, offset);

      const eventsQuery = `
        SELECT * FROM audit_events 
        ${whereClause} 
        ${orderClause} 
        ${limitClause}
      `;

      const eventsResult = await DatabaseService.query<AuditEvent>(eventsQuery, values);

      // Parse JSON fields
      const events = eventsResult.rows.map(event => ({
        ...event,
        changes: event.changes ? JSON.parse(event.changes as string) : undefined,
        metadata: event.metadata ? JSON.parse(event.metadata as string) : undefined
      }));

      return { events, total, page, limit };
    } catch (error) {
      logger.error('Failed to get audit events', {
        error: error instanceof Error ? error.message : error,
        filters
      });
      throw error;
    }
  }

  /**
   * Get authentication audit log
   */
  static async getAuthAuditLog(
    userId?: string,
    eventType?: AuthAuditEvent['eventType'],
    page: number = 1,
    limit: number = 50
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      let whereClause = 'WHERE expires_at > NOW()';
      const values: any[] = [];
      let paramIndex = 1;

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex++}`;
        values.push(userId);
      }

      if (eventType) {
        whereClause += ` AND event_type = $${paramIndex++}`;
        values.push(eventType);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*)::int as total FROM auth_audit_log ${whereClause}`;
      const countResult = await DatabaseService.query<{ total: number }>(countQuery, values);
      const total = countResult.rows[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      values.push(limit, offset);

      const eventsQuery = `
        SELECT * FROM auth_audit_log 
        ${whereClause} 
        ORDER BY created_at DESC 
        ${limitClause}
      `;

      const eventsResult = await DatabaseService.query(eventsQuery, values);

      // Parse JSON details
      const events = eventsResult.rows.map(event => ({
        ...event,
        details: event.details ? JSON.parse(event.details) : undefined
      }));

      return { events, total, page, limit };
    } catch (error) {
      logger.error('Failed to get auth audit log', {
        error: error instanceof Error ? error.message : error,
        userId,
        eventType
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueUsers: number;
    topOperations: Array<{ operation: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
    eventsByDay: Array<{ date: string; count: number }>;
  }> {
    try {
      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (dateFrom) {
        whereClause += ` AND timestamp >= $${paramIndex++}`;
        values.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ` AND timestamp <= $${paramIndex++}`;
        values.push(dateTo);
      }

      // Get overall statistics
      const statsQuery = `
        SELECT 
          COUNT(*)::int as total_events,
          COUNT(CASE WHEN success THEN 1 END)::int as successful_events,
          COUNT(CASE WHEN NOT success THEN 1 END)::int as failed_events,
          COUNT(DISTINCT user_id)::int as unique_users
        FROM audit_events 
        ${whereClause}
      `;

      const statsResult = await DatabaseService.query<{
        total_events: number;
        successful_events: number;
        failed_events: number;
        unique_users: number;
      }>(statsQuery, values);

      const stats = statsResult.rows[0];

      // Get top operations
      const topOperationsQuery = `
        SELECT operation, COUNT(*)::int as count
        FROM audit_events
        ${whereClause}
        GROUP BY operation
        ORDER BY count DESC
        LIMIT 10
      `;

      const topOperationsResult = await DatabaseService.query<{
        operation: string;
        count: number;
      }>(topOperationsQuery, values);

      // Get top resources
      const topResourcesQuery = `
        SELECT resource, COUNT(*)::int as count
        FROM audit_events
        ${whereClause}
        GROUP BY resource
        ORDER BY count DESC
        LIMIT 10
      `;

      const topResourcesResult = await DatabaseService.query<{
        resource: string;
        count: number;
      }>(topResourcesQuery, values);

      // Get events by day
      const eventsByDayQuery = `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*)::int as count
        FROM audit_events
        ${whereClause}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        LIMIT 30
      `;

      const eventsByDayResult = await DatabaseService.query<{
        date: string;
        count: number;
      }>(eventsByDayQuery, values);

      return {
        totalEvents: stats?.total_events || 0,
        successfulEvents: stats?.successful_events || 0,
        failedEvents: stats?.failed_events || 0,
        uniqueUsers: stats?.unique_users || 0,
        topOperations: topOperationsResult.rows,
        topResources: topResourcesResult.rows,
        eventsByDay: eventsByDayResult.rows
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', {
        error: error instanceof Error ? error.message : error,
        dateFrom,
        dateTo
      });
      throw error;
    }
  }

  /**
   * Clean up old audit events (GDPR compliance)
   */
  static async cleanupOldEvents(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.MAX_RETENTION_DAYS);

      const result = await DatabaseService.query<{ deleted_count: number }>(
        `WITH deleted AS (
          DELETE FROM audit_events 
          WHERE timestamp < $1 
          RETURNING id
        ) 
        SELECT COUNT(*)::int as deleted_count FROM deleted`,
        [cutoffDate]
      );

      const deletedCount = result.rows[0]?.deleted_count || 0;

      if (deletedCount > 0) {
        logger.info('Cleaned up old audit events', {
          deletedCount,
          cutoffDate,
          retentionDays: this.MAX_RETENTION_DAYS
        });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old audit events', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Export audit events for compliance
   */
  static async exportAuditEvents(
    filters: AuditFilters = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: any[]; count: number }> {
    try {
      const result = await this.getAuditEvents(filters, 1, 10000); // Large limit for export
      
      if (format === 'csv') {
        // Convert to CSV format
        const csvData = result.events.map(event => ({
          timestamp: event.timestamp?.toISOString(),
          operation: event.operation,
          resource: event.resource,
          resourceId: event.resourceId,
          userId: event.userId,
          userRole: event.userRole,
          success: event.success,
          ipAddress: event.ipAddress,
          duration: event.duration,
          error: event.error,
          correlationId: event.correlationId
        }));

        return { data: csvData, count: result.total };
      }

      return { data: result.events, count: result.total };
    } catch (error) {
      logger.error('Failed to export audit events', {
        error: error instanceof Error ? error.message : error,
        filters,
        format
      });
      throw error;
    }
  }

  /**
   * Search audit events by text
   */
  static async searchAuditEvents(
    searchTerm: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    events: AuditEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const searchPattern = `%${searchTerm}%`;
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*)::int as total 
        FROM audit_events 
        WHERE 
          operation ILIKE $1 OR 
          resource ILIKE $1 OR 
          resource_id ILIKE $1 OR
          user_id ILIKE $1 OR
          error ILIKE $1 OR
          correlation_id ILIKE $1
      `;

      const countResult = await DatabaseService.query<{ total: number }>(
        countQuery, 
        [searchPattern]
      );
      const total = countResult.rows[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const eventsQuery = `
        SELECT * FROM audit_events 
        WHERE 
          operation ILIKE $1 OR 
          resource ILIKE $1 OR 
          resource_id ILIKE $1 OR
          user_id ILIKE $1 OR
          error ILIKE $1 OR
          correlation_id ILIKE $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const eventsResult = await DatabaseService.query<AuditEvent>(
        eventsQuery, 
        [searchPattern, limit, offset]
      );

      // Parse JSON fields
      const events = eventsResult.rows.map(event => ({
        ...event,
        changes: event.changes ? JSON.parse(event.changes as string) : undefined,
        metadata: event.metadata ? JSON.parse(event.metadata as string) : undefined
      }));

      return { events, total, page, limit };
    } catch (error) {
      logger.error('Failed to search audit events', {
        error: error instanceof Error ? error.message : error,
        searchTerm
      });
      throw error;
    }
  }
}
