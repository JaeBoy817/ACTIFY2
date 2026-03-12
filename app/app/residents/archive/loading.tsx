export default function ResidentsArchiveLoading() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-[1.8rem] border border-[#2a3f67] bg-[linear-gradient(180deg,#091327_0%,#0b1428_46%,#090f1f_100%)]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-[#24395f] bg-[linear-gradient(180deg,#0f1b33_0%,#0b1427_100%)]"
          />
        ))}
      </div>
      <div className="h-[520px] animate-pulse rounded-2xl border border-[#213457] bg-[linear-gradient(180deg,#0e192f_0%,#0a1324_100%)]" />
    </div>
  );
}
