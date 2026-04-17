"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";

import {
  ATTENDANCE_TIMEFRAME_OPTIONS,
  attendanceStatusLabel,
  defaultAttendanceSummary,
  type AttendanceTimeframeKey,
  type ResidentAttendanceWorkflowPayload
} from "@/components/resident-snapshots/attendanceTypes";
import type { ResidentSnapshot, SnapshotIntentAction } from "@/components/resident-snapshots/types";
import { ActionButton, AIShortcutButton } from "@/components/workspace/shared";

function toAccordionError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Could not load attendance details.";
}

function trendSummary(payload: ResidentAttendanceWorkflowPayload | null) {
  if (!payload) return "Attendance details will appear after tracking begins.";
  if (payload.summary.participationPercentage === null) {
    return "No attendance tracked yet for the selected timeframe.";
  }

  const percentage = payload.summary.participationPercentage;
  const opportunities = payload.summary.totalTrackedOpportunities;
  const participated = payload.summary.participatedCount;

  if (payload.summary.trend === "up") {
    return `Participation is currently ${percentage}% and improving from the previous period (${participated} of ${opportunities} opportunities).`;
  }
  if (payload.summary.trend === "down") {
    return `Participation is currently ${percentage}% and lower than the previous period (${participated} of ${opportunities} opportunities).`;
  }
  return `Participation is currently ${percentage}% (${participated} of ${opportunities} tracked opportunities).`;
}

export function ResidentAttendanceAccordion({
  resident,
  refreshToken,
  onTrackAttendance,
  onAskActify,
  actionsById
}: {
  resident: ResidentSnapshot;
  refreshToken: number;
  onTrackAttendance: () => void;
  onAskActify: (action: SnapshotIntentAction) => void;
  actionsById: Record<string, SnapshotIntentAction | undefined>;
}) {
  const [timeframe, setTimeframe] = useState<AttendanceTimeframeKey>("THIS_MONTH");
  const [payload, setPayload] = useState<ResidentAttendanceWorkflowPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(
          `/api/attendance/residents/${encodeURIComponent(resident.id)}/workflow?timeframe=${encodeURIComponent(timeframe)}`,
          {
            cache: "no-store"
          }
        );
        const data = (await response.json().catch(() => null)) as ResidentAttendanceWorkflowPayload | { error?: string } | null;
        if (!response.ok) {
          throw new Error((data && "error" in data && data.error) || "Could not load attendance details.");
        }
        if (cancelled) return;
        setPayload(data as ResidentAttendanceWorkflowPayload);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(toAccordionError(error));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [resident.id, timeframe, refreshToken]);

  const summary = useMemo(() => payload?.summary ?? defaultAttendanceSummary(timeframe), [payload, timeframe]);
  const records = payload?.records ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Attendance Timeframe</p>
        <select
          value={timeframe}
          onChange={(event) => setTimeframe(event.target.value as AttendanceTimeframeKey)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          aria-label="Attendance timeframe"
        >
          {ATTENDANCE_TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="inline-flex items-center gap-1 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading attendance details...
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Participation"
          value={summary.participationPercentage === null ? "No attendance tracked yet" : `${summary.participationPercentage}%`}
        />
        <MetricCard label="Attended" value={summary.attendedCount} />
        <MetricCard label="1:1 Completed" value={summary.oneToOneCompletedCount} />
        <MetricCard label="Missed / Refused" value={summary.missedCount + summary.refusalCount} />
      </div>

      <p className="text-sm text-slate-700">{trendSummary(payload)}</p>
      {summary.trend === "up" ? (
        <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          Trend: improving
        </p>
      ) : summary.trend === "down" ? (
        <p className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
          <TrendingDown className="h-3.5 w-3.5" aria-hidden />
          Trend: declining
        </p>
      ) : (
        <p className="text-xs text-slate-500">Trend: stable</p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Attendance Breakdown</p>
        <div className="space-y-2">
          {records.slice(0, 10).map((record) => (
            <article key={record.id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{record.activityTitle}</p>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  {attendanceStatusLabel(record.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {record.date} · {record.timeLabel}
                {record.location ? ` · ${record.location}` : ""}
              </p>
              {record.note ? <p className="mt-1 text-xs text-slate-500">Note: {record.note}</p> : null}
            </article>
          ))}
          {!records.length && !isLoading ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              No attendance records yet for this timeframe.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ActionButton tone="secondary" onClick={onTrackAttendance}>
          Track Today&apos;s Attendance
        </ActionButton>
        <ActionButton tone="secondary" onClick={onTrackAttendance}>
          Log 1:1 Completion
        </ActionButton>
        <ActionButton tone="secondary" onClick={onTrackAttendance}>
          Mark Recent Attendance
        </ActionButton>
        <AIShortcutButton
          label="Ask Actify About Participation"
          description="Get practical ideas to improve engagement this month."
          onClick={() => {
            const action = actionsById["analytics-summary"];
            if (action) onAskActify(action);
          }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
