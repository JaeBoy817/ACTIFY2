import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, ClipboardPenLine, FileBarChart2, Users } from "lucide-react";

import { MarketingAuthCtas } from "@/components/marketing/MarketingAuthCtas";

export const dynamic = "force-static";

const DOC_BLOCKS = [
  {
    title: "Core Workflow",
    body: "Plan calendar schedules, track attendance, and complete documentation from one connected daily workflow.",
    icon: CalendarDays,
    accent: "text-cyan-200"
  },
  {
    title: "Documentation Guidance",
    body: "Use structured Progress, 1:1, UDA, and MDS support workflows that keep resident context visible.",
    icon: ClipboardPenLine,
    accent: "text-violet-200"
  },
  {
    title: "Reporting and Oversight",
    body: "Generate cleaner monthly views of participation, completion status, and follow-up activity.",
    icon: FileBarChart2,
    accent: "text-emerald-200"
  }
] as const;

export default function DocsPage() {
  return (
    <div className="pb-10 pt-6 md:pb-14 md:pt-8">
      <section className="rounded-[2rem] border border-slate-700/70 bg-[linear-gradient(180deg,#090e19_0%,#080c14_100%)] p-5 shadow-[0_30px_120px_-45px_rgba(9,93,255,0.45)] md:p-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/85">Product Docs</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] text-white md:text-6xl">
            Practical guidance for real activity workflows.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
            A quick guide to how Actify supports planning, participation tracking, resident follow-up, and documentation operations.
          </p>
          <MarketingAuthCtas className="mt-6" />
        </header>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {DOC_BLOCKS.map((block) => {
            const Icon = block.icon;
            return (
              <article key={block.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
                <Icon className={"h-5 w-5 " + block.accent} />
                <h2 className="mt-3 text-lg font-bold text-white">{block.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{block.body}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/85">
              <BookOpenCheck className="h-4 w-4" />
              Documentation Focus Areas
            </p>
            <div className="mt-4 grid gap-2">
              {[
                "How to move from scheduled activity to attendance completion",
                "When to use Progress Notes vs 1:1 Notes",
                "How UDA and MDS support workflows tie to resident due tracking",
                "How resident follow-up signals surface on dashboard and documentation queues",
                "How analytics month boundaries are calculated and reviewed"
              ].map((line) => (
                <p key={line} className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                  {line}
                </p>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
              <Users className="h-4 w-4" />
              Need Guided Setup?
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">We can walk through your workflow live.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              If your team wants a focused setup walkthrough, request a demo and we&apos;ll map the best path for your facility.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <MarketingAuthCtas size="sm" />
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-full border border-slate-500 bg-slate-900/85 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
              >
                Back Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </article>
        </section>
      </section>
    </div>
  );
}
