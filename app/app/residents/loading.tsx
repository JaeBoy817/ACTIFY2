export default function ResidentsLoading() {
  return (
    <div className="space-y-4">
      <div className="glass-panel h-32 animate-pulse rounded-2xl border-white/15" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="glass-panel h-[580px] animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-[580px] animate-pulse rounded-2xl border-white/15" />
      </div>
    </div>
  );
}
