export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.35rem] border border-[#34435e]/90 bg-[linear-gradient(180deg,#10182a_0%,#0d1524_50%,#09101d_100%)] p-5 shadow-[0_30px_58px_-36px_rgba(36,78,142,0.7)] md:p-6">
        <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-10 w-64 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-4 w-[28rem] max-w-full animate-pulse rounded bg-white/10" />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-7 w-20 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(360px,420px)]">
        <div className="rounded-[1.35rem] border border-[#34435e]/90 bg-[linear-gradient(180deg,#10182a_0%,#0d1524_50%,#09101d_100%)] p-4">
          <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-white/10" />
                <div className="mt-1 h-3 w-3/4 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[#34435e]/90 bg-[linear-gradient(180deg,#10182a_0%,#0d1524_50%,#09101d_100%)] p-4">
          <div className="h-5 w-52 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-56 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          <div className="mt-3 h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        </div>

        <div className="rounded-[1.35rem] border border-[#34435e]/90 bg-[linear-gradient(180deg,#10182a_0%,#0d1524_50%,#09101d_100%)] p-4">
          <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-[420px] animate-pulse rounded-2xl border border-white/10 bg-white/10" />
        </div>
      </section>
    </div>
  );
}
