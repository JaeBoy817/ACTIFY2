import Link from "next/link";
import { CalendarDays, Sparkles, Users } from "lucide-react";

export function PricingPageHero() {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white/95 px-6 pb-10 pt-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] md:px-10 md:pb-12">
      <div aria-hidden className="pointer-events-none absolute right-10 top-8 h-48 w-48 rounded-full bg-sky-100/70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-6 left-8 h-44 w-44 rounded-full bg-teal-100/60 blur-3xl" />

      <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="max-w-3xl">
          <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Pricing
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            One Small Monthly Cost. A Lot Less Daily Stress.
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

        <div className="relative mx-auto w-full max-w-[420px] pb-2 pt-1">
          <article className="relative overflow-hidden rounded-[26px] border border-slate-200/90 bg-white p-5 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.36)] transition duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Worth More Than It Costs
            </div>
            <p className="mt-4 text-sm text-slate-600">If Actify saves even one hour per month, it pays for itself quickly.</p>
            <div className="mt-4 grid gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-500">Monthly</p>
                <p className="text-lg font-semibold text-slate-900">$5.99</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-semibold text-emerald-700">Annual Value</p>
                <p className="text-lg font-semibold text-emerald-800">$5.00/mo effective</p>
              </div>
            </div>
          </article>

          <article className="absolute -left-2 top-7 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Residents
            </div>
            <p className="mt-1 text-xs text-slate-500">Track preferences and participation fast</p>
          </article>

          <article className="absolute -bottom-2 right-0 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Calendar
            </div>
            <p className="mt-1 text-xs text-slate-500">Build month, week, and day plans quickly</p>
          </article>
        </div>
      </div>
    </section>
  );
}
