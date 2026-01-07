
import { NextResponse } from 'next/server';
import { getSeatRepository } from '@/app/api/container';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const seatRepository = await getSeatRepository();
    const seats = await seatRepository.findByEventId(eventId);
    
    // Convert to DTOs if necessary, or return directly
    // Sorting by seatNumber numerically
    const sortedSeats = seats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));

    return NextResponse.json(sortedSeats);
  } catch (error) {
    console.error('[API] Failed to fetch seats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
