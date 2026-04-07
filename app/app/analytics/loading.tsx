export default function AnalyticsLoading() {
  const panel =
    "rounded-[1.35rem] border border-[#2f4672]/90 bg-[linear-gradient(180deg,#0b1629_0%,#0a1325_52%,#080f1d_100%)] shadow-[0_28px_48px_-36px_rgba(37,99,235,0.72)]";

  return (
    <div className="space-y-5">
      <section className={`${panel} p-4`}>
        <div className="h-8 w-44 animate-pulse rounded bg-[#173159]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#173159]" />
        <div className="mt-4 h-16 animate-pulse rounded-2xl border border-[#35527f] bg-[#11243f]" />
      </section>

      <section className={`${panel} p-4`}>
        <div className="h-5 w-48 animate-pulse rounded bg-[#173159]" />
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-full border border-[#35527f] bg-[#11243f]" />
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`${panel} h-32 animate-pulse`} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
        <div className={`${panel} h-[380px] animate-pulse`} />
        <div className={`${panel} h-[380px] animate-pulse`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={`${panel} h-[320px] animate-pulse`} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className={`${panel} h-[420px] animate-pulse`} />
        <div className="space-y-4">
          <div className={`${panel} h-[220px] animate-pulse`} />
          <div className={`${panel} h-[220px] animate-pulse`} />
        </div>
      </section>
    </div>
  );
}
