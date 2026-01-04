import { Seat } from '@/core/domain/seat.entity';
import { ISeatRepository } from '@/core/interfaces/ISeatRepository';
import { IEventPublisher } from '@/core/interfaces/IEventPublisher';
import { EVENT_QUEUES, createSeatLockedEvent, createSeatSoldEvent } from '@/core/events';

/**
 * Custom Error: Seat Not Found
 */
export class SeatNotFoundError extends Error {
  constructor(seatId: string) {
    super(`Seat ${seatId} not found`);
    this.name = 'SeatNotFoundError';
  }
}

/**
 * Custom Error: Seat Not Available
 */
export class SeatNotAvailableError extends Error {
  constructor(seatId: string, currentStatus: string) {
    super(`Seat ${seatId} is not available (current status: ${currentStatus})`);
    this.name = 'SeatNotAvailableError';
  }
}

/**
 * Custom Error: Unauthorized Lock Operation
 */
export class UnauthorizedLockError extends Error {
  constructor(userId: string, seatId: string) {
    super(`User ${userId} does not own the lock on seat ${seatId}`);
    this.name = 'UnauthorizedLockError';
  }
}

/**
 * Booking Service
 * 
 * Handles seat reservation business logic following these principles:
 * - Dependency Injection: Receives repository and event publisher via constructor
 * - Immutability: Works with immutable Seat entities
 * - Single Responsibility: Only handles booking operations
 * - Event-Driven: Publishes domain events after successful operations
 * 
 * @example
 * ```typescript
 * const repo = new PrismaSeatRepository(prisma);
 * const publisher = new RabbitMQEventPublisher(rabbitMQ);
 * const bookingService = new BookingService(repo, publisher);
 * const lockedSeat = await bookingService.lockSeat('seat-123', 'user-456');
 * ```
 */
export class BookingService {
  constructor(
    private readonly seatRepository: ISeatRepository,
    private readonly eventPublisher?: IEventPublisher
  ) {}

  /**
   * Locks a seat for a user (first step in booking process)
   * 
   * Flow:
   * 1. Find seat in DB
   * 2. Check availability
   * 3. Lock seat (immutable)
   * 4. Persist to DB + invalidate cache
   * 5. Publish SeatLockedEvent (fire-and-forget)
   * 
   * @param seatId - The seat to lock
   * @param userId - The user requesting the lock
   * @returns The locked seat (new immutable instance)
   * @throws SeatNotFoundError if seat doesn't exist
   * @throws SeatNotAvailableError if seat is not AVAILABLE
   */
  async lockSeat(seatId: string, userId: string): Promise<Seat> {
    // 1. Find the seat
    const seat = await this.seatRepository.findById(seatId);
    
    if (!seat) {
      throw new SeatNotFoundError(seatId);
    }

    // 2. Check if available
    if (!seat.isAvailable()) {
      throw new SeatNotAvailableError(seatId, seat.status);
    }

    // 3. Lock the seat (returns NEW immutable instance)
    const lockedSeat = seat.lock(userId);

    // 4. Persist the change (handled by CachedSeatRepository - DB + cache invalidation)
    await this.seatRepository.save(lockedSeat);

    // 5. Publish event (fire-and-forget - does NOT block response)
    if (this.eventPublisher) {
      const event = createSeatLockedEvent({
        seatId: lockedSeat.id,
        eventId: lockedSeat.eventId,
        userId,
        seatNumber: lockedSeat.seatNumber,
        price: lockedSeat.price,
      });
      
      // Fire-and-forget: don't await, just schedule
      this.eventPublisher.publish(EVENT_QUEUES.NOTIFICATION, event)
        .catch(err => console.error('[BookingService] Failed to publish SeatLockedEvent:', err));
    }

    return lockedSeat;
  }

  /**
   * Releases a locked seat back to available
   * 
   * @param seatId - The seat to release
   * @param userId - The user releasing the lock (must be the lock owner)
   * @returns The released seat (new immutable instance)
   * @throws SeatNotFoundError if seat doesn't exist
   * @throws UnauthorizedLockError if user doesn't own the lock
   */
  async releaseSeat(seatId: string, userId: string): Promise<Seat> {
    // 1. Find the seat
    const seat = await this.seatRepository.findById(seatId);
    
    if (!seat) {
      throw new SeatNotFoundError(seatId);
    }

    // 2. Verify ownership
    if (!seat.isLockedBy(userId)) {
      throw new UnauthorizedLockError(userId, seatId);
    }

    // 3. Release the seat (returns NEW immutable instance)
    const releasedSeat = seat.release();

    // 4. Persist the change
    await this.seatRepository.save(releasedSeat);

    return releasedSeat;
  }

  /**
   * Confirms a sale after successful payment
   * 
   * Flow:
   * 1. Find seat in DB
   * 2. Verify lock ownership
   * 3. Mark as sold (immutable)
   * 4. Persist to DB + invalidate cache
   * 5. Publish SeatSoldEvent (fire-and-forget)
   *    → Triggers: PDF generation, Email notification
   * 
   * IMPORTANT: The API response returns IMMEDIATELY after step 4.
   * Step 5 is fire-and-forget - the user does NOT wait for PDF/Email.
   * 
   * @param seatId - The seat to mark as sold
   * @param userId - The user completing the purchase (must own the lock)
   * @returns The sold seat (new immutable instance)
   * @throws SeatNotFoundError if seat doesn't exist
   * @throws UnauthorizedLockError if user doesn't own the lock
   */
  async confirmSale(seatId: string, userId: string): Promise<Seat> {
    // 1. Find the seat
    const seat = await this.seatRepository.findById(seatId);
    
    if (!seat) {
      throw new SeatNotFoundError(seatId);
    }

    // 2. Verify ownership
    if (!seat.isLockedBy(userId)) {
      throw new UnauthorizedLockError(userId, seatId);
    }

    // 3. Mark as sold (returns NEW immutable instance)
    const soldSeat = seat.sell();

    // 4. Persist the change (DB + cache invalidation)
    await this.seatRepository.save(soldSeat);

    // 5. ⚡ FIRE-AND-FORGET: Publish event for downstream processing
    //    API response returns IMMEDIATELY - does NOT wait for:
    //    - PDF generation
    //    - Email notification
    //    - Analytics
    if (this.eventPublisher) {
      const event = createSeatSoldEvent({
        seatId: soldSeat.id,
        eventId: soldSeat.eventId,
        userId,
        seatNumber: soldSeat.seatNumber,
        price: soldSeat.price,
      });
      
      // Non-blocking: schedule publish but don't await
      this.eventPublisher.publish(EVENT_QUEUES.TICKET_GENERATION, event)
        .catch(err => console.error('[BookingService] Failed to publish SeatSoldEvent:', err));
    }

    return soldSeat;
  }
}
