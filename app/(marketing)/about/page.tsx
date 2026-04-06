import Link from "next/link";
import { ArrowRight, Compass, Lightbulb, ShieldCheck, UsersRound } from "lucide-react";

export const dynamic = "force-static";

const SOLUTION_CARDS = [
  {
    title: "Built for activity operations",
    body: "Actify is designed around real activity department workflows, not retrofitted generic admin tools.",
    icon: UsersRound,
    accent: "from-cyan-500/25 to-blue-500/25"
  },
  {
    title: "Clarity over clutter",
    body: "Scheduling, attendance, documentation, and follow-up stay connected so teams can work with confidence.",
    icon: Compass,
    accent: "from-violet-500/25 to-fuchsia-500/25"
  },
  {
    title: "Practical workflow design",
    body: "Fast charting, clear due visibility, and cleaner monthly reporting without extra complexity.",
    icon: Lightbulb,
    accent: "from-emerald-500/25 to-cyan-500/25"
  }
] as const;

const VALUES = [
  "Clarity over clutter",
  "Speed over friction",
  "Structure over chaos",
  "Resident-centered decisions",
  "Survey-ready documentation",
  "Reliable monthly visibility"
] as const;

export default function AboutPage() {
  return (
    <div className="pb-10 pt-6 md:pb-14 md:pt-8">
      <section className="rounded-[2rem] border border-slate-700/70 bg-[linear-gradient(180deg,#090e19_0%,#080c14_100%)] p-5 shadow-[0_30px_120px_-45px_rgba(9,93,255,0.45)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/85">About Actify</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.02] text-white md:text-6xl">
              Built to make activity departments more organized, visible, and confident.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Actify helps activity teams in SNFs, assisted living, and long-term care run daily workflows with less
              fragmentation. Planning, participation, resident follow-up, and documentation are connected in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/request-access"
                className="inline-flex h-11 items-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/75 to-blue-600/75 px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Request Demo
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center rounded-full border border-slate-600 bg-slate-900/90 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-400"
              >
                Sign In
              </Link>
            </div>
          </article>

          <article className="grid gap-3">
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100/85">Who it&apos;s for</p>
              <p className="mt-2 text-sm leading-6 text-emerald-50">
                Activity Directors, Activity Assistants, and facility leaders who need cleaner daily operations and
                stronger monthly visibility.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-300/25 bg-violet-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100/85">What changes</p>
              <p className="mt-2 text-sm leading-6 text-violet-50">
                Fewer disconnected systems, fewer missed follow-ups, and more confidence in documentation completion.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Product lens</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Purpose-built for care activity workflows, not generic “task management” translated into healthcare terms.
              </p>
            </div>
          </article>
        </div>

        <section className="mt-10">
          <header className="mb-5 max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">Our Approach</p>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">The way Actify solves the daily workload</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300 md:text-base">
              We focus on practical tools that help teams plan, execute, document, and report without introducing new
              complexity.
            </p>
          </header>

          <div className="grid gap-3 md:grid-cols-3">
            {SOLUTION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
                  <div className={"pointer-events-none absolute inset-x-4 top-2 h-20 rounded-xl bg-gradient-to-r blur-2xl " + card.accent} />
                  <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800/85 text-slate-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="relative mt-3 text-lg font-bold text-white">{card.title}</h3>
                  <p className="relative mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
            <h3 className="text-xl font-bold text-white">What this solves for activity teams</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                "Scattered documentation",
                "Missed 1:1 follow-ups",
                "Manual attendance reconciliation",
                "Disconnected planning and charting",
                "Unclear month-end reporting",
                "Limited resident-level visibility"
              ].map((item) => (
                <p key={item} className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                  {item}
                </p>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
            <div className="flex items-center gap-2 text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Product Values</p>
            </div>
            <div className="mt-4 grid gap-2">
              {VALUES.map((value) => (
                <p key={value} className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                  {value}
                </p>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-10 rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-cyan-500/14 via-blue-500/14 to-violet-500/14 p-6">
          <h2 className="text-2xl font-black text-white md:text-3xl">See what a cleaner activity workflow looks like.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 md:text-base">
            If your team is juggling fragmented systems, Actify can consolidate planning, attendance, documentation,
            resident tracking, and reporting into one practical platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/request-access"
              className="inline-flex h-11 items-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/80 to-blue-600/80 px-5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Request Demo
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-slate-500 bg-slate-900/85 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
            >
              Back Home
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-full border border-slate-500 bg-slate-900/85 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
            >
              Contact Team
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
