"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, endOfDay, format, parseISO, startOfDay, startOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FileDown,
  GripVertical,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";

import { CalendarPdfPreviewDialog } from "@/components/app/calendar-pdf-preview-dialog";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatInTimeZone, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { cachedFetchJson, invalidateClientCache } from "@/lib/perf/client-cache";

type CalendarTemplateLite = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  defaultChecklist: unknown;
  adaptations: unknown;
};

type CalendarEventLite = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  seriesId: string | null;
  occurrenceKey: string | null;
  isOverride: boolean;
  conflictOverride: boolean;
  checklist: unknown;
  adaptationsEnabled: unknown;
};

type RepeatMode = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
type RepeatEndMode = "NEVER" | "ON_DATE" | "AFTER_COUNT";

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 36;
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 21;
const DEFAULT_EVENT_DURATION_MIN = 60;
const WEEKDAY_TOKENS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

type ConflictState = {
  endpoint: string;
  method: "POST" | "PATCH";
  payload: Record<string, unknown>;
  conflicts: Array<{
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    location: string;
  }>;
  outsideBusinessHours: boolean;
  message: string;
};

type EventEditState = {
  id: string;
  title: string;
  location: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  scope: "instance" | "series";
  seriesId: string | null;
  occurrenceKey: string | null;
};

type ScheduleState = {
  mode: "manual" | "template" | "duplicate";
  templateId: string | null;
  title: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  location: string;
  checklistText: string;
  bedBound: boolean;
  dementiaFriendly: boolean;
  lowVisionHearing: boolean;
  oneToOneMini: boolean;
  repeat: RepeatMode;
  repeatEndMode: RepeatEndMode;
  repeatUntilDate: string;
  repeatCount: number;
  weeklyByDay: string[];
};

const emptyScheduleState: ScheduleState = {
  mode: "manual",
  templateId: null,
  title: "",
  dateKey: "",
  startTime: "10:00",
  endTime: "11:00",
  location: "Activity Room",
  checklistText: "",
  bedBound: false,
  dementiaFriendly: false,
  lowVisionHearing: false,
  oneToOneMini: false,
  repeat: "NONE",
  repeatEndMode: "NEVER",
  repeatUntilDate: "",
  repeatCount: 4,
  weeklyByDay: []
};

function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour * 60 + minute;
}

function minutesToTime(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, value));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function minutesToStandardLabel(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, value));
  const hour24 = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  if (minute === 0) {
    return `${hour12} ${period}`;
  }
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function asChecklistText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        return String((item as { text: unknown }).text);
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function hasChecklistItems(value: unknown) {
  if (!Array.isArray(value)) return false;
  return value.length > 0;
}

function hasAdaptationsEnabled(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const safe = value as Record<string, unknown>;
  return Boolean(safe.bedBound || safe.dementiaFriendly || safe.lowVisionHearing || safe.oneToOneMini);
}

function asAdaptationToggles(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      bedBound: false,
      dementiaFriendly: false,
      lowVisionHearing: false,
      oneToOneMini: false
    };
  }
  const safe = value as Record<string, unknown>;
  return {
    bedBound: Boolean(safe.bedBound),
    dementiaFriendly: Boolean(safe.dementiaFriendly),
    lowVisionHearing: Boolean(safe.lowVisionHearing),
    oneToOneMini: Boolean(safe.oneToOneMini)
  };
}

function dayTokenForDateKey(dateKey: string, timeZone: string) {
  const dayStart = zonedDateStringToUtcStart(dateKey, timeZone);
  if (!dayStart) return "MO";
  const weekday = formatInTimeZone(dayStart, timeZone, { weekday: "short" }).slice(0, 2).toUpperCase();
  return WEEKDAY_TOKENS.includes(weekday as (typeof WEEKDAY_TOKENS)[number])
    ? weekday
    : "MO";
}

function toUtcFromDateAndTime(dateKey: string, hhmm: string, timeZone: string) {
  const dayStart = zonedDateStringToUtcStart(dateKey, timeZone);
  if (!dayStart) return null;
  const minutes = parseTimeToMinutes(hhmm);
  return new Date(dayStart.getTime() + minutes * 60_000);
}

