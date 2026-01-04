/**
 * TicketRush Background Worker
 * 
 * This worker runs independently from the Next.js application.
 * It consumes messages from RabbitMQ and processes background tasks:
 * - PDF ticket generation
 * - Email notifications
 * 
 * Features:
 * - Manual acknowledgment for reliability
 * - Correlation ID propagation for distributed tracing
 * - Structured logging with Winston
 * 
 * Run with: npm run worker
 * 
 * @file worker.ts
 */

import amqp from 'amqplib';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Queue names
const TICKET_GENERATION_QUEUE = 'ticket_generation_queue';

// Configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// ===========================================
// STRUCTURED LOGGER WITH CORRELATION ID
// ===========================================

let currentCorrelationId: string = 'worker-startup';

const workerFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const correlationId = currentCorrelationId.substring(0, 8);
    const metaStr = Object.keys(meta).length > 0 
      ? ` ${JSON.stringify(meta)}` 
      : '';
    return `${timestamp} [${correlationId}] ${level}: ${message}${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: 'info',
  format: workerFormat,
  transports: [new winston.transports.Console()],
});

// ===========================================
// PROCESSING FUNCTIONS
// ===========================================

async function generatePDF(seatId: string, seatNumber: string): Promise<void> {
  logger.info(`📄 Generating PDF for Seat ${seatNumber}`, { seatId });
  
  // Simulate heavy processing (2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  logger.info(`✅ PDF generated for Seat ${seatNumber}`);
}

async function sendEmailNotification(userId: string, seatNumber: string): Promise<void> {
  logger.info(`📧 Sending email`, { userId });
  
  // Simulate email sending (1 second)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  logger.info(`✅ Email sent to user`);
}

async function processSeatSoldEvent(message: {
  seatId: string;
  eventId: string;
  userId: string;
  seatNumber: string;
  price: number;
  soldAt: string;
  correlationId?: string;
}): Promise<void> {
  logger.info('Processing SeatSoldEvent', {
    seatId: message.seatId,
    userId: message.userId,
    seatNumber: message.seatNumber,
    price: message.price,
  });

  // Step 1: Generate PDF ticket
  await generatePDF(message.seatId, message.seatNumber);

  // Step 2: Send email notification
  await sendEmailNotification(message.userId, message.seatNumber);

  logger.info(`🎉 All processing complete for Seat ${message.seatNumber}`);
}

// ===========================================
// MAIN WORKER FUNCTION
// ===========================================

async function startWorker(): Promise<void> {
  logger.info('🚀 TicketRush Worker starting...');
  logger.info(`📡 Connecting to RabbitMQ at ${RABBITMQ_URL}`);

  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Assert queue exists (durable = survives restart)
    await channel.assertQueue(TICKET_GENERATION_QUEUE, {
      durable: true,
    });

    // Set prefetch to 1 (process one message at a time)
    await channel.prefetch(1);

    logger.info('✅ Connected to RabbitMQ');
    logger.info(`👂 Listening on queue: ${TICKET_GENERATION_QUEUE}`);
    logger.info('Waiting for messages... (Press Ctrl+C to exit)');

    // ================================================================
    // MESSAGE CONSUMER WITH CORRELATION ID EXTRACTION
    // ================================================================
    await channel.consume(
      TICKET_GENERATION_QUEUE,
      async (msg) => {
        if (!msg) return;

        const startTime = Date.now();

        try {
          // ================================================================
          // EXTRACT CORRELATION ID FROM MESSAGE HEADERS
          // ================================================================
          // This allows us to trace the request from the API to the worker.
          // The same UUID appears in both the API logs and Worker logs.
          // ================================================================
          const messageHeaders = msg.properties.headers || {};
          const correlationIdFromHeader = messageHeaders['x-correlation-id'] as string | undefined;
          const messageContent = JSON.parse(msg.content.toString());
          
          // Priority: header > message body > generate new
          currentCorrelationId = 
            correlationIdFromHeader ?? 
            messageContent.correlationId ?? 
            uuidv4();

          logger.info('📨 Message received', {
            correlationIdSource: correlationIdFromHeader ? 'header' : 
              messageContent.correlationId ? 'body' : 'generated',
          });

          // Process the message
          await processSeatSoldEvent(messageContent);

          // ================================================================
          // ✅ ACK ONLY AFTER SUCCESSFUL PROCESSING
          // ================================================================
          channel.ack(msg);

          const duration = Date.now() - startTime;
          logger.info(`⏱️  Processing complete`, { durationMs: duration });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('❌ Error processing message', { error: errorMessage });

          // NACK with requeue=true to retry later
          channel.nack(msg, false, true);
          logger.warn('🔄 Message requeued for retry');
        } finally {
          // Reset for next message
          currentCorrelationId = 'idle';
        }
      },
      { noAck: false }
    );

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down worker...');
      await channel.close();
      await connection.close();
      logger.info('👋 Worker stopped gracefully');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('🛑 Received SIGTERM, shutting down...');
      await channel.close();
      await connection.close();
      process.exit(0);
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('💥 Failed to start worker', { error: errorMessage });
    process.exit(1);
  }
}

// Start the worker
currentCorrelationId = 'startup';
startWorker();
