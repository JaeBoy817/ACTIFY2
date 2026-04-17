import { Sparkles } from "lucide-react";

const PROMPTS = [
  "Reword this 1:1 note",
  "Give me a backup activity",
  "Suggest a low-energy group game",
  "Help me plan next week",
  "Give me ideas for a bed-bound resident"
] as const;

export function AssistantShowcase() {
  return (
    <section className="grid gap-6 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.35)] lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:p-8">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistant Spotlight
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Ask Actify Instead of Starting From Scratch
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
          Generate activity ideas, reword progress notes, build 1:1 documentation drafts, and get resident-specific
          support in seconds.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
            <span
              key={prompt}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              {prompt}
            </span>
          ))}
        </div>
      </div>

      <article className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.5)] md:p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Actify AI Assistant</p>
            <p className="text-xs text-slate-500">Activity ideas, note support, and planning help</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Ready to help
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="ml-auto max-w-[72%] rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Build a 7-day low-budget activity plan.
          </div>
          <div className="max-w-[90%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
            Here&apos;s a low-budget weekly plan with group options, 1:1 alternatives, and backup ideas for rainy days.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Monday Theme: Music & Memory</p>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li>Morning: Memory Music Circle</li>
              <li>Afternoon: Song Request Room Visits</li>
              <li>Backup: Personal Playlist Reflection</li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  );
}
