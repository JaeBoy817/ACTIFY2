import { CalendarClock, CheckCheck, CircleAlert, Clock3, FileSpreadsheet, UsersRound } from "lucide-react";

import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";
import { AttendanceStatusPill } from "@/components/attendance/v3/AttendanceStatusPill";
import type { AttendanceMode } from "@/components/attendance/v3/types";
import type { AttendanceSessionSummary } from "@/lib/attendance-tracker/types";
import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";

function formatSessionTime(session: AttendanceSessionSummary) {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Time unavailable";
  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export function AttendanceDetailPanel({
  mode,
  selectedSession,
  residentsTotal,
  markedCount,
  pendingCount,
  saving,
  canEdit,
  onSave,
  onMarkAllPresent,
  onClearVisible,
  lastSavedAt,
  statusPreview
}: {
  mode: AttendanceMode;
  selectedSession: AttendanceSessionSummary | null;
  residentsTotal: number;
  markedCount: number;
  pendingCount: number;
  saving: boolean;
  canEdit: boolean;
  onSave: () => void;
  onMarkAllPresent: () => void;
  onClearVisible: () => void;
  lastSavedAt: string | null;
  statusPreview: QuickAttendanceStatus[];
}) {
  return (
    <aside className="space-y-3">
      <section className="rounded-[1.5rem] border border-[#1f3152] bg-[linear-gradient(180deg,#0a1325_0%,#0b1529_100%)] p-4 shadow-[0_20px_40px_-30px_rgba(37,99,235,0.7)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#97add3]">Session Detail</p>
        {selectedSession ? (
          <>
            <h3 className="mt-2 text-xl font-black text-white">{selectedSession.title}</h3>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#9eb4d8]">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatSessionTime(selectedSession)}
            </p>
            <p className="mt-1 text-xs text-[#9eb4d8]">{selectedSession.location || "No location set"}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#9eb4d8]">Select an activity session to review and mark attendance.</p>
        )}

        <div className="mt-4 space-y-2 rounded-xl border border-[#253b62] bg-[#0f1d35] p-3">
          <div className="flex items-center justify-between text-sm text-[#bed1f1]">
            <span>Residents in roster</span>
            <strong className="text-white">{residentsTotal}</strong>
          </div>
          <div className="flex items-center justify-between text-sm text-[#bed1f1]">
            <span>Marked in active view</span>
            <strong className="text-white">{markedCount}</strong>
          </div>
          <div className="flex items-center justify-between text-sm text-[#bed1f1]">
            <span>Still missing</span>
            <strong className="text-white">{Math.max(0, pendingCount)}</strong>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AttendanceQuickActionButton
            label={saving ? "Saving..." : "Finalize Session"}
            icon={CheckCheck}
            tone="emerald"
            onClick={onSave}
            disabled={!canEdit || !selectedSession || saving}
          />
          <AttendanceQuickActionButton
            label="Mark All Present"
            icon={UsersRound}
            tone="sky"
            onClick={onMarkAllPresent}
            disabled={!canEdit || !selectedSession}
          />
          <AttendanceQuickActionButton
            label="Clear Visible"
            icon={CircleAlert}
            tone="amber"
            onClick={onClearVisible}
            disabled={!canEdit || !selectedSession}
          />
          <AttendanceQuickActionButton label="Reports" icon={FileSpreadsheet} href="/app/attendance/reports" tone="violet" />
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-[#9eb4d8]">
          <Clock3 className="h-3.5 w-3.5" />
          {lastSavedAt ? `Saved ${lastSavedAt}` : "Not saved yet"}
          <span className="rounded-full border border-[#2b426c] bg-[#0f203f] px-2 py-0.5 uppercase tracking-[0.12em] text-[10px]">
            {mode}
          </span>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[#1f3152] bg-[linear-gradient(180deg,#091224_0%,#0a1325_100%)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#97add3]">Status Preview</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {statusPreview.length === 0 ? (
            <p className="text-sm text-[#9eb4d8]">No marks yet.</p>
          ) : (
            statusPreview.map((status, index) => <AttendanceStatusPill key={`${status}-${index}`} status={status} />)
          )}
        </div>
      </section>
    </aside>
  );
}

