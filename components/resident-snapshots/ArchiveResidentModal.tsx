"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { ArchiveReason, ResidentSnapshot } from "@/components/resident-snapshots/types";

const REASONS: ArchiveReason[] = ["Returned Home", "Transfer", "Hospital", "Other"];

export function ArchiveResidentModal({
  open,
  resident,
  onClose,
  onConfirm,
  isSubmitting
}: {
  open: boolean;
  resident: ResidentSnapshot | null;
  onClose: () => void;
  onConfirm: (input: { date: string; reason: ArchiveReason; note: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState<ArchiveReason>("Returned Home");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(new Date().toISOString().slice(0, 10));
    setReason("Returned Home");
    setNote("");
  }, [open]);

  if (!open || !resident) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Archive Resident</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Archive {resident.fullName}?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Archive this resident from active snapshots? Their profile will remain available in Discharged / Archived.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Discharge Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reason</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ArchiveReason)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              {REASONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Optional note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Any handoff or transition context"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !date}
            onClick={() => {
              void onConfirm({ date, reason, note });
            }}
            className="rounded-full border border-rose-200 bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Archiving..." : "Confirm Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
