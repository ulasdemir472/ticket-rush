import { Seat, SeatStatus } from '@/core/domain/seat.entity';
import { InMemorySeatRepository } from '@/infrastructure/repositories/InMemorySeatRepository';
import { BookingService, SeatNotFoundError, SeatNotAvailableError } from './BookingService';

describe('BookingService', () => {
  let seatRepository: InMemorySeatRepository;
  let bookingService: BookingService;

  beforeEach(() => {
    // Fresh repository and service for each test
    seatRepository = new InMemorySeatRepository();
    bookingService = new BookingService(seatRepository);
  });

  describe('lockSeat()', () => {
    it('should lock an AVAILABLE seat for a user', async () => {
      // Arrange
      const seat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      });
      seatRepository.seed([seat]);

      // Act
      const lockedSeat = await bookingService.lockSeat('seat-1', 'user-123');

      // Assert
      expect(lockedSeat.status).toBe(SeatStatus.LOCKED);
      expect(lockedSeat.userId).toBe('user-123');
      expect(lockedSeat.version).toBe(2); // Version incremented
    });

    it('should persist the locked seat to the repository', async () => {
      // Arrange
      const seat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      });
      seatRepository.seed([seat]);

      // Act
      await bookingService.lockSeat('seat-1', 'user-123');

      // Assert - check repository was updated
      const savedSeat = await seatRepository.findById('seat-1');
      expect(savedSeat?.status).toBe(SeatStatus.LOCKED);
      expect(savedSeat?.userId).toBe('user-123');
    });

    it('should throw SeatNotFoundError if seat does not exist', async () => {
      // Act & Assert
      await expect(
        bookingService.lockSeat('non-existent-seat', 'user-123')
      ).rejects.toThrow(SeatNotFoundError);
    });

    it('should throw SeatNotAvailableError if seat is already LOCKED', async () => {
      // Arrange
      const lockedSeat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      }).lock('user-999');
      seatRepository.seed([lockedSeat]);

      // Act & Assert
      await expect(
        bookingService.lockSeat('seat-1', 'user-123')
      ).rejects.toThrow(SeatNotAvailableError);
    });

    it('should throw SeatNotAvailableError if seat is already SOLD', async () => {
      // Arrange
      const soldSeat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      }).lock('user-999').sell();
      seatRepository.seed([soldSeat]);

      // Act & Assert
      await expect(
        bookingService.lockSeat('seat-1', 'user-123')
      ).rejects.toThrow(SeatNotAvailableError);

      await expect(
        bookingService.lockSeat('seat-1', 'user-123')
      ).rejects.toThrow('Seat seat-1 is not available (current status: SOLD)');
    });

    it('should not modify the original seat (immutability check)', async () => {
      // Arrange
      const originalSeat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      });
      seatRepository.seed([originalSeat]);

      // Act
      const lockedSeat = await bookingService.lockSeat('seat-1', 'user-123');

      // Assert - original reference unchanged
      expect(originalSeat.status).toBe(SeatStatus.AVAILABLE);
      expect(lockedSeat.status).toBe(SeatStatus.LOCKED);
      expect(lockedSeat).not.toBe(originalSeat);
    });
  });

  describe('releaseSeat()', () => {
    it('should release a LOCKED seat back to AVAILABLE', async () => {
      // Arrange
      const lockedSeat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      }).lock('user-123');
      seatRepository.seed([lockedSeat]);

      // Act
      const releasedSeat = await bookingService.releaseSeat('seat-1', 'user-123');

      // Assert
      expect(releasedSeat.status).toBe(SeatStatus.AVAILABLE);
      expect(releasedSeat.userId).toBeNull();
    });

    it('should throw error if user tries to release a seat they do not own', async () => {
      // Arrange
      const lockedSeat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      }).lock('user-123');
      seatRepository.seed([lockedSeat]);

      // Act & Assert
      await expect(
        bookingService.releaseSeat('seat-1', 'different-user')
      ).rejects.toThrow('User different-user does not own the lock on seat seat-1');
    });
  });

  describe('confirmSale()', () => {
    it('should mark a LOCKED seat as SOLD', async () => {
      // Arrange
      const lockedSeat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      }).lock('user-123');
      seatRepository.seed([lockedSeat]);

      // Act
      const soldSeat = await bookingService.confirmSale('seat-1', 'user-123');

      // Assert
      expect(soldSeat.status).toBe(SeatStatus.SOLD);
      expect(soldSeat.userId).toBe('user-123');
    });

    it('should throw error if user tries to confirm sale for seat they do not own', async () => {
      // Arrange
      const lockedSeat = Seat.create({
        id: 'seat-1',
        eventId: 'event-1',
        seatNumber: 'A1',
        price: 100,
      }).lock('user-123');
      seatRepository.seed([lockedSeat]);

      // Act & Assert
      await expect(
        bookingService.confirmSale('seat-1', 'different-user')
      ).rejects.toThrow('User different-user does not own the lock on seat seat-1');
    });
  });
});
