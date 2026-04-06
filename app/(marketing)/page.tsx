import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPenLine,
  FileCheck2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react";

export const dynamic = "force-static";

type ValueCard = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

type FeatureCard = {
  title: string;
  body: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const VALUE_CARDS: ValueCard[] = [
  {
    title: "Save time",
    body: "Plan activities, track attendance, and chart notes without repeating the same work in multiple places.",
    icon: Sparkles,
    accent: "from-cyan-400/35 to-blue-500/35"
  },
  {
    title: "Stay organized",
    body: "See schedules, resident follow-ups, and due tasks in one workspace instead of scattered binders and sheets.",
    icon: CheckCircle2,
    accent: "from-violet-400/35 to-indigo-500/35"
  },
  {
    title: "Track participation",
    body: "Review attendance and engagement trends quickly so your team can adjust programming with confidence.",
    icon: HeartPulse,
    accent: "from-emerald-400/35 to-cyan-500/35"
  },
  {
    title: "Keep documentation in one place",
    body: "Progress notes, 1:1 notes, UDA, and MDS support stay connected to residents and daily workflows.",
    icon: FileCheck2,
    accent: "from-amber-300/35 to-orange-500/35"
  }
];

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: "Calendar Planning",
    body: "Build a clear monthly activity schedule, avoid overlap, and keep your day-to-day programming visible at a glance.",
    tag: "Plan faster",
    icon: CalendarDays,
    accent: "text-cyan-200"
  },
  {
    title: "Attendance Tracking",
    body: "Mark participation quickly during busy activity days and instantly spot sessions that still need follow-up.",
    tag: "Track clearly",
    icon: ClipboardCheck,
    accent: "text-blue-200"
  },
  {
    title: "Documentation Hub",
    body: "Keep progress notes, 1:1 notes, UDA, and MDS support workflows organized and easy to complete.",
    tag: "Stay survey-ready",
    icon: ClipboardPenLine,
    accent: "text-violet-200"
  },
  {
    title: "Resident Management",
    body: "View preferences, participation patterns, and due dates from one resident-focused command center.",
    tag: "Resident-first",
    icon: Users,
    accent: "text-teal-200"
  },
  {
    title: "Analytics & Reporting",
    body: "See monthly participation and documentation performance without manually rebuilding reports each cycle.",
    tag: "See trends",
    icon: BarChart3,
    accent: "text-fuchsia-200"
  },
  {
    title: "Care Planning Support",
    body: "Connect activity-focused goals and interventions with the documentation and participation details staff need.",
    tag: "Coordinate care",
    icon: FileText,
    accent: "text-amber-100"
  }
];

const PAIN_SOLUTIONS = [
  {
    pain: "Scattered resident notes",
    solution: "Keep progress notes, 1:1 notes, and due documentation tied to the same resident workflow."
  },
  {
    pain: "Missed follow-ups",
    solution: "Surface due items and resident needs before they get buried under daily tasks."
  },
  {
    pain: "Manual participation tracking",
    solution: "Log attendance quickly and review trends in one place instead of rebuilding counts later."
  },
  {
    pain: "Disconnected calendars and documentation",
    solution: "Move from activity schedule to attendance and charting without jumping between separate systems."
  }
];

const PREVIEWS = [
  {
    title: "Dashboard",
    body: "See today's schedule, follow-ups, and due items in one glance.",
    accent: "from-cyan-500/25 to-blue-500/25"
  },
  {
    title: "Calendar",
    body: "Plan your month without the chaos.",
    accent: "from-violet-500/25 to-fuchsia-500/25"
  },
  {
    title: "Documentation",
    body: "Keep progress notes, 1:1s, UDA, and MDS workflows organized.",
    accent: "from-emerald-500/25 to-teal-500/25"
  },
  {
    title: "Residents",
    body: "Track preferences, participation, and due dates from one resident hub.",
    accent: "from-amber-500/25 to-orange-500/25"
  }
];

const TESTIMONIALS = [
  {
    quote:
      "Actify gives our activity department one place to run the day. We spend less time hunting for paperwork and more time with residents.",
    name: "Activity Director",
    org: "Skilled Nursing Facility"
  },
  {
    quote:
      "The attendance and documentation flow is much cleaner. Our team can see what is due before end-of-month pressure hits.",
    name: "Activities Coordinator",
    org: "Long-Term Care Campus"
  },
  {
    quote:
      "Resident follow-up is easier to manage because preferences, participation, and charting are connected in one system.",
    name: "Recreation Manager",
    org: "Assisted Living Community"
  }
];

