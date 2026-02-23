export default function SettingsLoading() {
  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl p-5">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-white/55" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded bg-white/45" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="glass-panel h-[760px] animate-pulse rounded-2xl bg-white/35" />
        <div className="glass-panel h-[760px] animate-pulse rounded-2xl bg-white/35" />
      </section>
    </div>
  );
}
