export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
        ))}
      </div>
    </div>
  );
}
