"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
} from "date-fns";
import {
  CalendarPlus2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Gift,
  MapPin,
  Plus,
  Printer,
  Repeat,
  Sparkles,
  Trash2,
  WandSparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DrawerShell, ModalShell } from "@/components/workspace/shared";
import { toUtcIso } from "@/components/calendar/utils";
import type {
  CalendarActivity,
  CalendarActivityType,
  CalendarDay,
  CalendarMonth,
  CalendarRecurrenceEndType,
  CalendarRecurrenceType
} from "@/lib/calendar-creation/types";
import { buildHolidayLookup, getHolidayBadgeForDate } from "@/lib/calendar/getHolidayBadgeForDate";
import { getHolidaysForYear } from "@/lib/calendar/getHolidaysForYear";
import type { CalendarHoliday } from "@/lib/calendar/holidays";
import {
  buildResidentBirthdayLookup,
  getBirthdayBadgeForDate,
  type ResidentBirthdaySource
} from "@/lib/calendar/resident-birthdays";
import { useToast } from "@/lib/use-toast";
import { formatInTimeZone, zonedDateKey } from "@/lib/timezone";
import { cn } from "@/lib/utils";

type CalendarViewMode = "month" | "week" | "day";

type ActivityDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  type: CalendarActivityType;
  description: string;
  suppliesNeeded: string;
  backupPlan: string;
  internalNotes: string;
  colorTone: string;
  isRecurring: boolean;
  recurrenceType: CalendarRecurrenceType;
  recurrenceRepeatOn: number[];
  recurrenceEndType: CalendarRecurrenceEndType;
  recurrenceEndDate: string;
  recurrenceCount: number;
  recurrenceCustomInterval: number;
  recurrenceExclusions: string[];
};

type ActivityEditorState =
  | {
      mode: "create";
      draft: ActivityDraft;
    }
  | {
      mode: "edit";
      draft: ActivityDraft;
      activityId: string;
      originalDate: string;
      editScope: "single" | "series";
      sourceSeriesId: string | null;
    };

type BirthdayBadgeItem = {
  residentId: string;
  residentName: string;
  birthMonth: number;
  birthDay: number;
  dateForDisplay: string;
  type: "birthday";
  label: string;
  shortLabel: string;
  key: string;
  dateLabel: string;
};

type ResidentBirthdayApiRow = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  birthDate: string | null;
  status?: string | null;
};

type PersistedActivityMeta = {
  category?: string;
  type?: CalendarActivityType;
  description?: string;
  suppliesNeeded?: string[];
  backupPlan?: string;
  internalNotes?: string;
  colorTone?: string;
  tags?: string[];
  recurrenceType?: CalendarRecurrenceType;
  recurrenceDaysOfWeek?: number[];
  recurrenceEndType?: CalendarRecurrenceEndType;
  recurrenceEndDate?: string;
  recurrenceCount?: number;
  recurrenceCustomInterval?: number;
  recurrenceExclusions?: string[];
};

type PersistedAdaptationsPayload = {
  bedBound?: boolean;
  dementiaFriendly?: boolean;
  lowVisionHearing?: boolean;
  oneToOneMini?: boolean;
  overrides?: Record<string, unknown>;
  calendarMeta?: PersistedActivityMeta;
};

type PersistedActivityRecord = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  seriesId: string | null;
  checklist?: unknown;
  adaptationsEnabled?: unknown;
};

const VIEW_OPTIONS: Array<{ key: CalendarViewMode; label: string }> = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" }
];

const DAY_HEADERS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CATEGORY_OPTIONS = [
  "All Categories",
  "Group Activity",
  "1:1 Visit",
  "Independent Activity",
  "Holiday Activity",
  "Sensory Activity",
  "Physical Activity",
  "Cognitive Activity",
  "Music / Entertainment",
  "Spiritual / Religious",
  "Social Event",
  "Craft / Creative",
  "Room Visit"
] as const;

const TYPE_OPTIONS: CalendarActivityType[] = ["Group", "1:1", "Independent"];

const COLOR_TONES = ["Teal", "Blue", "Violet", "Rose", "Amber", "Slate"] as const;
const REPEAT_DAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
] as const;

function toISODate(date: Date) {
  return format(startOfDay(date), "yyyy-MM-dd");
}

function parseDate(isoDate: string) {
  return startOfDay(parseISO(`${isoDate}T00:00:00`));
}

function createEmptyDay(date: string): CalendarDay {
  return {
    date,
    holidayName: null,
    isHoliday: false,
    isSpecialEvent: false,
    hasBackupPlan: false,
    hasOneToOneCoverage: false,
    dayNotes: "",
    prepReminders: "",
    staffOnlyNotes: "",
    activities: []
  };
}

function createBlankCalendarMonth(year: number, month: number): CalendarMonth {
  const baseDate = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(baseDate);

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return createEmptyDay(`${year}-${String(month).padStart(2, "0")}-${day}`);
  });

  return {
    calendarId: `calendar-${year}-${String(month).padStart(2, "0")}-draft`,
    title: `${format(baseDate, "MMMM yyyy")} Activity Calendar`,
    month,
    year,
    facilityName: "Actify",
    templateSource: null,
    isDraft: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days,
    notes: "",
    printSettings: {
      includeInternalNotes: false,
      includeBackupNotes: true,
      includeDescriptions: true,
      grayscale: false,
      includeFacilityName: true,
      includeHolidayBadges: true,
      includeLegend: false
    },
    exportSettings: {
      lastExportAt: null,
      lastFormat: null
    }
  };
}

function sortCalendars(calendars: CalendarMonth[]) {
  return [...calendars].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

function ensureCalendarMonth(calendars: CalendarMonth[], year: number, month: number) {
  const index = calendars.findIndex((calendar) => calendar.year === year && calendar.month === month);
  if (index >= 0) {
    return {
      index,
      calendars: [...calendars]
    };
  }

  return {
    index: calendars.length,
    calendars: [...calendars, createBlankCalendarMonth(year, month)]
  };
}

function refreshDayFlags(day: CalendarDay): CalendarDay {
  return {
    ...day,
    hasBackupPlan: day.activities.some((activity) => activity.backupAlternative.trim().length > 0),
    hasOneToOneCoverage: day.activities.some((activity) => activity.type === "1:1")
  };
}

function upsertDay(calendars: CalendarMonth[], dateISO: string, updater: (day: CalendarDay) => CalendarDay) {
  const targetDate = parseDate(dateISO);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  const { calendars: withMonth, index } = ensureCalendarMonth(calendars, year, month);
  const calendar = withMonth[index];
  const dayIndex = calendar.days.findIndex((day) => day.date === dateISO);

  const day = dayIndex >= 0 ? calendar.days[dayIndex] : createEmptyDay(dateISO);
  const nextDay = updater(day);

  const nextDays = dayIndex >= 0 ? calendar.days.map((item, idx) => (idx === dayIndex ? nextDay : item)) : [...calendar.days, nextDay];

  nextDays.sort((a, b) => a.date.localeCompare(b.date));

  const nextCalendar: CalendarMonth = {
    ...calendar,
    days: nextDays,
    updatedAt: new Date().toISOString()
  };

  const nextCalendars = withMonth.map((item, idx) => (idx === index ? nextCalendar : item));
  return sortCalendars(nextCalendars);
}

function parseTimeToMinutes(value: string) {
  const plain = value.trim();

  const twentyFourMatch = plain.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hour = Number(twentyFourMatch[1]);
    const minute = Number(twentyFourMatch[2]);
    return hour * 60 + minute;
  }

  const meridiemMatch = plain.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!meridiemMatch) return Number.MAX_SAFE_INTEGER;

  const hour = Number(meridiemMatch[1]);
  const minute = Number(meridiemMatch[2]);
  const meridiem = meridiemMatch[3].toUpperCase();
  const normalizedHour = hour % 12 + (meridiem === "PM" ? 12 : 0);

  return normalizedHour * 60 + minute;
}

function toResidentDisplayName(row: ResidentBirthdayApiRow) {
  const preferred = row.preferredName?.trim();
  if (preferred) return preferred;

  const first = row.firstName.trim();
  const last = row.lastName.trim();
  if (!first && !last) return "Resident";
  if (!last) return first;
  return `${first} ${last.charAt(0)}.`;
}

function toResidentBirthdaySources(rows: ResidentBirthdayApiRow[]): ResidentBirthdaySource[] {
  return rows
    .filter((row) => row.status !== "DISCHARGED")
    .filter((row) => typeof row.birthDate === "string" && row.birthDate.trim().length > 0)
    .map((row) => ({
      residentId: row.id,
      residentName: toResidentDisplayName(row),
      birthDate: row.birthDate as string
    }));
}

function toInputTime(value: string) {
  const trimmed = value.trim();
  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    return `${twentyFourMatch[1].padStart(2, "0")}:${twentyFourMatch[2]}`;
  }

  const meridiemMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!meridiemMatch) return "09:00";

  let hour = Number(meridiemMatch[1]);
  const minute = Number(meridiemMatch[2]);
  const meridiem = meridiemMatch[3].toUpperCase();

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeType(value: string | undefined): CalendarActivityType {
  if (value === "1:1") return "1:1";
  if (value === "Independent") return "Independent";
  return "Group";
}

function parsePersistedMeta(value: unknown): PersistedActivityMeta {
  if (!value || typeof value !== "object") return {};
  const safe = value as PersistedAdaptationsPayload;
  if (!safe.calendarMeta || typeof safe.calendarMeta !== "object") return {};
  return safe.calendarMeta;
}

