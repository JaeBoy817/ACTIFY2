export default function ResidentCouncilLoading() {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] border border-[#3f4f69]/85 bg-[linear-gradient(180deg,#0f1827_0%,#0d1522_55%,#0a101a_100%)] p-5 shadow-[0_28px_50px_-34px_rgba(121,139,176,0.66)]">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[#223652]" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded bg-[#1c2d46]" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-[#445a79] bg-[#152338]" />
          ))}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[#3f4f69]/85 bg-[linear-gradient(180deg,#0f1827_0%,#0d1522_55%,#0a101a_100%)] p-4 shadow-[0_28px_50px_-34px_rgba(121,139,176,0.66)]">
        <div className="h-4 w-64 animate-pulse rounded bg-[#223652]" />
        <div className="mt-3 grid gap-2 xl:grid-cols-[190px_170px_170px_170px_minmax(0,1fr)]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-full border border-[#4e6385] bg-[#17263f]" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <div className="h-[660px] animate-pulse rounded-[1.35rem] border border-[#3f4f69]/85 bg-[linear-gradient(180deg,#0f1827_0%,#0d1522_55%,#0a101a_100%)]" />
        <div className="h-[660px] animate-pulse rounded-[1.35rem] border border-[#3f4f69]/85 bg-[linear-gradient(180deg,#0f1827_0%,#0d1522_55%,#0a101a_100%)]" />
        <div className="h-[660px] animate-pulse rounded-[1.35rem] border border-[#3f4f69]/85 bg-[linear-gradient(180deg,#0f1827_0%,#0d1522_55%,#0a101a_100%)]" />
      </section>
    </div>
  );
}
