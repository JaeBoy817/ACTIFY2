"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, X } from "lucide-react";

import type { ArchiveReason, ResidentSnapshot } from "@/components/resident-snapshots/types";

const REASONS: ArchiveReason[] = ["Returned Home", "Transfer", "Hospital", "Other"];

export function BulkArchiveResidentsModal({
  open,
  residents,
  onClose,
  onConfirm,
  isSubmitting
}: {
  open: boolean;
  residents: ResidentSnapshot[];
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

  const previewNames = useMemo(() => residents.slice(0, 5).map((resident) => resident.fullName), [residents]);
  const remainingCount = Math.max(0, residents.length - previewNames.length);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Archive className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mass Archive Residents</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Archive {residents.length} resident{residents.length === 1 ? "" : "s"}?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Selected residents will move out of the active Residents list and into Archived Residents. Existing attendance, 1:1 visits, notes, reports, and history stay attached to each resident profile.
              </p>
            </div>
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

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected Profiles</p>
          {residents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No active resident profiles selected.</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {previewNames.join(", ")}
              {remainingCount > 0 ? ` and ${remainingCount} more` : ""}
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Archive Date</span>
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
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Optional note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional transition or discharge context for these archived profiles"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !date || residents.length === 0}
            onClick={() => {
              void onConfirm({ date, reason, note });
            }}
            className="rounded-full border border-rose-200 bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Archiving..." : "Archive Selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
