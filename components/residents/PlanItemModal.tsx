"use client";

import { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  barriers,
  cueingLevelOptions,
  goalTemplates,
  groupPreferenceOptions,
  interventions,
  planAreas,
  targetFrequencyOptions,
  type CueingLevelKey,
  type GroupPreferenceKey,
  type PlanAreaKey,
  type TargetFrequencyKey
} from "@/lib/planLibrary";

export type ResidentPlanFormPayload = {
  id?: string;
  planAreaKey: PlanAreaKey;
  goalTemplateId: string | null;
  customGoalText: string | null;
  targetFrequency: TargetFrequencyKey;
  interventions: string[];
  cueingLevel: CueingLevelKey;
  groupPreference: GroupPreferenceKey;
  barriers: string[];
  notes: string | null;
  active: boolean;
};

type PlanItemModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItem?: ResidentPlanFormPayload | null;
  onSave: (payload: ResidentPlanFormPayload) => Promise<void> | void;
  canEdit: boolean;
};

type GoalMode = "template" | "custom";

function buildDefaultState(initialItem?: ResidentPlanFormPayload | null): ResidentPlanFormPayload {
  if (initialItem) {
    return {
      ...initialItem,
      goalTemplateId: initialItem.goalTemplateId ?? null,
      customGoalText: initialItem.customGoalText ?? null,
      interventions: [...initialItem.interventions],
      barriers: [...initialItem.barriers],
      notes: initialItem.notes ?? null
    };
  }

  const firstArea = planAreas[0].key;
  const firstTemplate = goalTemplates[firstArea][0];

  return {
    planAreaKey: firstArea,
    goalTemplateId: firstTemplate?.id ?? null,
    customGoalText: null,
    targetFrequency: firstTemplate?.suggestedFrequency ?? "WEEKLY",
    interventions: [],
    cueingLevel: "NONE",
    groupPreference: firstTemplate?.suggestedGroupPreference ?? "MIXED",
    barriers: [],
    notes: null,
    active: true
  };
}

