/**
 * Request Context using AsyncLocalStorage
 * 
 * Provides request-scoped storage that automatically propagates
 * through async operations without explicit passing.
 * 
 * This allows us to access the correlationId anywhere in the
 * request lifecycle without passing it through every function.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

/**
 * Context data stored per request
 */
export interface RequestContext {
  correlationId: string;
  startTime: Date;
  path?: string;
  method?: string;
}

/**
 * AsyncLocalStorage instance for request context
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Gets the current request context
 * Returns undefined if called outside a request context
 */
export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Gets the current correlation ID
 * Returns a new UUID if no context exists (for background processes)
 */
export function getCorrelationId(): string {
  const context = getContext();
  return context?.correlationId ?? uuidv4();
}

/**
 * Runs a function within a new request context
 * 
 * @param context - The context data
 * @param fn - The function to run
 * @returns The result of the function
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Creates a new request context with optional overrides
 */
export function createContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    correlationId: overrides?.correlationId ?? uuidv4(),
    startTime: overrides?.startTime ?? new Date(),
    path: overrides?.path,
    method: overrides?.method,
  };
}

/**
 * Runs a function with a specific correlation ID context
 * Useful for worker processes that receive correlation ID from messages
 */
export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  const context = createContext({ correlationId });
  return runWithContext(context, fn);
}
