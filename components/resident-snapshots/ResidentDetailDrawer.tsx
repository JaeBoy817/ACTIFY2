"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Sparkles, X } from "lucide-react";

import { ResidentAccordionSection } from "@/components/resident-snapshots/ResidentAccordionSection";
import { ResidentAttendanceAccordion } from "@/components/resident-snapshots/ResidentAttendanceAccordion";
import { ResidentQuickChips } from "@/components/resident-snapshots/ResidentQuickChips";
import {
  ANALYTICS_TIMEFRAME_OPTIONS,
  type AnalyticsTimeframeKey,
  getResidentAnalyticsWindow
} from "@/components/resident-snapshots/analytics";
import type { ResidentSnapshot, SnapshotIntentAction } from "@/components/resident-snapshots/types";
import { toDisplayDate, toRelativeDayLabel } from "@/components/resident-snapshots/helpers";
import { ActionButton, AIShortcutButton, StatusBadge, TagChip } from "@/components/workspace/shared";
import { toResidentStatusLabel } from "@/lib/residents/types";
import { cn } from "@/lib/utils";

export function ResidentDetailDrawer({
  open,
  resident,
  actions,
  onClose,
  onAskActify,
  onEdit,
  onArchive,
  onAddFollowUp,
  onTrackAttendance,
  attendanceRefreshToken
}: {
  open: boolean;
  resident: ResidentSnapshot | null;
  actions: SnapshotIntentAction[];
  onClose: () => void;
  onAskActify: (action: SnapshotIntentAction) => void;
  onEdit: () => void;
  onArchive: () => void;
  onAddFollowUp: () => void;
  onTrackAttendance: () => void;
  attendanceRefreshToken: number;
}) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframeKey>("THIS_MONTH");

  const actionById = useMemo(
    () =>
      Object.fromEntries(actions.map((action) => [action.id, action])) as Record<string, SnapshotIntentAction | undefined>,
    [actions]
  );

  const analytics = useMemo(
    () => (resident ? getResidentAnalyticsWindow(resident, timeframe) : null),
    [resident, timeframe]
  );
  const hasTrackedAnalytics = Boolean(
    analytics &&
      (analytics.offered > 0 ||
        analytics.attended > 0 ||
        analytics.oneToOne > 0 ||
        analytics.refusals > 0 ||
        analytics.missed > 0 ||
        analytics.participation !== null)
  );

  if (!open || !resident) return null;

  const quickActions = actions.slice(0, 12);

  return (
    <div className="fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-[1px]">
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl transition duration-300",
          "sm:max-w-xl lg:max-w-2xl"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Resident details for ${resident.fullName}`}
      >
        <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resident Snapshot</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{resident.fullName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
                <span>Room {resident.room}</span>
                {resident.preferredName ? <span>· Prefers {resident.preferredName}</span> : null}
                <span>· {toResidentStatusLabel(resident.status)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Close resident details</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge label={toResidentStatusLabel(resident.status)} tone={resident.status === "ACTIVE" ? "success" : "warning"} />
            {resident.followUpRequired ? <StatusBadge label="Needs Follow-Up" tone="danger" /> : null}
            {resident.tags.slice(0, 3).map((tag) => (
              <TagChip key={`${resident.id}-header-${tag}`} label={tag} />
            ))}
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quick Snapshot</p>
            <div className="mt-2">
              <ResidentQuickChips resident={resident} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Engagement Analytics</p>
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value as AnalyticsTimeframeKey)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              >
                {ANALYTICS_TIMEFRAME_OPTIONS.slice(0, 3).map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricStripCard
                label="Participation %"
                value={analytics?.participation === null ? "No attendance tracked yet" : `${analytics?.participation}%`}
              />
              <MetricStripCard label="Group Attendance" value={hasTrackedAnalytics ? (analytics?.attended ?? 0) : "No data"} />
              <MetricStripCard label="1:1 Visits" value={hasTrackedAnalytics ? (analytics?.oneToOne ?? 0) : "No data"} />
              <MetricStripCard
                label="Missed / Refused"
                value={hasTrackedAnalytics ? (analytics?.missed ?? 0) + (analytics?.refusals ?? 0) : "No data"}
              />
            </div>
          </section>

          <ResidentAccordionSection title="Preferences" defaultOpen>
            <LabeledList label="Interests" values={resident.interests} />
            <LabeledList label="Dislikes" values={resident.dislikes} />
            <LabeledList label="Favorite Activities" values={resident.favoriteActivities} />
            <LabeledList label="Favorite Music" values={resident.favoriteMusic} />
            <LabeledList label="Favorite Movies / TV" values={resident.favoriteMedia} />
            <LabeledList label="Favorite Conversation Topics" values={resident.favoriteTopics} />
          </ResidentAccordionSection>

          <ResidentAccordionSection title="Engagement Style">
            <LabeledText label="Group Participation Style" value={resident.participationStyle} />
            <LabeledText label="1:1 Response Style" value={resident.oneToOneStyle} />
            <LabeledText label="What Usually Works" value={resident.whatWorks} />
            <LabeledText label="What Usually Does Not Work" value={resident.whatDoesNotWork} />
            <LabeledText label="Common Refusals" value={resident.commonRefusals} />
            <LabeledText label="Best Time of Day" value={resident.bestTimeOfDay} />
          </ResidentAccordionSection>

          <ResidentAccordionSection title="Support Needs">
            <div className="flex flex-wrap gap-1.5">
              {resident.supportNeeds.length ? resident.supportNeeds.map((need) => <TagChip key={need} label={need} />) : <p className="text-sm text-slate-500">No support needs added yet.</p>}
            </div>
          </ResidentAccordionSection>

          <ResidentAccordionSection title="Follow-Up">
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Status:</span> {resident.followUpRequired ? "Needs follow-up" : "No follow-up flagged"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Follow-up date:</span> {resident.followUpDate || "Not set"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Priority:</span> {resident.followUpPriority || "Not set"}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton tone="secondary" onClick={onAddFollowUp}>
                Set Follow-Up
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => actionById["follow-up"] && onAskActify(actionById["follow-up"])}>
                Ask Actify for Follow-Up Idea
              </ActionButton>
            </div>
          </ResidentAccordionSection>

          <ResidentAccordionSection title="Last Engagement">
            <div className="space-y-2 text-sm text-slate-700">
              <p className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-slate-400" aria-hidden />
                Last engagement: {toRelativeDayLabel(resident.lastEngagementDate)}
              </p>
              <p className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
                Last activity: {resident.lastActivity || "Not logged"}
              </p>
              <p>Last 1:1 visit: {resident.lastOneToOne || "Not logged"}</p>
              <p>Last note date: {resident.lastNoteDate ? toDisplayDate(resident.lastNoteDate) : "Not set"}</p>
              <p>Last successful activity type: {resident.lastSuccessfulActivityType || "Not set"}</p>
            </div>
          </ResidentAccordionSection>

          <ResidentAccordionSection title="Engagement Notes">
            <LabeledText label="Notes for Engagement" value={resident.sourceNotes} />
            <LabeledText label="Things to Avoid" value={resident.whatDoesNotWork} />
            <LabeledText label="Conversation Starters" value={resident.favoriteTopics.join(", ")} />
          </ResidentAccordionSection>

          <ResidentAccordionSection title="Participation & Attendance">
            <ResidentAttendanceAccordion
              resident={resident}
              refreshToken={attendanceRefreshToken}
              onTrackAttendance={onTrackAttendance}
              onAskActify={onAskActify}
              actionsById={actionById}
            />
          </ResidentAccordionSection>

          <ResidentAccordionSection title="AI Actions" defaultOpen>
            <div className="grid gap-2 sm:grid-cols-2">
              {quickActions.map((action) => (
                <AIShortcutButton key={action.id} label={action.label} description={action.description} onClick={() => onAskActify(action)} />
              ))}
            </div>
          </ResidentAccordionSection>
        </div>

        <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ActionButton tone="secondary" onClick={onEdit}>
              Edit Resident
            </ActionButton>
            <ActionButton tone="secondary" onClick={() => actionById["idea-1to1"] && onAskActify(actionById["idea-1to1"])}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Ask Actify
            </ActionButton>
            <ActionButton onClick={onAddFollowUp}>Add Follow-Up</ActionButton>
            <ActionButton tone="secondary" onClick={onTrackAttendance}>
              Track Attendance
            </ActionButton>
            <ActionButton tone="secondary" onClick={onArchive}>
              Archive / Discharge
            </ActionButton>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function MetricStripCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function LabeledList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      {values.length ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <TagChip key={`${label}-${value}`} label={value} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">None added yet.</p>
      )}
    </div>
  );
}

function LabeledText({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="text-sm leading-6 text-slate-700">{value && value.trim() ? value : "Not set."}</p>
    </div>
  );
}
