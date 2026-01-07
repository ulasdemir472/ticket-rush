'use client';

import React, { use } from 'react';
import useSWR from 'swr';
import { Seat, SeatStatus } from '@/components/Seat';
import { toast, Toaster } from 'sonner';
import { Loader2, RefreshCw, X, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SeatData {
  id: string;
  seatNumber: string;
  status: SeatStatus;
  price: number;
}

interface PendingPurchase {
    seatId: string;
    seatNumber: string;
    userId: string;
    price: number;
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();

  // 1. Polling for real-time seat updates
  const { data: seats, error, isLoading, mutate } = useSWR<SeatData[]>(
    `/api/v1/events/${eventId}/seats`,
    fetcher,
    {
      refreshInterval: 1000, 
      revalidateOnFocus: true,
    }
  );

  // Local state
  const [loadingSeats, setLoadingSeats] = React.useState<Record<string, boolean>>({});
  const [pendingSeat, setPendingSeat] = React.useState<PendingPurchase | null>(null);
  const [isConfirming, setIsConfirming] = React.useState(false);

  // 2. Handle Seat Lock
  const handleSeatClick = async (seat: SeatData) => {
    // Generate a temporary user ID (valid UUID required by API)
    const userId = crypto.randomUUID();
    
    setLoadingSeats((prev) => ({ ...prev, [seat.id]: true }));

    try {
      const response = await fetch('/api/v1/seats/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId: seat.id,
          userId,
        }),
      });

      if (response.status === 409) {
        toast.error('⚠️ Too slow!', {
          description: 'This seat was just taken by another user.',
          duration: 4000,
        });
        mutate();
      } else if (!response.ok) {
        const errorData = await response.json();
        toast.error('Error locking seat', {
            description: errorData.error?.message || 'Unknown error occurred'
        });
      } else {
        // SUCCESS LOCK
        toast.success('✅ Seat Locked!', {
          description: `Seat ${seat.seatNumber} is reserved. Complete payment in 5 mins.`,
        });
        
        // Open Payment Modal
        setPendingSeat({
            seatId: seat.id,
            seatNumber: seat.seatNumber,
            price: seat.price,
            userId,
        });
        
        mutate();
      }
    } catch (err) {
      toast.error('Network Error', {
        description: 'Failed to reach the server.',
      });
      console.error(err);
    } finally {
      setLoadingSeats((prev) => ({ ...prev, [seat.id]: false }));
    }
  };

  // 3. Handle Payment Confirmation
  const handleConfirmPayment = async () => {
    if (!pendingSeat) return;
    
    setIsConfirming(true);
    
    try {
        const response = await fetch('/api/v1/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              seatId: pendingSeat.seatId,
              userId: pendingSeat.userId,
            }),
          });

          if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.error?.message || 'Payment failed');
          }

          // SUCCESS PAYMENT
          toast.success('🎉 Ticket Generated!', {
              description: `Check your email for Seat ${pendingSeat.seatNumber}.`,
              duration: 5000,
          });

          setPendingSeat(null);
          mutate(); // Refresh to see SOLD status

    } catch (error) {
        toast.error('Payment Failed', {
            description: error instanceof Error ? error.message : 'Please try again',
        });
    } finally {
        setIsConfirming(false);
    }
  };

  if (error) return <div className="text-center text-red-500 mt-20">Failed to load seats</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <Toaster position="top-center" richColors />
      
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Select Your Seats</h1>
            <p className="text-slate-400">Event ID: {eventId}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
             <RefreshCw className="h-4 w-4 animate-spin" />
             Live Updates
          </div>
        </div>

        {/* Legend */}
        <div className="mb-8 flex justify-center gap-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-emerald-500"></div>
            <span className="text-sm font-medium">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-amber-400"></div>
            <span className="text-sm font-medium">Locked (In Process)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-rose-600"></div>
            <span className="text-sm font-medium">Sold</span>
          </div>
        </div>

        {/* Seat Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-sm">
            {/* Screen */}
            <div className="mb-12">
                <div className="mx-auto h-2 w-3/4 rounded-full bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-50 shadow-[0_10px_20px_rgba(255,255,255,0.1)]"></div>
                <p className="mt-2 text-center text-xs uppercase tracking-widest text-slate-600">Screen</p>
            </div>

            <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 justify-items-center">
              {seats?.map((seat) => (
                <Seat
                  key={seat.id}
                  seatNumber={seat.seatNumber}
                  status={seat.status}
                  price={Number(seat.price)}
                  isLoading={loadingSeats[seat.id]}
                  onClick={() => handleSeatClick(seat)}
                />
              ))}
            </div>
            
             {seats?.length === 0 && (
                <p className="text-center text-slate-500">No seats configuration found for this event.</p>
            )}
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {pendingSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Confirm Purchase</h2>
                    <button 
                        onClick={() => setPendingSeat(null)}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-6 rounded-lg bg-slate-800/50 p-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>Seat Number</span>
                        <span className="font-mono text-white">{pendingSeat.seatNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>Price</span>
                        <span className="font-mono text-emerald-400 text-lg">${Number(pendingSeat.price).toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleConfirmPayment}
                        disabled={isConfirming}
                        className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white shadow-lg transition-all hover:bg-emerald-600 hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isConfirming ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CreditCard className="h-5 w-5" />
                                Pay & Confirm
                            </>
                        )}
                    </button>
                    <button
                         onClick={() => setPendingSeat(null)}
                         disabled={isConfirming}
                         className="w-full rounded-lg py-3 font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
