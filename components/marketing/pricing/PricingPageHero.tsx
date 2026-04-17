import Link from "next/link";

export function PricingPageHero() {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white/95 px-6 pb-10 pt-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] md:px-10 md:pb-12">
      <div aria-hidden className="pointer-events-none absolute right-10 top-8 h-48 w-48 rounded-full bg-sky-100/70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-6 left-8 h-44 w-44 rounded-full bg-teal-100/60 blur-3xl" />

      <div className="relative max-w-3xl">
        <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          Pricing
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Simple Pricing for a Smarter Activity Workflow
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
          Actify helps Activities Directors save time on planning, notes, resident organization, and calendar building
          without the complexity of traditional software.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Get Started
          </Link>
          <Link
            href="#plans"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Choose a Plan
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Built for Activities Directors in skilled nursing facilities. No bloated system, just useful tools.
        </p>
      </div>
    </section>
  );
}
