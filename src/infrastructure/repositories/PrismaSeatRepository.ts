import type { PrismaClient } from '@prisma/client';
import { Seat, SeatStatus, SeatProps } from '@/core/domain/seat.entity';
import { ISeatRepository } from '@/core/interfaces/ISeatRepository';
import { ConcurrencyError } from '@/core/errors/repository.errors';

/**
 * Prisma Seat type from the database
 * We define this manually to avoid Prisma version-specific import issues
 */
interface PrismaSeat {
  id: string;
  eventId: string;
  seatNumber: string;
  status: 'AVAILABLE' | 'LOCKED' | 'SOLD';
  price: { toNumber(): number } | number;
  userId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

type PrismaSeatStatus = 'AVAILABLE' | 'LOCKED' | 'SOLD';

/**
 * Maps Prisma SeatStatus to Domain SeatStatus
 */
function mapPrismaStatusToDomain(status: PrismaSeatStatus): SeatStatus {
  const mapping: Record<PrismaSeatStatus, SeatStatus> = {
    AVAILABLE: SeatStatus.AVAILABLE,
    LOCKED: SeatStatus.LOCKED,
    SOLD: SeatStatus.SOLD,
  };
  return mapping[status];
}

/**
 * Maps Domain SeatStatus to Prisma SeatStatus
 */
function mapDomainStatusToPrisma(status: SeatStatus): PrismaSeatStatus {
  const mapping: Record<SeatStatus, PrismaSeatStatus> = {
    [SeatStatus.AVAILABLE]: 'AVAILABLE',
    [SeatStatus.LOCKED]: 'LOCKED',
    [SeatStatus.SOLD]: 'SOLD',
  };
  return mapping[status];
}

/**
 * Maps Prisma Seat model to Domain Seat entity
 */
function mapToDomain(prismaSeat: PrismaSeat): Seat {
  const price = typeof prismaSeat.price === 'number' 
    ? prismaSeat.price 
    : prismaSeat.price.toNumber();

  const props: SeatProps = {
    id: prismaSeat.id,
    eventId: prismaSeat.eventId,
    seatNumber: prismaSeat.seatNumber,
    status: mapPrismaStatusToDomain(prismaSeat.status),
    price,
    userId: prismaSeat.userId,
    version: prismaSeat.version,
  };
  return Seat.fromPersistence(props);
}

/**
 * Prisma Seat Repository
 * 
 * Production implementation of ISeatRepository using Prisma ORM.
 * Implements optimistic locking to prevent concurrent modification issues.
 * 
 * @example
 * ```typescript
 * const repo = new PrismaSeatRepository(prisma);
 * const seat = await repo.findById('seat-123');
 * ```
 */
export class PrismaSeatRepository implements ISeatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Seat | null> {
    const prismaSeat = await this.prisma.seat.findUnique({
      where: { id },
    });

    if (!prismaSeat) return null;
    return mapToDomain(prismaSeat as PrismaSeat);
  }

  async findByEventId(eventId: string): Promise<Seat[]> {
    const prismaSeats = await this.prisma.seat.findMany({
      where: { eventId },
      orderBy: { seatNumber: 'asc' },
    });

    return prismaSeats.map((seat) => mapToDomain(seat as PrismaSeat));
  }

  async findByIdWithVersion(id: string, expectedVersion: number): Promise<Seat | null> {
    const prismaSeat = await this.prisma.seat.findFirst({
      where: {
        id,
        version: expectedVersion,
      },
    });

    if (!prismaSeat) return null;
    return mapToDomain(prismaSeat as PrismaSeat);
  }

  /**
   * Saves a seat with optimistic locking.
   * 
   * CRITICAL: Uses version-based optimistic locking to prevent lost updates.
   * 
   * The update query:
   * ```sql
   * UPDATE seats
   * SET status = :newStatus, version = version + 1, ...
   * WHERE id = :id AND version = :currentVersion - 1
   * ```
   * 
   * If another process modified the seat (version changed), the update
   * will affect 0 rows and we throw a ConcurrencyError.
   * 
   * @throws ConcurrencyError if the seat was modified by another process
   */
  async save(seat: Seat): Promise<Seat> {
    const seatData = seat.toJSON();
    const previousVersion = seatData.version - 1;

    // Check if this is a new seat (version 1 = first save)
    if (seatData.version === 1) {
      // Create new seat
      const created = await this.prisma.seat.create({
        data: {
          id: seatData.id,
          eventId: seatData.eventId,
          seatNumber: seatData.seatNumber,
          status: mapDomainStatusToPrisma(seatData.status),
          price: seatData.price,
          userId: seatData.userId,
          version: seatData.version,
        },
      });
      return mapToDomain(created as PrismaSeat);
    }

    // ================================================================
    // OPTIMISTIC LOCKING: Update only if version matches
    // ================================================================
    // We use updateMany because it returns the count of affected rows.
    // If count === 0, another process has modified this seat.
    // ================================================================
    const result = await this.prisma.seat.updateMany({
      where: {
        id: seatData.id,
        version: previousVersion, // Only update if version hasn't changed
      },
      data: {
        status: mapDomainStatusToPrisma(seatData.status),
        userId: seatData.userId,
        version: seatData.version, // Increment version
        // Note: eventId, seatNumber, price are immutable after creation
      },
    });

    // Check if the update was successful
    if (result.count === 0) {
      // Another process modified this seat - throw concurrency error
      throw new ConcurrencyError('Seat', seatData.id, previousVersion);
    }

    // Return the updated seat
    return seat;
  }

  /**
   * Saves a seat within an existing transaction.
   * Useful when multiple seats need to be updated atomically.
   */
  async saveInTransaction(
    seat: Seat,
    tx: Pick<PrismaClient, 'seat'>
  ): Promise<Seat> {
    const seatData = seat.toJSON();
    const previousVersion = seatData.version - 1;

    if (seatData.version === 1) {
      const created = await tx.seat.create({
        data: {
          id: seatData.id,
          eventId: seatData.eventId,
          seatNumber: seatData.seatNumber,
          status: mapDomainStatusToPrisma(seatData.status),
          price: seatData.price,
          userId: seatData.userId,
          version: seatData.version,
        },
      });
      return mapToDomain(created as PrismaSeat);
    }

    const result = await tx.seat.updateMany({
      where: {
        id: seatData.id,
        version: previousVersion,
      },
      data: {
        status: mapDomainStatusToPrisma(seatData.status),
        userId: seatData.userId,
        version: seatData.version,
      },
    });

    if (result.count === 0) {
      throw new ConcurrencyError('Seat', seatData.id, previousVersion);
    }

    return seat;
  }
}