const FAQ_ITEMS = [
  {
    question: "Who is Actify built for?",
    answer:
      "Actify is built for Activity Directors and interdisciplinary teams in SNFs, assisted living, and long-term care settings."
  },
  {
    question: "Does Actify replace paper attendance and note workflows?",
    answer:
      "Yes. Actify is designed to replace scattered paper processes with one connected workflow for planning, participation, and documentation."
  },
  {
    question: "Can we use Actify for UDA and MDS support workflows?",
    answer:
      "Yes. The Documentation Hub includes structured UDA and MDS support workflows aligned to activity department needs."
  },
  {
    question: "Can facility leaders track department performance?",
    answer:
      "Yes. Analytics and reporting help leaders monitor participation, documentation completion, and follow-up workload by month."
  }
];

function SectionShell({
  id,
  eyebrow,
  title,
  subtitle,
  children
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-28 border-t border-slate-700/60 pt-10 md:mt-14 md:pt-12">
      <header className="mb-6 max-w-3xl">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm leading-7 text-slate-300 md:text-base">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function ProductPreviewMockup() {
  return (
    <div
      aria-label="Actify product preview"
      className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950/80 p-4 shadow-[0_20px_80px_-40px_rgba(8,120,255,0.65)]"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative rounded-2xl border border-slate-700/70 bg-slate-900/95 p-3">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Actify Workspace</p>
          <span className="inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-500/12 px-2 py-1 text-[10px] font-semibold text-cyan-100">
            Live View
          </span>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-sky-300/30 bg-sky-500/10 p-2.5">
                <p className="text-[10px] text-sky-100/80">Open Sessions</p>
                <p className="mt-1 text-xl font-black text-sky-100">6</p>
              </div>
              <div className="rounded-xl border border-violet-300/30 bg-violet-500/10 p-2.5">
                <p className="text-[10px] text-violet-100/80">1:1 Due</p>
                <p className="mt-1 text-xl font-black text-violet-100">14</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-300">
                <span>Monthly Calendar</span>
                <span>April 2026</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                {Array.from({ length: 28 }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index === 11 || index === 17 || index === 20
                        ? "rounded-md bg-cyan-500/30 px-1 py-1 text-cyan-50"
                        : "rounded-md bg-slate-800/85 px-1 py-1 text-slate-400"
                    }
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
              <p className="text-[11px] text-emerald-100/80">Documentation Snapshot</p>
              <div className="mt-2 space-y-1 text-xs text-emerald-50">
                <p>Progress Notes: 22</p>
                <p>UDA Due This Week: 4</p>
                <p>MDS Overdue: 1</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
              <p className="text-[11px] text-amber-100/80">Today&apos;s Activities</p>
              <div className="mt-2 space-y-1 text-xs text-amber-50">
                <p>10:00 Bingo (14 present)</p>
                <p>1:30 Music Social (12 present)</p>
                <p>3:00 1:1 Visits (8 pending)</p>
              </div>
            </div>

            <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-3">
              <p className="text-[11px] text-fuchsia-100/80">Resident Follow-Up</p>
              <div className="mt-2 space-y-1 text-xs text-fuchsia-50">
                <p>3 low participation flags</p>
                <p>2 repeated refusals</p>
                <p>5 residents due for 1:1</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3">
              <p className="text-[11px] text-slate-300">Participation Trend</p>
              <div className="mt-2 flex h-24 items-end gap-1.5">
                {[30, 50, 38, 62, 58, 72, 68].map((height, index) => (
                  <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/40 to-blue-400/80" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMockCard({ title, body, accent }: { title: string; body: string; accent: string }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/75 p-4">
      <div className={"pointer-events-none absolute inset-x-3 top-3 h-20 rounded-xl bg-gradient-to-r blur-2xl " + accent} />
      <div className="relative rounded-xl border border-slate-700/70 bg-slate-950/85 p-3">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span>{title}</span>
          <LayoutDashboard className="h-3.5 w-3.5" />
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-2 rounded bg-slate-700/80" />
          <div className="h-2 rounded bg-slate-700/60" />
          <div className="h-2 w-3/4 rounded bg-slate-700/40" />
        </div>
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className="pb-10 pt-6 md:pb-14 md:pt-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-700/70 bg-[linear-gradient(180deg,#090e19_0%,#080c14_100%)] p-5 shadow-[0_30px_120px_-45px_rgba(9,93,255,0.55)] md:p-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-18%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-[-12%] top-[8%] h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-20%] left-[30%] h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <section id="home" className="relative grid gap-8 pb-12 pt-2 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
              Built for Activity Directors
            </span>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] text-white md:text-6xl">
              Run your activity department with less paperwork and more clarity.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Actify is the all-in-one workspace for activity teams in SNFs, assisted living, and long-term care.
              Schedule activities, track attendance, manage resident follow-ups, and keep documentation organized in one system.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/request-access"
                className="inline-flex h-11 items-center rounded-full border border-cyan-300/40 bg-gradient-to-r from-cyan-500/70 to-blue-600/70 px-5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Request Demo
              </Link>
              <Link
                href="#product-preview"
                className="inline-flex h-11 items-center rounded-full border border-slate-600/90 bg-slate-900/85 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                Watch Product Tour
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Built for SNFs, assisted living, and long-term care teams.
            </p>
          </div>

          <ProductPreviewMockup />
        </section>

        <section className="relative border-t border-slate-700/70 pt-10">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {VALUE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-slate-500/80"
                >
                  <div className={"pointer-events-none absolute inset-x-3 -top-8 h-20 rounded-full bg-gradient-to-r blur-2xl " + card.accent} />
                  <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800/85 text-slate-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="relative mt-3 text-lg font-bold text-white">{card.title}</h2>
                  <p className="relative mt-1 text-sm leading-6 text-slate-300">{card.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <SectionShell
          id="features"
          eyebrow="Core Modules"
          title="Everything your activity department needs, connected in one platform"
          subtitle="Actify replaces fragmented workflows with one operational system built for real activity documentation and participation tracking."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_CARDS.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-slate-500/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex rounded-full border border-slate-600/80 bg-slate-800/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                      {feature.tag}
                    </span>
                    <Icon className={"h-4 w-4 " + feature.accent} />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </SectionShell>

        <SectionShell
          id="how-it-works"
          eyebrow="How It Works"
          title="Plan, run, document, and review in one daily rhythm"
          subtitle="Designed for busy departments that need speed without sacrificing documentation quality."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                step: "Step 1",
                title: "Plan the month",
                body: "Build your calendar and publish clear daily schedules the team can follow."
              },
              {
                step: "Step 2",
                title: "Track attendance quickly",
                body: "Mark participation in real time and surface residents who need follow-up."
              },
              {
                step: "Step 3",
                title: "Complete documentation",
                body: "Finish progress notes, 1:1 notes, UDA, and MDS support from one linked workflow."
              }
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">{item.step}</p>
                <h3 className="mt-2 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          id="for-facilities"
          eyebrow="Built for Activity Directors"
          title="Real activity department pain points, solved with one cleaner system"
          subtitle="Actify is built for daily operations and facility-level visibility so staff and leaders can stay aligned."
        >
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
              <h3 className="text-xl font-bold text-white">Stop juggling disconnected tools</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Activity teams should not have to bounce between paper logs, spreadsheets, whiteboards, and separate note systems.
                Actify keeps planning, participation, and documentation connected so work does not get lost between shifts.
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                <p className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2">For Activity Directors: faster daily control</p>
                <p className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2">For Administrators: clearer completion and compliance visibility</p>
                <p className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2">For Leaders: cleaner month-end reporting confidence</p>
              </div>
            </article>

            <div className="space-y-3">
              {PAIN_SOLUTIONS.map((item) => (
                <article key={item.pain} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200/90">Pain</p>
                  <p className="mt-1 text-base font-semibold text-white">{item.pain}</p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200/90">Actify Fix</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{item.solution}</p>
                </article>
              ))}
            </div>
          </div>
        </SectionShell>

        <SectionShell
          id="product-preview"
          eyebrow="Product Preview"
          title="A clearer app experience across your most important workflows"
          subtitle="Preview the modules teams use every day to run planning, attendance, documentation, and resident tracking."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {PREVIEWS.map((preview) => (
              <PreviewMockCard key={preview.title} title={preview.title} body={preview.body} accent={preview.accent} />
            ))}
          </div>
        </SectionShell>

        <SectionShell
          eyebrow="Social Proof"
          title="Designed for SNFs, assisted living, and long-term care teams"
          subtitle="Early users consistently ask for the same thing: one system that actually matches activity department workflows."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <article key={item.quote} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
                <p className="text-sm leading-7 text-slate-200">&quot;{item.quote}&quot;</p>
                <p className="mt-4 text-sm font-semibold text-white">{item.name}</p>
                <p className="text-xs text-slate-400">{item.org}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-200 sm:grid-cols-3">
            {[
              "Built for real activity workflows",
              "Made to reduce clutter",
              "Presentation-ready reporting and organization"
            ].map((line) => (
              <p key={line} className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2">
                {line}
              </p>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          id="faq"
          eyebrow="FAQ"
          title="Quick answers"
          subtitle="Everything here is focused on practical deployment for activity departments and facility teams."
        >
          <div className="grid gap-2">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white">{item.question}</summary>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </SectionShell>

        <section className="rounded-3xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-violet-500/15 p-6 md:p-7">
          <h2 className="text-2xl font-black text-white md:text-3xl">See what a more organized activity department can look like.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            Give your team a cleaner system for scheduling, participation tracking, and documentation follow-through.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/request-access"
              className="inline-flex h-11 items-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/80 to-blue-600/80 px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Request Demo
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center rounded-full border border-slate-500 bg-slate-900/85 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
