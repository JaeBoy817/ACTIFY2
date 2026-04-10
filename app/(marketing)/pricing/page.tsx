import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardPenLine,
  FileText,
  HeartPulse,
  ShieldCheck,
  Users,
  Wallet
} from "lucide-react";

import { MarketingAuthCtas } from "@/components/marketing/MarketingAuthCtas";

export const dynamic = "force-static";

const INCLUDED_FEATURES = [
  "Full activity calendar and scheduling workspace",
  "Attendance tracking tied to real resident workflow",
  "Resident profiles with preferences, participation, and due items",
  "Progress Notes, 1:1 Notes, UDA, and MDS workflow visibility",
  "Care Plans with goals, interventions, and linked participation support",
  "Department analytics and leadership-ready reporting",
  "Budget, stock, volunteers, and resident council workflow support",
  "Premium export and PDF-ready reporting workflow"
] as const;

const WORKFLOW_BLOCKS = [
  {
    title: "Resident-centered operations",
    body: "Resident profiles, preferences, participation patterns, admission-date context, and due visibility all stay connected.",
    icon: Users
  },
  {
    title: "Documentation that stays organized",
    body: "Progress, 1:1, UDA, and MDS support workflows stay tied to the resident story so teams can chart faster and more clearly.",
    icon: ClipboardPenLine
  },
  {
    title: "Calendar + attendance + follow-up in one flow",
    body: "Plan the month, run the day, mark attendance, and move directly into documentation without workflow gaps.",
    icon: CalendarDays
  },
  {
    title: "Leadership-ready visibility",
    body: "Get clean analytics, month summaries, and print-ready reports that are easy to review and present.",
    icon: BarChart3
  }
] as const;

const DIFFERENTIATORS = [
  "Not just a calendar",
  "Not just a notes tool",
  "Not just attendance tracking",
  "Not just reporting",
  "One connected platform built for how Activity Directors actually work"
] as const;

const PRICING_FAQ = [
  {
    question: "What is included in Actify Premium?",
    answer:
      "Actify Premium includes calendar planning, attendance tracking, resident workflows, documentation visibility, care plan support, analytics, reporting, and operational modules like budget, volunteers, and resident council."
  },
  {
    question: "Is the price per facility or per user?",
    answer:
      "Actify Premium is billed as one monthly subscription per facility workspace in the current setup."
  },
  {
    question: "Can I use Actify across multiple facilities?",
    answer:
      "Yes. Multi-facility rollout is supported. Contact us if you need a structured rollout across multiple locations."
  },
  {
    question: "Does Actify include documentation tools?",
    answer:
      "Yes. Documentation workflows include Progress Notes, 1:1 Notes, UDA visibility, and MDS support context."
  },
  {
    question: "Can I generate reports and print PDFs?",
    answer:
      "Yes. Actify includes clean report generation and export-ready PDF workflows built for leadership and survey prep."
  },
  {
    question: "Is Actify built for SNFs and assisted living?",
    answer:
      "Yes. Actify is purpose-built for SNFs, assisted living, long-term care, and activity department workflows."
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Billing can be managed in the Stripe billing portal, including cancellation."
  }
] as const;

export default function PricingPage() {
  return (
    <div className="pb-10 pt-6 md:pb-14 md:pt-8">
      <section className="rounded-[2rem] border border-slate-700/70 bg-[linear-gradient(180deg,#090e19_0%,#080c14_100%)] p-5 shadow-[0_30px_120px_-45px_rgba(9,93,255,0.45)] md:p-8">
        <header className="max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/85">Pricing</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] text-white md:text-6xl">
            One premium system for the entire activity department.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
            Built specifically for Activity Directors. Plan activities, track attendance, manage documentation, monitor
            due items, build care plans, and generate clean reports from one connected workspace.
          </p>
          <MarketingAuthCtas className="mt-6" />
        </header>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500/14 via-blue-500/14 to-violet-500/14 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/85">Actify Premium</p>
                <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">$20/month</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/45 bg-cyan-500/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                <Wallet className="h-3.5 w-3.5" />
                Monthly Plan
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-200">
              Built for Activity Directors who want one clean system for scheduling, documentation, attendance,
              residents, care plans, analytics, reports, and daily operational workflows.
            </p>

            <div className="mt-4 grid gap-2">
              {INCLUDED_FEATURES.map((feature) => (
                <p
                  key={feature}
                  className="inline-flex items-start gap-2 rounded-xl border border-slate-600/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  {feature}
                </p>
              ))}
            </div>

            <MarketingAuthCtas className="mt-6" />
          </article>

          <div className="space-y-3">
            <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                Why it&apos;s worth it
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Actify replaces scattered spreadsheets, disconnected notes, and calendar-only tools with one structured,
                premium workflow designed for real activity departments.
              </p>
              <div className="mt-4 grid gap-2">
                {DIFFERENTIATORS.map((item) => (
                  <p key={item} className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    {item}
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
                <HeartPulse className="h-4 w-4" />
                Built for care activity reality
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Purpose-built for SNFs, assisted living, and long-term care teams who need operational clarity without
                adding admin friction.
              </p>
            </article>
          </div>
        </div>

        <section className="mt-10 border-t border-slate-700/70 pt-10">
          <header className="mb-5 max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">What&apos;s Included</p>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Premium features built for Activity Directors</h2>
          </header>
          <div className="grid gap-3 md:grid-cols-2">
            {WORKFLOW_BLOCKS.map((block) => {
              const Icon = block.icon;
              return (
                <article key={block.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
                  <Icon className="h-5 w-5 text-cyan-200" />
                  <h3 className="mt-3 text-lg font-bold text-white">{block.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{block.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
            <FileText className="h-4 w-4" />
            Why Actify feels different
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            Most teams are forced to choose between basic calendars, generic notes tools, or disconnected reporting.
            Actify brings those workflows together in one premium operational system.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {DIFFERENTIATORS.map((item) => (
              <p key={item} className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-slate-700/70 pt-10">
          <header className="mb-4 max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">Pricing FAQ</p>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Clear answers before you start</h2>
          </header>
          <div className="grid gap-2">
            {PRICING_FAQ.map((item) => (
              <details key={item.question} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white">{item.question}</summary>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-violet-500/15 p-6">
          <h2 className="text-2xl font-black text-white md:text-3xl">Ready to run your department from one platform?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 md:text-base">
            Sign up now and start with Actify Premium at $20/month, or sign in to continue if your facility already has access.
          </p>
          <MarketingAuthCtas className="mt-6" />
        </section>
      </section>
    </div>
  );
}
