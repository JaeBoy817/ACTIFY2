export default function ResidentCouncilLoading() {
  return (
    <div className="min-h-screen space-y-4 bg-gradient-to-br from-[#FFF4E6]/70 via-[#FFF0F0]/60 to-[#FFF0F6]/70">
      <section className="glass-panel rounded-3xl p-6">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-white/60" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded bg-white/50" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-9 w-36 animate-pulse rounded-xl bg-white/60" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass-panel rounded-2xl p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-white/55" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-white/65" />
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-2xl p-4">
        <div className="h-[420px] animate-pulse rounded-xl bg-white/45" />
      </section>
    </div>
  );
}
