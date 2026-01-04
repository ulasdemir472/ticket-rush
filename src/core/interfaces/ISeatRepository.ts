import { Seat } from '@/core/domain/seat.entity';

/**
 * Seat Repository Interface
 * 
 * Defines the contract for seat persistence operations.
 * Follows the Repository Pattern and Dependency Inversion Principle (SOLID).
 * 
 * The domain layer depends on this interface, not on concrete implementations.
 * This allows swapping implementations (InMemory, Prisma, etc.) without
 * changing business logic.
 */
export interface ISeatRepository {
  /**
   * Finds a seat by its unique identifier
   * @param id - The seat's unique ID
   * @returns The seat if found, null otherwise
   */
  findById(id: string): Promise<Seat | null>;

  /**
   * Finds all seats for a given event
   * @param eventId - The event's unique ID
   * @returns Array of seats for the event
   */
  findByEventId(eventId: string): Promise<Seat[]>;

  /**
   * Persists a seat (create or update)
   * @param seat - The seat entity to save
   * @returns The saved seat
   */
  save(seat: Seat): Promise<Seat>;

  /**
   * Finds a seat by ID with optimistic locking check
   * @param id - The seat's unique ID
   * @param expectedVersion - The expected version for optimistic locking
   * @returns The seat if found and version matches, null otherwise
   */
  findByIdWithVersion(id: string, expectedVersion: number): Promise<Seat | null>;
}
