import { DatabaseService } from './DatabaseService';
import { RedisService } from '../cache/redis';
import { logger, logGDPREvent } from '../utils/logger';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  externalId?: string;
  role: 'employee' | 'hr_specialist' | 'hr_manager' | 'team_lead' | 'admin' | 'system';
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  dataProcessingConsent: boolean;
  consentDate?: Date;
  dataRetentionUntil?: Date;
}

/**
 * Create user input interface
 */
export interface CreateUserInput {
  email: string;
  externalId?: string;
  role?: User['role'];
  dataProcessingConsent?: boolean;
  firstName?: string;
  lastName?: string;
}

/**
 * Update user input interface
 */
export interface UpdateUserInput {
  email?: string;
  role?: User['role'];
  status?: User['status'];
  dataProcessingConsent?: boolean;
}

/**
 * User query filters interface
 */
export interface UserFilters {
  role?: User['role'] | User['role'][];
  status?: User['status'] | User['status'][];
  search?: string; // Search in email or profile name
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

/**
 * User service class
 */
export class UserService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly CACHE_PREFIX = 'user:';

  /**
   * Get user by ID
   */
  static async getUserById(id: string, useCache: boolean = true): Promise<User | null> {
    try {
      // Try cache first
      if (useCache) {
        const cachedUser = await RedisService.get<User>(
          `${this.CACHE_PREFIX}${id}`, 
          true
        );
        if (cachedUser) {
          return cachedUser;
        }
      }

      const result = await DatabaseService.query<User>(
        'SELECT * FROM users WHERE id = $1 AND status != $2',
        [id, 'deleted']
      );

      const user = result.rows[0] || null;

      // Cache the result
      if (user && useCache) {
        await RedisService.set(`${this.CACHE_PREFIX}${id}`, user, this.CACHE_TTL);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user by ID', {
        error: error instanceof Error ? error.message : error,
        userId: id
      });
      throw error;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string, useCache: boolean = true): Promise<User | null> {
    try {
      // Try cache first
      const cacheKey = `${this.CACHE_PREFIX}email:${email.toLowerCase()}`;
      if (useCache) {
        const cachedUser = await RedisService.get<User>(cacheKey, true);
        if (cachedUser) {
          return cachedUser;
        }
      }

      const result = await DatabaseService.query<User>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND status != $2',
        [email, 'deleted']
      );

      const user = result.rows[0] || null;

      // Cache the result
      if (user && useCache) {
        await RedisService.set(cacheKey, user, this.CACHE_TTL);
        await RedisService.set(`${this.CACHE_PREFIX}${user.id}`, user, this.CACHE_TTL);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user by email', {
        error: error instanceof Error ? error.message : error,
        email: email.toLowerCase()
      });
      throw error;
    }
  }

  /**
   * Get user by external ID (OIDC)
   */
  static async getUserByExternalId(externalId: string, useCache: boolean = true): Promise<User | null> {
    try {
      // Try cache first
      const cacheKey = `${this.CACHE_PREFIX}external:${externalId}`;
      if (useCache) {
        const cachedUser = await RedisService.get<User>(cacheKey, true);
        if (cachedUser) {
          return cachedUser;
        }
      }

      const result = await DatabaseService.query<User>(
        'SELECT * FROM users WHERE external_id = $1 AND status != $2',
        [externalId, 'deleted']
      );

      const user = result.rows[0] || null;

      // Cache the result
      if (user && useCache) {
        await RedisService.set(cacheKey, user, this.CACHE_TTL);
        await RedisService.set(`${this.CACHE_PREFIX}${user.id}`, user, this.CACHE_TTL);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user by external ID', {
        error: error instanceof Error ? error.message : error,
        externalId
      });
      throw error;
    }
  }

  /**
   * Create new user
   */
  static async createUser(
    input: CreateUserInput,
    createdBy?: string
  ): Promise<User> {
    try {
      // Check if email already exists
      const existingUser = await this.getUserByEmail(input.email, false);
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Check if external ID already exists
      if (input.externalId) {
        const existingExternalUser = await this.getUserByExternalId(input.externalId, false);
        if (existingExternalUser) {
          throw new ConflictError('External ID already registered');
        }
      }

      const result = await DatabaseService.query<User>(
        `INSERT INTO users (
          email, external_id, role, data_processing_consent, 
          consent_date, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) RETURNING *`,
        [
          input.email,
          input.externalId || null,
          input.role || 'employee',
          input.dataProcessingConsent || false,
          input.dataProcessingConsent ? new Date() : null,
          createdBy || null
        ]
      );

      const user = result.rows[0];

      // Create initial profile if name provided
      if (input.firstName || input.lastName) {
        await DatabaseService.query(
          `INSERT INTO user_profiles (
            user_id, first_name, last_name, display_name
          ) VALUES ($1, $2, $3, $4)`,
          [
            user.id,
            input.firstName || null,
            input.lastName || null,
            [input.firstName, input.lastName].filter(Boolean).join(' ') || null
          ]
        );
      }

      // Initialize XP balance
      await DatabaseService.query(
        'INSERT INTO user_xp_balances (user_id) VALUES ($1)',
        [user.id]
      );

      // Clear related caches
      await this.clearUserCache(user.id, user.email, user.externalId);

      // Log GDPR event
      if (input.dataProcessingConsent) {
        logGDPREvent({
          type: 'consent_change',
          userId: user.id,
          description: 'User registered with data processing consent',
          legalBasis: 'consent',
          dataTypes: ['personal_data', 'contact_info'],
          metadata: { action: 'user_registration' }
        });
      }

      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdBy
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : error,
        input: { ...input, email: input.email.toLowerCase() }
      });
      throw error;
    }
  }

  /**
   * Update user
   */
  static async updateUser(
    id: string,
    input: UpdateUserInput,
    updatedBy?: string
  ): Promise<User> {
    try {
      // Get existing user
      const existingUser = await this.getUserById(id, false);
      if (!existingUser) {
        throw new NotFoundError('User', id);
      }

      // Check email uniqueness if changing
      if (input.email && input.email !== existingUser.email) {
        const existingEmailUser = await this.getUserByEmail(input.email, false);
        if (existingEmailUser && existingEmailUser.id !== id) {
          throw new ConflictError('Email already in use');
        }
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (input.email) {
        updateFields.push(`email = $${paramIndex++}`);
        values.push(input.email);
      }

      if (input.role) {
        updateFields.push(`role = $${paramIndex++}`);
        values.push(input.role);
      }

      if (input.status) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(input.status);
      }

      if (input.dataProcessingConsent !== undefined) {
        updateFields.push(`data_processing_consent = $${paramIndex++}`);
        values.push(input.dataProcessingConsent);
        
        if (input.dataProcessingConsent) {
          updateFields.push(`consent_date = $${paramIndex++}`);
          values.push(new Date());
        }
      }

      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy || null);

      values.push(id); // WHERE clause

      const result = await DatabaseService.query<User>(
        `UPDATE users SET 
          ${updateFields.join(', ')}, 
          updated_at = NOW() 
         WHERE id = $${paramIndex} AND status != 'deleted'
         RETURNING *`,
        values
      );

      const user = result.rows[0];
      if (!user) {
        throw new NotFoundError('User', id);
      }

      // Clear caches
      await this.clearUserCache(user.id, user.email, user.externalId);
      if (existingUser.email !== user.email) {
        await this.clearUserCache(null, existingUser.email);
      }

      // Log GDPR event if consent changed
      if (input.dataProcessingConsent !== undefined && 
          input.dataProcessingConsent !== existingUser.dataProcessingConsent) {
        logGDPREvent({
          type: 'consent_change',
          userId: user.id,
          description: `Data processing consent ${input.dataProcessingConsent ? 'granted' : 'withdrawn'}`,
          legalBasis: input.dataProcessingConsent ? 'consent' : undefined,
          metadata: { 
            previousConsent: existingUser.dataProcessingConsent,
            newConsent: input.dataProcessingConsent,
            updatedBy 
          }
        });
      }

      logger.info('User updated successfully', {
        userId: user.id,
        changes: Object.keys(input),
        updatedBy
      });

      return user;
    } catch (error) {
      logger.error('Failed to update user', {
        error: error instanceof Error ? error.message : error,
        userId: id,
        updatedBy
      });
      throw error;
    }
  }

  /**
   * Soft delete user (GDPR compliance)
   */
  static async deleteUser(id: string, deletedBy?: string): Promise<void> {
    try {
      const user = await this.getUserById(id, false);
      if (!user) {
        throw new NotFoundError('User', id);
      }

      await DatabaseService.transaction(async (client) => {
        // Soft delete user
        await client.query(
          'UPDATE users SET status = $1, updated_by = $2, updated_at = NOW() WHERE id = $3',
          ['deleted', deletedBy || null, id]
        );

        // Anonymize profile data
        await client.query(
          `UPDATE user_profiles SET 
            data_anonymized = true,
            anonymized_at = NOW(),
            first_name = NULL,
            last_name = NULL,
            display_name = 'Deleted User',
            bio = NULL,
            phone = NULL,
            linkedin_url = NULL
           WHERE user_id = $1`,
          [id]
        );

        // Set data retention until date
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() + 30); // 30 days for deletion

        await client.query(
          'UPDATE users SET data_retention_until = $1 WHERE id = $2',
          [retentionDate, id]
        );
      });

      // Clear all caches
      await this.clearUserCache(id, user.email, user.externalId);

      // Log GDPR event
      logGDPREvent({
        type: 'data_deletion',
        userId: id,
        description: 'User account deleted and data anonymized',
        metadata: { deletedBy, retentionDays: 30 }
      });

      logger.info('User deleted successfully', {
        userId: id,
        deletedBy
      });
    } catch (error) {
      logger.error('Failed to delete user', {
        error: error instanceof Error ? error.message : error,
        userId: id,
        deletedBy
      });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<void> {
    try {
      await DatabaseService.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [id]
      );

      // Clear user cache to ensure fresh data
      await RedisService.delete(`${this.CACHE_PREFIX}${id}`);
    } catch (error) {
      logger.error('Failed to update last login', {
        error: error instanceof Error ? error.message : error,
        userId: id
      });
      // Don't throw error for login timestamp update
    }
  }

  /**
   * Get users with filters and pagination
   */
  static async getUsers(
    filters: UserFilters = {},
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    try {
      const validSortFields = ['created_at', 'updated_at', 'last_login_at', 'email', 'role', 'status'];
      if (!validSortFields.includes(sortBy)) {
        sortBy = 'created_at';
      }

      let whereClause = 'WHERE u.status != $1';
      const values: any[] = ['deleted'];
      let paramIndex = 2;

      // Apply filters
      if (filters.role) {
        const roles = Array.isArray(filters.role) ? filters.role : [filters.role];
        const rolePlaceholders = roles.map(() => `$${paramIndex++}`).join(',');
        whereClause += ` AND u.role IN (${rolePlaceholders})`;
        values.push(...roles);
      }

      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        const statusPlaceholders = statuses.map(() => `$${paramIndex++}`).join(',');
        whereClause += ` AND u.status IN (${statusPlaceholders})`;
        values.push(...statuses);
      }

      if (filters.search) {
        whereClause += ` AND (
          u.email ILIKE $${paramIndex} OR 
          p.display_name ILIKE $${paramIndex} OR
          CONCAT(p.first_name, ' ', p.last_name) ILIKE $${paramIndex}
        )`;
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.createdAfter) {
        whereClause += ` AND u.created_at >= $${paramIndex++}`;
        values.push(filters.createdAfter);
      }

      if (filters.createdBefore) {
        whereClause += ` AND u.created_at <= $${paramIndex++}`;
        values.push(filters.createdBefore);
      }

      if (filters.lastLoginAfter) {
        whereClause += ` AND u.last_login_at >= $${paramIndex++}`;
        values.push(filters.lastLoginAfter);
      }

      if (filters.lastLoginBefore) {
        whereClause += ` AND u.last_login_at <= $${paramIndex++}`;
        values.push(filters.lastLoginBefore);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*)::int as total
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ${whereClause}
      `;

      const countResult = await DatabaseService.query<{ total: number }>(countQuery, values);
      const total = countResult.rows[0]?.total || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const orderClause = `ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}`;
      const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      values.push(limit, offset);

      const usersQuery = `
        SELECT u.* 
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ${whereClause}
        ${orderClause}
        ${limitClause}
      `;

      const usersResult = await DatabaseService.query<User>(usersQuery, values);

      return {
        users: usersResult.rows,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Failed to get users', {
        error: error instanceof Error ? error.message : error,
        filters,
        page,
        limit
      });
      throw error;
    }
  }

  /**
   * Clear user cache
   */
  private static async clearUserCache(
    userId?: string | null,
    email?: string | null,
    externalId?: string | null
  ): Promise<void> {
    const cacheKeys: string[] = [];

    if (userId) {
      cacheKeys.push(`${this.CACHE_PREFIX}${userId}`);
    }

    if (email) {
      cacheKeys.push(`${this.CACHE_PREFIX}email:${email.toLowerCase()}`);
    }

    if (externalId) {
      cacheKeys.push(`${this.CACHE_PREFIX}external:${externalId}`);
    }

    if (cacheKeys.length > 0) {
      await Promise.all(cacheKeys.map(key => RedisService.delete(key)));
    }
  }
}
