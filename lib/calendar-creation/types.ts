export type CalendarActivityType = "Group" | "1:1" | "Independent";

export type CalendarPrepLevel = "Low" | "Medium" | "High";

export type CalendarIndoorOutdoor = "Indoor" | "Outdoor" | "Either";

export type CalendarRecurrenceType = "DAILY" | "WEEKDAYS" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";

export type CalendarRecurrenceEndType = "NEVER" | "ON_DATE" | "AFTER_OCCURRENCES";

export type CalendarActivity = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  type: CalendarActivityType;
  description: string;
  residentFacingDescription: string;
  suppliesNeeded: string[];
  internalNotes: string;
  prepLevel: CalendarPrepLevel;
  indoorOutdoor: CalendarIndoorOutdoor;
  backupAlternative: string;
  reusableTemplate: boolean;
  isRecurring: boolean;
  repeatRule: string | null;
  recurrenceRule: string | null;
  recurrenceType: CalendarRecurrenceType | null;
  recurrenceInterval: number | null;
  recurrenceDaysOfWeek: number[] | null;
  recurrenceEndType: CalendarRecurrenceEndType | null;
  recurrenceEndDate: string | null;
  recurrenceCount: number | null;
  recurrenceExclusions: string[] | null;
  recurringSeriesId: string | null;
  tags: string[];
  aiGenerated: boolean;
  createdFromTemplate: boolean;
};

export type CalendarDay = {
  date: string;
  holidayName: string | null;
  isHoliday: boolean;
  isSpecialEvent: boolean;
  hasBackupPlan: boolean;
  hasOneToOneCoverage: boolean;
  dayNotes: string;
  prepReminders: string;
  staffOnlyNotes: string;
  activities: CalendarActivity[];
};

export type CalendarMonth = {
  calendarId: string;
  title: string;
  month: number;
  year: number;
  facilityName: string;
  templateSource: string | null;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  days: CalendarDay[];
  notes: string;
  printSettings: {
    includeInternalNotes: boolean;
    includeBackupNotes: boolean;
    includeDescriptions: boolean;
    grayscale: boolean;
    includeFacilityName: boolean;
    includeHolidayBadges: boolean;
    includeLegend: boolean;
  };
  exportSettings: {
    lastExportAt: string | null;
    lastFormat: "PDF" | "PRINT" | "CSV" | null;
  };
};

export type ActivityTemplateItem = {
  id: string;
  title: string;
  category: string;
  prepLevel: CalendarPrepLevel;
  energy: "Low" | "Medium" | "High";
  indoorOutdoor: CalendarIndoorOutdoor;
  description: string;
  tags: string[];
};

export type CalendarThemeWeek = {
  id: string;
  title: string;
  description: string;
  dailySubthemes: Array<{ day: string; label: string; focus: string }>;
};
