export default function TemplatesLoading() {
  return (
    <div className="space-y-4">
      <div className="glass-panel h-40 animate-pulse rounded-2xl border-white/20" />
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="glass-panel h-[640px] animate-pulse rounded-2xl border-white/20" />
        <div className="glass-panel h-[640px] animate-pulse rounded-2xl border-white/20" />
      </div>
    </div>
  );
}

