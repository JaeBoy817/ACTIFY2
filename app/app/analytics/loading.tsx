export default function AnalyticsLoading() {
  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl border-white/20 p-4">
        <div className="skeleton shimmer h-8 w-40 rounded" />
        <div className="mt-2 skeleton shimmer h-4 w-72 rounded" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-white/55" />
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="glass-panel h-32 animate-pulse rounded-2xl border-white/20" />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass-panel h-72 animate-pulse rounded-2xl border-white/20" />
        <div className="glass-panel h-72 animate-pulse rounded-2xl border-white/20" />
      </section>
    </div>
  );
}
