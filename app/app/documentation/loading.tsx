export default function DocumentationLoading() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-[1.8rem] border border-[#223962] bg-[#091325]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl border border-[#223962] bg-[#091325]" />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-2xl border border-[#223962] bg-[#091325]" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[620px] animate-pulse rounded-2xl border border-[#223962] bg-[#091325]" />
        <div className="h-[620px] animate-pulse rounded-2xl border border-[#223962] bg-[#091325]" />
      </div>
    </div>
  );
}
