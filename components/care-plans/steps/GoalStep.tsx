"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CARE_PLAN_GOAL_BASELINES } from "@/lib/care-plans/enums";
import { GOAL_TEMPLATES_BY_FOCUS, getGoalTemplateByKey } from "@/lib/care-plans/templates";
import type { CarePlanGoalDraft } from "@/components/care-plans/types";
import type { CarePlanFocusAreaKey } from "@/lib/care-plans/enums";

function makeGoal(): CarePlanGoalDraft {
  return {
    id: `goal-${Math.random().toString(36).slice(2)}`,
    templateKey: null,
    customText: null,
    baseline: "RARE",
    target: "SOMETIMES",
    timeframeDays: 30
  };
}

export function GoalStep({
  focusAreas,
  goals,
  onChange,
  error
}: {
  focusAreas: CarePlanFocusAreaKey[];
  goals: CarePlanGoalDraft[];
  onChange: (next: CarePlanGoalDraft[]) => void;
  error?: string | null;
}) {
  const availableTemplates = focusAreas.flatMap((focus) => GOAL_TEMPLATES_BY_FOCUS[focus] ?? []);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Define measurable goals</p>
        <p className="text-sm text-muted-foreground">Pick a template and adjust baseline/target in a few clicks.</p>
      </div>

      {goals.map((goal, index) => {
        const template = goal.templateKey ? getGoalTemplateByKey(goal.templateKey) : null;
        return (
          <div key={goal.id} className="rounded-2xl border border-white/20 bg-white/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Goal {index + 1}</p>
              {goals.length > 1 ? (
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  onClick={() => onChange(goals.filter((item) => item.id !== goal.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <label className="text-xs text-foreground/70">
              Template
              <select
                className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
                value={goal.templateKey ?? ""}
                onChange={(event) => {
                  const selectedTemplateKey = event.target.value || null;
                  onChange(
                    goals.map((item) =>
                      item.id === goal.id
                        ? {
                            ...item,
                            templateKey: selectedTemplateKey,
                            customText: selectedTemplateKey ? null : item.customText,
                            baseline: selectedTemplateKey ? getGoalTemplateByKey(selectedTemplateKey)?.suggestedBaseline ?? item.baseline : item.baseline,
                            target: selectedTemplateKey ? getGoalTemplateByKey(selectedTemplateKey)?.suggestedTarget ?? item.target : item.target,
                            timeframeDays: selectedTemplateKey
                              ? getGoalTemplateByKey(selectedTemplateKey)?.suggestedTimeframeDays ?? item.timeframeDays
                              : item.timeframeDays
                          }
                        : item
                    )
                  );
                }}
              >
                <option value="">Select a goal template</option>
                {availableTemplates.map((item) => (
                  <option key={item.templateKey} value={item.templateKey}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            {template ? (
              <p className="mt-2 rounded-lg border border-white/15 bg-white/15 p-2 text-xs text-foreground/80">{template.text}</p>
            ) : null}

            <label className="mt-3 block text-xs text-foreground/70">
              Custom goal text (optional)
              <Textarea
                className="mt-1 min-h-[80px] bg-white/60"
                placeholder="Write a custom goal statement if needed."
                value={goal.customText ?? ""}
                onChange={(event) =>
                  onChange(goals.map((item) => (item.id === goal.id ? { ...item, customText: event.target.value } : item)))
                }
              />
            </label>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <label className="text-xs text-foreground/70">
                Baseline
                <select
                  value={goal.baseline}
                  className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
                  onChange={(event) =>
                    onChange(
                      goals.map((item) =>
                        item.id === goal.id ? { ...item, baseline: event.target.value as CarePlanGoalDraft["baseline"] } : item
                      )
                    )
                  }
                >
                  {CARE_PLAN_GOAL_BASELINES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground/70">
                Target
                <select
                  value={goal.target}
                  className="mt-1 h-10 w-full rounded-md border border-white/20 bg-white/60 px-3 text-sm"
                  onChange={(event) =>
                    onChange(
                      goals.map((item) =>
                        item.id === goal.id ? { ...item, target: event.target.value as CarePlanGoalDraft["target"] } : item
                      )
                    )
                  }
                >
                  {CARE_PLAN_GOAL_BASELINES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground/70">
                Timeframe (days)
                <Input
                  type="number"
                  min={7}
                  max={365}
                  className="mt-1 bg-white/60"
                  value={goal.timeframeDays}
                  onChange={(event) =>
                    onChange(
                      goals.map((item) =>
                        item.id === goal.id
                          ? { ...item, timeframeDays: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : item.timeframeDays }
                          : item
                      )
                    )
                  }
                />
              </label>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={goals.length >= 3}
          onClick={() => onChange([...goals, makeGoal()])}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add another goal
        </Button>
        <p className="text-xs text-muted-foreground">{goals.length}/3 goals</p>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

export function createDefaultGoalDrafts() {
  return [makeGoal()];
}
