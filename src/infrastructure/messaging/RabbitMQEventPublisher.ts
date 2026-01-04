import { DomainEvent } from '@/core/events/DomainEvent';
import { IEventPublisher } from '@/core/interfaces/IEventPublisher';
import { RabbitMQClient } from './RabbitMQClient';
import { getCorrelationId } from '@/infrastructure/logging/RequestContext';
import { logger } from '@/infrastructure/logging/Logger';

/**
 * RabbitMQ Event Publisher
 * 
 * Implementation of IEventPublisher using RabbitMQ.
 * Features:
 * - Fire-and-forget pattern (non-blocking)
 * - Automatic correlation ID propagation via message headers
 */
export class RabbitMQEventPublisher implements IEventPublisher {
  constructor(private readonly client: RabbitMQClient) {}

  /**
   * Publishes an event to a queue with correlation ID
   * 
   * The correlation ID is automatically extracted from the current
   * request context (AsyncLocalStorage) and added to message headers.
   * This allows the worker to trace the request.
   */
  async publish(queue: string, event: DomainEvent): Promise<void> {
    try {
      // Get correlation ID from current request context
      const correlationId = event.correlationId ?? getCorrelationId();
      
      // Publish with correlation ID in headers
      await this.client.publish(queue, event, {
        headers: {
          'x-correlation-id': correlationId,
        },
      });
      
      logger.info(`Event published`, {
        eventType: event.eventType,
        queue,
      });
    } catch (error) {
      // Fire-and-forget: log error but don't throw
      logger.error(`Failed to publish event`, {
        eventType: event.eventType,
        queue,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * No-Op Event Publisher
 * 
 * Used for testing or when messaging is disabled.
 * Implements IEventPublisher but does nothing.
 */
export class NoOpEventPublisher implements IEventPublisher {
  async publish(_queue: string, _event: DomainEvent): Promise<void> {
    // No-op: used for testing
  }
}
