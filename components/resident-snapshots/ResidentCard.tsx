import { ArrowUpRight, Sparkles } from "lucide-react";

import { ResidentTag } from "@/components/resident-snapshots/ResidentTag";
import type { ResidentSnapshot } from "@/components/resident-snapshots/types";
import { toRelativeDayLabel } from "@/components/resident-snapshots/helpers";
import { toResidentStatusLabel } from "@/lib/residents/types";
import { cn } from "@/lib/utils";

export function ResidentCard({
  resident,
  selected,
  onSelect,
  onAskActify
}: {
  resident: ResidentSnapshot;
  selected: boolean;
  onSelect: () => void;
  onAskActify: () => void;
}) {
  return (
    <article
      className={cn(
        "group rounded-3xl border bg-white p-4 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200",
        selected ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-200"
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{resident.fullName}</h3>
          <p className="mt-0.5 text-sm text-slate-600">Room {resident.room}</p>
        </div>
        <ResidentTag
          label={toResidentStatusLabel(resident.status)}
          tone={resident.status === "DISCHARGED" ? "soft" : "accent"}
        />
      </header>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {resident.tags.slice(0, 4).map((tag) => (
          <ResidentTag key={tag} label={tag} />
        ))}
      </div>

      <dl className="space-y-2 text-sm text-slate-600">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Participation style</dt>
          <dd className="mt-1 text-sm leading-5 text-slate-700">{resident.quickSummary}</dd>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="font-semibold uppercase tracking-[0.12em] text-slate-500">Last engagement</dt>
            <dd className="mt-0.5 text-slate-700">{toRelativeDayLabel(resident.lastEngagementDate)}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.12em] text-slate-500">Last touchpoint</dt>
            <dd className="mt-0.5 line-clamp-1 text-slate-700">{resident.lastOneToOne || resident.lastActivity || "Not logged"}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onAskActify}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask Actify
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
        >
          View Snapshot
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}
