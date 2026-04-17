export function PricingHero() {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white/95 px-6 py-12 text-center shadow-[0_30px_90px_-58px_rgba(15,23,42,0.38)] md:px-10 md:py-14">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-44 w-56 -translate-x-1/2 rounded-full bg-indigo-100/55 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-10 left-16 h-36 w-36 rounded-full bg-sky-100/55 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-8 top-10 h-40 w-40 rounded-full bg-violet-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        <p className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
          Pricing
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Simple Pricing for Activities Directors
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
          Actify helps you save time on notes, resident planning, and calendar building with one clean AI-powered workspace.
        </p>
      </div>
    </section>
  );
}
