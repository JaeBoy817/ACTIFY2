import { UserRound } from "lucide-react";

import type { ResidentSnapshot } from "@/components/assistant-dashboard/types";

type ResidentMiniCardProps = {
  resident: ResidentSnapshot;
};

function tagList(items: string[]) {
  if (!items.length) return "Not added yet";
  return items.join(" • ");
}

export function ResidentMiniCard({ resident }: ResidentMiniCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.45)]">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{resident.name}</h3>
          <p className="text-xs text-slate-500">Room {resident.room}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden>
          <UserRound className="h-4 w-4" />
        </span>
      </header>
      <dl className="space-y-1.5 text-xs leading-relaxed text-slate-600">
        <div>
          <dt className="font-semibold text-slate-700">Interests</dt>
          <dd>{tagList(resident.interests)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Dislikes</dt>
          <dd>{tagList(resident.dislikes)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Participation style</dt>
          <dd>{resident.participationStyle}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Suggested matches</dt>
          <dd>{tagList(resident.suggestedMatches)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          View Snapshot
        </button>
        <button
          type="button"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Get Suggestions
        </button>
      </div>
    </article>
  );
}
