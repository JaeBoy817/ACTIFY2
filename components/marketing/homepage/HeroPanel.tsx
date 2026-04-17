import Link from "next/link";

import { HeroProductVisual } from "@/components/marketing/homepage/HeroProductVisual";

export function HeroPanel() {
  return (
    <section id="home" className="rounded-[34px] border border-slate-200/80 bg-white/95 px-6 pb-10 pt-7 shadow-[0_30px_85px_-48px_rgba(15,23,42,0.35)] md:px-10 md:pb-12 md:pt-10">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.95fr)]">
        <div>
          <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Built for skilled nursing activity teams
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Your AI Workspace for
            <span className="bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent"> Activities Directors</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Actify helps Activities Directors create activity ideas, reword notes, track residents, and build calendars
            faster without the clutter of traditional software.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Try Actify
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              See How It Works
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-500">Made for Activities Directors, not administrators.</p>
        </div>

        <HeroProductVisual />
      </div>
    </section>
  );
}
