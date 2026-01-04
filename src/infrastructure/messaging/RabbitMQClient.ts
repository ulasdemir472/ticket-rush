/**
 * RabbitMQ Client
 * 
 * Singleton implementation for RabbitMQ message broker.
 * Features:
 * - Singleton pattern (single connection)
 * - Connection retry with exponential backoff
 * - Durable queues for message persistence
 * - Graceful error handling
 */

import amqp from 'amqplib';

// Use ChannelModel which is the actual return type from connect()
type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

/**
 * Retry configuration for connection attempts
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Singleton state for the RabbitMQ client
 */
const globalForRabbitMQ = globalThis as unknown as {
  rabbitMQClient: RabbitMQClient | undefined;
};

/**
 * RabbitMQ Client
 * 
 * Provides reliable message publishing with automatic reconnection.
 * 
 * @example
 * ```typescript
 * const client = RabbitMQClient.getInstance();
 * await client.connect();
 * await client.publish('seat-locked', { seatId: '123', userId: '456' });
 * ```
 */
export class RabbitMQClient {
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;
  private readonly url: string;
  private readonly retryConfig: RetryConfig;
  private isConnecting: boolean = false;
  private assertedQueues: Set<string> = new Set();

  private constructor(url?: string, retryConfig?: Partial<RetryConfig>) {
    this.url = url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Gets the singleton instance of RabbitMQClient
   */
  static getInstance(): RabbitMQClient {
    if (!globalForRabbitMQ.rabbitMQClient) {
      globalForRabbitMQ.rabbitMQClient = new RabbitMQClient();
    }
    return globalForRabbitMQ.rabbitMQClient;
  }

  /**
   * Connects to RabbitMQ with retry logic
   * 
   * Uses exponential backoff for retries:
   * - Attempt 1: Wait 1s
   * - Attempt 2: Wait 2s
   * - Attempt 3: Wait 4s
   * - ... up to maxDelayMs
   * 
   * @throws Error if all retry attempts fail
   */
  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt
      await this.waitForConnection();
      return;
    }

    this.isConnecting = true;
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`[RabbitMQ] Connection attempt ${attempt}/${this.retryConfig.maxRetries}...`);
        
        // Establish connection
        this.connection = await amqp.connect(this.url);
        
        // Create channel
        this.channel = await this.connection.createChannel();

        // Set up error handlers for automatic reconnection
        this.connection.on('error', (err: Error) => {
          console.error('[RabbitMQ] Connection error:', err.message);
          this.handleDisconnect();
        });

        this.connection.on('close', () => {
          console.warn('[RabbitMQ] Connection closed');
          this.handleDisconnect();
        });

        this.channel.on('error', (err: Error) => {
          console.error('[RabbitMQ] Channel error:', err.message);
        });

        console.log('[RabbitMQ] Connected successfully');
        this.isConnecting = false;
        return;

      } catch (error) {
        lastError = error as Error;
        console.error(
          `[RabbitMQ] Connection attempt ${attempt} failed:`,
          lastError.message
        );

        if (attempt < this.retryConfig.maxRetries) {
          console.log(`[RabbitMQ] Retrying in ${delay}ms...`);
          await this.sleep(delay);
          
          // Exponential backoff
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          );
        }
      }
    }

    this.isConnecting = false;
    throw new Error(
      `[RabbitMQ] Failed to connect after ${this.retryConfig.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Publishes a message to a queue
   * 
   * @param queue - Queue name
   * @param message - Message payload (will be JSON serialized)
   * @param options - Optional publish options
   */
  async publish(
    queue: string,
    message: object,
    options?: amqp.Options.Publish
  ): Promise<boolean> {
    await this.ensureConnection();

    if (!this.channel) {
      throw new Error('[RabbitMQ] Channel not available');
    }

    // Assert queue if not already done (durable = survives restart)
    if (!this.assertedQueues.has(queue)) {
      await this.channel.assertQueue(queue, {
        durable: true, // Queue survives RabbitMQ restart
      });
      this.assertedQueues.add(queue);
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const published = this.channel.sendToQueue(queue, messageBuffer, {
      persistent: true, // Message survives RabbitMQ restart
      contentType: 'application/json',
      timestamp: Date.now(),
      ...options,
    });

    if (published) {
      console.log(`[RabbitMQ] Published message to queue '${queue}'`);
    } else {
      console.warn(`[RabbitMQ] Message buffered (queue '${queue}' full)`);
    }

    return published;
  }

  /**
   * Consumes messages from a queue
   * 
   * @param queue - Queue name to consume from
   * @param handler - Callback function for each message
   */
  async consume(
    queue: string,
    handler: (message: object) => Promise<void>
  ): Promise<void> {
    await this.ensureConnection();

    if (!this.channel) {
      throw new Error('[RabbitMQ] Channel not available');
    }

    // Assert queue if not already done
    if (!this.assertedQueues.has(queue)) {
      await this.channel.assertQueue(queue, {
        durable: true,
      });
      this.assertedQueues.add(queue);
    }

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        this.channel?.ack(msg);
      } catch (error) {
        console.error(`[RabbitMQ] Error processing message:`, error);
        // Reject and requeue the message
        this.channel?.nack(msg, false, true);
      }
    });

    console.log(`[RabbitMQ] Consuming from queue '${queue}'`);
  }

  /**
   * Closes the connection gracefully
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.assertedQueues.clear();
      console.log('[RabbitMQ] Connection closed gracefully');
    } catch (error) {
      console.error('[RabbitMQ] Error closing connection:', error);
    }
  }

  /**
   * Checks if currently connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  // ===========================================
  // Private Helper Methods
  // ===========================================

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  private handleDisconnect(): void {
    this.connection = null;
    this.channel = null;
    this.assertedQueues.clear();
  }

  private async waitForConnection(timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    while (this.isConnecting && Date.now() - startTime < timeoutMs) {
      await this.sleep(100);
    }
    if (!this.isConnected()) {
      throw new Error('[RabbitMQ] Connection timeout');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton getter
export function getRabbitMQClient(): RabbitMQClient {
  return RabbitMQClient.getInstance();
}
