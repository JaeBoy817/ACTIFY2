import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardPenLine,
  FileText,
  Package,
  Sparkles,
  Users
} from "lucide-react";

import {
  AccentTag,
  Eyebrow,
  MattePanel,
  PrimaryCta,
  PublicContainer,
  PublicSection,
  SectionHeading,
  SecondaryCta
} from "@/components/public/PublicPrimitives";
import {
  HERO_BULLETS,
  HERO_HEADLINE,
  HERO_SUBHEAD,
  HOME_FAQ_ITEMS,
  HOW_IT_WORKS_STEPS,
  MODULE_SNAPSHOT_ITEMS,
  TRUST_ROW_BULLETS,
  TRUST_ROW_TITLE
} from "@/content/marketing";
import { getModuleRegistryItem, MODULE_REGISTRY, type ModuleRegistryKey } from "@/lib/moduleRegistry";

export const dynamic = "force-static";

const featureIconMap: Record<string, typeof CalendarDays> = {
  dashboard: BarChart3,
  calendar: CalendarDays,
  templates: Sparkles,
  attendance: ClipboardCheck,
  notes: ClipboardPenLine,
  residents: Users,
  "care-plan": ClipboardCheck,
  analytics: BarChart3,
  volunteers: Users,
  "budget-stock": Package,
  "resident-council": Users,
  reports: FileText
};

