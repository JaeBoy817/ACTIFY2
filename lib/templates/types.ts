export type TemplateType = "activity" | "note" | "care_plan" | "report";

export type TemplateStatus = "active" | "archived";

export type ActivityTemplatePayload = {
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedMinutes?: number;
  supplies: string[];
  setupSteps: string[];
  checklistItems: string[];
  adaptations: {
    bedBound: string;
    dementia: string;
    lowVision: string;
    oneToOne: string;
  };
};

export type NoteTemplatePayload = {
  fieldsEnabled: {
    mood: boolean;
    cues: boolean;
    participation: boolean;
    response: boolean;
    followUp: boolean;
  };
  defaultTextBlocks: {
    opening?: string;
    body?: string;
    followUp?: string;
  };
  quickPhrases: string[];
};

export type UnifiedTemplatePayload =
  | ActivityTemplatePayload
  | NoteTemplatePayload
  | Record<string, never>;

export type UnifiedTemplate = {
  id: string;
  type: TemplateType;
  title: string;
  category?: string;
  tags: string[];
  status: TemplateStatus;
  isFavorite: boolean;
  usageCount: number;
  updatedAt: string;
  payload: UnifiedTemplatePayload;
};

export const TEMPLATE_TYPE_OPTIONS: Array<{ value: TemplateType; label: string; enabled: boolean }> = [
  { value: "activity", label: "Activities", enabled: true },
  { value: "note", label: "Notes", enabled: true },
  { value: "care_plan", label: "Care Plans", enabled: false },
  { value: "report", label: "Reports", enabled: false }
];

