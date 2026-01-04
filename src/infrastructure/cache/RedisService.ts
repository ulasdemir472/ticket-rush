/**
 * Redis Service
 * 
 * Implementation of ICache using Redis (ioredis client).
 * Provides caching capabilities with TTL support.
 * 
 * Uses singleton pattern similar to Prisma to prevent connection issues.
 */

import Redis from 'ioredis';
import { ICache } from '@/core/interfaces/ICache';

// Singleton Redis client
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Creates or returns the singleton Redis client
 */
function getRedisClient(): Redis {
  if (!globalForRedis.redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    globalForRedis.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect until first command
    });

    // Log connection events in development
    if (process.env.NODE_ENV === 'development') {
      globalForRedis.redis.on('connect', () => {
        console.log('[Redis] Connected');
      });
      globalForRedis.redis.on('error', (err) => {
        console.error('[Redis] Error:', err.message);
      });
    }
  }

  return globalForRedis.redis;
}

/**
 * Redis Cache Service
 * 
 * Implements ICache interface using Redis as the backend.
 * Handles JSON serialization/deserialization automatically.
 */
export class RedisService implements ICache {
  private readonly redis: Redis;
  private readonly defaultTtl: number;

  constructor(defaultTtlSeconds: number = 60) {
    this.redis = getRedisClient();
    this.defaultTtl = defaultTtlSeconds;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error);
      return null; // Graceful degradation - treat as cache miss
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds ?? this.defaultTtl;
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
      // Graceful degradation - log and continue without caching
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`[Redis] Error deleting pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Error checking existence of key ${key}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService(60); // 60 second default TTL
