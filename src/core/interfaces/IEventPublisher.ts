import { DomainEvent } from '@/core/events/DomainEvent';

/**
 * Event Publisher Interface
 * 
 * Defines the contract for publishing domain events.
 * This abstraction allows swapping implementations (RabbitMQ, Kafka, In-Memory)
 * without changing the business logic.
 */
export interface IEventPublisher {
  /**
   * Publishes an event to the specified queue
   * 
   * @param queue - Target queue name
   * @param event - Domain event to publish
   * @returns Promise resolving when publish is complete (fire-and-forget)
   */
  publish(queue: string, event: DomainEvent): Promise<void>;
}
