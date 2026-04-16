"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { AttendanceBreakdownList } from "@/components/resident-snapshots/AttendanceBreakdownList";
import { ParticipationTrendMiniChart } from "@/components/resident-snapshots/ParticipationTrendMiniChart";
import {
  ANALYTICS_TIMEFRAME_OPTIONS,
  type AnalyticsTimeframeKey,
  analyticsPatternNotes,
  getResidentAnalyticsWindow
} from "@/components/resident-snapshots/analytics";
import type { ResidentSnapshot, SnapshotIntentAction } from "@/components/resident-snapshots/types";
import { AIShortcutButton } from "@/components/workspace/shared";

export function ResidentAnalyticsAccordion({
  resident,
  onAskActify,
  actionsById
}: {
  resident: ResidentSnapshot;
  onAskActify: (action: SnapshotIntentAction) => void;
  actionsById: Record<string, SnapshotIntentAction | undefined>;
}) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframeKey>("LAST_30_DAYS");

  const metrics = useMemo(() => getResidentAnalyticsWindow(resident, timeframe), [resident, timeframe]);
  const notes = useMemo(() => analyticsPatternNotes(resident, timeframe), [resident, timeframe]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Attendance Timeframe</p>
        <select
          value={timeframe}
          onChange={(event) => setTimeframe(event.target.value as AnalyticsTimeframeKey)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        >
          {ANALYTICS_TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Participation %" value={metrics.participation === null ? "N/A" : `${metrics.participation}%`} />
        <MetricCard label="Attendance %" value={metrics.offered > 0 ? `${Math.round((metrics.attended / metrics.offered) * 100)}%` : "N/A"} />
        <MetricCard label="Group Attendance" value={metrics.attended} />
        <MetricCard label="1:1 Visits" value={metrics.oneToOne} />
        <MetricCard label="Refusals" value={metrics.refusals} />
        <MetricCard label="Missed Activities" value={metrics.missed} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Activity Attendance Breakdown</p>
        <AttendanceBreakdownList items={resident.attendanceByActivityType ?? []} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Participation Trend</p>
        <ParticipationTrendMiniChart value={metrics.participation} trend={resident.lastParticipationTrend ?? "flat"} />
        {resident.lastParticipationTrend === "up" ? (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Participation improving
          </p>
        ) : resident.lastParticipationTrend === "down" ? (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            Participation declining
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Engagement Pattern Notes</p>
        <ul className="space-y-1 text-sm text-slate-700">
          {notes.map((note) => (
            <li key={note} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              {note}
            </li>
          ))}
        </ul>
        {metrics.limitedData ? (
          <p className="text-xs text-slate-500">Not enough expanded attendance data yet. Showing best available recent snapshot.</p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <AIShortcutButton
          label="Ask why attendance may be low"
          description="Get practical reasons and next-step prompts."
          onClick={() => actionsById["analytics-attendance-low"] && onAskActify(actionsById["analytics-attendance-low"])}
        />
        <AIShortcutButton
          label="Suggest participation boosters"
          description="Generate activity suggestions to improve engagement."
          onClick={() => actionsById["analytics-participation-boost"] && onAskActify(actionsById["analytics-participation-boost"])}
        />
        <AIShortcutButton
          label="Suggest 1:1 plan"
          description="Create a targeted 1:1 sequence based on attendance."
          onClick={() => actionsById["analytics-1to1-plan"] && onAskActify(actionsById["analytics-1to1-plan"])}
        />
        <AIShortcutButton
          label="Summarize attendance trends"
          description="Generate a concise trend summary for handoff."
          onClick={() => actionsById["analytics-summary"] && onAskActify(actionsById["analytics-summary"])}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
