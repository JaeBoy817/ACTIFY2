"use client";

import { useEffect, useState } from "react";

import { ActionButton, ModalShell } from "@/components/workspace/shared";

export type FollowUpDraft = {
  date: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  note: string;
};

export function FollowUpModal({
  open,
  onClose,
  onSave,
  onSaveAndAskActify,
  initialValue
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: FollowUpDraft) => void;
  onSaveAndAskActify: (value: FollowUpDraft) => void;
  initialValue?: Partial<FollowUpDraft>;
}) {
  const [draft, setDraft] = useState<FollowUpDraft>({
    date: "",
    reason: "",
    priority: "MEDIUM",
    note: ""
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      date: initialValue?.date ?? "",
      reason: initialValue?.reason ?? "",
      priority: initialValue?.priority ?? "MEDIUM",
      note: initialValue?.note ?? ""
    });
  }, [initialValue?.date, initialValue?.note, initialValue?.priority, initialValue?.reason, open]);

  return (
    <ModalShell open={open} title="Set Follow-Up" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Follow-Up Date</span>
          <input
            type="date"
            value={draft.date}
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Priority</span>
          <select
            value={draft.priority}
            onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as FollowUpDraft["priority"] }))}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reason</span>
          <input
            value={draft.reason}
            onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            placeholder="Low engagement, declined group, etc."
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Optional Note</span>
          <textarea
            rows={3}
            value={draft.note}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            placeholder="Optional details for the next visit."
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <ActionButton tone="secondary" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton onClick={() => onSave(draft)}>Save</ActionButton>
        <ActionButton tone="secondary" onClick={() => onSaveAndAskActify(draft)}>
          Save and Ask Actify
        </ActionButton>
      </div>
    </ModalShell>
  );
}
