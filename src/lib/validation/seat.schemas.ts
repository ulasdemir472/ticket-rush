import { z } from 'zod';

/**
 * Lock Seat Request Schema
 * Validates incoming POST request body for seat locking
 */
export const lockSeatSchema = z.object({
  seatId: z.string().uuid('seatId must be a valid UUID'),
  userId: z.string().uuid('userId must be a valid UUID'),
});

export type LockSeatRequest = z.infer<typeof lockSeatSchema>;

/**
 * Release Seat Request Schema
 */
export const releaseSeatSchema = z.object({
  seatId: z.string().uuid('seatId must be a valid UUID'),
  userId: z.string().uuid('userId must be a valid UUID'),
});

export type ReleaseSeatRequest = z.infer<typeof releaseSeatSchema>;

/**
 * Confirm Sale Request Schema
 */
export const confirmSaleSchema = z.object({
  seatId: z.string().uuid('seatId must be a valid UUID'),
  userId: z.string().uuid('userId must be a valid UUID'),
});

export type ConfirmSaleRequest = z.infer<typeof confirmSaleSchema>;
