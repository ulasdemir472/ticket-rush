import { DomainEvent } from './DomainEvent';

/**
 * Seat Sold Event
 * 
 * Published when a seat is successfully sold (payment confirmed).
 * Triggers downstream processes:
 * - PDF ticket generation
 * - Email confirmation
 * - Analytics tracking
 */
export interface SeatSoldEvent extends DomainEvent {
  readonly eventType: 'SEAT_SOLD';
  readonly seatId: string;
  readonly eventId: string;
  readonly userId: string;
  readonly seatNumber: string;
  readonly price: number;
  readonly soldAt: Date;
}

/**
 * Creates a SeatSoldEvent
 */
export function createSeatSoldEvent(params: {
  seatId: string;
  eventId: string;
  userId: string;
  seatNumber: string;
  price: number;
  correlationId?: string;
}): SeatSoldEvent {
  return {
    eventType: 'SEAT_SOLD',
    seatId: params.seatId,
    eventId: params.eventId,
    userId: params.userId,
    seatNumber: params.seatNumber,
    price: params.price,
    soldAt: new Date(),
    timestamp: new Date(),
    correlationId: params.correlationId,
  };
}
