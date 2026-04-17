import { Users } from "lucide-react";

export function ResidentsShowcase() {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.42)] md:p-6">
      <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        <Users className="h-3.5 w-3.5" />
        Residents Spotlight
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Resident Snapshots</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Quickly find interests, dislikes, support needs, attendance trends, and follow-up flags in one clean resident
        workspace.
      </p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">James R.</p>
            <p className="text-xs text-slate-500">Room 118 • Quiet setting preferred</p>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
            1:1 Focus
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Music</span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Word Puzzles</span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Morning Preferred</span>
        </div>

        <p className="mt-3 text-xs text-slate-600">68% participation this month • 4 group attends • 2 recent 1:1s</p>
      </div>
    </article>
  );
}
