/**
 * Custom Error Types for Repository Operations
 */

/**
 * Thrown when an optimistic locking conflict is detected.
 * This happens when another process has modified the entity
 * since it was last read.
 */
export class ConcurrencyError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly expectedVersion: number
  ) {
    super(
      `Concurrency conflict: ${entityType} with ID ${entityId} ` +
      `was modified by another process. Expected version ${expectedVersion}.`
    );
    this.name = 'ConcurrencyError';
  }
}

/**
 * Thrown when an entity is not found in the database.
 */
export class EntityNotFoundError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string
  ) {
    super(`${entityType} with ID ${entityId} not found`);
    this.name = 'EntityNotFoundError';
  }
}
