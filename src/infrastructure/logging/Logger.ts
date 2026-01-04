/**
 * Structured Logger using Winston
 * 
 * Features:
 * - JSON formatted logs for production
 * - Colored console logs for development
 * - Automatic correlation ID injection from AsyncLocalStorage
 * - Timestamp on every log entry
 */

import winston from 'winston';
import { getCorrelationId, getContext } from './RequestContext';

/**
 * Custom format that adds correlation ID from AsyncLocalStorage
 */
const correlationIdFormat = winston.format((info) => {
  const context = getContext();
  info.correlationId = context?.correlationId ?? getCorrelationId();
  info.path = context?.path;
  info.method = context?.method;
  return info;
});

/**
 * Development format: colored, human-readable
 */
const devFormat = winston.format.combine(
  correlationIdFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { level, message, timestamp, correlationId, ...meta } = info;
    const corrId = typeof correlationId === 'string' ? correlationId.substring(0, 8) : '--------';
    const metaStr = Object.keys(meta).length > 0 
      ? ` ${JSON.stringify(meta)}` 
      : '';
    return `${timestamp} [${corrId}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * Production format: JSON for log aggregation (CloudWatch, Datadog, etc.)
 */
const prodFormat = winston.format.combine(
  correlationIdFormat(),
  winston.format.timestamp(),
  winston.format.json()
);

/**
 * Winston Logger instance
 */
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Logger facade with correlation ID context
 * 
 * @example
 * ```typescript
 * import { logger } from '@/infrastructure/logging';
 * 
 * // All logs automatically include correlationId
 * logger.info('Processing request');
 * logger.error('Failed to process', { error: err.message });
 * ```
 */
export const logger = {
  /**
   * Debug level log
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.debug(message, meta);
  },

  /**
   * Info level log
   */
  info(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.info(message, meta);
  },

  /**
   * Warning level log
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.warn(message, meta);
  },

  /**
   * Error level log
   */
  error(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.error(message, meta);
  },

  /**
   * Creates a child logger with additional default metadata
   */
  child(defaultMeta: Record<string, unknown>) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) => 
        logger.debug(msg, { ...defaultMeta, ...meta }),
      info: (msg: string, meta?: Record<string, unknown>) => 
        logger.info(msg, { ...defaultMeta, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) => 
        logger.warn(msg, { ...defaultMeta, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) => 
        logger.error(msg, { ...defaultMeta, ...meta }),
    };
  },
};

export default logger;
