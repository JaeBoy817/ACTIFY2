import Link from "next/link";

import { ANNUAL_SAVINGS } from "@/components/marketing/pricing/pricing-data";

export function PricingCTASection() {
  return (
    <section className="rounded-[36px] border border-slate-200 bg-white/95 px-6 py-10 shadow-[0_28px_72px_-52px_rgba(15,23,42,0.34)] md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Start Now</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Choose the Plan That Makes the Work Easier
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
          Actify helps Activities Directors save time, stay organized, and handle notes, residents, and calendar planning
          faster in one clean workspace.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up?plan=monthly"
            className="inline-flex h-11 min-w-[170px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Choose Monthly
          </Link>
          <Link
            href="/sign-up?plan=annual"
            className="inline-flex h-11 min-w-[170px] items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Choose Annual
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-500">Annual saves ${ANNUAL_SAVINGS.toFixed(2)}/year compared to monthly billing.</p>
      </div>
    </section>
  );
}
