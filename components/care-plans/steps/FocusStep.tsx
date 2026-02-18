"use client";

import { CARE_PLAN_FOCUS_AREAS, type CarePlanFocusAreaKey } from "@/lib/care-plans/enums";
import { cn } from "@/lib/utils";

export function FocusStep({
  value,
  onChange,
  error
}: {
  value: CarePlanFocusAreaKey[];
  onChange: (next: CarePlanFocusAreaKey[]) => void;
  error?: string | null;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Select 1-3 focus areas</p>
        <p className="text-sm text-muted-foreground">Keep this concise so staff can understand the plan in seconds.</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {CARE_PLAN_FOCUS_AREAS.map((item) => {
          const selected = value.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (selected) {
                  onChange(value.filter((entry) => entry !== item.key));
                  return;
                }
                if (value.length >= 3) return;
                onChange([...value, item.key]);
              }}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm transition",
                selected
                  ? "border-actifyBlue bg-actifyBlue/15 text-foreground"
                  : "border-white/20 bg-white/10 text-foreground/85 hover:bg-white/20"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{value.length}/3 selected</p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
