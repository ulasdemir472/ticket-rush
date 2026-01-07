import amqp from 'amqplib';
import 'dotenv/config';

// Use ChannelModel which is the actual return type from connect()
type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

/**
 * RabbitMQ Client
 * 
 * Singleton implementation for RabbitMQ message broker.
 * Features:
 * - Singleton pattern (single connection)
 * - Lazy connection (connects on first publish)
 * - Auto-reconnect
 * - Durable queues
 */
export class RabbitMQClient {
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;
  private readonly url: string;
  private isConnecting: boolean = false;
  private assertedQueues: Set<string> = new Set();
  
  // Singleton instance
  private static instance: RabbitMQClient;

  private constructor() {
    this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  }

  /**
   * Gets the singleton instance of RabbitMQClient
   */
  static getInstance(): RabbitMQClient {
    if (!RabbitMQClient.instance) {
      RabbitMQClient.instance = new RabbitMQClient();
    }
    return RabbitMQClient.instance;
  }

  /**
   * Connects to RabbitMQ
   */
  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt to finish
      await this.waitForConnection();
      return;
    }

    this.isConnecting = true;

    try {
      console.log("🔗 Connecting to RabbitMQ at", this.url);
      
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Handle connection loss
      this.connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err);
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed');
        this.handleDisconnect();
      });

      console.log("✅ RabbitMQ Connected & Channel Created");
      this.isConnecting = false;

    } catch (error) {
      this.isConnecting = false;
      console.error('[RabbitMQ] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Publishes a message to a queue
   * Auto-connects if not connected (Lazy Connection)
   */
  async publish(queue: string, message: object): Promise<boolean> {
    // 1. Lazy Connect
    if (!this.channel) {
      console.log("🔌 Auto-connecting to RabbitMQ for publish...");
      await this.connect();
    }

    // 2. Ensure Channel exists
    if (!this.channel) {
      throw new Error('[RabbitMQ] Failed to create channel');
    }

    // 3. Assert Queue (once per session)
    if (!this.assertedQueues.has(queue)) {
      await this.channel.assertQueue(queue, { durable: true });
      this.assertedQueues.add(queue);
    }

    // 4. Send Message
    const messageBuffer = Buffer.from(JSON.stringify(message));
    console.log(`📤 Publishing to ${queue}:`, message);

    const result = this.channel.sendToQueue(queue, messageBuffer, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    });

    console.log("✅ Message sent to buffer");
    return result;
  }

  /**
   * Consumes messages from a queue
   */
  async consume(queue: string, handler: (msg: object) => Promise<void>): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
        throw new Error('[RabbitMQ] No channel available for consume');
    }

    await this.channel.assertQueue(queue, { durable: true });
    
    console.log(`👂 Consuming from ${queue}`);
    
    this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        this.channel?.ack(msg);
      } catch (err) {
        console.error('Consumer error:', err);
        this.channel?.nack(msg, false, true);
      }
    });
  }

  private handleDisconnect() {
    this.connection = null;
    this.channel = null;
    this.assertedQueues.clear();
    this.isConnecting = false;
  }

  private async waitForConnection(): Promise<void> {
    while (this.isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Export singleton getter (to match existing usage)
export function getRabbitMQClient(): RabbitMQClient {
  return RabbitMQClient.getInstance();
}