function parseChecklistSupplies(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "text" in item) {
        const text = (item as { text?: unknown }).text;
        return typeof text === "string" ? text.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

function createPersistedActivityFromRecord(record: PersistedActivityRecord, timeZone: string): { dateISO: string; activity: CalendarActivity } {
  const startDate = new Date(record.startAt);
  const endDate = new Date(record.endAt);
  const dateISO = zonedDateKey(startDate, timeZone);
  const meta = parsePersistedMeta(record.adaptationsEnabled);

  const supplies = Array.isArray(meta.suppliesNeeded) && meta.suppliesNeeded.length > 0
    ? meta.suppliesNeeded
    : parseChecklistSupplies(record.checklist);

  const category = typeof meta.category === "string" && meta.category.trim().length > 0 ? meta.category : "Group Activity";
  const type = normalizeType(meta.type);
  const colorTone = typeof meta.colorTone === "string" && COLOR_TONES.includes(meta.colorTone as (typeof COLOR_TONES)[number])
    ? meta.colorTone
    : "Teal";
  const description =
    typeof meta.description === "string" && meta.description.trim().length > 0
      ? meta.description
      : "Resident-friendly activity block.";
  const backupPlan = typeof meta.backupPlan === "string" ? meta.backupPlan : "";
  const internalNotes = typeof meta.internalNotes === "string" ? meta.internalNotes : "";

  const activity: CalendarActivity = {
    id: record.id,
    title: record.title,
    startTime: formatInTimeZone(startDate, timeZone, { hour: "numeric", minute: "2-digit" }),
    endTime: formatInTimeZone(endDate, timeZone, { hour: "numeric", minute: "2-digit" }),
    location: record.location || "Activity Room",
    category,
    type,
    description,
    residentFacingDescription: description,
    suppliesNeeded: supplies,
    internalNotes,
    prepLevel: "Low",
    indoorOutdoor: "Indoor",
    backupAlternative: backupPlan,
    reusableTemplate: false,
    isRecurring: Boolean(record.seriesId),
    repeatRule: null,
    recurrenceRule: null,
    recurrenceType: meta.recurrenceType ?? null,
    recurrenceInterval: meta.recurrenceCustomInterval ?? null,
    recurrenceDaysOfWeek: meta.recurrenceDaysOfWeek ?? null,
    recurrenceEndType: meta.recurrenceEndType ?? null,
    recurrenceEndDate: meta.recurrenceEndDate ?? null,
    recurrenceCount: meta.recurrenceCount ?? null,
    recurrenceExclusions: meta.recurrenceExclusions ?? null,
    recurringSeriesId: record.seriesId,
    tags:
      Array.isArray(meta.tags) && meta.tags.length > 0
        ? meta.tags
        : [type, category, `tone:${String(colorTone).toLowerCase()}`, ...(record.seriesId ? ["Recurring"] : [])],
    aiGenerated: false,
    createdFromTemplate: false
  };

  return { dateISO, activity };
}

function mapRecurrenceToApi(
  draft: ActivityDraft,
  timeZone: string
): {
  freq: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  byDay?: Array<"SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA">;
  count?: number;
  until?: string;
  timezone: string;
} | undefined {
  if (!draft.isRecurring) return undefined;

  const byDayCodes = (draft.recurrenceRepeatOn.length ? draft.recurrenceRepeatOn : [parseDate(draft.date).getDay()])
    .sort((a, b) => a - b)
    .map((day) => weekdayCode(day) as "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA");

  const recurrence: {
    freq: "DAILY" | "WEEKLY" | "MONTHLY";
    interval: number;
    byDay?: Array<"SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA">;
    count?: number;
    until?: string;
    timezone: string;
  } = {
    freq: "WEEKLY",
    interval: 1,
    timezone: timeZone
  };

  if (draft.recurrenceType === "DAILY") {
    recurrence.freq = "DAILY";
    recurrence.interval = 1;
  } else if (draft.recurrenceType === "WEEKDAYS") {
    recurrence.freq = "WEEKLY";
    recurrence.interval = 1;
    recurrence.byDay = ["MO", "TU", "WE", "TH", "FR"];
  } else if (draft.recurrenceType === "WEEKLY") {
    recurrence.freq = "WEEKLY";
    recurrence.interval = 1;
    recurrence.byDay = byDayCodes;
  } else if (draft.recurrenceType === "BIWEEKLY") {
    recurrence.freq = "WEEKLY";
    recurrence.interval = 2;
    recurrence.byDay = byDayCodes;
  } else if (draft.recurrenceType === "MONTHLY") {
    recurrence.freq = "MONTHLY";
    recurrence.interval = 1;
  } else {
    recurrence.freq = "WEEKLY";
    recurrence.interval = Math.max(1, draft.recurrenceCustomInterval || 1);
    recurrence.byDay = byDayCodes;
  }

  if (draft.recurrenceEndType === "AFTER_OCCURRENCES") {
    recurrence.count = Math.max(1, draft.recurrenceCount);
  }
  if (draft.recurrenceEndType === "ON_DATE" && draft.recurrenceEndDate) {
    const untilIso = toUtcIso(draft.recurrenceEndDate, "23:59", timeZone);
    if (untilIso) recurrence.until = untilIso;
  }

  return recurrence;
}

function recurrencePayloadToRRule(payload: NonNullable<ReturnType<typeof mapRecurrenceToApi>>) {
  const parts = [`FREQ=${payload.freq}`, `INTERVAL=${payload.interval}`];
  if (payload.byDay && payload.byDay.length > 0) {
    parts.push(`BYDAY=${payload.byDay.join(",")}`);
  }
  if (payload.count) {
    parts.push(`COUNT=${payload.count}`);
  }
  if (payload.until) {
    parts.push(`UNTIL=${payload.until.replace(/[-:]/g, "").replace(".000", "").replace(".000Z", "Z")}`);
  }
  return parts.join(";");
}

function weekdayCode(value: number) {
  if (value === 0) return "SU";
  if (value === 1) return "MO";
  if (value === 2) return "TU";
  if (value === 3) return "WE";
  if (value === 4) return "TH";
  if (value === 5) return "FR";
  return "SA";
}

function buildPersistencePayloadFromDraft(draft: ActivityDraft, timeZone: string) {
  const startAt = toUtcIso(draft.date, draft.startTime, timeZone);
  const endAt = toUtcIso(draft.date, draft.endTime, timeZone);
  if (!startAt || !endAt) return null;

  const supplies = parseCommaSeparated(draft.suppliesNeeded);
  const meta: PersistedActivityMeta = {
    category: draft.category,
    type: draft.type,
    description: draft.description.trim(),
    suppliesNeeded: supplies,
    backupPlan: draft.backupPlan.trim(),
    internalNotes: draft.internalNotes.trim(),
    colorTone: draft.colorTone,
    tags: [draft.type, draft.category, `tone:${draft.colorTone.toLowerCase()}`, ...(draft.isRecurring ? ["Recurring"] : [])],
    recurrenceType: draft.isRecurring ? draft.recurrenceType : undefined,
    recurrenceDaysOfWeek: draft.isRecurring ? draft.recurrenceRepeatOn : undefined,
    recurrenceEndType: draft.isRecurring ? draft.recurrenceEndType : undefined,
    recurrenceEndDate: draft.isRecurring && draft.recurrenceEndType === "ON_DATE" ? draft.recurrenceEndDate : undefined,
    recurrenceCount: draft.isRecurring && draft.recurrenceEndType === "AFTER_OCCURRENCES" ? draft.recurrenceCount : undefined,
    recurrenceCustomInterval: draft.isRecurring ? draft.recurrenceCustomInterval : undefined,
    recurrenceExclusions: draft.isRecurring ? draft.recurrenceExclusions : undefined
  };

  return {
    title: draft.title.trim(),
    startAt,
    endAt,
    location: draft.location.trim() || "Activity Room",
    checklist: supplies.map((text) => ({ text, done: false })),
    adaptationsEnabled: {
      bedBound: false,
      dementiaFriendly: false,
      lowVisionHearing: false,
      oneToOneMini: false,
      overrides: {},
      calendarMeta: meta
    } satisfies PersistedAdaptationsPayload,
    recurrence: mapRecurrenceToApi(draft, timeZone)
  };
}

function validateRecurringDraft(draft: ActivityDraft) {
  if (!draft.isRecurring) return null;

  if (!draft.recurrenceType) return "Select a repeat pattern.";

  if (
    (draft.recurrenceType === "WEEKLY" ||
      draft.recurrenceType === "BIWEEKLY" ||
      draft.recurrenceType === "CUSTOM") &&
    draft.recurrenceRepeatOn.length === 0
  ) {
    return "Select at least one day for this recurring pattern.";
  }

  if (draft.recurrenceType === "CUSTOM" && (!Number.isFinite(draft.recurrenceCustomInterval) || draft.recurrenceCustomInterval < 1)) {
    return "Custom repeat interval must be at least 1 week.";
  }

  if (draft.recurrenceEndType === "ON_DATE") {
    if (!draft.recurrenceEndDate) return "Select an end date for this recurring series.";
    if (draft.recurrenceEndDate < draft.date) return "Recurring end date must be on or after the activity date.";
  }

  if (draft.recurrenceEndType === "AFTER_OCCURRENCES") {
    if (!Number.isFinite(draft.recurrenceCount) || draft.recurrenceCount < 1) {
      return "Occurrences count must be at least 1.";
    }
  }

  return null;
}

function activitySort(a: CalendarActivity, b: CalendarActivity) {
  return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
}

function formatRangeLabel(viewMode: CalendarViewMode, anchorDate: Date) {
  if (viewMode === "month") {
    return format(anchorDate, "MMMM yyyy");
  }

  if (viewMode === "week") {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(anchorDate, { weekStartsOn: 0 });

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, "MMMM d")}–${format(weekEnd, "d, yyyy")}`;
    }

    return `${format(weekStart, "MMM d")}–${format(weekEnd, "MMM d, yyyy")}`;
  }

  return format(anchorDate, "EEEE, MMMM d, yyyy");
}

function daySummary(day: CalendarDay, categoryFilter: string) {
  const filtered = day.activities.filter((activity) => categoryFilter === "All Categories" || activity.category === categoryFilter);
  const attended = filtered.length;
  const grouped = filtered.filter((activity) => activity.type === "Group").length;
  const oneToOne = filtered.filter((activity) => activity.type === "1:1").length;

  return { attended, grouped, oneToOne };
}

function defaultDraft(dateISO: string): ActivityDraft {
  const anchorDate = parseDate(dateISO);
  return {
    title: "",
    date: dateISO,
    startTime: "10:00",
    endTime: "10:45",
    location: "Activity Room",
    category: "Group Activity",
    type: "Group",
    description: "",
    suppliesNeeded: "",
    backupPlan: "",
    internalNotes: "",
    colorTone: "Teal",
    isRecurring: false,
    recurrenceType: "WEEKLY",
    recurrenceRepeatOn: [anchorDate.getDay()],
    recurrenceEndType: "NEVER",
    recurrenceEndDate: "",
    recurrenceCount: 10,
    recurrenceCustomInterval: 1,
    recurrenceExclusions: []
  };
}

export function CalendarCreationWorkspace() {
  const router = useRouter();
  const { toast } = useToast();
  const today = useMemo(() => startOfDay(new Date()), []);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago", []);
  const fetchRequestRef = useRef(0);

  const [calendars, setCalendars] = useState<CalendarMonth[]>([
    createBlankCalendarMonth(today.getFullYear(), today.getMonth() + 1)
  ]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [categoryFilter, setCategoryFilter] = useState<string>("All Categories");
  const [jumpDate, setJumpDate] = useState<string>(toISODate(today));

  const [dayDrawerDate, setDayDrawerDate] = useState<Date | null>(null);
  const [copyTargetDate, setCopyTargetDate] = useState<string>(toISODate(addDays(today, 1)));

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityEditor, setActivityEditor] = useState<ActivityEditorState>({
    mode: "create",
    draft: defaultDraft(toISODate(today))
  });
  const [activityFormError, setActivityFormError] = useState<string | null>(null);
  const [activitySavingState, setActivitySavingState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [savingActivity, setSavingActivity] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesLoadError, setActivitiesLoadError] = useState<string | null>(null);
  const [seriesAction, setSeriesAction] = useState<{
    mode: "edit" | "delete";
    activity: CalendarActivity;
    dateISO: string;
  } | null>(null);
  const [residentBirthdays, setResidentBirthdays] = useState<ResidentBirthdaySource[]>([]);
  const [showHolidays, setShowHolidays] = useState(true);
  const [showBirthdays, setShowBirthdays] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadResidents() {
      try {
        const response = await fetch("/api/residents", {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { residents?: ResidentBirthdayApiRow[] };
        if (ignore) return;

        const residentRows = Array.isArray(payload.residents) ? payload.residents : [];
        setResidentBirthdays(toResidentBirthdaySources(residentRows));
      } catch {
        if (!ignore) {
          setResidentBirthdays([]);
        }
      }
    }

    void loadResidents();
    return () => {
      ignore = true;
    };
  }, []);

  const dayLookup = useMemo(() => {
    const map = new Map<string, CalendarDay>();

    calendars.forEach((calendar) => {
      calendar.days.forEach((day) => {
        map.set(day.date, day);
      });
    });

    return map;
  }, [calendars]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
      days.push(cursor);
    }

    return days;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(anchorDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [anchorDate]);

  const visibleDates = useMemo(() => {
    if (viewMode === "month") return monthDays;
    if (viewMode === "week") return weekDays;
    return [selectedDate];
  }, [monthDays, selectedDate, viewMode, weekDays]);

  const visibleRange = useMemo(() => {
    if (visibleDates.length === 0) {
      const fallback = startOfDay(selectedDate);
      return {
        start: fallback,
        endExclusive: addDays(fallback, 1)
      };
    }
    const sorted = [...visibleDates].sort((a, b) => a.getTime() - b.getTime());
    return {
      start: startOfDay(sorted[0]),
      endExclusive: addDays(startOfDay(sorted[sorted.length - 1]), 1)
    };
  }, [selectedDate, visibleDates]);

  const syncCalendarsFromPersistedEvents = useCallback(
    (records: PersistedActivityRecord[]) => {
      setCalendars((current) => {
        const nowIso = new Date().toISOString();
        let next = current.map((calendar) => ({
          ...calendar,
          updatedAt: nowIso,
          days: calendar.days.map((day) =>
            refreshDayFlags({
              ...day,
              activities: []
            })
          )
        }));

        const requiredMonthKeys = new Set<string>([
          `${anchorDate.getFullYear()}-${String(anchorDate.getMonth() + 1).padStart(2, "0")}`
        ]);

        for (const record of records) {
          const { dateISO, activity } = createPersistedActivityFromRecord(record, timeZone);
          const eventDate = parseDate(dateISO);
          requiredMonthKeys.add(`${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`);

          next = upsertDay(next, dateISO, (day) =>
            refreshDayFlags({
              ...day,
              activities: [...day.activities, activity].sort(activitySort)
            })
          );
        }

        requiredMonthKeys.forEach((monthKey) => {
          const [yearValue, monthValue] = monthKey.split("-").map(Number);
          const result = ensureCalendarMonth(next, yearValue, monthValue);
          next = result.calendars;
        });

        return sortCalendars(next);
      });
    },
    [anchorDate, timeZone]
  );

  const fetchPersistedActivities = useCallback(async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    setActivitiesLoading(true);
    setActivitiesLoadError(null);
    try {
      const query = new URLSearchParams({
        start: visibleRange.start.toISOString(),
        end: visibleRange.endExclusive.toISOString(),
        view: viewMode === "day" ? "day" : viewMode === "week" ? "week" : "month"
      });
      const response = await fetch(`/api/calendar/range?${query.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const payload = (await response.json()) as {
        activities?: PersistedActivityRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load calendar activities.");
      }
      const records = Array.isArray(payload.activities) ? payload.activities : [];
      if (fetchRequestRef.current !== requestId) return;
      syncCalendarsFromPersistedEvents(records);
    } catch (error) {
      if (fetchRequestRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "Unable to load calendar activities.";
      setActivitiesLoadError(message);
    } finally {
      if (fetchRequestRef.current !== requestId) return;
      setActivitiesLoading(false);
    }
  }, [syncCalendarsFromPersistedEvents, viewMode, visibleRange.endExclusive, visibleRange.start]);

  useEffect(() => {
    void fetchPersistedActivities();
  }, [fetchPersistedActivities]);

  const holidayLookup = useMemo(() => {
    const years = new Set<number>();

    visibleDates.forEach((date) => {
      years.add(date.getFullYear());
    });

    years.add(selectedDate.getFullYear());

    if (dayDrawerDate) {
      years.add(dayDrawerDate.getFullYear());
    }

    const holidayEntries = Array.from(years).flatMap((year) => getHolidaysForYear(year));
    return buildHolidayLookup(holidayEntries);
  }, [dayDrawerDate, selectedDate, visibleDates]);

  const birthdayLookup = useMemo(() => {
    const years = new Set<number>();
    visibleDates.forEach((date) => years.add(date.getFullYear()));
    years.add(selectedDate.getFullYear());
    if (dayDrawerDate) {
      years.add(dayDrawerDate.getFullYear());
    }

    return buildResidentBirthdayLookup({
      residents: residentBirthdays,
      years: Array.from(years)
    });
  }, [dayDrawerDate, residentBirthdays, selectedDate, visibleDates]);

  const upcomingBirthdays = useMemo(() => {
    if (!showBirthdays) return [] as BirthdayBadgeItem[];
    const records: BirthdayBadgeItem[] = [];
    for (let index = 0; index < 14; index += 1) {
      const date = addDays(today, index);
      const dateKey = toISODate(date);
      const entries = getBirthdayBadgeForDate(dateKey, birthdayLookup) as BirthdayBadgeItem[];
      records.push(...entries);
    }
    return records.slice(0, 6);
  }, [birthdayLookup, showBirthdays, today]);

  const selectedDay = useMemo(() => {
    const date = dayDrawerDate ?? selectedDate;
    const iso = toISODate(date);
    return dayLookup.get(iso) ?? createEmptyDay(iso);
  }, [dayDrawerDate, dayLookup, selectedDate]);

  const getHolidayBadgesForDate = (date: Date) => {
    if (!showHolidays) return [] as CalendarHoliday[];
    return getHolidayBadgeForDate(toISODate(date), holidayLookup);
  };

  const getBirthdayBadgesForDate = (date: Date) => {
    if (!showBirthdays) return [] as BirthdayBadgeItem[];
    return getBirthdayBadgeForDate(toISODate(date), birthdayLookup) as BirthdayBadgeItem[];
  };

  const categoryOptions = useMemo(() => {
    const dynamic = new Set<string>(CATEGORY_OPTIONS);

    calendars.forEach((calendar) => {
      calendar.days.forEach((day) => {
        day.activities.forEach((activity) => {
          dynamic.add(activity.category);
        });
      });
    });

    return ["All Categories", ...Array.from(dynamic).filter((value) => value !== "All Categories").sort((a, b) => a.localeCompare(b))];
  }, [calendars]);

  function getDay(date: Date) {
    const iso = toISODate(date);
    return dayLookup.get(iso) ?? createEmptyDay(iso);
  }

  function getVisibleActivities(day: CalendarDay) {
    return day.activities
      .filter((activity) => categoryFilter === "All Categories" || activity.category === categoryFilter)
      .sort(activitySort);
  }

  function openAiPrompt(prompt: string) {
    router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
  }

  function setSelected(date: Date, openDrawer = false) {
    setSelectedDate(startOfDay(date));
    setAnchorDate(startOfDay(date));
    setJumpDate(toISODate(date));

    if (openDrawer) {
      setDayDrawerDate(startOfDay(date));
    }
  }

  function shiftRange(direction: "prev" | "next") {
    const delta = direction === "next" ? 1 : -1;

    if (viewMode === "month") {
      const next = delta > 0 ? addMonths(anchorDate, 1) : subMonths(anchorDate, 1);
      setAnchorDate(next);
      setSelectedDate(next);
      setJumpDate(toISODate(next));
      return;
    }

    if (viewMode === "week") {
      const next = delta > 0 ? addWeeks(anchorDate, 1) : subWeeks(anchorDate, 1);
      setAnchorDate(next);
      setSelectedDate(next);
      setJumpDate(toISODate(next));
      return;
    }

    const next = delta > 0 ? addDays(anchorDate, 1) : subDays(anchorDate, 1);
    setAnchorDate(next);
    setSelectedDate(next);
    setJumpDate(toISODate(next));
  }

  function jumpToToday() {
    setAnchorDate(today);
    setSelectedDate(today);
    setDayDrawerDate(null);
    setJumpDate(toISODate(today));
  }

  function openCreateActivity(date: Date) {
    setActivityFormError(null);
    setActivitySavingState("idle");
    setActivityEditor({
      mode: "create",
      draft: defaultDraft(toISODate(date))
    });
    setActivityModalOpen(true);
  }

  function openEditActivity(activity: CalendarActivity, dateISO: string, editScope: "single" | "series") {
    setActivityFormError(null);
    setActivitySavingState("idle");
    const isSeriesEdit = editScope === "series";
    const nextDraft = defaultDraft(dateISO);
    setActivityEditor({
      mode: "edit",
      activityId: activity.id,
      originalDate: dateISO,
      editScope,
      sourceSeriesId: activity.recurringSeriesId,
      draft: {
        ...nextDraft,
        title: activity.title,
        date: dateISO,
        startTime: toInputTime(activity.startTime),
        endTime: toInputTime(activity.endTime),
        location: activity.location,
        category: activity.category,
        type: activity.type,
        description: activity.description,
        suppliesNeeded: activity.suppliesNeeded.join(", "),
        backupPlan: activity.backupAlternative,
        internalNotes: activity.internalNotes,
        colorTone: COLOR_TONES.find((tone) => activity.tags.includes(`tone:${tone.toLowerCase()}`)) ?? "Teal",
        isRecurring: isSeriesEdit ? Boolean(activity.isRecurring || activity.recurringSeriesId) : false,
        recurrenceType: activity.recurrenceType ?? nextDraft.recurrenceType,
        recurrenceRepeatOn:
          isSeriesEdit && Array.isArray(activity.recurrenceDaysOfWeek) && activity.recurrenceDaysOfWeek.length > 0
            ? [...activity.recurrenceDaysOfWeek]
            : nextDraft.recurrenceRepeatOn,
        recurrenceEndType: activity.recurrenceEndType ?? nextDraft.recurrenceEndType,
        recurrenceEndDate: activity.recurrenceEndDate ?? "",
        recurrenceCount: activity.recurrenceCount ?? nextDraft.recurrenceCount,
        recurrenceCustomInterval: activity.recurrenceInterval ?? nextDraft.recurrenceCustomInterval,
        recurrenceExclusions:
          isSeriesEdit && Array.isArray(activity.recurrenceExclusions) ? [...activity.recurrenceExclusions] : []
      }
    });
    setActivityModalOpen(true);
  }

  async function saveActivity(options?: { keepOpen?: boolean }) {
    const draft = activityEditor.draft;

    if (!draft.title.trim()) {
      setActivityFormError("Activity title is required.");
      setActivitySavingState("error");
      return;
    }

    const recurrenceError = validateRecurringDraft(draft);
    if (recurrenceError) {
      setActivityFormError(recurrenceError);
      setActivitySavingState("error");
      return;
    }

    if (parseTimeToMinutes(draft.endTime) <= parseTimeToMinutes(draft.startTime)) {
      setActivityFormError("End time must be later than start time.");
      setActivitySavingState("error");
      return;
    }

    const payload = buildPersistencePayloadFromDraft(draft, timeZone);
    if (!payload) {
      setActivityFormError("Invalid date or time. Please check the activity details.");
      setActivitySavingState("error");
      return;
    }

    setActivityFormError(null);
    setSavingActivity(true);
    setActivitySavingState("saving");

    try {
      let response: Response;

      if (activityEditor.mode === "edit") {
        if (activityEditor.editScope === "series" && activityEditor.sourceSeriesId) {
          const durationMin = Math.max(15, parseTimeToMinutes(draft.endTime) - parseTimeToMinutes(draft.startTime));
          const recurrencePayload = mapRecurrenceToApi(draft, timeZone);
          response = await fetch(`/api/calendar/series/${encodeURIComponent(activityEditor.sourceSeriesId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scope: "series",
              title: payload.title,
              location: payload.location,
              dtstart: payload.startAt,
              durationMin,
              rrule: recurrencePayload ? recurrencePayloadToRRule(recurrencePayload) : undefined,
              until: recurrencePayload?.until ?? null,
              timezone: recurrencePayload?.timezone ?? timeZone,
              checklist: payload.checklist,
              adaptations: payload.adaptationsEnabled
            })
          });
        } else {
          response = await fetch(`/api/calendar/activities/${encodeURIComponent(activityEditor.activityId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: payload.title,
              startAt: payload.startAt,
              endAt: payload.endAt,
              location: payload.location,
              checklist: payload.checklist,
              adaptationsEnabled: payload.adaptationsEnabled
            })
          });
        }
      } else {
        response = await fetch("/api/calendar/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            startAt: payload.startAt,
            endAt: payload.endAt,
            location: payload.location,
            checklist: payload.checklist,
            adaptationsEnabled: payload.adaptationsEnabled,
            recurrence: payload.recurrence
          })
        });
      }

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "We couldn't save this activity. Please try again.");
      }

      await fetchPersistedActivities();
      setSelected(parseDate(draft.date));
      setActivitySavingState("success");

      toast({
        title: activityEditor.mode === "edit" ? "Activity updated" : "Activity saved",
        description:
          activityEditor.mode === "edit"
            ? "Changes were saved and synced to your calendar."
            : "Activity saved and synced to your calendar."
      });

      if (options?.keepOpen) {
        setActivityEditor({
          mode: "create",
          draft: defaultDraft(draft.date)
        });
        setActivitySavingState("idle");
        return;
      }

      setActivityModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't save this activity. Please try again.";
      setActivityFormError(message);
      setActivitySavingState("error");
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setSavingActivity(false);
    }
  }

  async function deleteActivity(_dateISO: string, activity: CalendarActivity, scope: "single" | "series") {
    setSavingActivity(true);
    try {
      if (scope === "series" && activity.recurringSeriesId) {
        const response = await fetch(`/api/calendar/series/${encodeURIComponent(activity.recurringSeriesId)}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || "Unable to delete recurring activity series.");
        }
      } else {
        const response = await fetch(`/api/calendar/activities/${encodeURIComponent(activity.id)}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || "Unable to delete activity.");
        }
      }

      await fetchPersistedActivities();
      toast({
        title: "Activity deleted",
        description: "Calendar updates were saved."
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete activity.",
        variant: "destructive"
      });
    } finally {
      setSavingActivity(false);
    }
  }

  function buildDraftFromExistingActivity(activity: CalendarActivity, dateISO: string): ActivityDraft {
    return {
      ...defaultDraft(dateISO),
      title: `${activity.title} (Copy)`,
      startTime: toInputTime(activity.startTime),
      endTime: toInputTime(activity.endTime),
      location: activity.location,
      category: activity.category,
      type: activity.type,
      description: activity.description,
      suppliesNeeded: activity.suppliesNeeded.join(", "),
      backupPlan: activity.backupAlternative,
      internalNotes: activity.internalNotes,
      colorTone: COLOR_TONES.find((tone) => activity.tags.includes(`tone:${tone.toLowerCase()}`)) ?? "Teal",
      isRecurring: false,
      recurrenceType: "WEEKLY",
      recurrenceRepeatOn: [parseDate(dateISO).getDay()],
      recurrenceEndType: "NEVER",
      recurrenceEndDate: "",
      recurrenceCount: 10,
      recurrenceCustomInterval: 1,
      recurrenceExclusions: []
    };
  }

  async function duplicateActivity(dateISO: string, activity: CalendarActivity) {
    const duplicateDraft = buildDraftFromExistingActivity(activity, dateISO);
    const payload = buildPersistencePayloadFromDraft(duplicateDraft, timeZone);
    if (!payload) return;

    try {
      const response = await fetch("/api/calendar/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          startAt: payload.startAt,
          endAt: payload.endAt,
          location: payload.location,
          checklist: payload.checklist,
          adaptationsEnabled: payload.adaptationsEnabled
        })
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "Unable to duplicate activity.");
      }
      await fetchPersistedActivities();
      toast({
        title: "Activity duplicated",
        description: "The copied activity was saved."
      });
    } catch (error) {
      toast({
        title: "Duplicate failed",
        description: error instanceof Error ? error.message : "Unable to duplicate activity.",
        variant: "destructive"
      });
    }
  }

  async function copyDayPlan(sourceDateISO: string, targetDateISO: string) {
    if (!targetDateISO || targetDateISO === sourceDateISO) return;

    const sourceDay = dayLookup.get(sourceDateISO) ?? createEmptyDay(sourceDateISO);
    if (sourceDay.activities.length === 0) return;

    setSavingActivity(true);
    try {
      for (const activity of sourceDay.activities) {
        const draft = buildDraftFromExistingActivity(activity, targetDateISO);
        draft.title = activity.title;
        const payload = buildPersistencePayloadFromDraft(draft, timeZone);
        if (!payload) continue;
        const response = await fetch("/api/calendar/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            startAt: payload.startAt,
            endAt: payload.endAt,
            location: payload.location,
            checklist: payload.checklist,
            adaptationsEnabled: payload.adaptationsEnabled
          })
        });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error || "Unable to copy day plan.");
        }
      }

      await fetchPersistedActivities();
      setSelected(parseDate(targetDateISO));
      toast({
        title: "Day copied",
        description: "Activities were copied and saved."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Unable to copy day plan.",
        variant: "destructive"
      });
    } finally {
      setSavingActivity(false);
    }
  }

  function requestEditActivity(activity: CalendarActivity, dateISO: string) {
    if (activity.recurringSeriesId) {
      setSeriesAction({
        mode: "edit",
        activity,
        dateISO
      });
      return;
    }

    openEditActivity(activity, dateISO, "single");
  }

  function requestDeleteActivity(activity: CalendarActivity, dateISO: string) {
    if (activity.recurringSeriesId) {
      setSeriesAction({
        mode: "delete",
        activity,
        dateISO
      });
      return;
    }

    deleteActivity(dateISO, activity, "single");
  }

  const rangeLabel = formatRangeLabel(viewMode, anchorDate);

  return (
    <div className="space-y-4 pb-2">
      <CalendarPageHeader onAddActivity={() => openCreateActivity(selectedDate)} onAskActify={() => openAiPrompt("Help me build this month with balanced activities, backups, and 1:1 options.")} />

      <CalendarToolbar
        rangeLabel={rangeLabel}
        viewMode={viewMode}
        categoryFilter={categoryFilter}
        categoryOptions={categoryOptions}
        showHolidays={showHolidays}
        showBirthdays={showBirthdays}
        jumpDate={jumpDate}
        onShiftPrev={() => shiftRange("prev")}
        onShiftNext={() => shiftRange("next")}
        onToday={jumpToToday}
        onViewChange={(nextView) => setViewMode(nextView)}
        onJumpDateChange={(value) => {
          setJumpDate(value);
          if (!value) return;
          const parsed = parseDate(value);
          setSelected(parsed);
        }}
        onCategoryFilterChange={setCategoryFilter}
        onShowHolidaysChange={setShowHolidays}
        onShowBirthdaysChange={setShowBirthdays}
        onPrint={() => {
          if (typeof window !== "undefined") {
            window.print();
          }
        }}
      />

      {activitiesLoadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {activitiesLoadError}
          <button
            type="button"
            onClick={() => void fetchPersistedActivities()}
            className="ml-2 inline-flex rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
          >
            Retry
          </button>
        </div>
      ) : null}

      {activitiesLoading ? <p className="text-xs font-medium text-slate-500">Loading saved activities…</p> : null}

      {upcomingBirthdays.length > 0 ? (
        <UpcomingBirthdaysStrip
          birthdays={upcomingBirthdays}
          onAskActify={(residentName) =>
            openAiPrompt(`Give me simple birthday recognition ideas for ${residentName} in a skilled nursing setting.`)
          }
          onJumpToDate={(dateISO) => setSelected(parseDate(dateISO), true)}
        />
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-all duration-200">
        {viewMode === "month" ? (
          <MonthCalendarGrid
            days={monthDays}
            selectedDate={selectedDate}
            anchorDate={anchorDate}
            getDay={getDay}
            getVisibleActivities={getVisibleActivities}
            getHolidayBadges={getHolidayBadgesForDate}
            getBirthdayBadges={getBirthdayBadgesForDate}
            onOpenDay={(date) => setSelected(date, true)}
            onQuickAdd={openCreateActivity}
          />
        ) : null}

        {viewMode === "week" ? (
          <WeekCalendarView
            days={weekDays}
            selectedDate={selectedDate}
            getDay={getDay}
            getVisibleActivities={getVisibleActivities}
            getHolidayBadges={getHolidayBadgesForDate}
            getBirthdayBadges={getBirthdayBadgesForDate}
            onSelectDate={setSelected}
            onQuickAdd={openCreateActivity}
            onOpenEdit={requestEditActivity}
          />
        ) : null}

        {viewMode === "day" ? (
          <DayCalendarView
            date={selectedDate}
            day={getDay(selectedDate)}
            categoryFilter={categoryFilter}
            holidays={getHolidayBadgesForDate(selectedDate)}
            birthdays={getBirthdayBadgesForDate(selectedDate)}
            onAddActivity={openCreateActivity}
            onOpenEdit={requestEditActivity}
            onDelete={requestDeleteActivity}
            onDuplicate={duplicateActivity}
            onAskActify={() =>
              openAiPrompt(
                `Plan ${format(selectedDate, "EEEE, MMMM d")} with activity ideas and backups. Keep suggestions realistic for skilled nursing activities.`
              )
            }
          />
        ) : null}
      </div>

      <DayDetailDrawer
        open={dayDrawerDate !== null}
        date={dayDrawerDate ?? selectedDate}
        day={selectedDay}
        categoryFilter={categoryFilter}
        holidays={getHolidayBadgesForDate(dayDrawerDate ?? selectedDate)}
        birthdays={getBirthdayBadgesForDate(dayDrawerDate ?? selectedDate)}
        onClose={() => setDayDrawerDate(null)}
        onAddActivity={(date) => openCreateActivity(date)}
        onOpenEdit={requestEditActivity}
        onDelete={requestDeleteActivity}
        onDuplicate={duplicateActivity}
        onCopyDay={copyDayPlan}
        copyTargetDate={copyTargetDate}
        onCopyTargetDateChange={setCopyTargetDate}
        onAskActify={(prompt) => openAiPrompt(prompt)}
      />

      <ActivityModal
        open={activityModalOpen}
        editor={activityEditor}
        error={activityFormError}
        saving={savingActivity}
        saveState={activitySavingState}
        onClose={() => setActivityModalOpen(false)}
        onSave={() => saveActivity()}
        onSaveAndAddAnother={() => saveActivity({ keepOpen: true })}
        onChange={(patch) => {
          if (activityFormError) setActivityFormError(null);
          setActivityEditor((current) => ({
            ...current,
            draft: {
              ...current.draft,
              ...patch
            }
          }));
        }}
      />

      <RecurringSeriesActionModal
        state={seriesAction}
        onClose={() => setSeriesAction(null)}
        onEditSingle={(activity, dateISO) => {
          setSeriesAction(null);
          openEditActivity(activity, dateISO, "single");
        }}
        onEditSeries={(activity, dateISO) => {
          setSeriesAction(null);
          openEditActivity(activity, dateISO, "series");
        }}
        onDeleteSingle={(activity, dateISO) => {
          setSeriesAction(null);
          deleteActivity(dateISO, activity, "single");
        }}
        onDeleteSeries={(activity, dateISO) => {
          setSeriesAction(null);
          deleteActivity(dateISO, activity, "series");
        }}
      />

      <CalendarMiniActions
        onAction={(prompt) => openAiPrompt(prompt)}
        selectedDate={selectedDate}
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
        {(() => {
          const stats = daySummary(getDay(selectedDate), categoryFilter);
          if (stats.attended === 0) {
            return "No activities on the selected date yet. Add one manually or ask Actify to draft a quick plan.";
          }

          return `${format(selectedDate, "EEEE")} has ${stats.attended} scheduled activity${stats.attended === 1 ? "" : "ies"} (${stats.grouped} group, ${stats.oneToOne} 1:1).`;
        })()}
      </div>

    </div>
  );
}

