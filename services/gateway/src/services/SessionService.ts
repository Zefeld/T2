import { DatabaseService } from './DatabaseService';
import { RedisService } from '../cache/redis';
import { logger, logSecurityEvent } from '../utils/logger';
import { config } from '../config/config';
import { NotFoundError, AuthenticationError } from '../middleware/errorHandler';
import crypto from 'crypto';

/**
 * User session interface
 */
export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
  idToken?: string;
  accessToken?: string;
  tokenExpiresAt?: Date;
}

/**
 * Create session input interface
 */
export interface CreateSessionInput {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  idToken?: string;
  accessToken?: string;
  tokenExpiresAt?: Date;
  expiresIn?: number; // seconds
}

/**
 * Session service class
 */
export class SessionService {
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly CACHE_PREFIX = 'session:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private static readonly MAX_SESSIONS_PER_USER = 5;
  private static readonly SESSION_CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

  static {
    // Start periodic cleanup
    setInterval(() => {
      this.cleanupExpiredSessions().catch(error => 
        logger.error('Session cleanup failed', { error })
      );
    }, this.SESSION_CLEANUP_INTERVAL);
  }

  /**
   * Generate secure session token
   */
  private static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure refresh token
   */
  private static generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  /**
   * Create new session
   */
  static async createSession(input: CreateSessionInput): Promise<UserSession> {
    try {
      const sessionToken = this.generateSessionToken();
      const refreshToken = this.generateRefreshToken();
      const expiresAt = new Date(Date.now() + (input.expiresIn || config.security.sessionTimeout));

      // Check for existing sessions and enforce limit
      await this.enforceSessionLimit(input.userId);

      const result = await DatabaseService.query<UserSession>(
        `INSERT INTO user_sessions (
          user_id, session_token, refresh_token, expires_at,
          ip_address, user_agent, id_token, access_token, token_expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *`,
        [
          input.userId,
          sessionToken,
          refreshToken,
          expiresAt,
          input.ipAddress,
          input.userAgent,
          input.idToken,
          input.accessToken,
          input.tokenExpiresAt
        ]
      );

      const session = result.rows[0];

      // Cache session
      await RedisService.set(
        `${this.CACHE_PREFIX}${session.sessionToken}`,
        session,
        this.CACHE_TTL
      );

      // Add to user sessions set
      await RedisService.sadd(
        `${this.USER_SESSIONS_PREFIX}${input.userId}`,
        session.sessionToken
      );

      // Set expiration on user sessions set
      await RedisService.expire(
        `${this.USER_SESSIONS_PREFIX}${input.userId}`,
        Math.ceil(config.security.sessionTimeout / 1000)
      );

      logger.info('Session created', {
        sessionId: session.id,
        userId: input.userId,
        ipAddress: input.ipAddress,
        expiresAt
      });

      return session;
    } catch (error) {
      logger.error('Failed to create session', {
        error: error instanceof Error ? error.message : error,
        userId: input.userId,
        ipAddress: input.ipAddress
      });
      throw error;
    }
  }

  /**
   * Get session by token
   */
  static async getSession(sessionToken: string, useCache: boolean = true): Promise<UserSession | null> {
    try {
      // Try cache first
      if (useCache) {
        const cachedSession = await RedisService.get<UserSession>(
          `${this.CACHE_PREFIX}${sessionToken}`,
          true
        );
        if (cachedSession) {
          return cachedSession;
        }
      }

      const result = await DatabaseService.query<UserSession>(
        'SELECT * FROM user_sessions WHERE session_token = $1',
        [sessionToken]
      );

      const session = result.rows[0] || null;

      // Cache if found and not expired
      if (session && new Date() < new Date(session.expiresAt) && useCache) {
        await RedisService.set(
          `${this.CACHE_PREFIX}${sessionToken}`,
          session,
          this.CACHE_TTL
        );
      }

      return session;
    } catch (error) {
      logger.error('Failed to get session', {
        error: error instanceof Error ? error.message : error,
        sessionToken: sessionToken.substring(0, 8) + '...'
      });
      return null;
    }
  }

