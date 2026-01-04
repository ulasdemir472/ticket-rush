/**
 * Base Domain Event Interface
 * 
 * All domain events should implement this interface.
 * Events are immutable records of something that happened in the domain.
 */
export interface DomainEvent {
  readonly eventType: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
}

/**
 * Queue names for different event types
 */
export const EVENT_QUEUES = {
  TICKET_GENERATION: 'ticket_generation_queue',
  NOTIFICATION: 'notification_queue',
  ANALYTICS: 'analytics_queue',
} as const;