function CalendarPageHeader({ onAddActivity, onAskActify }: { onAddActivity: () => void; onAskActify: () => void }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Calendar</h1>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">Plan activities, build schedules, and manage your month at a glance.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAskActify}
          className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask Actify
        </button>
        <button
          type="button"
          onClick={onAddActivity}
          className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Activity
        </button>
      </div>
    </header>
  );
}

function CalendarToolbar({
  rangeLabel,
  viewMode,
  categoryFilter,
  categoryOptions,
  showHolidays,
  showBirthdays,
  jumpDate,
  onShiftPrev,
  onShiftNext,
  onToday,
  onViewChange,
  onJumpDateChange,
  onCategoryFilterChange,
  onShowHolidaysChange,
  onShowBirthdaysChange,
  onPrint
}: {
  rangeLabel: string;
  viewMode: CalendarViewMode;
  categoryFilter: string;
  categoryOptions: string[];
  showHolidays: boolean;
  showBirthdays: boolean;
  jumpDate: string;
  onShiftPrev: () => void;
  onShiftNext: () => void;
  onToday: () => void;
  onViewChange: (viewMode: CalendarViewMode) => void;
  onJumpDateChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onShowHolidaysChange: (next: boolean) => void;
  onShowBirthdaysChange: (next: boolean) => void;
  onPrint: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CalendarDateNavigator onPrev={onShiftPrev} onNext={onShiftNext} />

        <p className="text-base font-semibold text-slate-900 sm:text-lg">{rangeLabel}</p>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarTodayButton onClick={onToday} />
          <CalendarViewSwitcher viewMode={viewMode} onChange={onViewChange} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Jump to date</span>
          <input
            type="date"
            value={jumpDate}
            onChange={(event) => onJumpDateChange(event.target.value)}
            className="bg-transparent text-xs font-medium text-slate-700 focus-visible:outline-none"
            aria-label="Jump to date"
          />
        </label>

        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Filter</span>
          <select
            value={categoryFilter}
            onChange={(event) => onCategoryFilterChange(event.target.value)}
            className="max-w-[11.5rem] truncate bg-transparent text-xs font-medium text-slate-700 focus-visible:outline-none"
            aria-label="Filter by category"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onShowHolidaysChange(!showHolidays)}
          aria-pressed={showHolidays}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200",
            showHolidays
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          Show Holidays
        </button>

        <button
          type="button"
          onClick={() => onShowBirthdaysChange(!showBirthdays)}
          aria-pressed={showBirthdays}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200",
            showBirthdays
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <Gift className="h-3.5 w-3.5" aria-hidden />
          Show Birthdays
        </button>

        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          Print
        </button>
      </div>
    </section>
  );
}