function formatEventTimeRange(startAtIso: string, endAtIso: string, timeZone: string) {
  const startAt = new Date(startAtIso);
  const endAt = new Date(endAtIso);
  return `${formatInTimeZone(startAt, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  })} - ${formatInTimeZone(endAt, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function createWeekSlots() {
  const slots: Array<{ minute: number; label: string }> = [];
  const startMin = GRID_START_HOUR * 60;
  const endMin = GRID_END_HOUR * 60;
  for (let minute = startMin; minute <= endMin; minute += SLOT_MINUTES) {
    slots.push({
      minute,
      label: minutesToStandardLabel(minute)
    });
  }
  return slots;
}

function parseApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof (payload as { error: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  return fallback;
}

export function CalendarWeekWorkspace({
  templates,
  initialWeekStart,
  timeZone
}: {
  templates: CalendarTemplateLite[];
  initialWeekStart: string;
  timeZone: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const parsed = parseISO(initialWeekStart);
    const normalized = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return startOfWeek(normalized, { weekStartsOn: 1 });
  });
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEventLite[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [debouncedTemplateSearch, setDebouncedTemplateSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [keyboardArmedTemplateId, setKeyboardArmedTemplateId] = useState<string | null>(null);
  const [draggingTemplateId, setDraggingTemplateId] = useState<string | null>(null);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleState, setScheduleState] = useState<ScheduleState>(emptyScheduleState);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EventEditState | null>(null);
  const [mobileDockOpen, setMobileDockOpen] = useState(false);
  const [activeMobileDayKey, setActiveMobileDayKey] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedTemplateSearch(templateSearch.trim());
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [templateSearch]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  useEffect(() => {
    const todayKey = zonedDateKey(new Date(), timeZone);
    const weekContainsActiveDay = activeMobileDayKey
      ? weekDays.some((day) => zonedDateKey(day, timeZone) === activeMobileDayKey)
      : false;
    if (weekContainsActiveDay) return;

    const fallback = weekDays.some((day) => zonedDateKey(day, timeZone) === todayKey)
      ? todayKey
      : zonedDateKey(weekDays[0], timeZone);
    setActiveMobileDayKey(fallback);
  }, [activeMobileDayKey, timeZone, weekDays]);

  const weekStartKey = useMemo(() => zonedDateKey(weekDays[0], timeZone), [timeZone, weekDays]);
  const monthKey = useMemo(() => format(weekDays[0], "yyyy-MM-01"), [weekDays]);
  const todayKey = useMemo(() => zonedDateKey(new Date(), timeZone), [timeZone]);
  const weekLabel = useMemo(
    () => `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}`,
    [weekDays]
  );
  const slots = useMemo(() => createWeekSlots(), []);
  const totalGridHeight = slots.length * SLOT_HEIGHT;

  const loadWeekEvents = useCallback(
    async (
      targetWeekStart: Date,
      options?: {
        signal?: AbortSignal;
        silent?: boolean;
        force?: boolean;
      }
    ) => {
      const rangeStart = startOfDay(targetWeekStart);
      const rangeEnd = endOfDay(addDays(rangeStart, 6));
      const silent = Boolean(options?.silent);
      const rangeUrl = `/api/calendar/range?start=${encodeURIComponent(rangeStart.toISOString())}&end=${encodeURIComponent(rangeEnd.toISOString())}&view=week`;
      const cacheKey = `calendar-range:${rangeStart.toISOString()}:${rangeEnd.toISOString()}`;

      if (!silent) {
        setLoading(true);
      }
      try {
        const payload = await cachedFetchJson<{ activities?: CalendarEventLite[] }>(cacheKey, rangeUrl, {
          signal: options?.signal,
          ttlMs: 20_000,
          force: options?.force
        });
        if (options?.signal?.aborted) return;
        setEvents(Array.isArray(payload.activities) ? payload.activities : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        toast({
          title: "Unable to load week schedule",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      } finally {
        if (!silent && !options?.signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadWeekEvents(weekStart, { signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [loadWeekEvents, weekStart]);

  const templatesById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    const query = debouncedTemplateSearch.toLowerCase();
    return templates.filter((template) => {
      if (categoryFilter !== "ALL" && template.category !== categoryFilter) return false;
      if (difficultyFilter !== "ALL" && template.difficulty !== difficultyFilter) return false;
      if (!query) return true;
      return (
        template.title.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.difficulty.toLowerCase().includes(query)
      );
    });
  }, [categoryFilter, debouncedTemplateSearch, difficultyFilter, templates]);

  const categories = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category))).sort((a, b) => a.localeCompare(b)),
    [templates]
  );
  const difficulties = useMemo(
    () => Array.from(new Set(templates.map((template) => template.difficulty))).sort((a, b) => a.localeCompare(b)),
    [templates]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventLite[]>();
    for (const event of events) {
      const dateKey = zonedDateKey(new Date(event.startAt), timeZone);
      const existing = map.get(dateKey);
      if (existing) {
        existing.push(event);
      } else {
        map.set(dateKey, [event]);
      }
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [events, timeZone]);

  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const conflictingEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const rows of eventsByDay.values()) {
      const byLocation = new Map<string, Array<{ id: string; start: number; end: number }>>();
      for (const row of rows) {
        const bucket = byLocation.get(row.location) ?? [];
        bucket.push({
          id: row.id,
          start: new Date(row.startAt).getTime(),
          end: new Date(row.endAt).getTime()
        });
        byLocation.set(row.location, bucket);
      }

      for (const locationRows of byLocation.values()) {
        locationRows.sort((a, b) => a.start - b.start);
        const active: Array<{ id: string; end: number }> = [];

        for (const row of locationRows) {
          while (active.length > 0 && active[0].end <= row.start) {
            active.shift();
          }
          if (active.length > 0) {
            ids.add(row.id);
            for (const overlapping of active) {
              ids.add(overlapping.id);
            }
          }
          active.push({ id: row.id, end: row.end });
          active.sort((a, b) => a.end - b.end);
        }
      }
    }
    return ids;
  }, [eventsByDay]);

  const eventLayoutsByDay = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        event: CalendarEventLite;
        top: number;
        height: number;
        compactCard: boolean;
        tightCard: boolean;
        isConflict: boolean;
        hasChecklist: boolean;
        hasAdaptations: boolean;
        timeRangeLabel: string;
      }>
    >();

    for (const [dayKey, dayEvents] of eventsByDay.entries()) {
      const layouts = dayEvents.map((event) => {
        const eventStart = new Date(event.startAt);
        const eventEnd = new Date(event.endAt);
        const startTime = formatInTimeZone(eventStart, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
        const endTime = formatInTimeZone(eventEnd, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(endTime);
        const top = ((startMinutes - GRID_START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
        const height = Math.max(((endMinutes - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT, 28);
        const compactCard = height < 88;
        const tightCard = height < 68;
        return {
          event,
          top,
          height,
          compactCard,
          tightCard,
          isConflict: conflictingEventIds.has(event.id),
          hasChecklist: hasChecklistItems(event.checklist),
          hasAdaptations: hasAdaptationsEnabled(event.adaptationsEnabled),
          timeRangeLabel: formatEventTimeRange(event.startAt, event.endAt, timeZone)
        };
      });
      map.set(dayKey, layouts);
    }

    return map;
  }, [conflictingEventIds, eventsByDay, timeZone]);

  const weekActivityCount = events.length;
  const monthActivityCount = useMemo(() => {
    const monthToken = format(weekDays[0], "yyyy-MM");
    return events.filter((event) => format(new Date(event.startAt), "yyyy-MM") === monthToken).length;
  }, [events, weekDays]);

  const currentTimeIndicator = useMemo(() => {
    const now = new Date();
    const nowKey = zonedDateKey(now, timeZone);
    const dayIndex = weekDays.findIndex((day) => zonedDateKey(day, timeZone) === nowKey);
    if (dayIndex < 0) return null;

    const hhmm = formatInTimeZone(now, timeZone, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    const minutes = parseTimeToMinutes(hhmm);
    const top = ((minutes - GRID_START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
    return {
      dayIndex,
      top: Math.max(0, Math.min(totalGridHeight - 2, top))
    };
  }, [timeZone, totalGridHeight, weekDays]);

  function syncWeekToUrl(nextWeekStart: Date) {
    const date = format(nextWeekStart, "yyyy-MM-dd");
    router.replace(`/app/calendar?view=week&date=${date}`, { scroll: false });
  }

  function jumpToWeek(nextWeekStart: Date) {
    const normalized = startOfWeek(nextWeekStart, { weekStartsOn: 1 });
    setWeekStart(normalized);
    syncWeekToUrl(normalized);
  }

  function openScheduleModalFromTemplate(params: {
    templateId: string;
    dateKey: string;
    startMinutes: number;
  }) {
    const template = templatesById.get(params.templateId);
    if (!template) return;
    const defaultEndMinutes = params.startMinutes + DEFAULT_EVENT_DURATION_MIN;
    const checklistText = asChecklistText(template.defaultChecklist);
    const toggles = asAdaptationToggles(template.adaptations);
    setScheduleState({
      mode: "template",
      templateId: template.id,
      title: template.title,
      dateKey: params.dateKey,
      startTime: minutesToTime(params.startMinutes),
      endTime: minutesToTime(defaultEndMinutes),
      location: "Activity Room",
      checklistText,
      bedBound: toggles.bedBound,
      dementiaFriendly: toggles.dementiaFriendly,
      lowVisionHearing: toggles.lowVisionHearing,
      oneToOneMini: toggles.oneToOneMini,
      repeat: "NONE",
      repeatEndMode: "NEVER",
      repeatUntilDate: "",
      repeatCount: 4,
      weeklyByDay: [dayTokenForDateKey(params.dateKey, timeZone)]
    });
    setScheduleOpen(true);
  }

  function armTemplateForKeyboard(templateId: string) {
    setKeyboardArmedTemplateId(templateId);
    const template = templatesById.get(templateId);
    if (template) {
      toast({
        title: "Template armed",
        description: `Press Enter on a day header or day column to schedule “${template.title}”.`
      });
    }
  }

  function openManualScheduleModal(dateKey?: string) {
    const targetDateKey = dateKey ?? activeMobileDayKey ?? weekStartKey;
    const weekdayToken = dayTokenForDateKey(targetDateKey, timeZone);
    setScheduleState({
      ...emptyScheduleState,
      mode: "manual",
      dateKey: targetDateKey,
      title: "",
      repeatUntilDate: format(addDays(new Date(`${targetDateKey}T00:00:00.000Z`), 28), "yyyy-MM-dd"),
      weeklyByDay: [weekdayToken]
    });
    setScheduleOpen(true);
  }

  function openDuplicateModal(event: CalendarEventLite) {
    const startDate = new Date(event.startAt);
    const endDate = new Date(event.endAt);
    const dateKey = zonedDateKey(startDate, timeZone);
    const startTime = formatInTimeZone(startDate, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const endTime = formatInTimeZone(endDate, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const toggles = asAdaptationToggles(event.adaptationsEnabled);
    setScheduleState({
      mode: "duplicate",
      templateId: null,
      title: event.title,
      dateKey,
      startTime,
      endTime,
      location: event.location,
      checklistText: asChecklistText(event.checklist),
      bedBound: toggles.bedBound,
      dementiaFriendly: toggles.dementiaFriendly,
      lowVisionHearing: toggles.lowVisionHearing,
      oneToOneMini: toggles.oneToOneMini,
      repeat: "NONE",
      repeatEndMode: "NEVER",
      repeatUntilDate: "",
      repeatCount: 4,
      weeklyByDay: [dayTokenForDateKey(dateKey, timeZone)]
    });
    setScheduleOpen(true);
  }

  function openEditModal(event: CalendarEventLite) {
    const startDate = new Date(event.startAt);
    const endDate = new Date(event.endAt);
    const dateKey = zonedDateKey(startDate, timeZone);
    setEditState({
      id: event.id,
      title: event.title,
      location: event.location,
      dateKey,
      startTime: formatInTimeZone(startDate, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
      endTime: formatInTimeZone(endDate, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
      scope: "instance",
      seriesId: event.seriesId,
      occurrenceKey: event.occurrenceKey
    });
    setEditOpen(true);
  }

  async function handleConflictAwareRequest(params: {
    endpoint: string;
    method: "POST" | "PATCH";
    payload: Record<string, unknown>;
    successMessage: string;
    close?: () => void;
  }) {
    const response = await fetch(params.endpoint, {
      method: params.method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params.payload)
    });
    const payload = await response.json().catch(() => ({}));

    if (response.status === 409) {
      setConflictState({
        endpoint: params.endpoint,
        method: params.method,
        payload: params.payload,
        conflicts: Array.isArray(payload.conflicts) ? payload.conflicts : [],
        outsideBusinessHours: Boolean(payload.outsideBusinessHours),
        message: parseApiErrorMessage(payload, "Scheduling conflict detected.")
      });
      return false;
    }

    if (!response.ok) {
      toast({
        title: "Calendar update failed",
        description: parseApiErrorMessage(payload, "Please try again."),
        variant: "destructive"
      });
      return false;
    }

    params.close?.();
    toast({
      title: params.successMessage
    });
    invalidateClientCache("calendar-range:");
    await loadWeekEvents(weekStart, { silent: true, force: true });
    return true;
  }

  async function submitSchedule() {
    if (!scheduleState.dateKey) return;
    const startAt = toUtcFromDateAndTime(scheduleState.dateKey, scheduleState.startTime, timeZone);
    const endAt = toUtcFromDateAndTime(scheduleState.dateKey, scheduleState.endTime, timeZone);
    if (!startAt || !endAt || endAt <= startAt) {
      toast({
        title: "Invalid schedule range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    const checklist = scheduleState.checklistText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, done: false }));

    let recurrence: Record<string, unknown> | undefined;
    if (scheduleState.repeat !== "NONE") {
      const payload: Record<string, unknown> = {
        freq: scheduleState.repeat,
        interval: 1
      };
      if (scheduleState.repeat === "WEEKLY") {
        payload.byDay = scheduleState.weeklyByDay.length > 0 ? scheduleState.weeklyByDay : [dayTokenForDateKey(scheduleState.dateKey, timeZone)];
      }
      if (scheduleState.repeatEndMode === "ON_DATE" && scheduleState.repeatUntilDate) {
        const untilStart = zonedDateStringToUtcStart(scheduleState.repeatUntilDate, timeZone);
        if (untilStart) {
          payload.until = new Date(untilStart.getTime() + (23 * 60 + 59) * 60_000).toISOString();
        }
      }
      if (scheduleState.repeatEndMode === "AFTER_COUNT" && scheduleState.repeatCount > 0) {
        payload.count = scheduleState.repeatCount;
      }
      recurrence = payload;
    }

    await handleConflictAwareRequest({
      endpoint: "/api/calendar/activities",
      method: "POST",
      payload: {
        title: scheduleState.title || "Untitled Activity",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        location: scheduleState.location || "Activity Room",
        templateId: scheduleState.templateId ?? undefined,
        checklist,
        adaptationsEnabled: {
          bedBound: scheduleState.bedBound,
          dementiaFriendly: scheduleState.dementiaFriendly,
          lowVisionHearing: scheduleState.lowVisionHearing,
          oneToOneMini: scheduleState.oneToOneMini,
          overrides: {}
        },
        ...(recurrence ? { recurrence } : {})
      },
      successMessage: recurrence ? "Series scheduled" : "Activity scheduled",
      close: () => setScheduleOpen(false)
    });
  }

  async function submitEdit() {
    if (!editState) return;
    const startAt = toUtcFromDateAndTime(editState.dateKey, editState.startTime, timeZone);
    const endAt = toUtcFromDateAndTime(editState.dateKey, editState.endTime, timeZone);
    if (!startAt || !endAt || endAt <= startAt) {
      toast({
        title: "Invalid edit range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    if (editState.scope === "series" && editState.seriesId) {
      await handleConflictAwareRequest({
        endpoint: `/api/calendar/series/${editState.seriesId}`,
        method: "PATCH",
        payload: {
          scope: "series",
          title: editState.title,
          location: editState.location
        },
        successMessage: "Series updated",
        close: () => setEditOpen(false)
      });
      return;
    }

    await handleConflictAwareRequest({
      endpoint: `/api/calendar/activities/${editState.id}`,
      method: "PATCH",
      payload: {
        title: editState.title,
        location: editState.location,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        scope: "instance"
      },
      successMessage: "Event updated",
      close: () => setEditOpen(false)
    });
  }

  async function deleteEvent(eventId: string) {
    const response = await fetch(`/api/calendar/activities/${eventId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast({
        title: "Delete failed",
        description: parseApiErrorMessage(payload, "Could not delete event."),
        variant: "destructive"
      });
      return;
    }
    toast({ title: "Event deleted" });
    invalidateClientCache("calendar-range:");
    await loadWeekEvents(weekStart, { silent: true, force: true });
  }

  async function skipOccurrence() {
    if (!editState?.seriesId) return;
    const startAt = toUtcFromDateAndTime(editState.dateKey, editState.startTime, timeZone);
    if (!startAt) return;

    const response = await fetch(`/api/calendar/series/${editState.seriesId}/exdate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        occurrenceStartAt: startAt.toISOString()
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast({
        title: "Skip failed",
        description: parseApiErrorMessage(payload, "Could not skip this occurrence."),
        variant: "destructive"
      });
      return;
    }
    toast({ title: "Occurrence skipped" });
    setEditOpen(false);
    invalidateClientCache("calendar-range:");
    await loadWeekEvents(weekStart, { silent: true, force: true });
  }

  async function moveEvent(eventId: string, targetDateKey: string, targetStartMinutes: number) {
    const source = eventsById.get(eventId);
    if (!source) return;

    const sourceStart = new Date(source.startAt);
    const sourceEnd = new Date(source.endAt);
    const durationMin = Math.max(15, Math.round((sourceEnd.getTime() - sourceStart.getTime()) / 60_000));
    const startAt = toUtcFromDateAndTime(targetDateKey, minutesToTime(targetStartMinutes), timeZone);
    if (!startAt) return;
    const endAt = new Date(startAt.getTime() + durationMin * 60_000);

    const previous = events;
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString()
            }
          : event
      )
    );

    const response = await fetch(`/api/calendar/activities/${eventId}/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        location: source.location
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 409) {
      setEvents(previous);
      setConflictState({
        endpoint: `/api/calendar/activities/${eventId}/move`,
        method: "POST",
        payload: {
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          location: source.location
        },
        conflicts: Array.isArray(payload.conflicts) ? payload.conflicts : [],
        outsideBusinessHours: Boolean(payload.outsideBusinessHours),
        message: parseApiErrorMessage(payload, "Scheduling conflict detected.")
      });
      return;
    }

    if (!response.ok) {
      setEvents(previous);
      toast({
        title: "Move failed",
        description: parseApiErrorMessage(payload, "Could not move activity."),
        variant: "destructive"
      });
      return;
    }

    toast({ title: "Activity moved" });
    invalidateClientCache("calendar-range:");
    await loadWeekEvents(weekStart, { silent: true, force: true });
  }

  function clampGridMinute(minute: number) {
    const min = GRID_START_HOUR * 60;
    const max = GRID_END_HOUR * 60;
    return Math.max(min, Math.min(max, minute));
  }

  async function moveEventWithKeyboard(event: CalendarEventLite, dayIndex: number, key: string) {
    const startDate = new Date(event.startAt);
    const localStart = formatInTimeZone(startDate, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const startMinutes = parseTimeToMinutes(localStart);

    let nextDayIndex = dayIndex;
    let nextStartMinutes = startMinutes;
    if (key === "ArrowUp") nextStartMinutes -= SLOT_MINUTES;
    if (key === "ArrowDown") nextStartMinutes += SLOT_MINUTES;
    if (key === "ArrowLeft") nextDayIndex -= 1;
    if (key === "ArrowRight") nextDayIndex += 1;

    if (nextDayIndex < 0 || nextDayIndex > weekDays.length - 1) return;
    const targetDayKey = zonedDateKey(weekDays[nextDayIndex], timeZone);
    await moveEvent(event.id, targetDayKey, clampGridMinute(nextStartMinutes));
  }

  function getDropStartMinute(event: React.DragEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const slotIndex = Math.max(0, Math.min(slots.length - 1, Math.round(offsetY / SLOT_HEIGHT)));
    return GRID_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  }

  function handleDrop(dayKey: string, event: React.DragEvent<HTMLDivElement>, useDefaultTime = false) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-actify-calendar-drag");
    const startMinutes = useDefaultTime ? 10 * 60 : getDropStartMinute(event);
    setHoveredDayKey(null);

    try {
      const payload = raw ? (JSON.parse(raw) as { type: "template" | "event"; id: string }) : null;
      if (!payload) return;

      if (payload.type === "template") {
        setKeyboardArmedTemplateId(null);
        openScheduleModalFromTemplate({
          templateId: payload.id,
          dateKey: dayKey,
          startMinutes
        });
      } else if (payload.type === "event") {
        void moveEvent(payload.id, dayKey, startMinutes);
      }
    } catch {
      // ignore invalid drag payloads
    } finally {
      setDraggingTemplateId(null);
      setDraggingEventId(null);
    }
  }

  const mobileEventsForActiveDay = useMemo(() => eventsByDay.get(activeMobileDayKey) ?? [], [activeMobileDayKey, eventsByDay]);

  return (
    <div className="space-y-5">
      <GlassPanel variant="warm" className="sticky top-2 z-30 rounded-3xl px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Calendar Scheduler</h1>
              <Badge className="border-0 bg-actifyBlue/15 text-actifyBlue">Week Grid</Badge>
              <Badge variant="outline">{weekActivityCount} this week</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">{monthActivityCount} in month</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/75">
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/calendar?view=month&month=${format(weekStart, "yyyy-MM-dd")}`}>Month</Link>
              </Button>
              <Button size="sm" className="bg-actifyBlue text-white hover:bg-actifyBlue/90">Week</Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/calendar/day/${weekStartKey}`}>Day</Link>
              </Button>
              {keyboardArmedTemplateId ? (
                <Badge className="border border-actifyBlue/35 bg-actifyBlue/10 text-actifyBlue">
                  Armed: {templatesById.get(keyboardArmedTemplateId)?.title ?? "Template"}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-foreground/60">
              Keyboard: focus template and press Enter to arm. Use Enter on a day header to drop. Hold Alt + Arrow keys on an event to move it.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlassButton size="sm" variant="dense" onClick={() => jumpToWeek(addWeeks(weekStart, -1))}>
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Prev
            </GlassButton>
            <GlassButton size="sm" variant="dense" onClick={() => jumpToWeek(addWeeks(weekStart, 1))}>
              Next
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </GlassButton>
            <GlassButton size="sm" variant="dense" onClick={() => jumpToWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </GlassButton>
            <Badge className="border border-white/70 bg-white/75 text-foreground">{weekLabel}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlassButton size="sm" onClick={() => openManualScheduleModal(todayKey)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Activity
            </GlassButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GlassButton size="sm" variant="dense">
                  <FileDown className="mr-1.5 h-4 w-4" />
                  PDFs
                </GlassButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href={`/app/calendar/pdf?view=daily&date=${todayKey}&preview=1`} target="_blank" rel="noreferrer">Daily PDF</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/app/calendar/pdf?view=weekly&weekStart=${weekStartKey}&preview=1`} target="_blank" rel="noreferrer">Weekly PDF</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/app/calendar/pdf?view=monthly&month=${monthKey}&preview=1`} target="_blank" rel="noreferrer">Monthly PDF</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CalendarPdfPreviewDialog
              dateKey={todayKey}
              weekStartKey={weekStartKey}
              monthKey={monthKey}
              defaultView="weekly"
            />

            <GlassButton asChild size="sm" variant="dense">
              <Link href="/app/templates">Manage Templates</Link>
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <GlassCard className="hidden max-h-[78vh] overflow-hidden p-0 lg:block">
          <div className="sticky top-0 z-10 border-b border-white/60 bg-white/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-actifyBlue" />
              <p className="font-semibold text-foreground">Template Dock</p>
              <Badge variant="outline">{filteredTemplates.length}</Badge>
              {keyboardArmedTemplateId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 px-2 text-[11px]"
                  onClick={() => setKeyboardArmedTemplateId(null)}
                >
                  Clear armed
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-foreground/65">
              Search and drag templates into the week grid. Use filters for faster scheduling.
            </p>
          </div>
          <div className="space-y-3 overflow-y-auto px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/55" />
              <Input
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Search template title/category"
                className="h-10 border-white/70 bg-white/90 pl-9"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-9 rounded-md border border-white/70 bg-white/90 px-2 text-xs"
              >
                <option value="ALL">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value)}
                className="h-9 rounded-md border border-white/70 bg-white/90 px-2 text-xs"
              >
                <option value="ALL">All difficulty</option>
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData(
                      "application/x-actify-calendar-drag",
                      JSON.stringify({ type: "template", id: template.id })
                    );
                    setDraggingTemplateId(template.id);
                  }}
                  onDragEnd={() => {
                    setDraggingTemplateId(null);
                    setHoveredDayKey(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      armTemplateForKeyboard(template.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className={cn(
                    "rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actifyBlue/45",
                    draggingTemplateId === template.id && "opacity-60",
                    keyboardArmedTemplateId === template.id && "border-actifyBlue/40 bg-actifyBlue/10"
                  )}
                  aria-label={`Draggable template ${template.title}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{template.title}</p>
                      <p className="text-xs text-foreground/65">{template.category} · {template.difficulty}</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-foreground/55" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openScheduleModalFromTemplate({
                          templateId: template.id,
                          dateKey: activeMobileDayKey || weekStartKey,
                          startMinutes: 10 * 60
                        })
                      }
                    >
                      Schedule
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => armTemplateForKeyboard(template.id)}
                    >
                      Arm
                    </Button>
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/70 bg-white/70 px-3 py-2 text-xs text-foreground/70">
                  No templates match the current filter.
                </p>
              ) : null}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3 p-0">
          <div className="flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-3 lg:hidden">
            <p className="text-sm font-semibold text-foreground">Templates</p>
            <GlassButton size="sm" variant="dense" onClick={() => setMobileDockOpen(true)}>
              Open Dock
            </GlassButton>
          </div>

          <div ref={timelineRef} className="max-h-[76vh] overflow-auto rounded-2xl">
            <div className="min-w-[980px]">
              <div className="sticky top-0 z-20 grid grid-cols-[72px_repeat(7,minmax(120px,1fr))] border-b border-white/60 bg-white/95 backdrop-blur">
                <div className="border-r border-white/60 p-2 text-[11px] font-medium uppercase tracking-wide text-foreground/55">
                  Time
                </div>
                {weekDays.map((day) => {
                  const dayKey = zonedDateKey(day, timeZone);
                  const count = eventsByDay.get(dayKey)?.length ?? 0;
                  const isToday = dayKey === todayKey;
                  return (
                    <div
                      key={dayKey}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setHoveredDayKey(dayKey);
                      }}
                      onDragLeave={() => setHoveredDayKey((current) => (current === dayKey ? null : current))}
                      onDrop={(event) => handleDrop(dayKey, event, true)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        if (keyboardArmedTemplateId) {
                          setKeyboardArmedTemplateId(null);
                          openScheduleModalFromTemplate({
                            templateId: keyboardArmedTemplateId,
                            dateKey: dayKey,
                            startMinutes: 10 * 60
                          });
                          return;
                        }
                        openManualScheduleModal(dayKey);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={
                        keyboardArmedTemplateId
                          ? `Schedule armed template for ${format(day, "EEEE, MMMM d")}`
                          : `Open create activity for ${format(day, "EEEE, MMMM d")}`
                      }
                      className={cn(
                        "border-r border-white/60 p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actifyBlue/45",
                        isToday && "bg-actifyBlue/10",
                        hoveredDayKey === dayKey && "bg-actifyMint/20"
                      )}
                    >
                      <p className="text-xs font-semibold text-foreground">{format(day, "EEE")}</p>
                      <p className="text-sm text-foreground">{format(day, "MMM d")}</p>
                      <p className="text-[11px] text-foreground/65">{count} activities</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
                <div className="border-r border-white/60 bg-white/80">
                  {slots.map((slot) => (
                    <div
                      key={`slot-label-${slot.minute}`}
                      className="relative border-b border-white/60 px-2 py-1 text-[11px] text-foreground/60"
                      style={{ height: SLOT_HEIGHT }}
                    >
                      {slot.minute % 60 === 0 ? (
                        <span>
                          {slot.label}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>

                {weekDays.map((day, dayIndex) => {
                  const dayKey = zonedDateKey(day, timeZone);
                  const dayLayouts = eventLayoutsByDay.get(dayKey) ?? [];
                  return (
                    <div
                      key={`day-col-${dayKey}`}
                      className={cn(
                        "relative border-r border-white/60 bg-white/60",
                        dayKey === todayKey && "bg-actifyBlue/5",
                        hoveredDayKey === dayKey && "bg-actifyMint/15"
                      )}
                      style={{ height: totalGridHeight }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setHoveredDayKey(dayKey);
                      }}
                      onDragLeave={() => setHoveredDayKey((current) => (current === dayKey ? null : current))}
                      onDrop={(event) => handleDrop(dayKey, event)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        if ((event.target as HTMLElement).closest("button,a,input,select,textarea")) return;
                        event.preventDefault();
                        if (keyboardArmedTemplateId) {
                          setKeyboardArmedTemplateId(null);
                          openScheduleModalFromTemplate({
                            templateId: keyboardArmedTemplateId,
                            dateKey: dayKey,
                            startMinutes: 10 * 60
                          });
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Day column ${format(day, "EEEE, MMMM d")}`}
                    >
                      {slots.map((slot) => (
                        <div
                          key={`${dayKey}-${slot.minute}`}
                          className="pointer-events-none border-b border-white/50"
                          style={{ height: SLOT_HEIGHT }}
                        />
                      ))}

                      {dayLayouts.map(({ event, top, height, compactCard, tightCard, isConflict, hasChecklist, hasAdaptations, timeRangeLabel }) => {
                        return (
                          <div
                            key={event.id}
                            draggable
                            tabIndex={0}
                            aria-label={`Activity ${event.title}`}
                            onDragStart={(dragEvent) => {
                              dragEvent.dataTransfer.effectAllowed = "move";
                              dragEvent.dataTransfer.setData(
                                "application/x-actify-calendar-drag",
                                JSON.stringify({ type: "event", id: event.id })
                              );
                              setDraggingEventId(event.id);
                            }}
                            onDragEnd={() => {
                              setDraggingEventId(null);
                              setHoveredDayKey(null);
                            }}
                            onKeyDown={(eventKeyDown) => {
                              if (eventKeyDown.key === "Enter") {
                                eventKeyDown.preventDefault();
                                openEditModal(event);
                                return;
                              }
                              if (eventKeyDown.key === "Delete" || eventKeyDown.key === "Backspace") {
                                eventKeyDown.preventDefault();
                                void deleteEvent(event.id);
                                return;
                              }
                              if (
                                eventKeyDown.altKey &&
                                (eventKeyDown.key === "ArrowUp" ||
                                  eventKeyDown.key === "ArrowDown" ||
                                  eventKeyDown.key === "ArrowLeft" ||
                                  eventKeyDown.key === "ArrowRight")
                              ) {
                                eventKeyDown.preventDefault();
                                void moveEventWithKeyboard(event, dayIndex, eventKeyDown.key);
                              }
                            }}
                            className={cn(
                              "group absolute left-1 right-1 rounded-xl border p-2.5 text-xs shadow-sm outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-actifyBlue/60",
                              isConflict || event.conflictOverride
                                ? "border-amber-300 bg-amber-50/95"
                                : "border-actifyBlue/40 bg-actifyBlue/10",
                              draggingEventId === event.id && "opacity-60"
                            )}
                            style={{
                              top: Math.max(0, top),
                              height: Math.min(height, totalGridHeight - top)
                            }}
                            onClick={() => openEditModal(event)}
                          >
                            <div className="absolute right-1 top-1 z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 rounded-md border border-white/60 bg-white/85 text-foreground/70 hover:bg-white"
                                    onClick={(eventClick) => eventClick.stopPropagation()}
                                    aria-label={`Open actions for ${event.title}`}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem
                                    onSelect={(eventSelect) => {
                                      eventSelect.preventDefault();
                                      openEditModal(event);
                                    }}
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/app/calendar/day/${dayKey}`} onClick={(eventClick) => eventClick.stopPropagation()}>
                                      View Day
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/app/calendar/${event.id}/attendance`}
                                      onClick={(eventClick) => eventClick.stopPropagation()}
                                    >
                                      Track Attendance
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(eventSelect) => {
                                      eventSelect.preventDefault();
                                      openDuplicateModal(event);
                                    }}
                                  >
                                    <Copy className="mr-2 h-3.5 w-3.5" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(eventSelect) => {
                                      eventSelect.preventDefault();
                                      void deleteEvent(event.id);
                                    }}
                                    className="text-rose-700 focus:text-rose-700"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <p className="truncate pr-7 font-semibold text-foreground">{event.title}</p>
                            <p className="truncate pr-7 text-[11px] text-foreground/70">
                              {timeRangeLabel}
                            </p>
                            {!tightCard ? <p className="truncate pr-7 text-[11px] text-foreground/65">{event.location}</p> : null}
                            <div className={cn("mt-1 flex flex-wrap items-center gap-1.5 pr-7", tightCard && "mt-0.5")}>
                              {!compactCard && hasChecklist ? (
                                <Badge className="border border-white/60 bg-white/70 text-[10px] text-foreground">Checklist</Badge>
                              ) : null}
                              {!compactCard && hasAdaptations ? (
                                <Badge className="border border-white/60 bg-white/70 text-[10px] text-foreground">Adaptations</Badge>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      {currentTimeIndicator && currentTimeIndicator.dayIndex === dayIndex ? (
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-rose-500/70"
                          style={{ top: currentTimeIndicator.top }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-white/60 bg-white/80 p-3 text-xs text-foreground/70">
            Drag templates from the dock into a day/time slot. Keyboard: arm template with Enter, then Enter on a day header.
            Focus an event and use Alt + Arrow keys to move, Enter to edit, Delete to remove.
          </div>
        </GlassCard>
      </div>

      <Dialog open={mobileDockOpen} onOpenChange={setMobileDockOpen}>
        <DialogContent className="max-w-md border-white/60 bg-white/95">
          <DialogHeader>
            <DialogTitle>Template Dock</DialogTitle>
            <DialogDescription>Search and drag templates into the week schedule.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="Search templates"
            />
            <div className="grid gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="rounded-lg border border-white/70 bg-white/90 p-3 text-left"
                  onClick={() => {
                    setMobileDockOpen(false);
                    openScheduleModalFromTemplate({
                      templateId: template.id,
                      dateKey: activeMobileDayKey || weekStartKey,
                      startMinutes: 10 * 60
                    });
                  }}
                >
                  <p className="text-sm font-medium text-foreground">{template.title}</p>
                  <p className="text-xs text-foreground/65">{template.category} · {template.difficulty}</p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <GlassButton type="button" onClick={() => setMobileDockOpen(false)}>Close</GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/60 bg-white/95 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{scheduleState.mode === "manual" ? "Create Activity" : "Schedule Activity"}</DialogTitle>
            <DialogDescription>
              Set date, time, recurrence, checklist, and adaptations before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                Title
                <Input
                  value={scheduleState.title}
                  onChange={(event) => setScheduleState((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                Date
                <Input
                  type="date"
                  value={scheduleState.dateKey}
                  onChange={(event) => setScheduleState((current) => ({ ...current, dateKey: event.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                Start
                <Input
                  type="time"
                  value={scheduleState.startTime}
                  onChange={(event) => setScheduleState((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                End
                <Input
                  type="time"
                  value={scheduleState.endTime}
                  onChange={(event) => setScheduleState((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                Location
                <Input
                  value={scheduleState.location}
                  onChange={(event) => setScheduleState((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/80 p-3">
              <p className="text-sm font-medium text-foreground">Repeat</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <select
                  value={scheduleState.repeat}
                  onChange={(event) =>
                    setScheduleState((current) => ({
                      ...current,
                      repeat: event.target.value as RepeatMode
                    }))
                  }
                  className="h-9 rounded-md border border-white/70 bg-white/90 px-2 text-sm"
                >
                  <option value="NONE">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>

                <select
                  value={scheduleState.repeatEndMode}
                  onChange={(event) =>
                    setScheduleState((current) => ({
                      ...current,
                      repeatEndMode: event.target.value as RepeatEndMode
                    }))
                  }
                  className="h-9 rounded-md border border-white/70 bg-white/90 px-2 text-sm"
                  disabled={scheduleState.repeat === "NONE"}
                >
                  <option value="NEVER">Never</option>
                  <option value="ON_DATE">End on date</option>
                  <option value="AFTER_COUNT">End after count</option>
                </select>

                {scheduleState.repeatEndMode === "ON_DATE" ? (
                  <Input
                    type="date"
                    value={scheduleState.repeatUntilDate}
                    onChange={(event) =>
                      setScheduleState((current) => ({
                        ...current,
                        repeatUntilDate: event.target.value
                      }))
                    }
                    disabled={scheduleState.repeat === "NONE"}
                  />
                ) : scheduleState.repeatEndMode === "AFTER_COUNT" ? (
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={scheduleState.repeatCount}
                    onChange={(event) =>
                      setScheduleState((current) => ({
                        ...current,
                        repeatCount: Number(event.target.value) || 1
                      }))
                    }
                    disabled={scheduleState.repeat === "NONE"}
                  />
                ) : (
                  <div className="rounded-md border border-white/70 bg-white/75 px-3 py-2 text-xs text-foreground/65">
                    Continues by rule
                  </div>
                )}
              </div>

              {scheduleState.repeat === "WEEKLY" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAY_TOKENS.map((token) => {
                    const checked = scheduleState.weeklyByDay.includes(token);
                    return (
                      <label key={token} className="inline-flex items-center gap-1.5 rounded-md border border-white/70 bg-white/80 px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setScheduleState((current) => ({
                              ...current,
                              weeklyByDay: checked
                                ? current.weeklyByDay.filter((day) => day !== token)
                                : [...current.weeklyByDay, token]
                            }))
                          }
                        />
                        {token}
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <label className="space-y-1 text-sm">
              Checklist
              <Textarea
                value={scheduleState.checklistText}
                onChange={(event) => setScheduleState((current) => ({ ...current, checklistText: event.target.value }))}
                placeholder="One checklist item per line"
                className="min-h-24 bg-white/90"
              />
            </label>

            <div className="rounded-xl border border-white/70 bg-white/80 p-3">
              <p className="text-sm font-medium text-foreground">Adaptations</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-sm"><input type="checkbox" checked={scheduleState.bedBound} onChange={(event) => setScheduleState((current) => ({ ...current, bedBound: event.target.checked }))} className="mr-2 h-4 w-4" />Bed-bound</label>
                <label className="text-sm"><input type="checkbox" checked={scheduleState.dementiaFriendly} onChange={(event) => setScheduleState((current) => ({ ...current, dementiaFriendly: event.target.checked }))} className="mr-2 h-4 w-4" />Dementia-friendly</label>
                <label className="text-sm"><input type="checkbox" checked={scheduleState.lowVisionHearing} onChange={(event) => setScheduleState((current) => ({ ...current, lowVisionHearing: event.target.checked }))} className="mr-2 h-4 w-4" />Low vision/hearing</label>
                <label className="text-sm"><input type="checkbox" checked={scheduleState.oneToOneMini} onChange={(event) => setScheduleState((current) => ({ ...current, oneToOneMini: event.target.checked }))} className="mr-2 h-4 w-4" />1:1 mini</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <GlassButton type="button" variant="dense" onClick={() => setScheduleOpen(false)}>Cancel</GlassButton>
            <GlassButton type="button" onClick={() => void submitSchedule()}>Save Schedule</GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/60 bg-white/95 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>Update this occurrence or the full series.</DialogDescription>
          </DialogHeader>
          {editState ? (
            <div className="space-y-3">
              {editState.seriesId ? (
                <label className="space-y-1 text-sm">
                  Edit scope
                  <select
                    value={editState.scope}
                    onChange={(event) =>
                      setEditState((current) =>
                        current
                          ? {
                              ...current,
                              scope: event.target.value as "instance" | "series"
                            }
                          : null
                      )
                    }
                    className="h-9 w-full rounded-md border border-white/70 bg-white/90 px-2 text-sm"
                  >
                    <option value="instance">This instance</option>
                    <option value="series">Entire series</option>
                  </select>
                </label>
              ) : null}
              <label className="space-y-1 text-sm">
                Title
                <Input
                  value={editState.title}
                  onChange={(event) =>
                    setEditState((current) => (current ? { ...current, title: event.target.value } : null))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                Location
                <Input
                  value={editState.location}
                  onChange={(event) =>
                    setEditState((current) => (current ? { ...current, location: event.target.value } : null))
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  Date
                  <Input
                    type="date"
                    value={editState.dateKey}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, dateKey: event.target.value } : null))
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  Start
                  <Input
                    type="time"
                    value={editState.startTime}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, startTime: event.target.value } : null))
                    }
                    disabled={editState.scope === "series"}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  End
                  <Input
                    type="time"
                    value={editState.endTime}
                    onChange={(event) =>
                      setEditState((current) => (current ? { ...current, endTime: event.target.value } : null))
                    }
                    disabled={editState.scope === "series"}
                  />
                </label>
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex-wrap gap-2">
            {editState?.seriesId && editState.scope === "instance" ? (
              <GlassButton type="button" variant="dense" onClick={() => void skipOccurrence()}>
                Skip occurrence
              </GlassButton>
            ) : null}
            <GlassButton type="button" variant="dense" onClick={() => setEditOpen(false)}>Cancel</GlassButton>
            <GlassButton type="button" onClick={() => void submitEdit()}>Save Changes</GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(conflictState)} onOpenChange={(open) => (!open ? setConflictState(null) : undefined)}>
        <DialogContent className="border-white/60 bg-white/95 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Scheduling warning
            </DialogTitle>
            <DialogDescription>
              {conflictState?.message ?? "There is a scheduling conflict."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {conflictState?.outsideBusinessHours ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                This schedule is outside configured business hours.
              </p>
            ) : null}
            {conflictState?.conflicts?.length ? (
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-white/70 bg-white/85 p-2">
                {conflictState.conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded-md border border-white/70 bg-white/90 p-2 text-xs">
                    <p className="font-medium text-foreground">{conflict.title}</p>
                    <p className="text-foreground/70">
                      {formatEventTimeRange(conflict.startAt, conflict.endAt, timeZone)} · {conflict.location}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground/70">No overlapping events listed.</p>
            )}
          </div>
          <DialogFooter>
            <GlassButton type="button" variant="dense" onClick={() => setConflictState(null)}>
              Adjust time
            </GlassButton>
            <GlassButton
              type="button"
              onClick={async () => {
                if (!conflictState) return;
                const payload = {
                  ...conflictState.payload,
                  allowConflictOverride: true,
                  allowOutsideBusinessHoursOverride: true
                };
                setConflictState(null);
                await handleConflictAwareRequest({
                  endpoint: conflictState.endpoint,
                  method: conflictState.method,
                  payload,
                  successMessage: "Saved with override"
                });
              }}
            >
              Override anyway
            </GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GlassCard className="space-y-3 lg:hidden">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground">Weekly agenda</p>
          <Badge variant="outline">{mobileEventsForActiveDay.length} items</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {weekDays.map((day) => {
            const key = zonedDateKey(day, timeZone);
            const active = key === activeMobileDayKey;
            return (
              <Button
                key={key}
                size="sm"
                variant={active ? "default" : "outline"}
                className={active ? "bg-actifyBlue text-white" : ""}
                onClick={() => setActiveMobileDayKey(key)}
              >
                {format(day, "EEE d")}
              </Button>
            );
          })}
        </div>
        <div className="space-y-2">
          {mobileEventsForActiveDay.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/70 bg-white/80 p-3">
              <p className="font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-foreground/70">{formatEventTimeRange(event.startAt, event.endAt, timeZone)} · {event.location}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditModal(event)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => void deleteEvent(event.id)}>Delete</Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/app/calendar/${event.id}/attendance`}>Track</Link>
                </Button>
              </div>
            </div>
          ))}
          {mobileEventsForActiveDay.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/70 bg-white/70 px-3 py-3 text-sm text-foreground/70">
              No activities for this day.
            </p>
          ) : null}
        </div>
      </GlassCard>

      {loading ? (
        <div className="fixed bottom-4 right-4 rounded-full border border-white/60 bg-white/90 p-3 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-actifyBlue" />
        </div>
      ) : null}
    </div>
  );
}
