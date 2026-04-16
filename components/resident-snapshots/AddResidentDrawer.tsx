"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { SUPPORT_NEED_OPTIONS, toDefaultFormValue, toFormValue } from "@/components/resident-snapshots/helpers";
import type { ResidentSnapshot, ResidentSnapshotFormValue } from "@/components/resident-snapshots/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Preferences + Engagement" },
  { id: 3, title: "Support + Notes" }
] as const;

type StepId = (typeof STEPS)[number]["id"];

function StepTitle({ step }: { step: StepId }) {
  const active = STEPS.find((item) => item.id === step);
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step {step} of 3</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{active?.title}</h3>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}

export function AddResidentDrawer({
  open,
  mode,
  resident,
  onClose,
  onSave,
  onSaveAndAskActify,
  isSaving
}: {
  open: boolean;
  mode: "create" | "edit";
  resident: ResidentSnapshot | null;
  onClose: () => void;
  onSave: (value: ResidentSnapshotFormValue) => Promise<void>;
  onSaveAndAskActify?: (value: ResidentSnapshotFormValue) => Promise<void>;
  isSaving: boolean;
}) {
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<ResidentSnapshotFormValue>(toDefaultFormValue());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && resident) {
      setForm(toFormValue(resident));
      setStep(1);
      setError(null);
      return;
    }

    if (mode === "create" && !form.fullName && !form.room) {
      setForm(toDefaultFormValue());
      setStep(1);
      setError(null);
    }
  }, [open, mode, resident, form.fullName, form.room]);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return form.fullName.trim().length > 1 && form.room.trim().length > 0;
    }
    return true;
  }, [form.fullName, form.room, step]);

  if (!open) return null;

  const updateField = <K extends keyof ResidentSnapshotFormValue>(key: K, value: ResidentSnapshotFormValue[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function saveNow(modeToUse: "save" | "save-and-ask") {
    if (!form.fullName.trim() || !form.room.trim()) {
      setError("Add a resident name and room number before saving.");
      setStep(1);
      return;
    }

    setError(null);
    if (modeToUse === "save-and-ask" && onSaveAndAskActify) {
      await onSaveAndAskActify(form);
      return;
    }
    await onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <section className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {mode === "create" ? "Add Resident" : "Edit Resident"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {mode === "create" ? "Create Resident Snapshot" : "Update Resident Snapshot"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">Keep it quick. Add essentials first, then expand as needed.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="grid grid-cols-3 gap-2">
            {STEPS.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className={cn("h-1 rounded-full transition", step >= item.id ? "bg-teal-400" : "bg-slate-200")} />
                <p className={cn("text-[11px]", step >= item.id ? "text-slate-700" : "text-slate-400")}>{item.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <StepTitle step={step} />

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Full Name" value={form.fullName} onChange={(value) => updateField("fullName", value)} placeholder="Martha Hill" />
              <InputField label="Preferred Name / Nickname" value={form.preferredName} onChange={(value) => updateField("preferredName", value)} placeholder="Marty" />
              <InputField label="Room Number" value={form.room} onChange={(value) => updateField("room", value)} placeholder="214B" />
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value as ResidentSnapshotFormValue["status"])}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="DISCHARGED">Discharged</option>
                </select>
              </label>
              <InputField label="Admission Date" type="date" value={form.admissionDate} onChange={(value) => updateField("admissionDate", value)} />
              <InputField label="Birthday" type="date" value={form.birthDate} onChange={(value) => updateField("birthDate", value)} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <TextareaField label="Interests" value={form.interests} onChange={(value) => updateField("interests", value)} placeholder="Music, puzzles, nail care" />
              <TextareaField label="Dislikes" value={form.dislikes} onChange={(value) => updateField("dislikes", value)} placeholder="Loud morning groups" />
              <TextareaField label="Favorite Activities" value={form.favoriteActivities} onChange={(value) => updateField("favoriteActivities", value)} placeholder="Bingo, music social" />
              <TextareaField label="Favorite Music" value={form.favoriteMusic} onChange={(value) => updateField("favoriteMusic", value)} placeholder="Country, gospel" />
              <TextareaField label="Favorite Topics" value={form.favoriteTopics} onChange={(value) => updateField("favoriteTopics", value)} placeholder="Family, faith, local events" />
              <TextareaField label="Group Participation Style" value={form.participationStyle} onChange={(value) => updateField("participationStyle", value)} placeholder="Watches first, then joins" />
              <TextareaField label="1:1 Response Style" value={form.oneToOneStyle} onChange={(value) => updateField("oneToOneStyle", value)} placeholder="Responds well to bedside conversation" />
              <InputField label="Best Time of Day" value={form.bestTimeOfDay} onChange={(value) => updateField("bestTimeOfDay", value)} placeholder="Afternoons" />
              <TextareaField label="What Usually Works" value={form.whatWorks} onChange={(value) => updateField("whatWorks", value)} placeholder="Offer two choices and familiar prompts" />
              <TextareaField label="What Usually Does Not Work" value={form.whatDoesNotWork} onChange={(value) => updateField("whatDoesNotWork", value)} placeholder="Large noisy groups" />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Select support needs and add practical notes for faster follow-up and planning.</p>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_NEED_OPTIONS.map((need) => {
                  const active = form.supportNeeds.includes(need);
                  return (
                    <button
                      key={need}
                      type="button"
                      onClick={() =>
                        updateField(
                          "supportNeeds",
                          active ? form.supportNeeds.filter((item) => item !== need) : [...form.supportNeeds, need]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-100",
                        active
                          ? "border-teal-300 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {need}
                    </button>
                  );
                })}
              </div>
              <TextareaField label="Engagement Notes" value={form.engagementNotes} onChange={(value) => updateField("engagementNotes", value)} placeholder="Helpful reminders for visits" />
              <TextareaField label="Conversation Starters" value={form.conversationStarters} onChange={(value) => updateField("conversationStarters", value)} placeholder="Family updates, hobbies, local events" />
              <TextareaField label="Things to Avoid" value={form.thingsToAvoid} onChange={(value) => updateField("thingsToAvoid", value)} placeholder="Noisy settings, long transitions" />
              <TextareaField label="Quick Tags" value={form.quickTags} onChange={(value) => updateField("quickTags", value)} placeholder="Loves Music, Needs Encouragement" />
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={() => setStep((current) => (current > 1 ? ((current - 1) as StepId) : current))}
            disabled={step === 1 || isSaving}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((current) => (current < 3 ? ((current + 1) as StepId) : current))}
              disabled={!canContinue || isSaving}
              className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void saveNow("save");
                }}
                disabled={isSaving}
                className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : mode === "create" ? "Save Resident" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveNow("save-and-ask");
                }}
                disabled={isSaving}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save and Ask Actify
              </button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}
