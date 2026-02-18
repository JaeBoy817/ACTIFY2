"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { GoalStep, createDefaultGoalDrafts } from "@/components/care-plans/steps/GoalStep";
import { FocusStep } from "@/components/care-plans/steps/FocusStep";
import { InterventionsStep } from "@/components/care-plans/steps/InterventionsStep";
import { ScheduleStep } from "@/components/care-plans/steps/ScheduleStep";
import type { CarePlanInterventionDraft, CarePlanWizardDraft } from "@/components/care-plans/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CARE_PLAN_TEMPLATE_BY_KEY } from "@/lib/care-plans/templates";
import { carePlanWizardPayloadSchema } from "@/lib/care-plans/validation";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type WizardStep = 0 | 1 | 2 | 3;

const stepMeta = [
  { label: "Focus", helper: "Pick plan areas (1-3)." },
  { label: "Goals", helper: "Set measurable goals." },
  { label: "Interventions", helper: "Choose support actions." },
  { label: "Schedule", helper: "Set frequency and review." }
] as const;

type ExistingPlanPrefill = {
  focusAreasList: string[];
  goals: Array<{
    id: string;
    templateKey: string | null;
    customText: string | null;
    baseline: "RARE" | "SOMETIMES" | "OFTEN";
    target: "RARE" | "SOMETIMES" | "OFTEN";
    timeframeDays: number;
  }>;
  interventions: Array<CarePlanInterventionDraft>;
  frequency: "DAILY" | "THREE_PER_WEEK" | "WEEKLY" | "PRN" | "CUSTOM";
  frequencyCustom: string | null;
  nextReviewDate: string;
  barriersList: string[];
  supportsList: string[];
  preferencesText: string | null;
  safetyNotes: string | null;
  status: "ACTIVE" | "ARCHIVED";
};

type Props = {
  mode: "create" | "edit";
  residentName: string;
  residentStatus: string;
  templateKey?: string | null;
  existingPlan?: ExistingPlanPrefill | null;
  submitAction: (formData: FormData) => Promise<void> | void;
};

function makeInterventionId() {
  return `int-${Math.random().toString(36).slice(2)}`;
}

function defaultDraft(): CarePlanWizardDraft {
  return {
    focusAreas: [],
    goals: createDefaultGoalDrafts(),
    interventions: [],
    frequency: "WEEKLY",
    frequencyCustom: "",
    nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    barriers: [],
    supports: [],
    preferencesText: "",
    safetyNotes: "",
    status: "ACTIVE"
  };
}

