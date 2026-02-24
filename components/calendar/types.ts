export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export type CalendarDrawerTab = "day" | "activity" | "templates";

export type CalendarTemplateLite = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  defaultChecklist: unknown;
  adaptations: unknown;
};

export type CalendarEventLite = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  templateId: string | null;
  seriesId: string | null;
  occurrenceKey: string | null;
  isOverride: boolean;
  conflictOverride: boolean;
  checklist: unknown;
  adaptationsEnabled: unknown;
};

export type CalendarFilterState = {
  location: string;
  categories: string[];
  showOnlyMine: boolean;
};

export type AdaptationFieldKey = "bedBound" | "dementiaFriendly" | "lowVisionHearing" | "oneToOneMini";

export type AdaptationFormState = Record<AdaptationFieldKey, { enabled: boolean; override: string }>;

export type ScheduleFormState = {
  id: string | null;
  templateId: string | null;
  title: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  checklistItems: string[];
  adaptations: AdaptationFormState;
};
