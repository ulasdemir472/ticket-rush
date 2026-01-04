/**
 * Generic Cache Interface
 * 
 * Defines a contract for cache operations that can be implemented
 * by different backends (Redis, In-Memory, etc.)
 */
export interface ICache {
  /**
   * Gets a value from the cache
   * @returns The cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Sets a value in the cache with optional TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Deletes a value from the cache
   * @param key - Cache key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Deletes multiple keys matching a pattern
   * @param pattern - Glob pattern for keys to delete
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * Checks if a key exists in the cache
   */
  exists(key: string): Promise<boolean>;
}
