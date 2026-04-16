import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type PromptChipsProps = {
  prompts: string[];
  activePrompt: string | null;
  onPickPrompt: (prompt: string) => void;
};

export function PromptChips({ prompts, activePrompt, onPickPrompt }: PromptChipsProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-3 shadow-sm shadow-slate-200/70" aria-label="Assistant quick prompts">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quick Starters</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => {
          const active = activePrompt === prompt;
          return (
            <button
              key={prompt}
              type="button"
              onClick={() => onPickPrompt(prompt)}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1",
                active
                  ? "border-sky-300 bg-sky-50 text-sky-800 shadow-sm shadow-sky-100"
                  : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm hover:shadow-slate-200"
              )}
            >
              <Sparkles className={cn("h-3.5 w-3.5", active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-500")} aria-hidden />
              {prompt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
