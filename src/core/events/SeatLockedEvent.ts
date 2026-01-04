import { DomainEvent } from './DomainEvent';

/**
 * Seat Locked Event
 * 
 * Published when a seat is locked for a user during checkout.
 * Used to trigger timeout handlers and analytics.
 */
export interface SeatLockedEvent extends DomainEvent {
  readonly eventType: 'SEAT_LOCKED';
  readonly seatId: string;
  readonly eventId: string;
  readonly userId: string;
  readonly seatNumber: string;
  readonly price: number;
  readonly lockedAt: Date;
  readonly expiresAt: Date; // Lock expiration time
}

/**
 * Creates a SeatLockedEvent
 */
export function createSeatLockedEvent(params: {
  seatId: string;
  eventId: string;
  userId: string;
  seatNumber: string;
  price: number;
  lockDurationMs?: number;
  correlationId?: string;
}): SeatLockedEvent {
  const now = new Date();
  const lockDuration = params.lockDurationMs ?? 15 * 60 * 1000; // Default 15 minutes

  return {
    eventType: 'SEAT_LOCKED',
    seatId: params.seatId,
    eventId: params.eventId,
    userId: params.userId,
    seatNumber: params.seatNumber,
    price: params.price,
    lockedAt: now,
    expiresAt: new Date(now.getTime() + lockDuration),
    timestamp: now,
    correlationId: params.correlationId,
  };
}