export function PlanItemModal({
  open,
  onOpenChange,
  initialItem,
  onSave,
  canEdit
}: PlanItemModalProps) {
  const [formState, setFormState] = useState<ResidentPlanFormPayload>(buildDefaultState(initialItem));
  const [goalMode, setGoalMode] = useState<GoalMode>(initialItem?.customGoalText ? "custom" : "template");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormState(buildDefaultState(initialItem));
      setGoalMode(initialItem?.customGoalText ? "custom" : "template");
      setErrorMessage(null);
      setSaving(false);
    }
  }, [open, initialItem]);

  const templatesForArea = useMemo(() => goalTemplates[formState.planAreaKey], [formState.planAreaKey]);
  const interventionsForArea = useMemo(() => interventions[formState.planAreaKey], [formState.planAreaKey]);
  const isEditing = Boolean(initialItem?.id);

  function toggleIntervention(interventionKey: string, checked: boolean) {
    setFormState((prev) => {
      const nextInterventions = checked
        ? Array.from(new Set([...prev.interventions, interventionKey]))
        : prev.interventions.filter((value) => value !== interventionKey);
      return { ...prev, interventions: nextInterventions };
    });
  }

  function toggleBarrier(barrierKey: string) {
    setFormState((prev) => {
      const exists = prev.barriers.includes(barrierKey);
      const nextBarriers = exists ? prev.barriers.filter((value) => value !== barrierKey) : [...prev.barriers, barrierKey];
      return { ...prev, barriers: nextBarriers };
    });
  }

  function handlePlanAreaChange(value: string) {
    const nextPlanArea = value as PlanAreaKey;
    const firstTemplate = goalTemplates[nextPlanArea][0];
    setFormState((prev) => ({
      ...prev,
      planAreaKey: nextPlanArea,
      goalTemplateId: firstTemplate?.id ?? null,
      customGoalText: goalMode === "custom" ? prev.customGoalText : null,
      interventions: []
    }));
    if (goalMode === "template" && firstTemplate) {
      setFormState((prev) => ({
        ...prev,
        planAreaKey: nextPlanArea,
        goalTemplateId: firstTemplate.id,
        targetFrequency: firstTemplate.suggestedFrequency,
        groupPreference: firstTemplate.suggestedGroupPreference,
        interventions: []
      }));
    }
  }

  function handleTemplateChange(value: string) {
    const selectedTemplate = templatesForArea.find((template) => template.id === value);
    setFormState((prev) => ({
      ...prev,
      goalTemplateId: value,
      customGoalText: null,
      targetFrequency: selectedTemplate?.suggestedFrequency ?? prev.targetFrequency,
      groupPreference: selectedTemplate?.suggestedGroupPreference ?? prev.groupPreference
    }));
    setGoalMode("template");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || saving) return;

    const hasCustomGoal = Boolean(formState.customGoalText?.trim());
    const hasTemplateGoal = Boolean(formState.goalTemplateId);

    if (goalMode === "custom" && !hasCustomGoal) {
      setErrorMessage("Custom goal text is required.");
      return;
    }
    if (goalMode === "template" && !hasTemplateGoal) {
      setErrorMessage("Select a goal template.");
      return;
    }
    if (formState.interventions.length === 0) {
      setErrorMessage("Select at least one intervention.");
      return;
    }

    setErrorMessage(null);
    setSaving(true);
    try {
      await onSave({
        ...formState,
        goalTemplateId: goalMode === "template" ? formState.goalTemplateId : null,
        customGoalText: goalMode === "custom" ? formState.customGoalText?.trim() || null : null,
        notes: formState.notes?.trim() || null
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan Area" : "Add Plan Area"}</DialogTitle>
          <DialogDescription>
            Pick a plan area, choose a goal template, and quick-select interventions for faster activities documentation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Plan Area</span>
              <Select value={formState.planAreaKey} onValueChange={handlePlanAreaChange} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {planAreas.map((area) => (
                    <SelectItem key={area.key} value={area.key}>{area.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Frequency</span>
              <Select
                value={formState.targetFrequency}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, targetFrequency: value as TargetFrequencyKey }))}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {targetFrequencyOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Group Preference</span>
              <Select
                value={formState.groupPreference}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, groupPreference: value as GroupPreferenceKey }))}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groupPreferenceOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Cueing Level</span>
              <Select
                value={formState.cueingLevel}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, cueingLevel: value as CueingLevelKey }))}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cueingLevelOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="rounded-xl border border-white/70 bg-white/65 p-3">
            <p className="text-sm font-medium text-foreground">Goal</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={goalMode === "template" ? "default" : "outline"}
                size="sm"
                onClick={() => setGoalMode("template")}
                disabled={!canEdit}
              >
                Use Template
              </Button>
              <Button
                type="button"
                variant={goalMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setGoalMode("custom")}
                disabled={!canEdit}
              >
                Custom Goal
              </Button>
            </div>

            {goalMode === "template" ? (
              <div className="mt-3 space-y-2">
                <Select value={formState.goalTemplateId ?? ""} onValueChange={handleTemplateChange} disabled={!canEdit}>
                  <SelectTrigger><SelectValue placeholder="Select goal template" /></SelectTrigger>
                  <SelectContent>
                    {templatesForArea.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {templatesForArea.find((template) => template.id === formState.goalTemplateId)?.goalText ?? "Choose a template to preview goal text."}
                </p>
              </div>
            ) : (
              <Textarea
                className="mt-3"
                placeholder="Custom goal text"
                value={formState.customGoalText ?? ""}
                onChange={(event) => setFormState((prev) => ({ ...prev, customGoalText: event.target.value }))}
                minLength={10}
                maxLength={500}
                disabled={!canEdit}
              />
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-white/70 bg-white/65 p-3">
            <p className="text-sm font-medium text-foreground">Interventions</p>
            <div className="grid gap-2 md:grid-cols-2">
              {interventionsForArea.map((intervention) => {
                const checked = formState.interventions.includes(intervention.key);
                return (
                  <label key={intervention.key} className="flex items-start gap-2 rounded-md border border-white/70 bg-white/80 px-2 py-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleIntervention(intervention.key, Boolean(value))}
                      disabled={!canEdit}
                    />
                    <span>{intervention.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-white/70 bg-white/65 p-3">
            <p className="text-sm font-medium text-foreground">Barriers (optional)</p>
            <div className="flex flex-wrap gap-2">
              {barriers.map((barrier) => {
                const selected = formState.barriers.includes(barrier.key);
                return (
                  <button
                    key={barrier.key}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${selected ? "border-actifyBlue bg-actifyBlue/15 text-actifyBlue" : "border-white/70 bg-white/80 text-foreground/80"}`}
                    onClick={() => toggleBarrier(barrier.key)}
                    disabled={!canEdit}
                  >
                    {barrier.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Notes (optional)</span>
            <Textarea
              placeholder="Additional context for staff"
              value={formState.notes ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              maxLength={1200}
              disabled={!canEdit}
            />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/65 px-3 py-2">
            <p className="text-sm font-medium">Active</p>
            <Checkbox
              checked={formState.active}
              onCheckedChange={(value) => setFormState((prev) => ({ ...prev, active: Boolean(value) }))}
              disabled={!canEdit}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canEdit || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
