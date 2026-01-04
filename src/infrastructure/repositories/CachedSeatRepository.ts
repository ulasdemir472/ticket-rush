/**
 * Cached Seat Repository (Decorator Pattern)
 * 
 * Wraps an ISeatRepository implementation with caching capabilities.
 * Implements the Cache-Aside (Read-Through) pattern:
 * 
 * Read Path:
 * 1. Check cache first
 * 2. If HIT: return cached data
 * 3. If MISS: fetch from DB, store in cache, return data
 * 
 * Write Path:
 * 1. Write to database
 * 2. Invalidate (delete) cache entry immediately
 * 
 * This ensures users never see stale data after a write operation.
 */

import { Seat } from '@/core/domain/seat.entity';
import { ISeatRepository } from '@/core/interfaces/ISeatRepository';
import { ICache } from '@/core/interfaces/ICache';

/**
 * Cache key generator for seats
 */
const CACHE_KEYS = {
  seat: (id: string) => `seat:${id}`,
  eventSeats: (eventId: string) => `event:${eventId}:seats`,
} as const;

/**
 * Default cache TTL in seconds
 */
const DEFAULT_TTL_SECONDS = 60;

/**
 * Cached Seat Repository
 * 
 * Decorator that adds caching layer to any ISeatRepository implementation.
 * 
 * @example
 * ```typescript
 * const prismaRepo = new PrismaSeatRepository(prisma);
 * const cachedRepo = new CachedSeatRepository(prismaRepo, redisService);
 * 
 * // This will use cache-aside pattern
 * const seat = await cachedRepo.findById('seat-123');
 * ```
 */
export class CachedSeatRepository implements ISeatRepository {
  constructor(
    private readonly repository: ISeatRepository,
    private readonly cache: ICache,
    private readonly ttlSeconds: number = DEFAULT_TTL_SECONDS
  ) {}

  /**
   * Find seat by ID with cache-aside pattern
   * 
   * Flow:
   * 1. Check cache for seat
   * 2. If cache HIT → return cached seat
   * 3. If cache MISS → fetch from DB, cache result, return
   */
  async findById(id: string): Promise<Seat | null> {
    const cacheKey = CACHE_KEYS.seat(id);

    // 1. Try cache first
    const cached = await this.cache.get<ReturnType<Seat['toJSON']>>(cacheKey);
    if (cached) {
      // Cache HIT - reconstitute domain entity from cached data
      return Seat.fromPersistence(cached);
    }

    // 2. Cache MISS - fetch from database
    const seat = await this.repository.findById(id);
    if (!seat) return null;

    // 3. Store in cache for future requests
    await this.cache.set(cacheKey, seat.toJSON(), this.ttlSeconds);

    return seat;
  }

  /**
   * Find seats by event ID (with cache)
   */
  async findByEventId(eventId: string): Promise<Seat[]> {
    const cacheKey = CACHE_KEYS.eventSeats(eventId);

    // Try cache first
    const cached = await this.cache.get<ReturnType<Seat['toJSON']>[]>(cacheKey);
    if (cached) {
      return cached.map((data) => Seat.fromPersistence(data));
    }

    // Cache miss - fetch from DB
    const seats = await this.repository.findByEventId(eventId);
    if (seats.length > 0) {
      await this.cache.set(
        cacheKey,
        seats.map((s) => s.toJSON()),
        this.ttlSeconds
      );
    }

    return seats;
  }

  /**
   * Find seat by ID with version check (bypass cache for consistency)
   * 
   * Note: We bypass cache here because version checking is critical
   * for optimistic locking and requires fresh data.
   */
  async findByIdWithVersion(id: string, expectedVersion: number): Promise<Seat | null> {
    // Bypass cache for version-sensitive operations
    return this.repository.findByIdWithVersion(id, expectedVersion);
  }

  /**
   * Save seat and INVALIDATE cache
   * 
   * Flow:
   * 1. Save to database
   * 2. Delete cache entry immediately
   * 3. Delete event seats cache (list might be stale)
   * 
   * This ensures users never see stale data after a status change.
   */
  async save(seat: Seat): Promise<Seat> {
    // 1. Save to database first
    const savedSeat = await this.repository.save(seat);

    // 2. INVALIDATE: Delete individual seat cache
    await this.cache.delete(CACHE_KEYS.seat(seat.id));

    // 3. INVALIDATE: Delete event seats list cache
    // (because the status of one seat changed, the list is now stale)
    await this.cache.delete(CACHE_KEYS.eventSeats(seat.eventId));

    return savedSeat;
  }
}
