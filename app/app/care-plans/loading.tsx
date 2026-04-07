export default function CarePlansLoading() {
  return (
    <div className="space-y-4">
      <div className="glass-panel h-32 animate-pulse rounded-2xl border-white/15" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <div className="glass-panel h-[680px] animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-[680px] animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-[680px] animate-pulse rounded-2xl border-white/15" />
      </div>
    </div>
  );
}
