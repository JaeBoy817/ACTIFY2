"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { CarePlanInterventionDraft } from "@/components/care-plans/types";
import { CARE_PLAN_INTERVENTION_LIBRARY } from "@/lib/care-plans/templates";
import { cn } from "@/lib/utils";

const typeOrder: Array<CarePlanInterventionDraft["type"]> = ["GROUP", "ONE_TO_ONE", "INDEPENDENT"];

function typeLabel(type: CarePlanInterventionDraft["type"]) {
  if (type === "ONE_TO_ONE") return "1:1";
  return type === "GROUP" ? "Group" : "Independent";
}

function makeId() {
  return `int-${Math.random().toString(36).slice(2)}`;
}

export function InterventionsStep({
  selected,
  onChange,
  suggestBedBound,
  error
}: {
  selected: CarePlanInterventionDraft[];
  onChange: (next: CarePlanInterventionDraft[]) => void;
  suggestBedBound: boolean;
  error?: string | null;
}) {
  const selectedByTitle = new Map(selected.map((item) => [item.title, item]));

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Choose interventions</p>
        <p className="text-sm text-muted-foreground">Select at least 2. Keep it practical for daily workflow.</p>
      </div>

      {selected.length > 6 ? (
        <div className="rounded-xl border border-amber-300/70 bg-amber-100/70 p-2 text-xs text-amber-800">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          You selected {selected.length} interventions. Consider keeping top priorities for clarity.
        </div>
      ) : null}

      <div className="space-y-4">
        {typeOrder.map((type) => {
          const rows = CARE_PLAN_INTERVENTION_LIBRARY.filter((item) => item.type === type);
          return (
            <div key={type} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{typeLabel(type)}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {rows.map((item) => {
                  const current = selectedByTitle.get(item.title);
                  const checked = Boolean(current);
                  return (
                    <button
                      key={`${type}-${item.title}`}
                      type="button"
                      onClick={() => {
                        if (checked) {
                          onChange(selected.filter((entry) => entry.title !== item.title));
                          return;
                        }
                        if (selected.length >= 12) return;
                        onChange([
                          ...selected,
                          {
                            id: makeId(),
                            title: item.title,
                            type: item.type,
                            bedBoundFriendly: suggestBedBound || item.bedBoundFriendly || false,
                            dementiaFriendly: item.dementiaFriendly || false,
                            lowVisionFriendly: item.lowVisionFriendly || false,
                            hardOfHearingFriendly: item.hardOfHearingFriendly || false
                          }
                        ]);
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm transition",
                        checked
                          ? "border-actifyBlue bg-actifyBlue/15 text-foreground"
                          : "border-white/20 bg-white/10 text-foreground/85 hover:bg-white/20"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {checked ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected.length ? (
        <div className="space-y-2 rounded-2xl border border-white/20 bg-white/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Selected adaptation toggles</p>
          <div className="space-y-2">
            {selected.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/15 bg-white/10 p-2">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Toggle
                    label="Bed-bound friendly"
                    suggested={suggestBedBound}
                    checked={item.bedBoundFriendly}
                    onChange={(next) => onChange(selected.map((entry) => (entry.id === item.id ? { ...entry, bedBoundFriendly: next } : entry)))}
                  />
                  <Toggle
                    label="Dementia friendly"
                    checked={item.dementiaFriendly}
                    onChange={(next) => onChange(selected.map((entry) => (entry.id === item.id ? { ...entry, dementiaFriendly: next } : entry)))}
                  />
                  <Toggle
                    label="Low vision friendly"
                    checked={item.lowVisionFriendly}
                    onChange={(next) => onChange(selected.map((entry) => (entry.id === item.id ? { ...entry, lowVisionFriendly: next } : entry)))}
                  />
                  <Toggle
                    label="Hard of hearing friendly"
                    checked={item.hardOfHearingFriendly}
                    onChange={(next) =>
                      onChange(selected.map((entry) => (entry.id === item.id ? { ...entry, hardOfHearingFriendly: next } : entry)))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{selected.length}/12 selected</p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  suggested = false
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  suggested?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-foreground/85">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        {label}
        {suggested ? <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">Suggested</span> : null}
      </span>
    </label>
  );
}
