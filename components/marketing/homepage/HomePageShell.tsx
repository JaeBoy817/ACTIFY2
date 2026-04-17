import { BotMessageSquare, CalendarDays, UsersRound } from "lucide-react";

import { AssistantShowcase } from "@/components/marketing/homepage/AssistantShowcase";
import { CalendarShowcase } from "@/components/marketing/homepage/CalendarShowcase";
import { FeaturePillarCard } from "@/components/marketing/homepage/FeaturePillarCard";
import { FinalCTAPanel } from "@/components/marketing/homepage/FinalCTAPanel";
import { HeroPanel } from "@/components/marketing/homepage/HeroPanel";
import { HowItWorksSection } from "@/components/marketing/homepage/HowItWorksSection";
import { ResidentsShowcase } from "@/components/marketing/homepage/ResidentsShowcase";
import { ValueGridSection } from "@/components/marketing/homepage/ValueGridSection";

const PILLARS = [
  {
    title: "Actify AI Assistant",
    description:
      "Get instant help with activity ideas, note rewording, care plan wording, and planning support across your day.",
    points: ["Activity ideas", "Note rewriting", "Calendar help", "Follow-up suggestions"],
    icon: BotMessageSquare,
    accentClassName: "border border-sky-200 bg-sky-50 text-sky-700"
  },
  {
    title: "Resident Snapshots",
    description: "Keep preferences, participation style, and engagement details organized in one clean workspace.",
    points: ["Interests and dislikes", "Support needs", "Participation patterns", "Follow-up visibility"],
    icon: UsersRound,
    accentClassName: "border border-teal-200 bg-teal-50 text-teal-700"
  },
  {
    title: "Calendar Creation",
    description:
      "Build your month faster with Sunday-through-Saturday planning, recurring events, and clean month/week/day views.",
    points: ["Quick activity add", "Recurring events", "Holiday + birthday placement", "AI planning shortcuts"],
    icon: CalendarDays,
    accentClassName: "border border-violet-200 bg-violet-50 text-violet-700"
  }
] as const;

export function HomePageShell() {
  return (
    <div className="space-y-6 pb-8 pt-3 md:space-y-8 md:pt-5">
      <HeroPanel />

      <section id="features" className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)] md:p-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Core Product</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Three Core Tools. One Smarter Workflow.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
            Everything Activities Directors need to plan faster, stay organized, and follow through without the clutter.
          </p>
        </header>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <FeaturePillarCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </section>

      <AssistantShowcase />

      <section className="space-y-3 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)] md:p-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Residents + Calendar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Plan Around Real Residents and Real Days
          </h2>
        </header>
        <div className="grid gap-3 lg:grid-cols-2">
          <ResidentsShowcase />
          <CalendarShowcase />
        </div>
      </section>

      <HowItWorksSection />
      <ValueGridSection />
      <FinalCTAPanel />
    </div>
  );
}
