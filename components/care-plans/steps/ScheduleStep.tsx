"use client";

import { CARE_PLAN_BARRIER_CHIPS, CARE_PLAN_FREQUENCIES, CARE_PLAN_SUPPORT_CHIPS } from "@/lib/care-plans/enums";
import type { CarePlanWizardDraft } from "@/components/care-plans/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function setReviewDateFromDays(onPatch: (patch: Partial<CarePlanWizardDraft>) => void, days: number) {
  const next = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  onPatch({ nextReviewDate: next.toISOString().slice(0, 10) });
}

export function ScheduleStep({
  draft,
  onPatch,
  error
}: {
  draft: CarePlanWizardDraft;
  onPatch: (patch: Partial<CarePlanWizardDraft>) => void;
  error?: string | null;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Schedule + review cadence</p>
        <p className="text-sm text-muted-foreground">Set frequency and next review date. Add optional context if needed.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium text-foreground">Frequency</span>
          <select
            value={draft.frequency}
            onChange={(event) => onPatch({ frequency: event.target.value as CarePlanWizardDraft["frequency"] })}
            className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
          >
            {CARE_PLAN_FREQUENCIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-foreground">Next review date</span>
          <Input
            type="date"
            value={draft.nextReviewDate}
            onChange={(event) => onPatch({ nextReviewDate: event.target.value })}
            className="mt-1 bg-white/60"
          />
        </label>
      </div>

      {draft.frequency === "CUSTOM" ? (
        <label className="text-sm">
          <span className="font-medium text-foreground">Custom frequency</span>
          <Input
            maxLength={60}
            value={draft.frequencyCustom}
            onChange={(event) => onPatch({ frequencyCustom: event.target.value })}
            placeholder="Example: Twice monthly after lunch"
            className="mt-1 bg-white/60"
          />
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs hover:bg-white/30" onClick={() => setReviewDateFromDays(onPatch, 30)}>
          Review in 30 days
        </button>
        <button type="button" className="rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs hover:bg-white/30" onClick={() => setReviewDateFromDays(onPatch, 90)}>
          Review in 90 days
        </button>
      </div>

      <details className="rounded-2xl border border-white/20 bg-white/10 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">More options</summary>
        <div className="mt-3 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">Barriers</p>
            <ChipMultiSelect
              items={CARE_PLAN_BARRIER_CHIPS}
              value={draft.barriers}
              onChange={(next) => onPatch({ barriers: next })}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">Supports</p>
            <ChipMultiSelect
              items={CARE_PLAN_SUPPORT_CHIPS}
              value={draft.supports}
              onChange={(next) => onPatch({ supports: next })}
            />
          </div>

          <label className="text-sm">
            <span className="font-medium text-foreground">Preferences (optional)</span>
            <Textarea
              maxLength={500}
              value={draft.preferencesText}
              onChange={(event) => onPatch({ preferencesText: event.target.value })}
              className="mt-1 min-h-[90px] bg-white/60"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium text-foreground">Safety notes (optional)</span>
            <Textarea
              maxLength={500}
              value={draft.safetyNotes}
              onChange={(event) => onPatch({ safetyNotes: event.target.value })}
              className="mt-1 min-h-[90px] bg-white/60"
            />
          </label>
        </div>
      </details>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

function ChipMultiSelect({
  items,
  value,
  onChange
}: {
  items: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = value.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => {
              if (selected) {
                onChange(value.filter((entry) => entry !== item));
              } else {
                onChange([...value, item]);
              }
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              selected
                ? "border-actifyBlue bg-actifyBlue/15 text-foreground"
                : "border-white/20 bg-white/10 text-foreground/80 hover:bg-white/20"
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