export default function LandingPage() {
  return (
    <div className="pb-12">
      <PublicSection className="pb-10 pt-12">
        <PublicContainer>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <MattePanel className="border-zinc-900 bg-zinc-900 p-7 text-zinc-100 md:p-10">
              <Eyebrow className="text-zinc-400">Today in Actify</Eyebrow>
              <h1 className="mt-3 font-[var(--font-display)] text-5xl leading-[0.96] md:text-7xl">
                {HERO_HEADLINE}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
                {HERO_SUBHEAD}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {HERO_BULLETS.map((bullet) => (
                  <AccentTag
                    key={bullet}
                    label={bullet}
                    className="border-zinc-700 bg-zinc-800 text-zinc-200"
                  />
                ))}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <PrimaryCta href="/sign-in">Sign In</PrimaryCta>
                <SecondaryCta href="/sign-up">Get Started</SecondaryCta>
                <SecondaryCta href="#what-actify-does" className="border-zinc-700 bg-zinc-800 text-zinc-100">
                  Explore Features
                </SecondaryCta>
              </div>
            </MattePanel>

            <div className="grid gap-4">
              <MattePanel className="border-yellow-300 bg-yellow-400 p-6 text-zinc-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-800/85">
                  Department Pulse
                </p>
                <p className="mt-2 text-4xl font-black leading-none">18</p>
                <p className="mt-1 text-sm text-zinc-800/90">Activities scheduled today</p>
              </MattePanel>
              <MattePanel className="grid grid-cols-2 gap-3 bg-white p-5">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">
                    1:1 Missing
                  </p>
                  <p className="mt-2 text-2xl font-black text-zinc-900">14</p>
                  <p className="text-xs text-zinc-600">Residents this month</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">
                    Documentation
                  </p>
                  <p className="mt-2 text-2xl font-black text-zinc-900">92%</p>
                  <p className="text-xs text-zinc-600">Completed this week</p>
                </div>
              </MattePanel>
              <MattePanel className="border-blue-600 bg-blue-600 p-5 text-zinc-50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100">
                  Modern command center for Activities Directors
                </p>
                <p className="mt-2 text-sm leading-6 text-blue-50/90">
                  Schedule, attendance, notes, care plans, residents, inventory, and reports in one system.
                </p>
              </MattePanel>
            </div>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection id="what-actify-does" className="py-8">
        <PublicContainer>
          <SectionHeading
            title="What Actify does"
            subtitle="Every core workflow in one connected platform."
          />
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULE_SNAPSHOT_ITEMS.map((item) => {
              const moduleItem =
                getModuleRegistryItem(item.key as ModuleRegistryKey) ??
                MODULE_REGISTRY.find((entry) => entry.title === item.title) ??
                MODULE_REGISTRY[0];
              const Icon = featureIconMap[item.key] ?? moduleItem.icon;
              return (
                <MattePanel key={item.key} className="group h-full p-4 transition hover:-translate-y-1">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-zinc-100">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-zinc-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
                </MattePanel>
              );
            })}
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="py-8">
        <PublicContainer>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <MattePanel className="border-zinc-900 bg-zinc-900 p-7 text-zinc-100">
              <Eyebrow className="text-zinc-400">Why it helps</Eyebrow>
              <h3 className="mt-3 font-[var(--font-display)] text-4xl leading-[1.02]">Less chaos. More control.</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Before</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Scattered notes, missed 1:1s, and month-end report stress.
                  </p>
                </div>
                <div className="rounded-xl border border-yellow-400/60 bg-yellow-400 p-4 text-zinc-950">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-800">After</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-800">
                    Daily clarity, visible follow-up, and cleaner monthly outcomes.
                  </p>
                </div>
              </div>
            </MattePanel>
            <MattePanel className="grid gap-3 p-5">
              {[
                "Save hours on notes and attendance",
                "Track monthly 1:1 completion without spreadsheets",
                "Keep care-plan evidence visible by resident",
                "Generate reports with fewer missing fields"
              ].map((line) => (
                <div key={line} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
                  {line}
                </div>
              ))}
            </MattePanel>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="py-8">
        <PublicContainer>
          <MattePanel className="border-zinc-900 bg-zinc-900 p-7 text-zinc-100">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div>
                <Eyebrow className="text-zinc-400">Product Spotlight</Eyebrow>
                <h3 className="mt-3 font-[var(--font-display)] text-4xl leading-[1.02]">
                  One place for your whole department.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
                  Actify links schedule, attendance, notes, 1:1 documentation, care plans, inventory, and reporting so
                  you can run the day and finish the month with confidence.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <PrimaryCta href="/sign-in">Open Workspace</PrimaryCta>
                  <SecondaryCta href="/about" className="border-zinc-700 bg-zinc-800 text-zinc-100">
                    Learn more
                  </SecondaryCta>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Today</p>
                  <p className="mt-2 text-sm text-zinc-200">6 activities scheduled • 2 attendance sessions pending</p>
                </div>
                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Residents</p>
                  <p className="mt-2 text-sm text-zinc-200">14 residents still need a monthly 1:1 note</p>
                </div>
                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Operations</p>
                  <p className="mt-2 text-sm text-zinc-200">3 low-stock categories • Reports ready to export</p>
                </div>
              </div>
            </div>
          </MattePanel>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="py-8">
        <PublicContainer>
          <SectionHeading title="How it works" subtitle="Plan, run, document, and stay ahead." />
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <MattePanel key={step.title} className="h-full p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Step {index + 1}
                </p>
                <h4 className="mt-2 text-lg font-bold text-zinc-900">{step.title}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{step.body}</p>
              </MattePanel>
            ))}
            <MattePanel className="h-full border-yellow-300 bg-yellow-400 p-5 text-zinc-950">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-800">Step 4</p>
              <h4 className="mt-2 text-lg font-bold">Stay ahead</h4>
              <p className="mt-2 text-sm leading-6 text-zinc-800">
                Track care plans, inventory, council action items, and reporting from the same command center.
              </p>
            </MattePanel>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="py-8">
        <PublicContainer>
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <MattePanel className="p-6">
              <SectionHeading title={TRUST_ROW_TITLE} subtitle="Built for teams that need practical, reliable daily workflows." />
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {TRUST_ROW_BULLETS.map((item) => (
                  <div key={item} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
                    {item}
                  </div>
                ))}
              </div>
            </MattePanel>
            <MattePanel className="border-zinc-900 bg-zinc-900 p-6 text-zinc-100">
              <h3 className="font-[var(--font-display)] text-3xl leading-tight">Ready to run your department with less friction?</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Move from scattered paperwork to a clear system your whole team can use.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <PrimaryCta href="/sign-up">Get Started</PrimaryCta>
                <SecondaryCta href="/sign-in" className="border-zinc-700 bg-zinc-800 text-zinc-100">
                  Sign In
                </SecondaryCta>
              </div>
            </MattePanel>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="pt-8">
        <PublicContainer>
          <MattePanel className="p-6">
            <Eyebrow>FAQ</Eyebrow>
            <h3 className="mt-2 text-3xl font-[var(--font-display)] text-zinc-950">Quick answers</h3>
            <div className="mt-4 grid gap-2">
              {HOME_FAQ_ITEMS.map((item) => (
                <details key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm leading-7 text-zinc-700">{item.answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Link href="/about" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-800 hover:text-zinc-900">
                Learn more about Actify
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </MattePanel>
        </PublicContainer>
      </PublicSection>
    </div>
  );
}
