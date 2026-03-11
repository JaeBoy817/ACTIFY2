export default function DocumentationLoading() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-[1.8rem] border border-[#223962] bg-[#091325]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl border border-[#223962] bg-[#091325]" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl border border-[#223962] bg-[#091325]" />
    </div>
  );
}
