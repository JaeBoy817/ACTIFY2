"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, PlusCircle } from "lucide-react";

import { AttendanceStatusSelector } from "@/components/resident-snapshots/AttendanceStatusSelector";
import type {
  AttendanceWorkflowStatus,
  ResidentAttendanceWorkflowPayload
} from "@/components/resident-snapshots/attendanceTypes";
import type { ResidentSnapshot } from "@/components/resident-snapshots/types";
import { ActionButton, ModalShell } from "@/components/workspace/shared";
import { cn } from "@/lib/utils";

type EditableActivityRow = {
  activityId: string;
  activityTitle: string;
  timeLabel: string;
  location: string | null;
  status: AttendanceWorkflowStatus | null;
  note: string;
};

type ManualOneToOneDraft = {
  enabled: boolean;
  activityTitle: string;
  time: string;
  location: string;
  status: AttendanceWorkflowStatus;
  note: string;
};

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function toWorkflowError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "We couldn't save attendance right now. Please try again.";
}

export function TrackAttendanceModal({
  open,
  resident,
  onClose,
  onSaved,
  onSaveAndAskActify
}: {
  open: boolean;
  resident: ResidentSnapshot | null;
  onClose: () => void;
  onSaved: (payload: ResidentAttendanceWorkflowPayload) => void;
  onSaveAndAskActify?: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey);
  const [workflow, setWorkflow] = useState<ResidentAttendanceWorkflowPayload | null>(null);
  const [rows, setRows] = useState<EditableActivityRow[]>([]);
  const [manualOneToOne, setManualOneToOne] = useState<ManualOneToOneDraft>({
    enabled: false,
    activityTitle: "1:1 Room Visit",
    time: "11:30",
    location: "Resident Room",
    status: "one_to_one_completed",
    note: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const residentId = resident?.id ?? null;

  const loadWorkflow = useCallback(async (dateKey: string) => {
    if (!residentId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/attendance/residents/${encodeURIComponent(residentId)}/workflow?timeframe=THIS_MONTH&date=${encodeURIComponent(dateKey)}`,
        {
          cache: "no-store"
        }
      );
      const data = (await response.json().catch(() => null)) as ResidentAttendanceWorkflowPayload | { error?: string } | null;
      if (!response.ok) {
        throw new Error((data && "error" in data && data.error) || "Could not load attendance details.");
      }

      const payload = data as ResidentAttendanceWorkflowPayload;
      setWorkflow(payload);
      setRows(
        payload.dayActivities.map((entry) => ({
          activityId: entry.activityId,
          activityTitle: entry.activityTitle,
          timeLabel: entry.timeLabel,
          location: entry.location,
          status: entry.status,
          note: entry.note ?? ""
        }))
      );
    } catch (error) {
      setErrorMessage(toWorkflowError(error));
    } finally {
      setIsLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    if (!open || !residentId) return;
    void loadWorkflow(selectedDate);
  }, [loadWorkflow, open, residentId, selectedDate]);

  useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      setWorkflow(null);
      setRows([]);
      setManualOneToOne({
        enabled: false,
        activityTitle: "1:1 Room Visit",
        time: "11:30",
        location: "Resident Room",
        status: "one_to_one_completed",
        note: ""
      });
    }
  }, [open]);

  const markedCount = useMemo(
    () => rows.filter((row) => row.status !== null).length + (manualOneToOne.enabled ? 1 : 0),
    [rows, manualOneToOne.enabled]
  );

  async function save(mode: "save" | "save-another" | "save-ask") {
    if (!residentId || !resident) return;
    setErrorMessage(null);

    const entries: Array<{
      activityId: string | null;
      activityTitle?: string;
      time?: string;
      location?: string;
      status: AttendanceWorkflowStatus;
      note: string | null;
      source: "residents-tab" | "manual";
    }> = rows
      .filter((row) => row.status !== null)
      .map((row) => ({
        activityId: row.activityId,
        status: row.status as AttendanceWorkflowStatus,
        note: row.note.trim() || null,
        source: "residents-tab" as const
      }));

    if (manualOneToOne.enabled) {
      entries.push({
        activityId: null,
        activityTitle: manualOneToOne.activityTitle.trim() || "1:1 Room Visit",
        time: manualOneToOne.time,
        location: manualOneToOne.location.trim() || "Resident Room",
        status: manualOneToOne.status,
        note: manualOneToOne.note.trim() || null,
        source: "manual" as const
      });
    }

    if (entries.length === 0) {
      setErrorMessage("Choose at least one attendance status before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/attendance/residents/${encodeURIComponent(residentId)}/workflow?timeframe=THIS_MONTH`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            date: selectedDate,
            entries
          })
        }
      );
      const payload = (await response.json().catch(() => null)) as ResidentAttendanceWorkflowPayload | { error?: string } | null;
      if (!response.ok) {
        throw new Error((payload && "error" in payload && payload.error) || "Attendance could not be saved.");
      }

      const nextWorkflow = payload as ResidentAttendanceWorkflowPayload;
      setWorkflow(nextWorkflow);
      setRows(
        nextWorkflow.dayActivities.map((entry) => ({
          activityId: entry.activityId,
          activityTitle: entry.activityTitle,
          timeLabel: entry.timeLabel,
          location: entry.location,
          status: entry.status,
          note: entry.note ?? ""
        }))
      );
      setManualOneToOne((current) => ({
        ...current,
        enabled: mode === "save-another" ? current.enabled : false,
        note: ""
      }));

      onSaved(nextWorkflow);

      if (mode === "save") {
        onClose();
      } else if (mode === "save-ask") {
        onClose();
        onSaveAndAskActify?.();
      }
    } catch (error) {
      setErrorMessage(toWorkflowError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalShell open={open} title="Track Attendance" onClose={onClose}>
      {!resident ? null : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{resident.fullName}</p>
                <p className="text-xs text-slate-600">Room {resident.room}</p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                Date
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                />
              </label>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                {workflow?.summary.participationPercentage === null
                  ? "No attendance tracked yet"
                  : `${workflow?.summary.participationPercentage}% participation this month`}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                {workflow?.summary.participatedCount ?? 0}/{workflow?.summary.totalTrackedOpportunities ?? 0} participated
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{markedCount} status updates ready</span>
            </div>
          </section>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</div>
          ) : null}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Today&apos;s Activities / Selected Date</p>
              {isLoading ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading
                </span>
              ) : null}
            </div>

            {rows.length === 0 && !isLoading ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
                No scheduled activities found for this date. You can still log a manual 1:1 completion below.
              </div>
            ) : null}

            <div className="space-y-2">
              {rows.map((row) => (
                <article key={row.activityId} className="rounded-xl border border-slate-200 bg-white p-3 transition duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.activityTitle}</p>
                      <p className="text-xs text-slate-500">
                        {row.timeLabel}
                        {row.location ? ` · ${row.location}` : ""}
                      </p>
                    </div>
                    <AttendanceStatusSelector
                      compact
                      value={row.status}
                      onChange={(status) =>
                        setRows((current) =>
                          current.map((entry) =>
                            entry.activityId === row.activityId
                              ? {
                                  ...entry,
                                  status
                                }
                              : entry
                          )
                        )
                      }
                    />
                  </div>
                  <input
                    value={row.note}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((entry) =>
                          entry.activityId === row.activityId
                            ? {
                                ...entry,
                                note: event.target.value
                              }
                            : entry
                        )
                      )
                    }
                    placeholder="Optional attendance note"
                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                  />
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <button
              type="button"
              onClick={() =>
                setManualOneToOne((current) => ({
                  ...current,
                  enabled: !current.enabled
                }))
              }
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800"
            >
              <PlusCircle className="h-4 w-4 text-slate-500" aria-hidden />
              {manualOneToOne.enabled ? "Hide manual 1:1 logging" : "Log manual 1:1 completion"}
            </button>

            {manualOneToOne.enabled ? (
              <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={manualOneToOne.activityTitle}
                    onChange={(event) =>
                      setManualOneToOne((current) => ({
                        ...current,
                        activityTitle: event.target.value
                      }))
                    }
                    placeholder="Activity title"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                  />
                  <input
                    value={manualOneToOne.time}
                    onChange={(event) =>
                      setManualOneToOne((current) => ({
                        ...current,
                        time: event.target.value
                      }))
                    }
                    placeholder="HH:MM"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                  />
                </div>
                <input
                  value={manualOneToOne.location}
                  onChange={(event) =>
                    setManualOneToOne((current) => ({
                      ...current,
                      location: event.target.value
                    }))
                  }
                  placeholder="Location"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                />
                <AttendanceStatusSelector
                  compact
                  value={manualOneToOne.status}
                  onChange={(status) =>
                    setManualOneToOne((current) => ({
                      ...current,
                      status
                    }))
                  }
                />
                <input
                  value={manualOneToOne.note}
                  onChange={(event) =>
                    setManualOneToOne((current) => ({
                      ...current,
                      note: event.target.value
                    }))
                  }
                  placeholder="Optional 1:1 note"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                />
              </div>
            ) : null}
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
            <ActionButton tone="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </ActionButton>
            <ActionButton tone="secondary" onClick={() => void save("save-another")} disabled={isSaving || isLoading}>
              {isSaving ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving...
                </span>
              ) : (
                "Save and Track Another"
              )}
            </ActionButton>
            <ActionButton onClick={() => void save("save")} disabled={isSaving || isLoading}>
              Save Attendance
            </ActionButton>
            <ActionButton
              tone="secondary"
              onClick={() => void save("save-ask")}
              disabled={isSaving || isLoading}
              className={cn("border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100")}
            >
              Save and Ask Actify
            </ActionButton>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
