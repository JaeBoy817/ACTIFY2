export default function AnalyticsLoading() {
  const panel =
    "rounded-[1.35rem] border border-[#243a61]/90 bg-[linear-gradient(180deg,#0d172b_0%,#0b1427_54%,#08101f_100%)] shadow-[0_28px_48px_-36px_rgba(37,99,235,0.75)]";

  return (
    <div className="space-y-4">
      <section className={`${panel} p-4`}>
        <div className="h-8 w-44 animate-pulse rounded bg-[#16315a]" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[#16315a]" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl border border-[#304872] bg-[#0e1a30]" />
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`${panel} h-32 animate-pulse`} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className={`${panel} h-72 animate-pulse`} />
        <div className={`${panel} h-72 animate-pulse`} />
      </section>
    </div>
  );
}
