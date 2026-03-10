export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-3xl border border-cyan-400/20 bg-slate-950/80" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[680px] animate-pulse rounded-3xl border border-cyan-400/20 bg-slate-950/80" />
        <div className="hidden h-[680px] animate-pulse rounded-3xl border border-cyan-400/20 bg-slate-950/80 xl:block" />
      </div>
    </div>
  );
}
