import { Seat } from '@/core/domain/seat.entity';
import { ISeatRepository } from '@/core/interfaces/ISeatRepository';

/**
 * In-Memory Seat Repository
 * 
 * A simple in-memory implementation of ISeatRepository for testing purposes.
 * This allows unit tests to run without a real database connection.
 * 
 * NOT for production use - data is lost when the process ends.
 */
export class InMemorySeatRepository implements ISeatRepository {
  private seats: Map<string, Seat> = new Map();

  /**
   * Seeds the repository with initial data (useful for testing)
   */
  seed(seats: Seat[]): void {
    seats.forEach((seat) => {
      this.seats.set(seat.id, seat);
    });
  }

  /**
   * Clears all data (useful for test cleanup)
   */
  clear(): void {
    this.seats.clear();
  }

  async findById(id: string): Promise<Seat | null> {
    return this.seats.get(id) ?? null;
  }

  async findByEventId(eventId: string): Promise<Seat[]> {
    const result: Seat[] = [];
    this.seats.forEach((seat) => {
      if (seat.eventId === eventId) {
        result.push(seat);
      }
    });
    return result;
  }

  async save(seat: Seat): Promise<Seat> {
    this.seats.set(seat.id, seat);
    return seat;
  }

  async findByIdWithVersion(id: string, expectedVersion: number): Promise<Seat | null> {
    const seat = this.seats.get(id);
    if (!seat) return null;
    if (seat.version !== expectedVersion) return null;
    return seat;
  }
}
