import { createClient, RedisClientType, RedisModules, RedisFunctions, RedisScripts } from 'redis';
import { config } from '../config/config';
import { logger, createIntegrationLogger } from '../utils/logger';
import { ExternalServiceError } from '../middleware/errorHandler';

/**
 * Redis client instance
 */
export let redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

/**
 * Redis service class
 */
export class RedisService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly CACHE_PREFIX = config.redis.prefix;

  /**
   * Initialize Redis connection
   */
  static async initialize(): Promise<void> {
    const redisLogger = createIntegrationLogger('redis', 'initialize');

    try {
      redisClient = createClient({
        url: config.redis.url,
        ...config.redis.options,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              redisLogger.error('Max Redis reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 50, 500);
          }
        }
      });

      // Set up event handlers
      redisClient.on('connect', () => {
        redisLogger.info('Redis client connecting');
      });

      redisClient.on('ready', () => {
        redisLogger.info('Redis client ready');
      });

      redisClient.on('error', (error) => {
        redisLogger.error('Redis client error', {
          error: error.message,
          stack: error.stack
        });
      });

      redisClient.on('reconnecting', () => {
        redisLogger.warn('Redis client reconnecting');
      });

      redisClient.on('end', () => {
        redisLogger.info('Redis client connection ended');
      });

      // Connect to Redis
      await redisClient.connect();

      // Test connection
      await redisClient.ping();

      redisLogger.info('Redis connection established successfully', {
        url: config.redis.url.replace(/\/\/.*@/, '//***:***@') // Hide credentials
      });

    } catch (error) {
      redisLogger.error('Failed to initialize Redis connection', {
        error: error instanceof Error ? error.message : error,
        url: config.redis.url.replace(/\/\/.*@/, '//***:***@')
      });
      throw new ExternalServiceError('Redis', 'Failed to connect to Redis');
    }
  }

  /**
   * Build cache key with prefix
   */
  private static buildKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Set a value in cache
   */
  static async set(
    key: string, 
    value: string | number | object, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      await redisClient.setEx(cacheKey, ttl, serializedValue);
      
      logger.debug('Cache set', { key: cacheKey, ttl });
    } catch (error) {
      logger.error('Failed to set cache', {
        error: error instanceof Error ? error.message : error,
        key
      });
      // Don't throw error for cache operations
    }
  }

  /**
   * Get a value from cache
   */
  static async get<T = string>(key: string, parseJson: boolean = false): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key);
      const value = await redisClient.get(cacheKey);
      
      if (value === null) {
        return null;
      }

      if (parseJson) {
        try {
          return JSON.parse(value) as T;
        } catch {
          logger.warn('Failed to parse cached JSON', { key: cacheKey });
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      logger.error('Failed to get cache', {
        error: error instanceof Error ? error.message : error,
        key
      });
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.del(cacheKey);
      
      logger.debug('Cache deleted', { key: cacheKey, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete cache', {
        error: error instanceof Error ? error.message : error,
        key
      });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check cache existence', {
        error: error instanceof Error ? error.message : error,
        key
      });
      return false;
    }
  }

  /**
   * Set key expiration
   */
  static async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.expire(cacheKey, ttl);
      return result;
    } catch (error) {
      logger.error('Failed to set cache expiration', {
        error: error instanceof Error ? error.message : error,
        key,
        ttl
      });
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  static async mget<T = string>(keys: string[], parseJson: boolean = false): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.buildKey(key));
      const values = await redisClient.mGet(cacheKeys);
      
      return values.map(value => {
        if (value === null) {
          return null;
        }

        if (parseJson) {
          try {
            return JSON.parse(value) as T;
          } catch {
            return value as T;
          }
        }

        return value as T;
      });
    } catch (error) {
      logger.error('Failed to get multiple cache values', {
        error: error instanceof Error ? error.message : error,
        keys
      });
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys
   */
  static async mset(keyValues: Record<string, string | number | object>, ttl?: number): Promise<void> {
    try {
      const pipeline = redisClient.multi();
      
      for (const [key, value] of Object.entries(keyValues)) {
        const cacheKey = this.buildKey(key);
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        if (ttl) {
          pipeline.setEx(cacheKey, ttl, serializedValue);
        } else {
          pipeline.set(cacheKey, serializedValue);
        }
      }
      
      await pipeline.exec();
      
      logger.debug('Multiple cache values set', { 
        count: Object.keys(keyValues).length,
        ttl 
      });
    } catch (error) {
      logger.error('Failed to set multiple cache values', {
        error: error instanceof Error ? error.message : error,
        keys: Object.keys(keyValues)
      });
    }
  }

  /**
   * Increment a numeric value
   */
  static async increment(key: string, by: number = 1): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.incrBy(cacheKey, by);
      
      logger.debug('Cache value incremented', { key: cacheKey, by, result });
      return result;
    } catch (error) {
      logger.error('Failed to increment cache value', {
        error: error instanceof Error ? error.message : error,
        key,
        by
      });
      return 0;
    }
  }

  /**
   * Add to set
   */
  static async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.sAdd(cacheKey, members);
      
      logger.debug('Added to set', { key: cacheKey, members, added: result });
      return result;
    } catch (error) {
      logger.error('Failed to add to set', {
        error: error instanceof Error ? error.message : error,
        key,
        members
      });
      return 0;
    }
  }

  /**
   * Get set members
   */
  static async smembers(key: string): Promise<string[]> {
    try {
      const cacheKey = this.buildKey(key);
      const members = await redisClient.sMembers(cacheKey);
      
      return members;
    } catch (error) {
      logger.error('Failed to get set members', {
        error: error instanceof Error ? error.message : error,
        key
      });
      return [];
    }
  }

  /**
   * Remove from set
   */
  static async srem(key: string, ...members: string[]): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.sRem(cacheKey, members);
      
      logger.debug('Removed from set', { key: cacheKey, members, removed: result });
      return result;
    } catch (error) {
      logger.error('Failed to remove from set', {
        error: error instanceof Error ? error.message : error,
        key,
        members
      });
      return 0;
    }
  }

  /**
   * Push to list (left)
   */
  static async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.lPush(cacheKey, values);
      
      logger.debug('Pushed to list', { key: cacheKey, values, length: result });
      return result;
    } catch (error) {
      logger.error('Failed to push to list', {
        error: error instanceof Error ? error.message : error,
        key,
        values
      });
      return 0;
    }
  }

  /**
   * Pop from list (right)
   */
  static async rpop(key: string): Promise<string | null> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.rPop(cacheKey);
      
      return result;
    } catch (error) {
      logger.error('Failed to pop from list', {
        error: error instanceof Error ? error.message : error,
        key
      });
      return null;
    }
  }

  /**
   * Get list range
   */
  static async lrange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    try {
      const cacheKey = this.buildKey(key);
      const result = await redisClient.lRange(cacheKey, start, stop);
      
      return result;
    } catch (error) {
      logger.error('Failed to get list range', {
        error: error instanceof Error ? error.message : error,
        key,
        start,
        stop
      });
      return [];
    }
  }

  /**
   * Set hash field
   */
  static async hset(key: string, field: string, value: string | number | object): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const result = await redisClient.hSet(cacheKey, field, serializedValue);
      
      logger.debug('Hash field set', { key: cacheKey, field });
      return result;
    } catch (error) {
      logger.error('Failed to set hash field', {
        error: error instanceof Error ? error.message : error,
        key,
        field
      });
      return 0;
    }
  }

  /**
   * Get hash field
   */
  static async hget<T = string>(key: string, field: string, parseJson: boolean = false): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key);
      const value = await redisClient.hGet(cacheKey, field);
      
      if (value === undefined) {
        return null;
      }

      if (parseJson) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      logger.error('Failed to get hash field', {
        error: error instanceof Error ? error.message : error,
        key,
        field
      });
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  static async hgetall<T = Record<string, string>>(key: string, parseJson: boolean = false): Promise<T> {
    try {
      const cacheKey = this.buildKey(key);
      const hash = await redisClient.hGetAll(cacheKey);
      
      if (parseJson) {
        const parsed: any = {};
        for (const [field, value] of Object.entries(hash)) {
          try {
            parsed[field] = JSON.parse(value);
          } catch {
            parsed[field] = value;
          }
        }
        return parsed as T;
      }

      return hash as T;
    } catch (error) {
      logger.error('Failed to get all hash fields', {
        error: error instanceof Error ? error.message : error,
        key
      });
      return {} as T;
    }
  }

  /**
   * Clear cache pattern
   */
  static async clearPattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await redisClient.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await redisClient.del(keys);
      
      logger.debug('Cache pattern cleared', { pattern: fullPattern, deletedCount: result });
      return result;
    } catch (error) {
      logger.error('Failed to clear cache pattern', {
        error: error instanceof Error ? error.message : error,
        pattern
      });
      return 0;
    }
  }

  /**
   * Get Redis info
   */
  static async getInfo(): Promise<string> {
    try {
      return await redisClient.info();
    } catch (error) {
      logger.error('Failed to get Redis info', {
        error: error instanceof Error ? error.message : error
      });
      return '';
    }
  }

  /**
   * Check Redis connection
   */
  static async isConnected(): Promise<boolean> {
    try {
      await redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : error
      });
    }
  }
}

/**
 * Initialize Redis connection on module load
 */
export async function connectRedis(): Promise<void> {
  await RedisService.initialize();
}
