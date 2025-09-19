import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/config';
import { logger, createDbLogger } from '../utils/logger';
import { DatabaseError } from '../middleware/errorHandler';

/**
 * Database connection pool
 */
let pool: Pool;

/**
 * Query interface for type safety
 */
export interface QueryConfig {
  text: string;
  values?: any[];
  name?: string;
}

/**
 * Transaction callback interface
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Database service class
 */
export class DatabaseService {
  /**
   * Initialize database connection pool
   */
  static async initialize(): Promise<void> {
    try {
      pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.username,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        min: config.database.pool.min,
        max: config.database.pool.max,
        idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
        connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
        // Connection validation
        application_name: 'career-platform-gateway',
        statement_timeout: 30000, // 30 seconds
        query_timeout: 30000,
        // Security settings
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connection pool initialized', {
        host: config.database.host,
        database: config.database.database,
        poolSize: config.database.pool.max
      });

      // Set up pool event handlers
      pool.on('connect', (client) => {
        logger.debug('New database client connected', {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount
        });
      });

      pool.on('acquire', (client) => {
        logger.debug('Database client acquired from pool', {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount
        });
      });

      pool.on('error', (err) => {
        logger.error('Database pool error', {
          error: err.message,
          stack: err.stack
        });
      });

      pool.on('remove', (client) => {
        logger.debug('Database client removed from pool', {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount
        });
      });

    } catch (error) {
      logger.error('Failed to initialize database connection pool', {
        error: error instanceof Error ? error.message : error,
        config: {
          host: config.database.host,
          port: config.database.port,
          database: config.database.database
        }
      });
      throw new DatabaseError('Failed to initialize database connection');
    }
  }

  /**
   * Execute a query
   */
  static async query<T = any>(
    queryConfig: QueryConfig | string,
    values?: any[],
    correlationId?: string
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const dbLogger = createDbLogger(
      typeof queryConfig === 'string' ? queryConfig : queryConfig.text,
      correlationId
    );

    let client: PoolClient | undefined;

    try {
      client = await pool.connect();
      
      let result: QueryResult<T>;
      
      if (typeof queryConfig === 'string') {
        result = await client.query(queryConfig, values);
      } else {
        result = await client.query(queryConfig);
      }

      const duration = Date.now() - startTime;

      dbLogger.info('Query executed successfully', {
        rowCount: result.rowCount,
        duration: `${duration}ms`,
        command: result.command
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      dbLogger.error('Query execution failed', {
        error: error instanceof Error ? error.message : error,
        duration: `${duration}ms`,
        code: (error as any)?.code,
        detail: (error as any)?.detail
      });

      throw error;

    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  static async transaction<T>(
    callback: TransactionCallback<T>,
    correlationId?: string
  ): Promise<T> {
    const startTime = Date.now();
    const dbLogger = createDbLogger('TRANSACTION', correlationId);

    let client: PoolClient | undefined;

    try {
      client = await pool.connect();
      
      await client.query('BEGIN');
      dbLogger.debug('Transaction started');

      const result = await callback(client);
      
      await client.query('COMMIT');
      
      const duration = Date.now() - startTime;
      dbLogger.info('Transaction committed successfully', {
        duration: `${duration}ms`
      });

      return result;

    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
        dbLogger.warn('Transaction rolled back', {
          error: error instanceof Error ? error.message : error
        });
      }

      const duration = Date.now() - startTime;
      dbLogger.error('Transaction failed', {
        error: error instanceof Error ? error.message : error,
        duration: `${duration}ms`
      });

      throw error;

    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute a prepared statement
   */
  static async preparedQuery<T = any>(
    name: string,
    text: string,
    values: any[] = [],
    correlationId?: string
  ): Promise<QueryResult<T>> {
    return this.query<T>({ name, text, values }, undefined, correlationId);
  }

  /**
   * Get pool statistics
   */
  static getPoolStats() {
    if (!pool) {
      return null;
    }

    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }

  /**
   * Check if database is connected
   */
  static async isConnected(): Promise<boolean> {
    try {
      if (!pool) {
        return false;
      }

      const result = await this.query('SELECT 1 as connected');
      return result.rows[0]?.connected === 1;
    } catch {
      return false;
    }
  }

  /**
   * Close database connection pool
   */
  static async close(): Promise<void> {
    if (pool) {
      await pool.end();
      logger.info('Database connection pool closed');
    }
  }

  /**
   * Set user context for Row Level Security (RLS)
   */
  static async setUserContext(userId: string, role: string, client?: PoolClient): Promise<void> {
    const query = `
      SELECT set_config('app.current_user_id', $1, true),
             set_config('app.current_user_role', $2, true)
    `;
    
    if (client) {
      await client.query(query, [userId, role]);
    } else {
      await this.query(query, [userId, role]);
    }
  }

  /**
   * Clear user context
   */
  static async clearUserContext(client?: PoolClient): Promise<void> {
    const query = `
      SELECT set_config('app.current_user_id', '', true),
             set_config('app.current_user_role', '', true)
    `;
    
    if (client) {
      await client.query(query);
    } else {
      await this.query(query);
    }
  }

  /**
   * Execute query with user context
   */
  static async queryWithContext<T = any>(
    userId: string,
    role: string,
    queryConfig: QueryConfig | string,
    values?: any[],
    correlationId?: string
  ): Promise<QueryResult<T>> {
    const client = await pool.connect();
    
    try {
      await this.setUserContext(userId, role, client);
      
      let result: QueryResult<T>;
      
      if (typeof queryConfig === 'string') {
        result = await client.query(queryConfig, values);
      } else {
        result = await client.query(queryConfig);
      }

      return result;

    } finally {
      await this.clearUserContext(client);
      client.release();
    }
  }

  /**
   * Build WHERE clause with filters
   */
  static buildWhereClause(
    filters: Record<string, any>,
    startIndex: number = 1
  ): { clause: string; values: any[]; nextIndex: number } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = startIndex;

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(',');
          conditions.push(`${key} IN (${placeholders})`);
          values.push(...value);
        }
      } else if (typeof value === 'string' && value.includes('%')) {
        conditions.push(`${key} ILIKE $${paramIndex++}`);
        values.push(value);
      } else {
        conditions.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { clause, values, nextIndex: paramIndex };
  }

  /**
   * Build pagination clause
   */
  static buildPaginationClause(
    page: number = 1,
    limit: number = 20,
    paramIndex: number = 1
  ): { clause: string; values: any[]; nextIndex: number } {
    const offset = (page - 1) * limit;
    
    return {
      clause: `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      values: [limit, offset],
      nextIndex: paramIndex + 2
    };
  }

  /**
   * Build ORDER BY clause
   */
  static buildOrderByClause(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
    validSortFields: string[] = []
  ): string {
    if (!sortBy || !validSortFields.includes(sortBy)) {
      return '';
    }

    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    return `ORDER BY ${sortBy} ${order}`;
  }
}

/**
 * Initialize database connection on module load
 */
export async function connectDatabase(): Promise<void> {
  await DatabaseService.initialize();
}
