export default function VolunteersLoading() {
  const panel =
    "rounded-[1.35rem] border border-[#2f4e47]/85 bg-[linear-gradient(180deg,#0b1a1a_0%,#0b1717_52%,#091212_100%)] shadow-[0_28px_48px_-36px_rgba(16,185,129,0.58)]";

  return (
    <div className="space-y-4">
      <section className={`${panel} p-4`}>
        <div className="h-8 w-44 animate-pulse rounded bg-[#173730]" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-[#173730]" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={`${panel} h-28 animate-pulse`} />
          ))}
        </div>
      </section>

      <section className={`${panel} p-4`}>
        <div className="h-5 w-52 animate-pulse rounded bg-[#173730]" />
        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_180px_190px_190px_160px_auto]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-full border border-[#3a6159] bg-[#102823]" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <div className={`${panel} h-[760px] animate-pulse`} />
        <div className={`${panel} h-[760px] animate-pulse`} />
        <div className="space-y-4">
          <div className={`${panel} h-[220px] animate-pulse`} />
          <div className={`${panel} h-[220px] animate-pulse`} />
          <div className={`${panel} h-[220px] animate-pulse`} />
        </div>
      </section>
    </div>
  );
}
