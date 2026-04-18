"use client";

import { CalendarDays, FilePenLine, HeartHandshake, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

export type AssistantExampleCard = {
  id: string;
  title: string;
  prompt: string;
  kind: "notes" | "one-to-one" | "calendar" | "ideas";
};

const iconByKind = {
  notes: FilePenLine,
  "one-to-one": HeartHandshake,
  calendar: CalendarDays,
  ideas: Lightbulb
} as const;

type AssistantExampleCardGridProps = {
  cards: AssistantExampleCard[];
  activePrompt: string | null;
  onSelect: (prompt: string) => void;
};

export function AssistantExampleCardGrid({ cards, activePrompt, onSelect }: AssistantExampleCardGridProps) {
  return (
    <section className="w-full" aria-label="Example assistant prompts">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Get Started With an Example
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = iconByKind[card.kind];
          const active = activePrompt === card.prompt;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.prompt)}
              className={cn(
                "group rounded-2xl border bg-white/92 p-3 text-left shadow-[0_16px_30px_-28px_rgba(15,23,42,0.75)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_34px_-28px_rgba(15,23,42,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
                active ? "border-violet-300 bg-violet-50/65" : "border-slate-200/90"
              )}
            >
              <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-violet-200 group-hover:bg-violet-50 group-hover:text-violet-700">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </div>
              <p className="text-sm font-medium leading-5 text-slate-800">{card.title}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

