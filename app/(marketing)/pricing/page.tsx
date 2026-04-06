import Link from "next/link";
import { BadgeCheck, Building2, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-static";

const INCLUDED = [
  "Calendar planning and monthly activity scheduling",
  "Attendance tracking and participation trend visibility",
  "Documentation hub for progress, 1:1, UDA, and MDS support",
  "Resident management with due-date tracking",
  "Care plan support and resident follow-up visibility",
  "Analytics and export-ready reporting"
] as const;

const ADD_ONS = [
  "Multi-campus rollout planning",
  "Implementation and workflow setup support",
  "Administrator alignment and reporting review",
  "Template and process standardization"
] as const;

export default function PricingPage() {
  return (
    <div className="pb-10 pt-6 md:pb-14 md:pt-8">
      <section className="rounded-[2rem] border border-slate-700/70 bg-[linear-gradient(180deg,#090e19_0%,#080c14_100%)] p-5 shadow-[0_30px_120px_-45px_rgba(9,93,255,0.45)] md:p-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/85">Pricing</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] text-white md:text-6xl">
            Simple access for activity departments and facility teams.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
            Actify is designed to give teams full workflow coverage from day one without piecing together multiple tools.
          </p>
        </header>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500/12 via-blue-500/12 to-violet-500/12 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/90">Primary Plan</p>
                <h2 className="mt-2 text-3xl font-black text-white">Full Access</h2>
              </div>
              <span className="inline-flex items-center rounded-full border border-cyan-300/45 bg-cyan-500/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                Included
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-200">
              One complete platform for planning, participation, documentation, resident workflows, and reporting.
            </p>

            <div className="mt-5 grid gap-2">
              {INCLUDED.map((item) => (
                <p key={item} className="inline-flex items-start gap-2 rounded-xl border border-slate-600/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  {item}
                </p>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/request-access"
                className="inline-flex h-11 items-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/80 to-blue-600/80 px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Request Demo
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center rounded-full border border-slate-500 bg-slate-900/85 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
              >
                Sign In
              </Link>
            </div>
          </article>

          <div className="space-y-3">
            <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
              <div className="flex items-center gap-2 text-amber-200">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">Implementation Support</p>
              </div>
              <div className="mt-3 grid gap-2">
                {ADD_ONS.map((item) => (
                  <p key={item} className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    {item}
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
              <div className="flex items-center gap-2 text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">Operational Fit</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Designed for SNFs, assisted living, and long-term care workflows where documentation quality and daily
                visibility both matter.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                <Building2 className="h-4 w-4 text-blue-300" />
                Facility-ready workflows from day one
              </p>
            </article>

            <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                <BadgeCheck className="h-4 w-4" />
                Need exact package details?
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                We can walk through your facility structure, team size, and rollout goals during a short demo call.
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex h-10 items-center rounded-full border border-slate-500 bg-slate-900 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:border-slate-300"
              >
                Contact / Demo
              </Link>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
