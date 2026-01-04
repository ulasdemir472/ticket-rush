import { Seat, SeatStatus } from './seat.entity';

describe('Seat Entity', () => {
  const defaultParams = {
    id: 'seat-123',
    eventId: 'event-456',
    seatNumber: 'A1',
    price: 99.99,
  };

  describe('create()', () => {
    it('should create an available seat with default values', () => {
      const seat = Seat.create(defaultParams);

      expect(seat.id).toBe('seat-123');
      expect(seat.eventId).toBe('event-456');
      expect(seat.seatNumber).toBe('A1');
      expect(seat.price).toBe(99.99);
      expect(seat.status).toBe(SeatStatus.AVAILABLE);
      expect(seat.userId).toBeNull();
      expect(seat.version).toBe(1);
    });
  });

  describe('Immutability', () => {
    it('should return a NEW instance when locked', () => {
      const original = Seat.create(defaultParams);
      const locked = original.lock('user-789');

      // Different instances
      expect(locked).not.toBe(original);

      // Original unchanged
      expect(original.status).toBe(SeatStatus.AVAILABLE);
      expect(original.userId).toBeNull();
      expect(original.version).toBe(1);

      // New instance has updated values
      expect(locked.status).toBe(SeatStatus.LOCKED);
      expect(locked.userId).toBe('user-789');
      expect(locked.version).toBe(2);
    });

    it('should return a NEW instance when sold', () => {
      const available = Seat.create(defaultParams);
      const locked = available.lock('user-789');
      const sold = locked.sell();

      expect(sold).not.toBe(locked);
      expect(locked.status).toBe(SeatStatus.LOCKED);
      expect(sold.status).toBe(SeatStatus.SOLD);
      expect(sold.version).toBe(3);
    });

    it('should return a NEW instance when released', () => {
      const locked = Seat.create(defaultParams).lock('user-789');
      const released = locked.release();

      expect(released).not.toBe(locked);
      expect(released.status).toBe(SeatStatus.AVAILABLE);
      expect(released.userId).toBeNull();
    });
  });

  describe('State Transitions', () => {
    it('should not allow locking a non-available seat', () => {
      const locked = Seat.create(defaultParams).lock('user-1');

      expect(() => locked.lock('user-2')).toThrow(
        'Cannot lock seat: current status is LOCKED'
      );
    });

    it('should not allow selling a non-locked seat', () => {
      const available = Seat.create(defaultParams);

      expect(() => available.sell()).toThrow(
        'Cannot sell seat: current status is AVAILABLE'
      );
    });

    it('should not allow releasing a non-locked seat', () => {
      const available = Seat.create(defaultParams);

      expect(() => available.release()).toThrow(
        'Cannot release seat: current status is AVAILABLE'
      );
    });

    it('should not allow selling an already sold seat', () => {
      const sold = Seat.create(defaultParams).lock('user-1').sell();

      expect(() => sold.sell()).toThrow(
        'Cannot sell seat: current status is SOLD'
      );
    });
  });

  describe('Query Methods', () => {
    it('should correctly report availability status', () => {
      const available = Seat.create(defaultParams);
      const locked = available.lock('user-1');
      const sold = locked.sell();

      expect(available.isAvailable()).toBe(true);
      expect(available.isLocked()).toBe(false);
      expect(available.isSold()).toBe(false);

      expect(locked.isAvailable()).toBe(false);
      expect(locked.isLocked()).toBe(true);
      expect(locked.isSold()).toBe(false);

      expect(sold.isAvailable()).toBe(false);
      expect(sold.isLocked()).toBe(false);
      expect(sold.isSold()).toBe(true);
    });

    it('should check if locked by specific user', () => {
      const locked = Seat.create(defaultParams).lock('user-123');

      expect(locked.isLockedBy('user-123')).toBe(true);
      expect(locked.isLockedBy('user-456')).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const seat = Seat.create(defaultParams);
      const json = seat.toJSON();

      expect(json).toEqual({
        id: 'seat-123',
        eventId: 'event-456',
        seatNumber: 'A1',
        price: 99.99,
        status: SeatStatus.AVAILABLE,
        userId: null,
        version: 1,
      });
    });
  });

  describe('fromPersistence()', () => {
    it('should reconstitute a seat from stored data', () => {
      const storedData = {
        id: 'seat-123',
        eventId: 'event-456',
        seatNumber: 'A1',
        price: 99.99,
        status: SeatStatus.SOLD,
        userId: 'user-789',
        version: 5,
      };

      const seat = Seat.fromPersistence(storedData);

      expect(seat.id).toBe('seat-123');
      expect(seat.status).toBe(SeatStatus.SOLD);
      expect(seat.userId).toBe('user-789');
      expect(seat.version).toBe(5);
    });
  });
});
