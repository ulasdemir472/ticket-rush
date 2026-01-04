/**
 * Correlation ID Middleware
 * 
 * Next.js middleware that extracts or generates a correlation ID
 * for request tracing across services.
 * 
 * Note: This middleware runs on the Edge runtime, so AsyncLocalStorage
 * is not available. The correlation ID is passed via headers to the
 * route handlers, which then use AsyncLocalStorage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Header names for correlation ID
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const CORRELATION_ID_HEADER_INTERNAL = 'x-internal-correlation-id';

/**
 * Middleware function
 * 
 * For API routes:
 * 1. Checks for X-Correlation-ID header
 * 2. If missing, generates a new UUID
 * 3. Adds the ID to request headers for route handlers
 * 4. Adds the ID to response headers for client debugging
 */
export function middleware(request: NextRequest): NextResponse {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Get or generate correlation ID
  const correlationId = 
    request.headers.get(CORRELATION_ID_HEADER) ?? uuidv4();

  // Create response with correlation ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_ID_HEADER_INTERNAL, correlationId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add to response headers for client debugging
  response.headers.set(CORRELATION_ID_HEADER, correlationId);

  return response;
}

/**
 * Configure which routes use this middleware
 */
export const config = {
  matcher: '/api/:path*',
};
