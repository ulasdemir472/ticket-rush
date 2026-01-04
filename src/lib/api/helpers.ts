/**
 * API Route Helpers
 * 
 * Utility functions for use in API route handlers to integrate
 * with the logging and tracing infrastructure.
 */

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { runWithContext, createContext } from '@/infrastructure/logging/RequestContext';
import { logger } from '@/infrastructure/logging/Logger';

/**
 * Header name for internal correlation ID (set by middleware)
 */
const CORRELATION_ID_HEADER = 'x-internal-correlation-id';

/**
 * Extracts correlation ID from request headers
 */
export function getCorrelationIdFromRequest(request: NextRequest): string {
  return request.headers.get(CORRELATION_ID_HEADER) 
    ?? request.headers.get('x-correlation-id')
    ?? uuidv4();
}

/**
 * Wraps an API route handler with request context
 * 
 * This sets up AsyncLocalStorage with the correlation ID so that
 * all logs within the request automatically include it.
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withRequestContext(request, async () => {
 *     logger.info('Processing request');  // Includes correlationId
 *     // ... your logic
 *   });
 * }
 * ```
 */
export async function withRequestContext<T>(
  request: NextRequest,
  handler: () => Promise<T>
): Promise<T> {
  const correlationId = getCorrelationIdFromRequest(request);
  const context = createContext({
    correlationId,
    path: request.nextUrl.pathname,
    method: request.method,
  });

  return runWithContext(context, async () => {
    logger.info('Request started', { 
      path: context.path, 
      method: context.method 
    });
    
    const start = Date.now();
    try {
      const result = await handler();
      const duration = Date.now() - start;
      logger.info('Request completed', { durationMs: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Request failed', { 
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}
