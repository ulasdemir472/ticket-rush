export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white tracking-tight">
          🎫 TicketRush
        </h1>
        <p className="mt-4 text-xl text-slate-300">
          High-Performance Ticket Sales Platform
        </p>
        <div className="mt-8">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            Phase 1: Infrastructure Ready
          </span>
        </div>
      </div>
    </main>
  );
}