  /**
   * Update session last activity
   */
  static async updateLastActivity(sessionToken: string): Promise<void> {
    try {
      await DatabaseService.query(
        'UPDATE user_sessions SET last_activity_at = NOW() WHERE session_token = $1',
        [sessionToken]
      );

      // Update cache
      const session = await this.getSession(sessionToken, false);
      if (session) {
        session.lastActivityAt = new Date();
        await RedisService.set(
          `${this.CACHE_PREFIX}${sessionToken}`,
          session,
          this.CACHE_TTL
        );
      }
    } catch (error) {
      logger.error('Failed to update session activity', {
        error: error instanceof Error ? error.message : error,
        sessionToken: sessionToken.substring(0, 8) + '...'
      });
      // Don't throw error for activity updates
    }
  }

  /**
   * Refresh session tokens
   */
  static async refreshSession(
    refreshToken: string,
    newIdToken?: string,
    newAccessToken?: string,
    newTokenExpiresAt?: Date
  ): Promise<UserSession> {
    try {
      const result = await DatabaseService.query<UserSession>(
        'SELECT * FROM user_sessions WHERE refresh_token = $1',
        [refreshToken]
      );

      const session = result.rows[0];
      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        throw new AuthenticationError('Session expired');
      }

      // Generate new tokens
      const newSessionToken = this.generateSessionToken();
      const newRefreshToken = this.generateRefreshToken();
      const newExpiresAt = new Date(Date.now() + config.security.sessionTimeout);

      const updateResult = await DatabaseService.query<UserSession>(
        `UPDATE user_sessions SET 
          session_token = $1,
          refresh_token = $2,
          expires_at = $3,
          id_token = $4,
          access_token = $5,
          token_expires_at = $6,
          last_activity_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          newSessionToken,
          newRefreshToken,
          newExpiresAt,
          newIdToken || session.idToken,
          newAccessToken || session.accessToken,
          newTokenExpiresAt || session.tokenExpiresAt,
          session.id
        ]
      );

      const updatedSession = updateResult.rows[0];

      // Update caches
      await RedisService.delete(`${this.CACHE_PREFIX}${session.sessionToken}`);
      await RedisService.set(
        `${this.CACHE_PREFIX}${newSessionToken}`,
        updatedSession,
        this.CACHE_TTL
      );

      // Update user sessions set
      await RedisService.srem(`${this.USER_SESSIONS_PREFIX}${session.userId}`, session.sessionToken);
      await RedisService.sadd(`${this.USER_SESSIONS_PREFIX}${session.userId}`, newSessionToken);

      logger.info('Session refreshed', {
        sessionId: session.id,
        userId: session.userId,
        oldToken: session.sessionToken.substring(0, 8) + '...',
        newToken: newSessionToken.substring(0, 8) + '...'
      });

      return updatedSession;
    } catch (error) {
      logger.error('Failed to refresh session', {
        error: error instanceof Error ? error.message : error,
        refreshToken: refreshToken.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Delete session (logout)
   */
  static async deleteSession(sessionToken: string): Promise<void> {
    try {
      const session = await this.getSession(sessionToken, false);
      if (!session) {
        return; // Already deleted or doesn't exist
      }

      await DatabaseService.query(
        'DELETE FROM user_sessions WHERE session_token = $1',
        [sessionToken]
      );

      // Clear caches
      await RedisService.delete(`${this.CACHE_PREFIX}${sessionToken}`);
      await RedisService.srem(`${this.USER_SESSIONS_PREFIX}${session.userId}`, sessionToken);

      logger.info('Session deleted', {
        sessionId: session.id,
        userId: session.userId,
        sessionToken: sessionToken.substring(0, 8) + '...'
      });
    } catch (error) {
      logger.error('Failed to delete session', {
        error: error instanceof Error ? error.message : error,
        sessionToken: sessionToken.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Delete all sessions for user (logout from all devices)
   */
  static async deleteUserSessions(userId: string, exceptSessionToken?: string): Promise<number> {
    try {
      let query = 'DELETE FROM user_sessions WHERE user_id = $1';
      const values: any[] = [userId];

      if (exceptSessionToken) {
        query += ' AND session_token != $2';
        values.push(exceptSessionToken);
      }

      query += ' RETURNING session_token';

      const result = await DatabaseService.query<{ session_token: string }>(query, values);
      const deletedSessions = result.rows;

      // Clear caches
      await Promise.all([
        // Clear individual session caches
        ...deletedSessions.map(session => 
          RedisService.delete(`${this.CACHE_PREFIX}${session.session_token}`)
        ),
        // Clear user sessions set
        RedisService.delete(`${this.USER_SESSIONS_PREFIX}${userId}`)
      ]);

      logger.info('User sessions deleted', {
        userId,
        deletedCount: deletedSessions.length,
        exceptToken: exceptSessionToken ? exceptSessionToken.substring(0, 8) + '...' : undefined
      });

      return deletedSessions.length;
    } catch (error) {
      logger.error('Failed to delete user sessions', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Get user active sessions
   */
  static async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const result = await DatabaseService.query<UserSession>(
        `SELECT * FROM user_sessions 
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY last_activity_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user sessions', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Enforce session limit per user
   */
  private static async enforceSessionLimit(userId: string): Promise<void> {
    try {
      const activeSessions = await this.getUserSessions(userId);
      
      if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
        // Delete oldest sessions to make room
        const sessionsToDelete = activeSessions.slice(this.MAX_SESSIONS_PER_USER - 1);
        
        await Promise.all(
          sessionsToDelete.map(session => this.deleteSession(session.sessionToken))
        );

        logSecurityEvent({
          type: 'authentication',
          severity: 'medium',
          userId,
          description: `Enforced session limit: deleted ${sessionsToDelete.length} old sessions`,
          metadata: { maxSessions: this.MAX_SESSIONS_PER_USER }
        });
      }
    } catch (error) {
      logger.error('Failed to enforce session limit', {
        error: error instanceof Error ? error.message : error,
        userId
      });
    }
  }

  /**
   * Cleanup expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await DatabaseService.query<{ session_token: string }>(
        'DELETE FROM user_sessions WHERE expires_at < NOW() RETURNING session_token'
      );

      const expiredSessions = result.rows;

      if (expiredSessions.length > 0) {
        // Clear caches for expired sessions
        await Promise.all(
          expiredSessions.map(session => 
            RedisService.delete(`${this.CACHE_PREFIX}${session.session_token}`)
          )
        );

        logger.info('Cleaned up expired sessions', {
          deletedCount: expiredSessions.length
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Check for suspicious session activity
   */
  static async checkSuspiciousActivity(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Check for multiple sessions from different IPs in short time
      const recentSessions = await DatabaseService.query<{
        ip_address: string;
        user_agent: string;
        created_at: Date;
      }>(
        `SELECT ip_address, user_agent, created_at 
         FROM user_sessions 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
         ORDER BY created_at DESC`,
        [userId]
      );

      if (recentSessions.rows.length > 3) {
        const uniqueIPs = new Set(
          recentSessions.rows
            .filter(s => s.ip_address)
            .map(s => s.ip_address)
        );

        if (uniqueIPs.size > 2) {
          logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            userId,
            ipAddress,
            userAgent,
            description: `Multiple sessions from different IPs: ${Array.from(uniqueIPs).join(', ')}`,
            metadata: { 
              sessionCount: recentSessions.rows.length,
              uniqueIPs: uniqueIPs.size 
            }
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check suspicious activity', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      return false;
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    averageSessionDuration: number;
    uniqueUsers: number;
  }> {
    try {
      const result = await DatabaseService.query<{
        total_active: number;
        total_expired: number;
        avg_duration_minutes: number;
        unique_users: number;
      }>(
        `SELECT 
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END)::int as total_active,
          COUNT(CASE WHEN expires_at <= NOW() THEN 1 END)::int as total_expired,
          COALESCE(AVG(EXTRACT(EPOCH FROM (last_activity_at - created_at)) / 60), 0)::int as avg_duration_minutes,
          COUNT(DISTINCT user_id)::int as unique_users
         FROM user_sessions
         WHERE created_at > NOW() - INTERVAL '24 hours'`
      );

      const stats = result.rows[0];

      return {
        totalActive: stats?.total_active || 0,
        totalExpired: stats?.total_expired || 0,
        averageSessionDuration: stats?.avg_duration_minutes || 0,
        uniqueUsers: stats?.unique_users || 0
      };
    } catch (error) {
      logger.error('Failed to get session statistics', {
        error: error instanceof Error ? error.message : error
      });
      return {
        totalActive: 0,
        totalExpired: 0,
        averageSessionDuration: 0,
        uniqueUsers: 0
      };
    }
  }
}
