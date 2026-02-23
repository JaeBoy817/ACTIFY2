export default function ResidentCouncilMeetingLoading() {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/25 bg-white/45 p-6 shadow-lg shadow-black/10">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-white/60" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded bg-white/50" />
      </section>
      <section className="rounded-2xl border border-white/25 bg-white/45 p-4 shadow-lg shadow-black/10">
        <div className="h-[480px] animate-pulse rounded-xl bg-white/50" />
      </section>
    </div>
  );
}
