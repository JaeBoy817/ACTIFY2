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
  Sparkles,
  Trash2,
  WandSparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { DrawerShell, ModalShell } from "@/components/workspace/shared";
import { SAMPLE_CALENDARS } from "@/lib/calendar-creation/mockData";
import type { CalendarActivity, CalendarActivityType, CalendarDay, CalendarMonth } from "@/lib/calendar-creation/types";
import { buildHolidayLookup, getHolidayBadgeForDate } from "@/lib/calendar/getHolidayBadgeForDate";
import { getHolidaysForYear } from "@/lib/calendar/getHolidaysForYear";
import type { CalendarHoliday } from "@/lib/calendar/holidays";
import {
  buildResidentBirthdayLookup,
  getBirthdayBadgeForDate,
  type ResidentBirthdaySource
} from "@/lib/calendar/resident-birthdays";
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

function uniqueId(prefix: string) {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function toDisplayTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${String(minute).padStart(2, "0")} ${meridiem}`;
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
    colorTone: "Teal"
  };
}

export function CalendarCreationWorkspace() {
  const router = useRouter();
  const today = useMemo(() => startOfDay(new Date()), []);

  const [calendars, setCalendars] = useState<CalendarMonth[]>(SAMPLE_CALENDARS);
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
    setActivityEditor({
      mode: "create",
      draft: defaultDraft(toISODate(date))
    });
    setActivityModalOpen(true);
  }

  function openEditActivity(activity: CalendarActivity, dateISO: string) {
    setActivityEditor({
      mode: "edit",
      activityId: activity.id,
      originalDate: dateISO,
      draft: {
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
        colorTone: COLOR_TONES.find((tone) => activity.tags.includes(`tone:${tone.toLowerCase()}`)) ?? "Teal"
      }
    });
    setActivityModalOpen(true);
  }

  function saveActivity() {
    if (!activityEditor.draft.title.trim()) {
      return;
    }

    const draft = activityEditor.draft;
    const activityId = activityEditor.mode === "edit" ? activityEditor.activityId : uniqueId("activity");

    const nextActivity: CalendarActivity = {
      id: activityId,
      title: draft.title.trim(),
      startTime: toDisplayTime(draft.startTime),
      endTime: toDisplayTime(draft.endTime),
      location: draft.location.trim() || "Activity Room",
      category: draft.category,
      type: draft.type,
      description: draft.description.trim() || "Resident-friendly activity block.",
      residentFacingDescription: draft.description.trim() || "Resident-friendly activity block.",
      suppliesNeeded: draft.suppliesNeeded
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      internalNotes: draft.internalNotes.trim(),
      prepLevel: "Low",
      indoorOutdoor: "Indoor",
      backupAlternative: draft.backupPlan.trim(),
      reusableTemplate: false,
      repeatRule: null,
      tags: [
        draft.type,
        `tone:${draft.colorTone.toLowerCase()}`,
        ...(draft.category ? [draft.category] : [])
      ],
      aiGenerated: false,
      createdFromTemplate: false
    };

    setCalendars((current) => {
      let next = [...current];

      if (activityEditor.mode === "edit") {
        next = upsertDay(next, activityEditor.originalDate, (day) =>
          refreshDayFlags({
            ...day,
            activities: day.activities.filter((activity) => activity.id !== activityEditor.activityId)
          })
        );
      }

      next = upsertDay(next, draft.date, (day) => {
        const withoutPreviousVersion = day.activities.filter((activity) => activity.id !== activityId);
        return refreshDayFlags({
          ...day,
          activities: [...withoutPreviousVersion, nextActivity].sort(activitySort)
        });
      });

      return next;
    });

    const date = parseDate(draft.date);
    setSelected(date);
    setActivityModalOpen(false);
  }

  function deleteActivity(dateISO: string, activityId: string) {
    setCalendars((current) =>
      upsertDay(current, dateISO, (day) =>
        refreshDayFlags({
          ...day,
          activities: day.activities.filter((activity) => activity.id !== activityId)
        })
      )
    );
  }

  function duplicateActivity(dateISO: string, activity: CalendarActivity) {
    const duplicate: CalendarActivity = {
      ...activity,
      id: uniqueId("activity"),
      title: `${activity.title} (Copy)`
    };

    setCalendars((current) =>
      upsertDay(current, dateISO, (day) =>
        refreshDayFlags({
          ...day,
          activities: [...day.activities, duplicate].sort(activitySort)
        })
      )
    );
  }

  function copyDayPlan(sourceDateISO: string, targetDateISO: string) {
    if (!targetDateISO || targetDateISO === sourceDateISO) return;

    const sourceDay = dayLookup.get(sourceDateISO) ?? createEmptyDay(sourceDateISO);
    if (sourceDay.activities.length === 0) return;

    const copies = sourceDay.activities.map((activity) => ({
      ...activity,
      id: uniqueId("activity")
    }));

    setCalendars((current) =>
      upsertDay(current, targetDateISO, (day) =>
        refreshDayFlags({
          ...day,
          activities: [...day.activities, ...copies].sort(activitySort)
        })
      )
    );

    setSelected(parseDate(targetDateISO));
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
            onOpenEdit={openEditActivity}
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
            onOpenEdit={openEditActivity}
            onDelete={deleteActivity}
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
        onOpenEdit={openEditActivity}
        onDelete={deleteActivity}
        onDuplicate={duplicateActivity}
        onCopyDay={copyDayPlan}
        copyTargetDate={copyTargetDate}
        onCopyTargetDateChange={setCopyTargetDate}
        onAskActify={(prompt) => openAiPrompt(prompt)}
      />

      <ActivityModal
        open={activityModalOpen}
        editor={activityEditor}
        onClose={() => setActivityModalOpen(false)}
        onSave={saveActivity}
        onChange={(patch) => {
          setActivityEditor((current) => ({
            ...current,
            draft: {
              ...current.draft,
              ...patch
            }
          }));
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
            <p className="truncate text-[11px] font-medium text-slate-800">{activity.title}</p>
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
                    <p className="truncate text-sm font-semibold text-slate-900">{activity.title}</p>
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
  onDelete: (dateISO: string, activityId: string) => void;
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
              onDelete={() => onDelete(day.date, activity.id)}
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
  onDelete: (dateISO: string, activityId: string) => void;
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
                  onDelete={() => onDelete(day.date, activity.id)}
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
  onClose,
  onSave,
  onChange
}: {
  open: boolean;
  editor: ActivityEditorState;
  onClose: () => void;
  onSave: () => void;
  onChange: (patch: Partial<ActivityDraft>) => void;
}) {
  const draft = editor.draft;

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
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {editor.mode === "edit" ? "Save Changes" : "Save Activity"}
        </button>
      </div>
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
