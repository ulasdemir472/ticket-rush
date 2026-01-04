/**
 * Composition Root (Dependency Injection Container)
 * 
 * This file is the single place where we wire together all dependencies.
 * Uses lazy initialization with dynamic imports to prevent build-time issues.
 * 
 * Now includes Redis caching with cache-aside pattern.
 * 
 * @see https://blog.ploeh.dk/2011/07/28/CompositionRoot/
 */

import { BookingService } from '@/core/services/BookingService';
import type { ISeatRepository } from '@/core/interfaces/ISeatRepository';

// ===========================================
// Lazy-loaded Singleton Instances
// ===========================================

let _bookingService: BookingService | null = null;

/**
 * Gets the Booking Service singleton
 * 
 * Wiring:
 * PrismaSeatRepository → CachedSeatRepository (decorator) → BookingService
 * 
 * The cache decorator adds:
 * - Read-through caching (60s TTL)
 * - Cache invalidation on writes
 */
export async function getBookingService(): Promise<BookingService> {
  if (!_bookingService) {
    // Dynamic imports to avoid build-time execution
    const { prisma } = await import('@/infrastructure/db/prisma');
    const { PrismaSeatRepository } = await import('@/infrastructure/repositories/PrismaSeatRepository');
    const { CachedSeatRepository } = await import('@/infrastructure/repositories/CachedSeatRepository');
    const { RedisService } = await import('@/infrastructure/cache/RedisService');
    
    // Create the repository chain:
    // Prisma (database) → Cached (Redis decorator)
    const prismaRepository = new PrismaSeatRepository(prisma);
    const redisCache = new RedisService(60); // 60 second TTL
    const cachedRepository: ISeatRepository = new CachedSeatRepository(
      prismaRepository,
      redisCache,
      60 // TTL in seconds
    );
    
    // Inject the cached repository into the service
    _bookingService = new BookingService(cachedRepository);
  }
  return _bookingService;
}
