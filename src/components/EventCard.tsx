import { CalendarDays, MapPin } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EventCardProps {
  title: string;
  date: string;
  location: string;
  imageUrl?: string; // Optional image
  onBuyClick?: () => void;
  className?: string;
}

export function EventCard({
  title,
  date,
  location,
  imageUrl,
  onBuyClick,
  className,
}: EventCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl transition-all hover:border-slate-700 hover:shadow-2xl',
        className
      )}
    >
      {/* Image Placeholder or Actual Image */}
      <div className="relative h-48 w-full bg-slate-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <span className="text-4xl">🎫</span>
          </div>
        )}
        
        {/* Date Badge */}
        <div className="absolute top-4 left-4 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-md border border-white/10">
            <div className='flex items-center gap-2 text-white/90 text-sm font-medium'>
                <CalendarDays className="h-4 w-4 text-emerald-400" />
                {date}
            </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="mb-2 text-xl font-bold text-white antialiased">
            {title}
        </h3>
        
        <div className="mb-6 flex items-center gap-2 text-slate-400">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{location}</span>
        </div>

        <button
          onClick={onBuyClick}
          className="group relative w-full overflow-hidden rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 transition-all hover:bg-emerald-400 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
             Buy Tickets
             <svg 
                className="h-4 w-4 transition-transform group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
