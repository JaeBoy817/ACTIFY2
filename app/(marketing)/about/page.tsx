import { ArrowRight, Compass, Lightbulb, UsersRound } from "lucide-react";

import {
  Eyebrow,
  MattePanel,
  PrimaryCta,
  PublicContainer,
  PublicSection,
  SectionHeading,
  SecondaryCta
} from "@/components/public/PublicPrimitives";
import {
  ABOUT_BODY,
  ABOUT_CTA_BODY,
  ABOUT_CTA_TITLE,
  ABOUT_MISSION_BODY,
  ABOUT_MISSION_TITLE,
  ABOUT_SOLUTIONS,
  ABOUT_TITLE
} from "@/content/marketing";

export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <div className="pb-12">
      <PublicSection className="pb-10 pt-12">
        <PublicContainer>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <MattePanel className="border-zinc-900 bg-zinc-900 p-7 text-zinc-100 md:p-10">
              <Eyebrow className="text-zinc-400">About Actify</Eyebrow>
              <h1 className="mt-3 font-[var(--font-display)] text-5xl leading-[0.96] md:text-7xl">
                {ABOUT_TITLE}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">{ABOUT_BODY}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <PrimaryCta href="/sign-in">Sign In</PrimaryCta>
                <SecondaryCta href="/sign-up">Get Started</SecondaryCta>
              </div>
            </MattePanel>
            <MattePanel className="space-y-3 p-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Built for</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  Activities Directors, Activity Assistants, and interdisciplinary teams in skilled nursing and rehab.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Core mission</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  Make daily activity workflows clear, fast, and auditable without adding more admin drag.
                </p>
              </div>
              <div className="rounded-xl border border-yellow-300 bg-yellow-400 p-4 text-zinc-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-800">Approach</p>
                <p className="mt-2 text-sm leading-6 text-zinc-800">
                  Structure over chaos. Visibility over guesswork. Useful over flashy.
                </p>
              </div>
            </MattePanel>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="py-8">
        <PublicContainer>
          <SectionHeading
            title={ABOUT_MISSION_TITLE}
            subtitle={ABOUT_MISSION_BODY}
          />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {ABOUT_SOLUTIONS.map((item, index) => (
              <MattePanel key={item.title} className="h-full p-5">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-zinc-100">
                  {index === 0 ? <UsersRound className="h-4 w-4" /> : index === 1 ? <Compass className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                </div>
                <h3 className="mt-3 text-lg font-bold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
              </MattePanel>
            ))}
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="py-8">
        <PublicContainer>
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <MattePanel className="p-6">
              <h2 className="font-[var(--font-display)] text-4xl leading-tight text-zinc-950">
                The problem we solve
              </h2>
              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {[
                  "Scattered documentation",
                  "Hard-to-track monthly 1:1 visits",
                  "Attendance gaps without context",
                  "Care plan follow-up hidden in notes",
                  "Inventory and planning disconnected",
                  "Report prep pressure at month-end"
                ].map((problem) => (
                  <div key={problem} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {problem}
                  </div>
                ))}
              </div>
            </MattePanel>
            <MattePanel className="border-zinc-900 bg-zinc-900 p-6 text-zinc-100">
              <h3 className="font-[var(--font-display)] text-3xl leading-tight">The idea behind Actify</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                One organized system for schedule, attendance, notes, care plans, residents, inventory, and reporting.
                The platform matches the way activity departments actually work day to day.
              </p>
            </MattePanel>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="py-8">
        <PublicContainer>
          <MattePanel className="p-6">
            <SectionHeading
              title="Product values"
              subtitle="Clarity and speed guide every workflow decision."
            />
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Clarity over clutter",
                "Speed over friction",
                "Structure over chaos",
                "Useful over flashy",
                "Visibility over guesswork",
                "Consistency over rework"
              ].map((value) => (
                <div key={value} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
                  {value}
                </div>
              ))}
            </div>
          </MattePanel>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="pt-8">
        <PublicContainer>
          <MattePanel className="border-zinc-900 bg-zinc-900 p-7 text-zinc-100">
            <h2 className="font-[var(--font-display)] text-4xl leading-tight">{ABOUT_CTA_TITLE}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">{ABOUT_CTA_BODY}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryCta href="/sign-in">Sign In</PrimaryCta>
              <SecondaryCta href="/sign-up" className="border-zinc-700 bg-zinc-800 text-zinc-100">
                Get Started
              </SecondaryCta>
              <SecondaryCta href="/" className="border-zinc-700 bg-zinc-800 text-zinc-100">
                Back Home <ArrowRight className="h-4 w-4" />
              </SecondaryCta>
            </div>
          </MattePanel>
        </PublicContainer>
      </PublicSection>
    </div>
  );
}