function buildFromTemplate(templateKey: string) {
  const template = CARE_PLAN_TEMPLATE_BY_KEY[templateKey];
  if (!template) return null;
  return {
    focusAreas: template.defaultFocusAreas,
    goals: template.defaultGoalTemplates.map((goal) => ({
      id: `goal-${Math.random().toString(36).slice(2)}`,
      templateKey: goal.templateKey,
      customText: null,
      baseline: goal.baseline,
      target: goal.target,
      timeframeDays: goal.timeframeDays
    })),
    interventions: template.defaultInterventions.map((intervention) => ({
      id: makeInterventionId(),
      title: intervention.title,
      type: intervention.type,
      bedBoundFriendly: intervention.bedBoundFriendly ?? false,
      dementiaFriendly: intervention.dementiaFriendly ?? false,
      lowVisionFriendly: intervention.lowVisionFriendly ?? false,
      hardOfHearingFriendly: intervention.hardOfHearingFriendly ?? false
    })),
    frequency: template.defaultFrequency,
    frequencyCustom: "",
    nextReviewDate: new Date(Date.now() + template.defaultReviewDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    barriers: template.suggestedBarriers ?? [],
    supports: template.suggestedSupports ?? [],
    preferencesText: "",
    safetyNotes: "",
    status: "ACTIVE" as const
  } satisfies CarePlanWizardDraft;
}

function buildFromExisting(existing: ExistingPlanPrefill): CarePlanWizardDraft {
  return {
    focusAreas: existing.focusAreasList as CarePlanWizardDraft["focusAreas"],
    goals:
      existing.goals.length > 0
        ? existing.goals
        : createDefaultGoalDrafts(),
    interventions: existing.interventions.map((item) => ({
      ...item,
      id: item.id || makeInterventionId()
    })),
    frequency: existing.frequency,
    frequencyCustom: existing.frequencyCustom ?? "",
    nextReviewDate: existing.nextReviewDate,
    barriers: existing.barriersList,
    supports: existing.supportsList,
    preferencesText: existing.preferencesText ?? "",
    safetyNotes: existing.safetyNotes ?? "",
    status: existing.status
  };
}

export function CarePlanWizard({
  mode,
  residentName,
  residentStatus,
  templateKey,
  existingPlan,
  submitAction
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>(0);

  const initialDraft = useMemo(() => {
    if (existingPlan) return buildFromExisting(existingPlan);
    if (templateKey) {
      const fromTemplate = buildFromTemplate(templateKey);
      if (fromTemplate) return fromTemplate;
    }
    return defaultDraft();
  }, [existingPlan, templateKey]);

  const [draft, setDraft] = useState<CarePlanWizardDraft>(initialDraft);
  const [errors, setErrors] = useState<Record<number, string | null>>({});

  function patch(patch: Partial<CarePlanWizardDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function validateForStep(targetStep: WizardStep) {
    if (targetStep >= 0 && draft.focusAreas.length === 0) {
      setErrors((prev) => ({ ...prev, 0: "Select at least one focus area." }));
      return false;
    }
    if (targetStep >= 1 && draft.goals.length === 0) {
      setErrors((prev) => ({ ...prev, 1: "Add at least one goal." }));
      return false;
    }
    if (targetStep >= 2 && draft.interventions.length < 2) {
      setErrors((prev) => ({ ...prev, 2: "Select at least two interventions." }));
      return false;
    }
    if (targetStep >= 3 && !draft.nextReviewDate) {
      setErrors((prev) => ({ ...prev, 3: "Set a next review date." }));
      return false;
    }
    setErrors({});
    return true;
  }

  function onNext() {
    const next = Math.min(3, step + 1) as WizardStep;
    if (!validateForStep(next)) return;
    setStep(next);
  }

  function onBack() {
    setStep((prev) => Math.max(0, prev - 1) as WizardStep);
  }

  function onSubmit() {
    const parsed = carePlanWizardPayloadSchema.safeParse({
      focusAreas: draft.focusAreas,
      goals: draft.goals.map((goal) => ({
        templateKey: goal.templateKey || undefined,
        customText: goal.customText || undefined,
        baseline: goal.baseline,
        target: goal.target,
        timeframeDays: goal.timeframeDays
      })),
      interventions: draft.interventions.map((item) => ({
        title: item.title,
        type: item.type,
        bedBoundFriendly: item.bedBoundFriendly,
        dementiaFriendly: item.dementiaFriendly,
        lowVisionFriendly: item.lowVisionFriendly,
        hardOfHearingFriendly: item.hardOfHearingFriendly
      })),
      frequency: draft.frequency,
      frequencyCustom: draft.frequencyCustom || undefined,
      nextReviewDate: draft.nextReviewDate,
      barriers: draft.barriers,
      supports: draft.supports,
      preferencesText: draft.preferencesText || undefined,
      safetyNotes: draft.safetyNotes || undefined,
      status: draft.status
    });

    if (!parsed.success) {
      const issuePath = parsed.error.issues[0]?.path[0];
      if (issuePath === "focusAreas") setStep(0);
      else if (issuePath === "goals") setStep(1);
      else if (issuePath === "interventions") setStep(2);
      else setStep(3);
      toast({
        title: "Check required fields",
        description: parsed.error.issues[0]?.message ?? "Please complete all required fields.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.set("payload", JSON.stringify(parsed.data));

    startTransition(async () => {
      try {
        await submitAction(formData);
        toast({
          title: mode === "create" ? "Care plan created" : "Care plan updated",
          description: "Saved successfully."
        });
        router.refresh();
      } catch (error) {
        toast({
          title: "Unable to save care plan",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <div className="space-y-4 [&_button]:shadow-md [&_button]:shadow-black/15 [&_button:hover]:shadow-lg [&_button:hover]:shadow-black/20">
      <Card className="glass-panel rounded-2xl border-white/15">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{mode === "create" ? "Create Care Plan" : "Edit Care Plan"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{residentName} · Step {step + 1} of 4</p>
          </div>
          <Button variant="outline" className="bg-white/70" onClick={onSubmit} disabled={isPending}>
            Save & Exit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-4">
            {stepMeta.map((entry, index) => (
              <button
                key={entry.label}
                type="button"
                className={cn(
                  "rounded-xl border p-2 text-left",
                  index === step ? "border-actifyBlue bg-actifyBlue/10" : "border-white/20 bg-white/10"
                )}
                onClick={() => setStep(index as WizardStep)}
              >
                <p className="text-xs uppercase tracking-wide text-foreground/70">Step {index + 1}</p>
                <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                <p className="text-xs text-muted-foreground">{entry.helper}</p>
                {index < step ? <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-600" /> : null}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
            {step === 0 ? (
              <FocusStep value={draft.focusAreas} onChange={(next) => patch({ focusAreas: next })} error={errors[0]} />
            ) : null}
            {step === 1 ? (
              <GoalStep focusAreas={draft.focusAreas} goals={draft.goals} onChange={(next) => patch({ goals: next })} error={errors[1]} />
            ) : null}
            {step === 2 ? (
              <InterventionsStep
                selected={draft.interventions}
                onChange={(next) => patch({ interventions: next })}
                suggestBedBound={residentStatus === "BED_BOUND"}
                error={errors[2]}
              />
            ) : null}
            {step === 3 ? (
              <ScheduleStep draft={draft} onPatch={patch} error={errors[3]} />
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack} disabled={step === 0 || isPending}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={onNext} disabled={isPending}>
                Next
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={isPending}>
                {mode === "create" ? "Create Care Plan" : "Save Changes"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
