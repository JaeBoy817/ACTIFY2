import type { CarePlanFocusAreaKey } from "@/lib/care-plans/enums";

export type CarePlanGoalDraft = {
  id: string;
  templateKey: string | null;
  customText: string | null;
  baseline: "RARE" | "SOMETIMES" | "OFTEN";
  target: "RARE" | "SOMETIMES" | "OFTEN";
  timeframeDays: number;
};

export type CarePlanInterventionDraft = {
  id: string;
  title: string;
  type: "GROUP" | "ONE_TO_ONE" | "INDEPENDENT";
  bedBoundFriendly: boolean;
  dementiaFriendly: boolean;
  lowVisionFriendly: boolean;
  hardOfHearingFriendly: boolean;
};

export type CarePlanWizardDraft = {
  focusAreas: CarePlanFocusAreaKey[];
  goals: CarePlanGoalDraft[];
  interventions: CarePlanInterventionDraft[];
  frequency: "DAILY" | "THREE_PER_WEEK" | "WEEKLY" | "PRN" | "CUSTOM";
  frequencyCustom: string;
  nextReviewDate: string;
  barriers: string[];
  supports: string[];
  preferencesText: string;
  safetyNotes: string;
  status: "ACTIVE" | "ARCHIVED";
};
