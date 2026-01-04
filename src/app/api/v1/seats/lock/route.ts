import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getBookingService } from '@/app/api/container';
import { lockSeatSchema } from '@/lib/validation/seat.schemas';
import { SeatNotFoundError, SeatNotAvailableError } from '@/core/services/BookingService';
import { ConcurrencyError } from '@/core/errors/repository.errors';

// Force dynamic rendering - skip static optimization at build time
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/seats/lock
 * 
 * Locks a seat for a user during the checkout process.
 * 
 * Request Body:
 * {
 *   "seatId": "uuid",
 *   "userId": "uuid"
 * }
 * 
 * Responses:
 * - 200 OK: Seat locked successfully
 * - 400 Bad Request: Invalid request body (Zod validation failed)
 * - 404 Not Found: Seat does not exist
 * - 409 Conflict: Seat was modified by another process (retry recommended)
 * - 422 Unprocessable Entity: Seat is not available (already locked/sold)
 * - 500 Internal Server Error: Unexpected error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validatedData = lockSeatSchema.parse(body);

    // 2. Call business logic (async to support dynamic imports)
    const bookingService = await getBookingService();
    const lockedSeat = await bookingService.lockSeat(
      validatedData.seatId,
      validatedData.userId
    );

    // 3. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: lockedSeat.id,
          seatNumber: lockedSeat.seatNumber,
          status: lockedSeat.status,
          userId: lockedSeat.userId,
          version: lockedSeat.version,
        },
        message: 'Seat locked successfully',
      },
      { status: 200 }
    );

  } catch (error) {
    // ================================================================
    // ERROR HANDLING
    // ================================================================

    // 400 Bad Request - Validation Error
    if (error instanceof ZodError) {
      const zodError = error as ZodError;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: zodError.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    // 404 Not Found - Seat doesn't exist
    if (error instanceof SeatNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_NOT_FOUND',
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // 422 Unprocessable Entity - Seat not available
    if (error instanceof SeatNotAvailableError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SEAT_NOT_AVAILABLE',
            message: error.message,
          },
        },
        { status: 422 }
      );
    }

    // ================================================================
    // 409 CONFLICT - Concurrency Error (Optimistic Locking Failed)
    // ================================================================
    // This happens when another process modified the seat between
    // our read and write operations. The client should retry.
    // ================================================================
    if (error instanceof ConcurrencyError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONCURRENCY_CONFLICT',
            message: 'The seat was modified by another process. Please retry.',
            retryable: true,
          },
        },
        { status: 409 }
      );
    }

    // 500 Internal Server Error - Unexpected error
    console.error('Unexpected error in POST /api/v1/seats/lock:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
