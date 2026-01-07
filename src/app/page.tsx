
import { prisma } from '@/infrastructure/db/prisma';
import { EventCard } from '@/components/EventCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export default async function Home() {
  // Fetch events from the database
  const events = await prisma.event.findMany({
    orderBy: {
      date: 'asc',
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
            Ticket<span className="text-emerald-500">Rush</span>
          </h1>
          <p className="text-xl text-slate-400">
            High-performance simulation of a ticket booking platform.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center">
            <h3 className="mb-2 text-2xl font-bold text-slate-200">No Events Found</h3>
            <p className="text-slate-400">
              Please seed the database with events to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/event/${event.id}`} className="block transition-transform hover:-translate-y-1">
                <EventCard
                  title={event.title}
                  location={event.location}
                  date={new Date(event.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
