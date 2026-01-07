import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getBookingService } from '@/app/api/container';
import { z } from 'zod';
import { SeatNotFoundError, SeatNotAvailableError, UnauthorizedLockError } from '@/core/services/BookingService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation Schema
const confirmPurchaseSchema = z.object({
  seatId: z.string().uuid(),
  userId: z.string().uuid(),
});

/**
 * POST /api/v1/payments/confirm
 * 
 * Confirms a purchase after successful payment.
 * 
 * Request Body:
 * {
 *   "seatId": "uuid",
 *   "userId": "uuid"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validatedData = confirmPurchaseSchema.parse(body);

    // 2. Call business logic
    const bookingService = await getBookingService();
    
    console.log(`💰 Processing payment confirmation for Seat ${validatedData.seatId}`);
    
    const soldSeat = await bookingService.confirmSale(
      validatedData.seatId,
      validatedData.userId
    );

    // 3. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: soldSeat.id,
          seatNumber: soldSeat.seatNumber,
          status: soldSeat.status,
          userId: soldSeat.userId,
          version: soldSeat.version,
        },
        message: 'Purchase confirmed successfully',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in POST /api/v1/payments/confirm:', error);

    // 400 Bad Request - Validation Error
    if (error instanceof ZodError) {
        return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid body' } }, { status: 400 });
    }

    // 404 Not Found
    if (error instanceof SeatNotFoundError) {
      return NextResponse.json({ success: false, error: { code: 'SEAT_NOT_FOUND', message: error.message } }, { status: 404 });
    }

    // 403 Forbidden - Not owner of lock
    if (error instanceof UnauthorizedLockError) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED_LOCK', message: error.message } }, { status: 403 });
    }

    // 500 Internal Server Error
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
