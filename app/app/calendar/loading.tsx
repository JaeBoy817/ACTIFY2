export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      <div className="glass-panel h-24 animate-pulse rounded-3xl border-white/20" />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="glass-panel h-[680px] animate-pulse rounded-3xl border-white/20" />
        <div className="glass-panel h-[680px] animate-pulse rounded-3xl border-white/20" />
      </div>
    </div>
  );
}

