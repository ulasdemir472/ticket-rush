import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'SOLD';

interface SeatProps {
  status: SeatStatus;
  seatNumber: string;
  price: number;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string; // Allow custom classes
}

export function Seat({
  status,
  seatNumber,
  price,
  onClick,
  isLoading = false,
  className,
}: SeatProps) {
  const isAvailable = status === 'AVAILABLE';
  const isLocked = status === 'LOCKED';
  const isSold = status === 'SOLD';

  return (
    <button
      onClick={isAvailable && !isLoading ? onClick : undefined}
      disabled={!isAvailable || isLoading}
      className={cn(
        'group relative flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all duration-200',
        // Base colors based on status
        isAvailable && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]',
        isLocked && 'cursor-not-allowed border-amber-400/50 bg-amber-400/10 text-amber-400',
        isSold && 'cursor-not-allowed border-rose-600/50 bg-rose-600/10 text-rose-600',
        isLoading && 'cursor-wait opacity-80',
        className
      )}
      aria-label={`Seat ${seatNumber} - ${status} - $${price}`}
      title={`Seat ${seatNumber} - $${price}`}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <span className="text-sm font-bold antialiased">
          {seatNumber}
        </span>
      )}

      {/* Price Tooltip (only for available seats on hover) */}
      {isAvailable && !isLoading && (
        <div className="absolute -top-10 left-1/2 hidden -translate-x-1/2 transform rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:block group-hover:opacity-100 whitespace-nowrap z-10 border border-slate-700">
          ${price}
        </div>
      )}
    </button>
  );
}