function CalendarDateNavigator({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
        aria-label="Go to previous date range"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
        aria-label="Go to next date range"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function CalendarTodayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
    >
      Today
    </button>
  );
}

function CalendarViewSwitcher({ viewMode, onChange }: { viewMode: CalendarViewMode; onChange: (viewMode: CalendarViewMode) => void }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
      {VIEW_OPTIONS.map((option) => {
        const active = option.key === viewMode;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200",
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MonthCalendarGrid({
  days,
  selectedDate,
  anchorDate,
  getDay,
  getVisibleActivities,
  getHolidayBadges,
  getBirthdayBadges,
  onOpenDay,
  onQuickAdd
}: {
  days: Date[];
  selectedDate: Date;
  anchorDate: Date;
  getDay: (date: Date) => CalendarDay;
  getVisibleActivities: (day: CalendarDay) => CalendarActivity[];
  getHolidayBadges: (date: Date) => CalendarHoliday[];
  getBirthdayBadges: (date: Date) => BirthdayBadgeItem[];
  onOpenDay: (date: Date) => void;
  onQuickAdd: (date: Date) => void;
}) {
  return (
    <div className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
        {DAY_HEADERS.map((dayLabel) => (
          <div key={dayLabel} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span className="hidden sm:inline">{dayLabel}</span>
            <span className="sm:hidden">{dayLabel.slice(0, 3)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date) => {
          const day = getDay(date);
          const activities = getVisibleActivities(day);
          const holidayBadges = getHolidayBadges(date);
          const birthdayBadges = getBirthdayBadges(date);

          return (
            <MonthCalendarDayCell
              key={toISODate(date)}
              date={date}
              activities={activities}
              holidayBadges={holidayBadges}
              birthdayBadges={birthdayBadges}
              outsideMonth={!isSameMonth(date, anchorDate)}
              isSelected={isSameDay(date, selectedDate)}
              onOpenDay={() => onOpenDay(date)}
              onQuickAdd={() => onQuickAdd(date)}
              isTodayDate={isToday(date)}
              isSpecialEvent={day.isSpecialEvent}
            />
          );
        })}
      </div>
    </div>
  );
}

function MonthCalendarDayCell({
  date,
  activities,
  holidayBadges,
  birthdayBadges,
  outsideMonth,
  isSelected,
  isTodayDate,
  isSpecialEvent,
  onOpenDay,
  onQuickAdd
}: {
  date: Date;
  activities: CalendarActivity[];
  holidayBadges: CalendarHoliday[];
  birthdayBadges: BirthdayBadgeItem[];
  outsideMonth: boolean;
  isSelected: boolean;
  isTodayDate: boolean;
  isSpecialEvent: boolean;
  onOpenDay: () => void;
  onQuickAdd: () => void;
}) {
  const preview = activities.slice(0, 3);
  const overflowCount = activities.length - preview.length;
  const holidayPreview = holidayBadges.slice(0, 1);
  const holidayOverflow = holidayBadges.length - holidayPreview.length;
  const birthdayPreview = birthdayBadges.slice(0, 1);
  const birthdayOverflow = birthdayBadges.length - birthdayPreview.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDay}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDay();
        }
      }}
      className={cn(
        "group min-h-[130px] border-b border-r border-slate-100 p-2.5 transition duration-200",
        outsideMonth ? "bg-slate-50/70" : "bg-white",
        isSelected && "bg-sky-50/75",
        !outsideMonth && "hover:bg-slate-50"
      )}
      aria-label={`View details for ${format(date, "MMMM d, yyyy")}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold",
              isTodayDate ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700",
              outsideMonth && "opacity-70"
            )}
          >
            {format(date, "d")}
          </span>
          {holidayPreview.map((holiday) => (
            <HolidayBadge key={holiday.id} holiday={holiday} compact />
          ))}
          {holidayOverflow > 0 ? <span className="text-[10px] font-semibold text-slate-500">+{holidayOverflow}</span> : null}
          {birthdayPreview.map((birthday) => (
            <BirthdayBadge key={birthday.key} birthday={birthday} compact />
          ))}
          {birthdayOverflow > 0 ? <span className="text-[10px] font-semibold text-rose-600">+{birthdayOverflow} birthdays</span> : null}
          {holidayBadges.length === 0 && isSpecialEvent ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Event</span> : null}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuickAdd();
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          aria-label={`Add activity on ${format(date, "MMMM d")}`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        {preview.map((activity) => (
          <div key={activity.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
            <p className="truncate text-[11px] font-medium text-slate-800">
              {activity.recurringSeriesId ? <Repeat className="mr-1 inline h-3 w-3 text-teal-600" aria-hidden /> : null}
              {activity.title}
            </p>
            <p className="text-[10px] text-slate-500">{activity.startTime}</p>
          </div>
        ))}

        {overflowCount > 0 ? <p className="text-[11px] font-medium text-slate-500">+{overflowCount} more</p> : null}
      </div>
    </div>
  );
}

function WeekCalendarView({
  days,
  selectedDate,
  getDay,
  getVisibleActivities,
  getHolidayBadges,
  getBirthdayBadges,
  onSelectDate,
  onQuickAdd,
  onOpenEdit
}: {
  days: Date[];
  selectedDate: Date;
  getDay: (date: Date) => CalendarDay;
  getVisibleActivities: (day: CalendarDay) => CalendarActivity[];
  getHolidayBadges: (date: Date) => CalendarHoliday[];
  getBirthdayBadges: (date: Date) => BirthdayBadgeItem[];
  onSelectDate: (date: Date, openDrawer?: boolean) => void;
  onQuickAdd: (date: Date) => void;
  onOpenEdit: (activity: CalendarActivity, dateISO: string) => void;
}) {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((date) => {
        const day = getDay(date);
        const activities = getVisibleActivities(day);
        const holidayBadges = getHolidayBadges(date);
        const birthdayBadges = getBirthdayBadges(date);

        return (
          <section
            key={toISODate(date)}
            className={cn(
              "flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:shadow-md",
              isSameDay(date, selectedDate) && "border-sky-300 ring-2 ring-sky-100"
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDate(date, true)}
              className="flex items-center justify-between rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{format(date, "EEE")}</p>
                <p className="text-sm font-semibold text-slate-900">{format(date, "MMM d")}</p>
                {holidayBadges.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {holidayBadges.slice(0, 2).map((holiday) => (
                      <HolidayBadge key={holiday.id} holiday={holiday} compact />
                    ))}
                  </div>
                ) : null}
                {birthdayBadges.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {birthdayBadges.slice(0, 1).map((birthday) => (
                      <BirthdayBadge key={birthday.key} birthday={birthday} compact />
                    ))}
                    {birthdayBadges.length > 1 ? <span className="text-[10px] font-semibold text-rose-600">+{birthdayBadges.length - 1}</span> : null}
                  </div>
                ) : null}
              </div>
              {isToday(date) ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">Today</span> : null}
            </button>

            <button
              type="button"
              onClick={() => onQuickAdd(date)}
              className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add
            </button>

            <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {activities.length === 0 ? (
                <CalendarEmptyState title="No activities" description="Add activity or ask Actify for this day." />
              ) : (
                activities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => onOpenEdit(activity, toISODate(date))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-left transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {activity.recurringSeriesId ? <Repeat className="mr-1 inline h-3.5 w-3.5 text-teal-600" aria-hidden /> : null}
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{activity.startTime} - {activity.endTime}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <CalendarCategoryBadge category={activity.category} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DayCalendarView({
  date,
  day,
  categoryFilter,
  holidays,
  birthdays,
  onAddActivity,
  onOpenEdit,
  onDelete,
  onDuplicate,
  onAskActify
}: {
  date: Date;
  day: CalendarDay;
  categoryFilter: string;
  holidays: CalendarHoliday[];
  birthdays: BirthdayBadgeItem[];
  onAddActivity: (date: Date) => void;
  onOpenEdit: (activity: CalendarActivity, dateISO: string) => void;
  onDelete: (activity: CalendarActivity, dateISO: string) => void;
  onDuplicate: (dateISO: string, activity: CalendarActivity) => void;
  onAskActify: () => void;
}) {
  const activities = day.activities
    .filter((activity) => categoryFilter === "All Categories" || activity.category === categoryFilter)
    .sort(activitySort);

  return (
    <section className="space-y-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Day View</p>
          <h2 className="text-lg font-semibold text-slate-900">{format(date, "EEEE, MMMM d, yyyy")}</h2>
          {holidays.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {holidays.map((holiday) => (
                <HolidayBadge key={holiday.id} holiday={holiday} />
              ))}
            </div>
          ) : null}
          {birthdays.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {birthdays.map((birthday) => (
                <BirthdayBadge key={birthday.key} birthday={birthday} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAskActify}
            className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
          >
            <WandSparkles className="h-3.5 w-3.5" aria-hidden />
            Ask Actify
          </button>
          <button
            type="button"
            onClick={() => onAddActivity(date)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add Activity
          </button>
        </div>
      </header>

      {activities.length === 0 ? (
        <CalendarEmptyState
          title="No activities scheduled yet"
          description="Add an activity or ask Actify for ideas to build this day."
          className="min-h-[240px]"
        />
      ) : (
        <div className="space-y-2.5">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onEdit={() => onOpenEdit(activity, day.date)}
              onDelete={() => onDelete(activity, day.date)}
              onDuplicate={() => onDuplicate(day.date, activity)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DayDetailDrawer({
  open,
  date,
  day,
  categoryFilter,
  holidays,
  birthdays,
  onClose,
  onAddActivity,
  onOpenEdit,
  onDelete,
  onDuplicate,
  onCopyDay,
  copyTargetDate,
  onCopyTargetDateChange,
  onAskActify
}: {
  open: boolean;
  date: Date;
  day: CalendarDay;
  categoryFilter: string;
  holidays: CalendarHoliday[];
  birthdays: BirthdayBadgeItem[];
  onClose: () => void;
  onAddActivity: (date: Date) => void;
  onOpenEdit: (activity: CalendarActivity, dateISO: string) => void;
  onDelete: (activity: CalendarActivity, dateISO: string) => void;
  onDuplicate: (dateISO: string, activity: CalendarActivity) => void;
  onCopyDay: (sourceDateISO: string, targetDateISO: string) => void;
  copyTargetDate: string;
  onCopyTargetDateChange: (value: string) => void;
  onAskActify: (prompt: string) => void;
}) {
  const activities = day.activities
    .filter((activity) => categoryFilter === "All Categories" || activity.category === categoryFilter)
    .sort(activitySort);

  const dayPrompt = `Suggest practical activity ideas for ${format(date, "EEEE, MMMM d")} with one backup option for each idea.`;
  const birthdayPrompt =
    birthdays.length === 1
      ? `Give me simple birthday recognition ideas for ${birthdays[0].residentName} in a skilled nursing facility.`
      : `Give me birthday recognition ideas for ${birthdays.length} residents with birthdays on ${format(date, "MMMM d")}. Keep it practical and low-prep.`;

  return (
    <DrawerShell open={open} title={format(date, "EEEE, MMMM d, yyyy")} onClose={onClose}>
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {isToday(date) ? <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">Today</span> : null}
            {holidays.map((holiday) => (
              <HolidayBadge key={holiday.id} holiday={holiday} />
            ))}
            {birthdays.map((birthday) => (
              <BirthdayBadge key={birthday.key} birthday={birthday} />
            ))}
            {day.isSpecialEvent ? <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">Special Event</span> : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAddActivity(date)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <CalendarPlus2 className="h-3.5 w-3.5" aria-hidden />
              Add Activity
            </button>
            <button
              type="button"
              onClick={() => onAskActify(dayPrompt)}
              className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Ask Actify
            </button>
          </div>
        </section>

        {birthdays.length > 0 ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Birthdays</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
              {birthdays.map((birthday) => (
                <li key={`drawer-birthday-${birthday.key}`} className="rounded-xl border border-rose-200 bg-white px-2.5 py-2">
                  {birthday.label}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAddActivity(date)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add Birthday Activity
              </button>
              <button
                type="button"
                onClick={() => onAskActify(birthdayPrompt)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Ask Actify for Birthday Ideas
              </button>
              <button
                type="button"
                onClick={() =>
                  onAskActify(
                    birthdays.length === 1
                      ? `Create a quick birthday reminder plan for ${birthdays[0].residentName} on ${format(date, "MMMM d")} including one 1:1 idea and one group option.`
                      : `Create birthday reminder ideas for ${birthdays.length} residents on ${format(date, "MMMM d")} with low-prep options.`
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                <CalendarPlus2 className="h-3.5 w-3.5" aria-hidden />
                Create Birthday Reminder
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Scheduled Activities</h3>

          <div className="mt-3 space-y-2">
            {activities.length === 0 ? (
              <CalendarEmptyState title="No activities scheduled yet" description="Add activity or ask Actify to fill this date." />
            ) : (
              activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onEdit={() => onOpenEdit(activity, day.date)}
                  onDelete={() => onDelete(activity, day.date)}
                  onDuplicate={() => onDuplicate(day.date, activity)}
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Copy Day Plan</h3>
          <p className="mt-1 text-xs text-slate-600">Copy this day’s activity lineup to another date.</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={copyTargetDate}
              onChange={(event) => onCopyTargetDateChange(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            />
            <button
              type="button"
              onClick={() => onCopyDay(day.date, copyTargetDate)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy to Date
            </button>
          </div>
        </section>
      </div>
    </DrawerShell>
  );
}

function ActivityModal({
  open,
  editor,
  error,
  saving,
  saveState,
  onClose,
  onSave,
  onSaveAndAddAnother,
  onChange
}: {
  open: boolean;
  editor: ActivityEditorState;
  error: string | null;
  saving: boolean;
  saveState: "idle" | "saving" | "success" | "error";
  onClose: () => void;
  onSave: () => void;
  onSaveAndAddAnother: () => void;
  onChange: (patch: Partial<ActivityDraft>) => void;
}) {
  const draft = editor.draft;
  const [newExclusionDate, setNewExclusionDate] = useState("");

  return (
    <ModalShell open={open} title={editor.mode === "edit" ? "Edit Activity" : "Add Activity"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Activity Title" htmlFor="activity-title">
          <input
            id="activity-title"
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Morning Bingo"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date" htmlFor="activity-date">
            <input
              id="activity-date"
              type="date"
              value={draft.date}
              onChange={(event) => onChange({ date: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            />
          </Field>

          <Field label="Start" htmlFor="activity-start">
            <input
              id="activity-start"
              type="time"
              value={draft.startTime}
              onChange={(event) => onChange({ startTime: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            />
          </Field>

          <Field label="End" htmlFor="activity-end">
            <input
              id="activity-end"
              type="time"
              value={draft.endTime}
              onChange={(event) => onChange({ endTime: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Location" htmlFor="activity-location">
            <input
              id="activity-location"
              value={draft.location}
              onChange={(event) => onChange({ location: event.target.value })}
              placeholder="Activity Room"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            />
          </Field>

          <Field label="Category" htmlFor="activity-category">
            <select
              id="activity-category"
              value={draft.category}
              onChange={(event) => onChange({ category: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              {categorySelectOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type" htmlFor="activity-type">
            <select
              id="activity-type"
              value={draft.type}
              onChange={(event) => onChange({ type: event.target.value as CalendarActivityType })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Color Label" htmlFor="activity-color-tone">
            <select
              id="activity-color-tone"
              value={draft.colorTone}
              onChange={(event) => onChange({ colorTone: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              {COLOR_TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recurring</p>
              <p className="text-xs text-slate-600">Make this activity repeat automatically on future dates.</p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ isRecurring: !draft.isRecurring })}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200",
                draft.isRecurring
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
              aria-pressed={draft.isRecurring}
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden />
              {draft.isRecurring ? "Recurring Enabled" : "Repeat this activity"}
            </button>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              draft.isRecurring ? "mt-3 max-h-[900px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="space-y-3 rounded-xl border border-teal-100 bg-white p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Repeat Pattern" htmlFor="recurrence-type">
                  <select
                    id="recurrence-type"
                    value={draft.recurrenceType}
                    onChange={(event) => {
                      const nextType = event.target.value as CalendarRecurrenceType;
                      const defaults =
                        nextType === "WEEKDAYS"
                          ? [1, 2, 3, 4, 5]
                          : nextType === "WEEKLY" || nextType === "BIWEEKLY" || nextType === "CUSTOM"
                            ? draft.recurrenceRepeatOn.length
                              ? draft.recurrenceRepeatOn
                              : [parseDate(draft.date).getDay()]
                            : [];
                      onChange({
                        recurrenceType: nextType,
                        recurrenceRepeatOn: defaults
                      });
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKDAYS">Every Weekday</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Biweekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </Field>

                {draft.recurrenceType === "CUSTOM" ? (
                  <Field label="Custom Interval (weeks)" htmlFor="recurrence-custom-interval">
                    <input
                      id="recurrence-custom-interval"
                      type="number"
                      min={1}
                      value={draft.recurrenceCustomInterval}
                      onChange={(event) =>
                        onChange({
                          recurrenceCustomInterval: Math.max(1, Number(event.target.value || 1))
                        })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                    />
                  </Field>
                ) : <div />}
              </div>

              {(draft.recurrenceType === "WEEKLY" ||
                draft.recurrenceType === "BIWEEKLY" ||
                draft.recurrenceType === "CUSTOM") && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Repeat On</p>
                  <div className="flex flex-wrap gap-2">
                    {REPEAT_DAY_OPTIONS.map((day) => {
                      const selected = draft.recurrenceRepeatOn.includes(day.value);
                      return (
                        <button
                          key={`repeat-on-${day.value}`}
                          type="button"
                          onClick={() =>
                            onChange({
                              recurrenceRepeatOn: selected
                                ? draft.recurrenceRepeatOn.filter((entry) => entry !== day.value)
                                : [...draft.recurrenceRepeatOn, day.value].sort((a, b) => a - b)
                            })
                          }
                          className={cn(
                            "inline-flex min-w-10 items-center justify-center rounded-full border px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200",
                            selected
                              ? "border-teal-200 bg-teal-50 text-teal-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          )}
                          aria-pressed={selected}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {draft.recurrenceType === "WEEKDAYS" ? (
                <p className="text-xs text-slate-600">Repeats Monday through Friday.</p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Repeat Ends" htmlFor="recurrence-end-type-alt">
                  <select
                    id="recurrence-end-type-alt"
                    value={draft.recurrenceEndType}
                    onChange={(event) => onChange({ recurrenceEndType: event.target.value as CalendarRecurrenceEndType })}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                  >
                    <option value="NEVER">Never</option>
                    <option value="ON_DATE">On Date</option>
                    <option value="AFTER_OCCURRENCES">After Number of Occurrences</option>
                  </select>
                </Field>

                {draft.recurrenceEndType === "ON_DATE" ? (
                  <Field label="End Date" htmlFor="recurrence-end-date">
                    <input
                      id="recurrence-end-date"
                      type="date"
                      value={draft.recurrenceEndDate}
                      onChange={(event) => onChange({ recurrenceEndDate: event.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                    />
                  </Field>
                ) : null}

                {draft.recurrenceEndType === "AFTER_OCCURRENCES" ? (
                  <Field label="Occurrences" htmlFor="recurrence-count">
                    <input
                      id="recurrence-count"
                      type="number"
                      min={1}
                      value={draft.recurrenceCount}
                      onChange={(event) => onChange({ recurrenceCount: Math.max(1, Number(event.target.value || 1)) })}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                    />
                  </Field>
                ) : null}
              </div>

              <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Advanced Exclusions
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={newExclusionDate}
                      onChange={(event) => setNewExclusionDate(event.target.value)}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newExclusionDate) return;
                        if (draft.recurrenceExclusions.includes(newExclusionDate)) return;
                        onChange({
                          recurrenceExclusions: [...draft.recurrenceExclusions, newExclusionDate].sort((a, b) =>
                            a.localeCompare(b)
                          )
                        });
                        setNewExclusionDate("");
                      }}
                      className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                    >
                      Exclude Date
                    </button>
                  </div>

                  {draft.recurrenceExclusions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {draft.recurrenceExclusions.map((date) => (
                        <button
                          key={`excluded-${date}`}
                          type="button"
                          onClick={() =>
                            onChange({
                              recurrenceExclusions: draft.recurrenceExclusions.filter((item) => item !== date)
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                          title="Remove exclusion"
                        >
                          {date}
                          <span aria-hidden>×</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No exclusion dates added.</p>
                  )}
                </div>
              </details>
            </div>
          </div>
        </section>

        <Field label="Short Description" htmlFor="activity-description">
          <textarea
            id="activity-description"
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={3}
            placeholder="Brief resident-facing activity summary"
            className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          />
        </Field>

        <Field label="Supplies Needed" htmlFor="activity-supplies">
          <input
            id="activity-supplies"
            value={draft.suppliesNeeded}
            onChange={(event) => onChange({ suppliesNeeded: event.target.value })}
            placeholder="Cards, markers, speaker"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          />
        </Field>

        <Field label="Backup Plan" htmlFor="activity-backup">
          <input
            id="activity-backup"
            value={draft.backupPlan}
            onChange={(event) => onChange({ backupPlan: event.target.value })}
            placeholder="Quiet conversation circle"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          />
        </Field>

        <Field label="Internal Notes" htmlFor="activity-notes">
          <textarea
            id="activity-notes"
            value={draft.internalNotes}
            onChange={(event) => onChange({ internalNotes: event.target.value })}
            rows={2}
            placeholder="Staff setup details"
            className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          />
        </Field>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        {editor.mode === "create" ? (
          <button
            type="button"
            onClick={onSaveAndAddAnother}
            disabled={saving}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : draft.isRecurring ? "Save Series & Add Another" : "Save and Add Another"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Saving activity…" : editor.mode === "edit" ? "Save Changes" : draft.isRecurring ? "Save Activity Series" : "Save Activity"}
        </button>
      </div>
      {saveState === "success" ? <p className="mt-2 text-xs font-semibold text-emerald-600">Activity saved.</p> : null}
      {saveState === "saving" ? <p className="mt-2 text-xs font-semibold text-slate-500">Saving activity…</p> : null}
    </ModalShell>
  );
}

function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onDuplicate
}: {
  activity: CalendarActivity;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-900">{activity.title}</h4>
          <p className="text-xs text-slate-600">{activity.startTime} - {activity.endTime}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <CalendarCategoryBadge category={activity.category} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{activity.type}</span>
            {activity.recurringSeriesId ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                <Repeat className="h-3 w-3" aria-hidden />
                Recurring
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconActionButton label="Edit activity" icon={<Edit3 className="h-3.5 w-3.5" />} onClick={onEdit} />
          <IconActionButton label="Duplicate activity" icon={<Copy className="h-3.5 w-3.5" />} onClick={onDuplicate} />
          <IconActionButton label="Delete activity" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} destructive />
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-700">{activity.description}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {activity.location}
        </span>
        {activity.backupAlternative ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Backup: {activity.backupAlternative}</span> : null}
      </div>
    </article>
  );
}

function RecurringSeriesActionModal({
  state,
  onClose,
  onEditSingle,
  onEditSeries,
  onDeleteSingle,
  onDeleteSeries
}: {
  state: {
    mode: "edit" | "delete";
    activity: CalendarActivity;
    dateISO: string;
  } | null;
  onClose: () => void;
  onEditSingle: (activity: CalendarActivity, dateISO: string) => void;
  onEditSeries: (activity: CalendarActivity, dateISO: string) => void;
  onDeleteSingle: (activity: CalendarActivity, dateISO: string) => void;
  onDeleteSeries: (activity: CalendarActivity, dateISO: string) => void;
}) {
  const open = Boolean(state);
  if (!state) {
    return (
      <ModalShell open={open} title="Recurring Activity" onClose={onClose}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">No recurring action selected.</p>
        </div>
      </ModalShell>
    );
  }

  const isEdit = state.mode === "edit";
  const title = isEdit ? "Edit Recurring Activity" : "Delete Recurring Activity";

  return (
    <ModalShell open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          This activity is part of a recurring series. Choose whether to apply changes only to this activity or the
          full series.
        </p>

        <div className="grid gap-2">
          {isEdit ? (
            <>
              <button
                type="button"
                onClick={() => onEditSingle(state.activity, state.dateISO)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                Edit only this activity
              </button>
              <button
                type="button"
                onClick={() => onEditSeries(state.activity, state.dateISO)}
                className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-left text-sm font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
              >
                Edit entire series
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onDeleteSingle(state.activity, state.dateISO)}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                Delete only this activity
              </button>
              <button
                type="button"
                onClick={() => onDeleteSeries(state.activity, state.dateISO)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                Delete entire series
              </button>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function CalendarEmptyState({
  title,
  description,
  className
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center",
        className
      )}
    >
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </div>
  );
}

function CalendarCategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeTone(category))}>{category}</span>
  );
}

function HolidayBadge({ holiday, compact = false }: { holiday: CalendarHoliday; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-semibold",
        compact ? "max-w-[7rem] truncate text-[10px]" : "text-[11px]",
        holidayTone(holiday)
      )}
      title={holiday.name}
    >
      {holiday.name}
    </span>
  );
}

function BirthdayBadge({ birthday, compact = false }: { birthday: BirthdayBadgeItem; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700",
        compact ? "max-w-[9rem] truncate text-[10px]" : "text-[11px]"
      )}
      title={birthday.label}
    >
      <Gift className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{compact ? birthday.shortLabel : birthday.label}</span>
    </span>
  );
}

function UpcomingBirthdaysStrip({
  birthdays,
  onAskActify,
  onJumpToDate
}: {
  birthdays: BirthdayBadgeItem[];
  onAskActify: (residentName: string) => void;
  onJumpToDate: (dateISO: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Upcoming Birthdays</p>
          <p className="mt-0.5 text-xs text-rose-700/90">Use this week’s birthdays for quick recognition planning.</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {birthdays.map((birthday) => (
          <button
            key={`upcoming-${birthday.key}`}
            type="button"
            onClick={() => onJumpToDate(birthday.dateForDisplay)}
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
            title={`Open ${birthday.dateLabel}`}
          >
            <Gift className="h-3 w-3" aria-hidden />
            <span>{birthday.shortLabel}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {birthdays.slice(0, 2).map((birthday) => (
          <button
            key={`upcoming-ai-${birthday.key}`}
            type="button"
            onClick={() => onAskActify(birthday.residentName)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Plan for {birthday.residentName}
          </button>
        ))}
      </div>
    </section>
  );
}

function badgeTone(category: string) {
  if (category.includes("1:1") || category.includes("Room")) {
    return "border border-violet-200 bg-violet-50 text-violet-700";
  }

  if (category.includes("Holiday") || category.includes("Social")) {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  if (category.includes("Music") || category.includes("Entertainment")) {
    return "border border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (category.includes("Sensory") || category.includes("Spiritual")) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border border-sky-200 bg-sky-50 text-sky-700";
}

function holidayTone(holiday: CalendarHoliday) {
  if (holiday.type === "observed") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (holiday.category === "federal") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (holiday.category === "religious") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (holiday.category === "skilled-nursing") {
    return "border-teal-200 bg-teal-50 text-teal-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function CalendarMiniActions({ onAction, selectedDate }: { onAction: (prompt: string) => void; selectedDate: Date }) {
  const options = [
    {
      id: "day-ideas",
      label: "Fill this date",
      prompt: `Fill ${format(selectedDate, "EEEE, MMMM d")} with low-prep activity ideas and one backup option per activity.`
    },
    {
      id: "week-backup",
      label: "Backup ideas",
      prompt: "Suggest backup activities for this week in case groups run low attendance."
    },
    {
      id: "theme-week",
      label: "Themed week",
      prompt: "Build a themed activity week with day-by-day ideas and backups."
    },
    {
      id: "holiday-plan",
      label: "Holiday plan",
      prompt: "Give me a holiday activity plan with group, 1:1, and bed-bound alternatives."
    }
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">AI Planning Shortcuts</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onAction(option.prompt)}
            className="rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-2 text-left text-xs font-semibold text-teal-800 transition hover:-translate-y-0.5 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function IconActionButton({
  label,
  icon,
  onClick,
  destructive
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2",
        destructive
          ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-200"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200"
      )}
    >
      {icon}
    </button>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function categorySelectOptions() {
  return CATEGORY_OPTIONS.filter((option) => option !== "All Categories");
}
