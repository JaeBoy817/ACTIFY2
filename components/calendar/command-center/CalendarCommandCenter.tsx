"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameMonth,
} from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCalendarQueries, type CalendarEventLite } from "@/hooks/useCalendarQueries";
import { useCalendarRange } from "@/hooks/useCalendarRange";
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_LOCATION,
  minutesToLabel,
  minutesToTime,
  parseTimeToMinutes,
  toUtcIso
} from "@/components/calendar/utils";
import type { CalendarTemplateLite, CalendarViewMode } from "@/components/calendar/types";
import { formatInTimeZone, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type CalendarSection = "schedule" | "create" | "library" | "settings";

type CalendarCommandCenterProps = {
  templates: CalendarTemplateLite[];
  initialDateKey: string;
  initialView: CalendarViewMode;
  initialSection: CalendarSection;
  timeZone: string;
};

type EventRecord = CalendarEventLite & {
  attendanceCount?: number;
  attendanceTaken?: boolean;
  documentationCount?: number;
};

type AttendanceStatusFilter =
  | "ALL"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "NEEDS_ATTENDANCE"
  | "ATTENDANCE_RECORDED"
  | "COMPLETED";

type EventTypeFilter = "ALL" | "GROUP" | "ONE_TO_ONE" | "SPECIAL_EVENT";

type CalendarFilters = {
  category: string;
  location: string;
  attendanceStatus: AttendanceStatusFilter;
  eventType: EventTypeFilter;
  adaptationTag: string;
};

type ActivityFormState = {
  id: string | null;
  title: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
  description: string;
  audience: string;
  templateId: string | null;
  bedBound: boolean;
  dementiaFriendly: boolean;
  lowVisionHearing: boolean;
  oneToOneMini: boolean;
  extraAdaptationTags: string[];
  attendanceFollowUp: boolean;
  recurringEnabled: boolean;
  recurringFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
  recurringCount: number;
};

type EventMeta = {
  category?: string;
  description?: string;
  audience?: string;
  extraAdaptationTags?: string[];
  attendanceFollowUp?: boolean;
};

const CALENDAR_VIEWS: Array<{ id: CalendarViewMode; label: string }> = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" }
];

const EVENT_CATEGORIES = [
  "Exercise",
  "Cognitive",
  "Social",
  "Spiritual",
  "Sensory",
  "Entertainment",
  "Outing",
  "1:1",
  "Special Event"
];

const EXTRA_ADAPTATION_TAGS = [
  "Wheelchair Accessible",
  "Low Hearing",
  "Low Vision",
  "Quiet Setting",
  "Large Print",
  "Sensory Support"
];

const CATEGORY_COLOR: Record<string, string> = {
  Exercise: "border-emerald-300/45 bg-emerald-500/20 text-emerald-100",
  Cognitive: "border-indigo-300/45 bg-indigo-500/20 text-indigo-100",
  Social: "border-sky-300/45 bg-sky-500/20 text-sky-100",
  Spiritual: "border-violet-300/45 bg-violet-500/20 text-violet-100",
  Sensory: "border-amber-300/45 bg-amber-500/20 text-amber-100",
  Entertainment: "border-fuchsia-300/45 bg-fuchsia-500/20 text-fuchsia-100",
  Outing: "border-cyan-300/45 bg-cyan-500/20 text-cyan-100",
  "1:1": "border-orange-300/45 bg-orange-500/20 text-orange-100",
  "Special Event": "border-rose-300/45 bg-rose-500/20 text-rose-100",
  Uncategorized: "border-slate-300/35 bg-slate-500/15 text-slate-100"
};

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const GRID_HOUR_HEIGHT = 60;

export function CalendarCommandCenter({
  templates,
  initialDateKey,
  initialView,
  initialSection,
  timeZone
}: CalendarCommandCenterProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [view, setView] = useState<CalendarViewMode>(initialView);
  const [anchorDateKey, setAnchorDateKey] = useState(initialDateKey);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CalendarFilters>({
    category: "ALL",
    location: "ALL",
    attendanceStatus: "ALL",
    eventType: "ALL",
    adaptationTag: "ALL"
  });

  const [templateDockOpen, setTemplateDockOpen] = useState(initialSection === "library");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("ALL");

  const [activityModalOpen, setActivityModalOpen] = useState(initialSection === "create");
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(() =>
    buildEmptyForm(initialDateKey, null)
  );

  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);
  const [detailsOpenMobile, setDetailsOpenMobile] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams();
    query.set("view", view);
    query.set("date", anchorDateKey);
    router.replace(`/app/calendar?${query.toString()}`, { scroll: false });
  }, [anchorDateKey, router, view]);

  const { range, rangeLabel, monthAnchor, monthDays, weekDays } = useCalendarRange({
    view,
    anchorDateKey,
    timeZone
  });

  const { events, isLoading, error: calendarLoadError, refresh } = useCalendarQueries({
    view,
    range,
    anchorDateKey,
    timeZone,
    includeStats: true
  });

  const templateById = useMemo(() => {
    return new Map(templates.map((template) => [template.id, template]));
  }, [templates]);

  const categories = useMemo(() => {
    const fromTemplates = templates.map((template) => template.category).filter(Boolean);
    const fromEvents = events.map((event) => resolveEventCategory(event, templateById)).filter(Boolean);
    return Array.from(new Set([...EVENT_CATEGORIES, ...fromTemplates, ...fromEvents])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [events, templateById, templates]);

  const locationOptions = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.location).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [events]);

  const eventRecords = events as EventRecord[];

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();

    return eventRecords.filter((event) => {
      const category = resolveEventCategory(event, templateById);
      const eventType = resolveEventType(category, event.title);
      const attendanceStatus = resolveAttendanceStatus(event, now);
      const adaptationTags = resolveAdaptationTags(event);

      if (filters.category !== "ALL" && category !== filters.category) return false;
      if (filters.location !== "ALL" && event.location !== filters.location) return false;
      if (filters.eventType !== "ALL" && eventType !== filters.eventType) return false;
      if (filters.attendanceStatus !== "ALL" && attendanceStatus !== filters.attendanceStatus) return false;
      if (filters.adaptationTag !== "ALL" && !adaptationTags.includes(filters.adaptationTag)) return false;

      if (!query) return true;

      const searchable = [
        event.title,
        event.location,
        category,
        attendanceStatus,
        adaptationTags.join(" "),
        parseEventMeta(event.adaptationsEnabled).description ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [eventRecords, filters, search, templateById]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, EventRecord[]>();
    for (const event of visibleEvents) {
      const dateKey = zonedDateKey(new Date(event.startAt), timeZone);
      const current = grouped.get(dateKey);
      if (current) {
        current.push(event);
      } else {
        grouped.set(dateKey, [event]);
      }
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return grouped;
  }, [timeZone, visibleEvents]);

  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDateKey) ?? [];
  }, [eventsByDate, selectedDateKey]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return eventRecords.find((event) => event.id === selectedEventId) ?? null;
  }, [eventRecords, selectedEventId]);

  const todayDateKey = useMemo(() => zonedDateKey(new Date(), timeZone), [timeZone]);
  const todayEvents = useMemo(() => eventsByDate.get(todayDateKey) ?? [], [eventsByDate, todayDateKey]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return visibleEvents
      .filter((event) => new Date(event.endAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5);
  }, [visibleEvents]);

  const daySummary = useMemo(() => {
    const categoriesForDay = Array.from(
      new Set(selectedDateEvents.map((event) => resolveEventCategory(event, templateById)))
    );
    const completed = selectedDateEvents.filter((event) => new Date(event.endAt).getTime() < Date.now()).length;
    const needsAttendance = selectedDateEvents.filter(
      (event) => resolveAttendanceStatus(event, new Date()) === "NEEDS_ATTENDANCE"
    ).length;
    return {
      total: selectedDateEvents.length,
      categories: categoriesForDay,
      completed,
      needsAttendance
    };
  }, [selectedDateEvents, templateById]);

  const summaryCards = useMemo(() => {
    const now = new Date();
    const needsAttendanceCount = visibleEvents.filter(
      (event) => resolveAttendanceStatus(event, now) === "NEEDS_ATTENDANCE"
    ).length;
    const docsPending = visibleEvents.filter((event) => (event.documentationCount ?? 0) === 0).length;
    return [
      {
        key: "today",
        title: "Today’s Schedule",
        value: todayEvents.length,
        hint: "Activities scheduled today",
        icon: CalendarDays,
        tint: "from-cyan-500/25 to-blue-600/15"
      },
      {
        key: "view-total",
        title: "In Current View",
        value: visibleEvents.length,
        hint: rangeLabel,
        icon: Clock3,
        tint: "from-violet-500/25 to-indigo-600/15"
      },
      {
        key: "attendance",
        title: "Needs Attendance",
        value: needsAttendanceCount,
        hint: "Past activities not marked",
        icon: ClipboardCheck,
        tint: "from-amber-500/25 to-orange-600/15"
      },
      {
        key: "templates",
        title: "Template Library",
        value: templates.length,
        hint: `${docsPending} activities missing notes`,
        icon: Sparkles,
        tint: "from-emerald-500/25 to-cyan-600/15"
      }
    ];
  }, [rangeLabel, templates.length, todayEvents.length, visibleEvents]);

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (templateCategory !== "ALL" && template.category !== templateCategory) return false;
      if (!query) return true;
      return `${template.title} ${template.category}`.toLowerCase().includes(query);
    });
  }, [templateCategory, templateSearch, templates]);

  const openNewActivity = useCallback(
    (dateKey?: string) => {
      setActivityForm(buildEmptyForm(dateKey ?? selectedDateKey ?? anchorDateKey, null));
      setActivityModalOpen(true);
    },
    [anchorDateKey, selectedDateKey]
  );

  const openEditActivity = useCallback(
    (event: EventRecord) => {
      setActivityForm(buildFormFromEvent(event, templateById, timeZone));
      setActivityModalOpen(true);
    },
    [templateById, timeZone]
  );

  const openTemplateSchedule = useCallback(
    (template: CalendarTemplateLite) => {
      setActivityForm(buildFormFromTemplate(template, selectedDateKey || anchorDateKey));
      setActivityModalOpen(true);
    },
    [anchorDateKey, selectedDateKey]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedEvent) return;
    const confirmed = window.confirm(`Delete "${selectedEvent.title}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/calendar/activities/${encodeURIComponent(selectedEvent.id)}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      toast({
        title: "Delete failed",
        description: "Unable to delete this activity right now.",
        variant: "destructive"
      });
      return;
    }
    setSelectedEventId(null);
    setDetailsOpenMobile(false);
    await refresh();
    toast({
      title: "Activity deleted",
      description: "The schedule has been updated."
    });
  }, [refresh, selectedEvent, toast]);

  const handleSaveActivity = useCallback(async () => {
    const form = activityForm;
    if (!form.title.trim()) {
      toast({
        title: "Title is required",
        description: "Add an activity title before saving.",
        variant: "destructive"
      });
      return;
    }

    const startAt = toUtcIso(form.dateKey, form.startTime, timeZone);
    const endAt = toUtcIso(form.dateKey, form.endTime, timeZone);

    if (!startAt || !endAt) {
      toast({
        title: "Invalid date or time",
        description: "Please provide a valid date and time.",
        variant: "destructive"
      });
      return;
    }

    if (parseTimeToMinutes(form.endTime) <= parseTimeToMinutes(form.startTime)) {
      toast({
        title: "End time must be later",
        description: "Adjust the activity time range to continue.",
        variant: "destructive"
      });
      return;
    }

    setSavingActivity(true);

    const payload = {
      title: form.title.trim(),
      startAt,
      endAt,
      location: form.location.trim() || DEFAULT_LOCATION,
      templateId: form.templateId ?? undefined,
      checklist: buildChecklistPayload(form),
      adaptationsEnabled: buildAdaptationPayload(form),
      ...(form.id || !form.recurringEnabled
        ? {}
        : {
            recurrence: {
              freq: form.recurringFrequency,
              interval: 1,
              count: Math.max(1, Math.min(32, form.recurringCount)),
              timezone: timeZone,
              ...(form.recurringFrequency === "WEEKLY"
                ? {
                    byDay: [weekdayCodeFromDate(form.dateKey, timeZone)]
                  }
                : {})
            }
          })
    };

    try {
      const response = await fetch(
        form.id
          ? `/api/calendar/activities/${encodeURIComponent(form.id)}`
          : "/api/calendar/activities",
        {
          method: form.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        let message = "Unable to save activity.";
        try {
          const errorPayload = (await response.json()) as { error?: string };
          if (errorPayload?.error) message = errorPayload.error;
        } catch {
          // ignore parse failures
        }
        toast({
          title: "Save failed",
          description: message,
          variant: "destructive"
        });
        return;
      }

      setActivityModalOpen(false);
      await refresh();
      toast({
        title: form.id ? "Activity updated" : "Activity scheduled",
        description: form.id
          ? "Your activity details were updated."
          : "The activity was added to the calendar."
      });
    } finally {
      setSavingActivity(false);
    }
  }, [activityForm, refresh, timeZone, toast]);

  const changePeriod = (direction: -1 | 1) => {
    const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
    const nextDate =
      view === "month"
        ? addMonths(anchor, direction)
        : view === "week" || view === "agenda"
          ? addWeeks(anchor, direction)
          : addDays(anchor, direction);
    const nextKey = zonedDateKey(nextDate, timeZone);
    setAnchorDateKey(nextKey);
    if (view !== "agenda") {
      setSelectedDateKey(nextKey);
    }
  };

  const jumpToToday = () => {
    const todayKey = zonedDateKey(new Date(), timeZone);
    setAnchorDateKey(todayKey);
    setSelectedDateKey(todayKey);
  };

  const rightRailDays = useMemo(() => {
    const center = zonedDateStringToUtcStart(selectedDateKey, timeZone) ?? new Date();
    return Array.from({ length: 7 }, (_, index) => addDays(center, index - 3));
  }, [selectedDateKey, timeZone]);

  const showDetails = Boolean(selectedEvent);

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#050b18] p-3 md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-8%_0%,rgba(56,189,248,0.18),transparent_62%),radial-gradient(980px_420px_at_95%_0%,rgba(139,92,246,0.22),transparent_62%),radial-gradient(840px_360px_at_38%_100%,rgba(59,130,246,0.16),transparent_72%)]" />
      <div className="relative z-10 space-y-4">
        <section className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea8d5]">Calendar</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Plan, view, and manage your activity schedule.</h1>
              <p className="mt-2 text-sm text-[#9bb2d8]">
                {formatInTimeZone(new Date(), timeZone, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openNewActivity()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/75 to-blue-600/80 px-4 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                New Activity
              </button>
              <button
                type="button"
                onClick={() => setTemplateDockOpen((current) => !current)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#3d5e8c] bg-[#112344] px-4 text-sm font-semibold text-[#d6e5ff] transition hover:border-[#5a82be]"
              >
                <Sparkles className="h-4 w-4" />
                Use Template
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#36527e] bg-[#0f1d37] px-3 text-sm text-[#d2e3ff]">
              <Search className="h-4 w-4 text-[#9ab4de]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, location, category, or notes..."
                className="h-full w-full bg-transparent text-sm text-white placeholder:text-[#8ca6d0] focus:outline-none"
              />
            </label>

            <div className="flex items-center gap-1 rounded-xl border border-[#3c5d8b] bg-[#112344] p-1">
              {CALENDAR_VIEWS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setView(entry.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                    view === entry.id
                      ? "bg-cyan-500/22 text-cyan-100"
                      : "text-[#c2d6f4] hover:bg-[#17315b] hover:text-white"
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-[#3c5d8b] bg-[#112344] p-1">
              <button
                type="button"
                onClick={() => changePeriod(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#d4e4ff] transition hover:bg-[#17315b]"
                aria-label="Previous period"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <p className="min-w-[160px] px-2 text-center text-xs font-semibold uppercase tracking-[0.11em] text-[#d4e4ff]">
                {rangeLabel}
              </p>
              <button
                type="button"
                onClick={() => changePeriod(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#d4e4ff] transition hover:bg-[#17315b]"
                aria-label="Next period"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={jumpToToday}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/18 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/65"
              >
                <CalendarClock className="h-4 w-4" />
                Today
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpenMobile((value) => !value)}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#3d5e8c] bg-[#112344] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#d6e5ff] transition hover:border-[#5a82be]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>

          <div className={cn("mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5", filtersOpenMobile ? "grid" : "hidden xl:grid")}>
            <FilterSelect
              label="Category"
              value={filters.category}
              onChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
              options={["ALL", ...categories]}
            />
            <FilterSelect
              label="Location"
              value={filters.location}
              onChange={(value) => setFilters((prev) => ({ ...prev, location: value }))}
              options={["ALL", ...locationOptions]}
            />
            <FilterSelect
              label="Attendance Status"
              value={filters.attendanceStatus}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  attendanceStatus: value as AttendanceStatusFilter
                }))
              }
              options={[
                "ALL",
                "SCHEDULED",
                "IN_PROGRESS",
                "NEEDS_ATTENDANCE",
                "ATTENDANCE_RECORDED",
                "COMPLETED"
              ]}
            />
            <FilterSelect
              label="Activity Type"
              value={filters.eventType}
              onChange={(value) => setFilters((prev) => ({ ...prev, eventType: value as EventTypeFilter }))}
              options={["ALL", "GROUP", "ONE_TO_ONE", "SPECIAL_EVENT"]}
            />
            <FilterSelect
              label="Adaptation Tag"
              value={filters.adaptationTag}
              onChange={(value) => setFilters((prev) => ({ ...prev, adaptationTag: value }))}
              options={["ALL", ...resolveAvailableAdaptationTags(visibleEvents)]}
            />
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.key}
              className="relative overflow-hidden rounded-2xl border border-[#2a3e66] bg-[#0d172f] p-4"
            >
              <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", card.tint)} />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#dbe8ff]">{card.title}</p>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
                <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                <p className="mt-1 text-xs text-[#d7e7ff]">{card.hint}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <aside className={cn("space-y-3", templateDockOpen ? "block" : "hidden xl:block")}>
            <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ca7d4]">Template Library</p>
                  <h3 className="mt-1 text-lg font-bold text-white">Schedule faster</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateDockOpen(false)}
                  className="hidden xl:inline-flex rounded-lg border border-[#3d5f8e] bg-[#122546] px-2 py-1 text-xs font-semibold text-[#d7e6ff]"
                >
                  Hide
                </button>
              </div>

              <label className="inline-flex h-10 w-full items-center gap-2 rounded-xl border border-[#34527f] bg-[#0f1c35] px-3 text-sm text-[#d3e3ff]">
                <Search className="h-4 w-4 text-[#95add6]" />
                <input
                  value={templateSearch}
                  onChange={(event) => setTemplateSearch(event.target.value)}
                  placeholder="Search templates..."
                  className="h-full w-full bg-transparent text-sm text-white placeholder:text-[#8ca5cf] focus:outline-none"
                />
              </label>

              <div className="mt-2">
                <FilterSelect
                  label="Template Category"
                  value={templateCategory}
                  onChange={setTemplateCategory}
                  options={["ALL", ...Array.from(new Set(templates.map((template) => template.category))).sort()]}
                />
              </div>

              <div className="mt-3 max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {filteredTemplates.length === 0 ? (
                  <EmptyBlock
                    title="No templates matched."
                    copy="Try another search or clear category filters."
                  />
                ) : null}
                {filteredTemplates.map((template) => (
                  <article
                    key={template.id}
                    className="rounded-xl border border-[#2f446a] bg-[#0f1b34] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{template.title}</p>
                        <p className="mt-0.5 text-xs text-[#9db5dd]">{template.category}</p>
                      </div>
                      <span className="rounded-full border border-[#416190] bg-[#13305a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d9e8ff]">
                        {template.difficulty}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {resolveTemplateAdaptationTags(template).slice(0, 3).map((tag) => (
                        <span
                          key={`${template.id}-${tag}`}
                          className="rounded-full border border-[#42608f] bg-[#152b4e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d6e5ff]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => openTemplateSchedule(template)}
                      className="mt-3 inline-flex items-center gap-1 rounded-full border border-cyan-300/45 bg-cyan-500/18 px-3 py-1 text-xs font-semibold text-cyan-100"
                    >
                      Use template
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            </article>
          </aside>

          <main className="space-y-3">
            <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
              {calendarLoadError ? (
                <div className="mb-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div>
                      <p className="font-semibold">Calendar data could not load.</p>
                      <p className="mt-1 text-xs leading-5 text-amber-100/85">{calendarLoadError}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {isLoading ? <CalendarWorkspaceSkeleton /> : null}
              {!isLoading && visibleEvents.length === 0 ? (
                <EmptyBlock
                  title="No activities found for this view."
                  copy="Clear filters, adjust dates, or add a new activity."
                  actionLabel="New Activity"
                  onAction={() => openNewActivity(selectedDateKey)}
                />
              ) : null}

              {!isLoading && visibleEvents.length > 0 && view === "month" ? (
                <MonthCalendarView
                  monthDays={monthDays}
                  monthAnchor={monthAnchor}
                  selectedDateKey={selectedDateKey}
                  timeZone={timeZone}
                  eventsByDate={eventsByDate}
                  templateById={templateById}
                  onSelectDate={(dateKey) => {
                    setSelectedDateKey(dateKey);
                    setSelectedEventId(null);
                  }}
                  onOpenDay={(dateKey) => {
                    setSelectedDateKey(dateKey);
                    setView("day");
                  }}
                  onOpenEvent={(eventId) => {
                    setSelectedEventId(eventId);
                    setDetailsOpenMobile(true);
                  }}
                />
              ) : null}

              {!isLoading && visibleEvents.length > 0 && view === "week" ? (
                <WeekTimeGridView
                  weekDays={weekDays}
                  eventsByDate={eventsByDate}
                  timeZone={timeZone}
                  templateById={templateById}
                  selectedDateKey={selectedDateKey}
                  onSelectDate={(dateKey) => setSelectedDateKey(dateKey)}
                  onOpenEvent={(eventId) => {
                    setSelectedEventId(eventId);
                    setDetailsOpenMobile(true);
                  }}
                />
              ) : null}

              {!isLoading && visibleEvents.length > 0 && view === "day" ? (
                <DayTimelineView
                  dateKey={selectedDateKey}
                  events={selectedDateEvents}
                  timeZone={timeZone}
                  templateById={templateById}
                  onOpenEvent={(eventId) => {
                    setSelectedEventId(eventId);
                    setDetailsOpenMobile(true);
                  }}
                />
              ) : null}

              {!isLoading && visibleEvents.length > 0 && view === "agenda" ? (
                <AgendaListView
                  events={visibleEvents}
                  timeZone={timeZone}
                  templateById={templateById}
                  onOpenEvent={(eventId) => {
                    setSelectedEventId(eventId);
                    setDetailsOpenMobile(true);
                  }}
                  onSelectDate={(dateKey) => {
                    setSelectedDateKey(dateKey);
                    setView("day");
                  }}
                />
              ) : null}
            </article>
          </main>

          <aside className="space-y-3">
            <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fa8d5]">Day Preview</p>
                  <h3 className="mt-1 text-lg font-bold text-white">
                    {formatInTimeZone(zonedDateStringToUtcStart(selectedDateKey, timeZone) ?? new Date(), timeZone, {
                      weekday: "long",
                      month: "short",
                      day: "numeric"
                    })}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsOpenMobile((open) => !open)}
                  className="inline-flex xl:hidden rounded-lg border border-[#3d5f8e] bg-[#122546] px-2 py-1 text-xs font-semibold text-[#d7e6ff]"
                >
                  {detailsOpenMobile ? "Hide" : "Show"}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 rounded-xl border border-[#2e446c] bg-[#0f1c36] p-2">
                {rightRailDays.map((day) => {
                  const key = zonedDateKey(day, timeZone);
                  const selected = key === selectedDateKey;
                  const isToday = key === todayDateKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDateKey(key)}
                      className={cn(
                        "rounded-lg border px-1 py-1 text-center transition",
                        selected
                          ? "border-cyan-300/55 bg-cyan-500/22 text-cyan-100"
                          : "border-[#3b5d8d] bg-[#132546] text-[#a9bfe1] hover:border-[#5f89c4]"
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                        {format(day, "EEE")}
                      </p>
                      <p className={cn("text-xs font-bold", isToday ? "text-amber-100" : "")}>{format(day, "d")}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
                <SummaryChip label="Total activities" value={daySummary.total} />
                <SummaryChip label="Completed" value={daySummary.completed} />
                <SummaryChip label="Needs attendance" value={daySummary.needsAttendance} />
                <SummaryChip
                  label="Categories"
                  value={daySummary.categories.length}
                />
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ea8d4]">Today&apos;s schedule</p>
                {todayEvents.length === 0 ? (
                  <EmptyBlock
                    title="No activities scheduled today."
                    copy="Add one to start planning the day."
                  />
                ) : (
                  todayEvents.slice(0, 5).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setSelectedDateKey(zonedDateKey(new Date(event.startAt), timeZone));
                        setDetailsOpenMobile(true);
                      }}
                      className="w-full rounded-xl border border-[#2f466f] bg-[#112446] p-2.5 text-left transition hover:border-[#628dc7]"
                    >
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      <p className="mt-0.5 text-xs text-[#9db5dd]">
                        {formatEventTime(event, timeZone)} · {event.location}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ea8d4]">Upcoming</p>
                {upcomingEvents.length === 0 ? (
                  <EmptyBlock
                    title="No upcoming activities."
                    copy="Your next scheduled activities will appear here."
                  />
                ) : (
                  upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setSelectedDateKey(zonedDateKey(new Date(event.startAt), timeZone));
                        setDetailsOpenMobile(true);
                      }}
                      className="w-full rounded-xl border border-[#2f466f] bg-[#112446] p-2.5 text-left transition hover:border-[#628dc7]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#95add5]">
                        {formatInTimeZone(new Date(event.startAt), timeZone, {
                          weekday: "short",
                          month: "short",
                          day: "numeric"
                        })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">{event.title}</p>
                      <p className="mt-0.5 text-xs text-[#9db5dd]">{formatEventTime(event, timeZone)}</p>
                    </button>
                  ))
                )}
              </div>
            </article>

            <article className={cn("rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4", detailsOpenMobile || showDetails ? "block" : "hidden xl:block")}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ea8d4]">Activity Details</p>
                  <h3 className="mt-1 text-lg font-bold text-white">Selected activity</h3>
                </div>
              </div>

              {!selectedEvent ? (
                <EmptyBlock
                  title="Select an activity to view details."
                  copy="Click any event in month, week, day, or agenda view."
                />
              ) : (
                <ActivityDetailsPanel
                  event={selectedEvent}
                  category={resolveEventCategory(selectedEvent, templateById)}
                  attendanceStatus={resolveAttendanceStatus(selectedEvent, new Date())}
                  adaptationTags={resolveAdaptationTags(selectedEvent)}
                  timeZone={timeZone}
                  onEdit={() => openEditActivity(selectedEvent)}
                  onDelete={handleDeleteSelected}
                  onDuplicate={() => {
                    setActivityForm(duplicateFormFromEvent(selectedEvent, templateById, timeZone, selectedDateKey));
                    setActivityModalOpen(true);
                  }}
                />
              )}
            </article>
          </aside>
        </section>
      </div>

      <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#2a3d62] bg-[#0a1328] text-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {activityForm.id ? "Edit Activity" : "Schedule Activity"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-2">
              <FieldLabel label="Title" required>
                <input
                  value={activityForm.title}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white placeholder:text-[#8da6cf] focus:border-cyan-300/70 focus:outline-none"
                  placeholder="Morning Stretch"
                />
              </FieldLabel>
              <FieldLabel label="Category">
                <select
                  value={activityForm.category}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white focus:border-cyan-300/70 focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </FieldLabel>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <FieldLabel label="Date" required>
                <input
                  type="date"
                  value={activityForm.dateKey}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, dateKey: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white focus:border-cyan-300/70 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel label="Start" required>
                <input
                  type="time"
                  value={activityForm.startTime}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white focus:border-cyan-300/70 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel label="End" required>
                <input
                  type="time"
                  value={activityForm.endTime}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, endTime: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white focus:border-cyan-300/70 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel label="Location">
                <input
                  value={activityForm.location}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, location: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white placeholder:text-[#8da6cf] focus:border-cyan-300/70 focus:outline-none"
                  placeholder="Activity Room"
                />
              </FieldLabel>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <FieldLabel label="Description / Notes">
                <textarea
                  value={activityForm.description}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="min-h-[88px] w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 py-2 text-sm text-white placeholder:text-[#8da6cf] focus:border-cyan-300/70 focus:outline-none"
                  placeholder="Optional planning details, setup notes, or reminders."
                />
              </FieldLabel>
              <FieldLabel label="Audience / Unit">
                <input
                  value={activityForm.audience}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, audience: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white placeholder:text-[#8da6cf] focus:border-cyan-300/70 focus:outline-none"
                  placeholder="Unit A, Memory Care, Open Group, etc."
                />
              </FieldLabel>
            </div>

            <div className="rounded-xl border border-[#2f446c] bg-[#0f1d37] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ab2da]">Adaptation Tags</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <ToggleCheck
                  label="Bed-bound"
                  checked={activityForm.bedBound}
                  onChange={(checked) => setActivityForm((prev) => ({ ...prev, bedBound: checked }))}
                />
                <ToggleCheck
                  label="Dementia-Friendly"
                  checked={activityForm.dementiaFriendly}
                  onChange={(checked) => setActivityForm((prev) => ({ ...prev, dementiaFriendly: checked }))}
                />
                <ToggleCheck
                  label="Low Vision / Hearing"
                  checked={activityForm.lowVisionHearing}
                  onChange={(checked) => setActivityForm((prev) => ({ ...prev, lowVisionHearing: checked }))}
                />
                <ToggleCheck
                  label="1:1 Mini"
                  checked={activityForm.oneToOneMini}
                  onChange={(checked) => setActivityForm((prev) => ({ ...prev, oneToOneMini: checked }))}
                />
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {EXTRA_ADAPTATION_TAGS.map((tag) => {
                  const checked = activityForm.extraAdaptationTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setActivityForm((prev) => ({
                          ...prev,
                          extraAdaptationTags: checked
                            ? prev.extraAdaptationTags.filter((entry) => entry !== tag)
                            : [...prev.extraAdaptationTags, tag]
                        }))
                      }
                      className={cn(
                        "rounded-lg border px-2 py-1 text-xs font-semibold transition",
                        checked
                          ? "border-cyan-300/55 bg-cyan-500/20 text-cyan-100"
                          : "border-[#3b5d8d] bg-[#102241] text-[#d7e6ff] hover:border-[#5f89c4]"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#2f446c] bg-[#0f1d37] p-3">
              <div className="grid gap-2 md:grid-cols-[auto_auto_1fr_auto] md:items-center">
                <ToggleCheck
                  label="Attendance follow-up needed"
                  checked={activityForm.attendanceFollowUp}
                  onChange={(checked) => setActivityForm((prev) => ({ ...prev, attendanceFollowUp: checked }))}
                />
                <ToggleCheck
                  label="Recurring schedule"
                  checked={activityForm.recurringEnabled}
                  disabled={Boolean(activityForm.id)}
                  onChange={(checked) => setActivityForm((prev) => ({ ...prev, recurringEnabled: checked }))}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={activityForm.recurringFrequency}
                    disabled={!activityForm.recurringEnabled || Boolean(activityForm.id)}
                    onChange={(event) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        recurringFrequency: event.target.value as ActivityFormState["recurringFrequency"]
                      }))
                    }
                    className="h-10 rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white disabled:opacity-50"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    disabled={!activityForm.recurringEnabled || Boolean(activityForm.id)}
                    value={activityForm.recurringCount}
                    onChange={(event) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        recurringCount: Number(event.target.value || 1)
                      }))
                    }
                    className="h-10 rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white disabled:opacity-50"
                  />
                </div>
                {activityForm.id ? (
                  <p className="text-xs text-[#95add7]">Recurring edits apply per instance.</p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              {activityForm.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(activityForm.id);
                    setActivityModalOpen(false);
                  }}
                  className="inline-flex h-10 items-center rounded-full border border-[#3d5e8d] bg-[#112344] px-4 text-sm font-semibold text-[#d6e5ff]"
                >
                  Back to Details
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openNewActivity(activityForm.dateKey)}
                  className="inline-flex h-10 items-center rounded-full border border-[#3d5e8d] bg-[#112344] px-4 text-sm font-semibold text-[#d6e5ff]"
                >
                  Save & Add Another
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="inline-flex h-10 items-center rounded-full border border-[#3d5e8d] bg-[#112344] px-4 text-sm font-semibold text-[#d6e5ff]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingActivity}
                onClick={handleSaveActivity}
                className="inline-flex h-10 items-center rounded-full border border-cyan-300/45 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 disabled:opacity-60"
              >
                {savingActivity ? "Saving..." : activityForm.id ? "Save Changes" : "Schedule Activity"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthCalendarView({
  monthDays,
  monthAnchor,
  selectedDateKey,
  timeZone,
  eventsByDate,
  templateById,
  onSelectDate,
  onOpenDay,
  onOpenEvent
}: {
  monthDays: Date[];
  monthAnchor: Date;
  selectedDateKey: string;
  timeZone: string;
  eventsByDate: Map<string, EventRecord[]>;
  templateById: Map<string, CalendarTemplateLite>;
  onSelectDate: (dateKey: string) => void;
  onOpenDay: (dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div
            key={day}
            className="rounded-lg border border-[#2d446b] bg-[#112444] py-2 text-center text-[11px] font-semibold uppercase tracking-[0.13em] text-[#bfd3f2]"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day) => {
          const key = zonedDateKey(day, timeZone);
          const dayEvents = eventsByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, monthAnchor);
          const selected = key === selectedDateKey;
          const today = key === zonedDateKey(new Date(), timeZone);
          return (
            <div
              key={key}
              className={cn(
                "min-h-[136px] rounded-xl border bg-[#0d1932] p-2 transition",
                inMonth ? "border-[#2b4168]" : "border-[#233553] opacity-70",
                selected ? "ring-1 ring-cyan-300/45" : "",
                today ? "shadow-[0_0_0_1px_rgba(251,191,36,0.45)]" : ""
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(key)}
                className="mb-1 inline-flex w-full items-center justify-between rounded-md px-1 text-left text-xs font-semibold text-[#d9e8ff]"
              >
                <span>{format(day, "d")}</span>
                {today ? (
                  <span className="rounded-full border border-amber-300/45 bg-amber-500/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-amber-100">
                    Today
                  </span>
                ) : null}
              </button>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onOpenEvent(event.id)}
                    className={cn(
                      "w-full rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:brightness-110",
                      CATEGORY_COLOR[resolveEventCategory(event, templateById)] ?? CATEGORY_COLOR.Uncategorized
                    )}
                  >
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-0.5 opacity-90">
                      {formatInTimeZone(new Date(event.startAt), timeZone, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </button>
                ))}
                {dayEvents.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => onOpenDay(key)}
                    className="w-full rounded-md border border-[#3d5e8d] bg-[#132748] px-1.5 py-1 text-left text-[11px] font-semibold text-[#d8e6ff]"
                  >
                    +{dayEvents.length - 3} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekTimeGridView({
  weekDays,
  eventsByDate,
  timeZone,
  templateById,
  selectedDateKey,
  onSelectDate,
  onOpenEvent
}: {
  weekDays: Date[];
  eventsByDate: Map<string, EventRecord[]>;
  timeZone: string;
  templateById: Map<string, CalendarTemplateLite>;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
}) {
  const hourRows = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, idx) => GRID_START_HOUR + idx);
  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR + 1) * GRID_HOUR_HEIGHT;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-2">
        <div />
        {weekDays.map((day) => {
          const key = zonedDateKey(day, timeZone);
          const selected = selectedDateKey === key;
          const today = key === zonedDateKey(new Date(), timeZone);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={cn(
                "rounded-xl border px-2 py-2 text-left transition",
                selected
                  ? "border-cyan-300/45 bg-cyan-500/18"
                  : "border-[#2f466f] bg-[#112444] hover:border-[#5d87c1]"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c7daf7]">{format(day, "EEE")}</p>
              <p className={cn("text-lg font-black", today ? "text-amber-100" : "text-white")}>{format(day, "d")}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-2">
        <div className="space-y-0">
          {hourRows.map((hour) => (
            <div
              key={hour}
              className="flex h-[60px] items-start justify-end pr-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8fa8d4]"
            >
              {minutesToLabel(hour * 60)}
            </div>
          ))}
        </div>

        {weekDays.map((day) => {
          const key = zonedDateKey(day, timeZone);
          const dayEvents = eventsByDate.get(key) ?? [];
          const positioned = positionWeekEvents(dayEvents, timeZone);
          return (
            <div key={key} className="relative overflow-hidden rounded-xl border border-[#2f466f] bg-[#0d1832]" style={{ height: gridHeight }}>
              {hourRows.map((hour) => (
                <div
                  key={`${key}-${hour}`}
                  className="absolute left-0 right-0 border-t border-[#203253]"
                  style={{ top: `${(hour - GRID_START_HOUR) * GRID_HOUR_HEIGHT}px` }}
                />
              ))}

              {positioned.map((entry) => {
                const category = resolveEventCategory(entry.event, templateById);
                const top = ((entry.startMinutes - GRID_START_HOUR * 60) / 60) * GRID_HOUR_HEIGHT;
                const height = Math.max(36, ((entry.endMinutes - entry.startMinutes) / 60) * GRID_HOUR_HEIGHT);
                const width = entry.columns > 1 ? `calc(${100 / entry.columns}% - 4px)` : "calc(100% - 6px)";
                const left = entry.columns > 1 ? `calc(${(100 / entry.columns) * entry.column}% + 2px)` : "3px";

                return (
                  <button
                    key={entry.event.id}
                    type="button"
                    onClick={() => onOpenEvent(entry.event.id)}
                    className={cn(
                      "absolute overflow-hidden rounded-md border p-1 text-left text-[10px] leading-tight transition hover:brightness-110",
                      CATEGORY_COLOR[category] ?? CATEGORY_COLOR.Uncategorized
                    )}
                    style={{ top, height, left, width }}
                  >
                    <p className="truncate font-semibold">{entry.event.title}</p>
                    <p className="truncate">{formatInTimeZone(new Date(entry.event.startAt), timeZone, { hour: "numeric", minute: "2-digit" })}</p>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayTimelineView({
  dateKey,
  events,
  timeZone,
  templateById,
  onOpenEvent
}: {
  dateKey: string;
  events: EventRecord[];
  timeZone: string;
  templateById: Map<string, CalendarTemplateLite>;
  onOpenEvent: (eventId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#2f466f] bg-[#112444] px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#95acd6]">
          {formatInTimeZone(zonedDateStringToUtcStart(dateKey, timeZone) ?? new Date(), timeZone, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          })}
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyBlock
          title="No activities scheduled for this day."
          copy="Use New Activity or template scheduling to build this day."
        />
      ) : (
        events.map((event) => {
          const category = resolveEventCategory(event, templateById);
          const adaptationTags = resolveAdaptationTags(event);
          const attendanceStatus = resolveAttendanceStatus(event, new Date());
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpenEvent(event.id)}
              className="w-full rounded-xl border border-[#2f466f] bg-[#112444] p-3 text-left transition hover:border-[#638fc9]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">{event.title}</p>
                  <p className="mt-0.5 text-sm text-[#9db5dd]">
                    {formatEventTime(event, timeZone)} · {event.location}
                  </p>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", CATEGORY_COLOR[category] ?? CATEGORY_COLOR.Uncategorized)}>
                  {category}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <AttendanceStatusChip status={attendanceStatus} />
                {adaptationTags.map((tag) => (
                  <span
                    key={`${event.id}-${tag}`}
                    className="rounded-full border border-[#42608f] bg-[#152b4e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d6e5ff]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

function AgendaListView({
  events,
  timeZone,
  templateById,
  onOpenEvent,
  onSelectDate
}: {
  events: EventRecord[];
  timeZone: string;
  templateById: Map<string, CalendarTemplateLite>;
  onOpenEvent: (eventId: string) => void;
  onSelectDate: (dateKey: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const event of events) {
      const dateKey = zonedDateKey(new Date(event.startAt), timeZone);
      const current = map.get(dateKey);
      if (current) {
        current.push(event);
      } else {
        map.set(dateKey, [event]);
      }
    }
    const ordered = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, dateEvents]) => ({
        dateKey,
        events: dateEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      }));
    return ordered;
  }, [events, timeZone]);

  return (
    <div className="space-y-3">
      {grouped.map((group) => (
        <section key={group.dateKey} className="rounded-xl border border-[#2f466f] bg-[#112444] p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectDate(group.dateKey)}
              className="text-left"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94acd6]">
                {formatInTimeZone(zonedDateStringToUtcStart(group.dateKey, timeZone) ?? new Date(), timeZone, {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </button>
            <p className="text-xs text-[#b7cbed]">{group.events.length} activities</p>
          </div>
          <div className="space-y-2">
            {group.events.map((event) => {
              const category = resolveEventCategory(event, templateById);
              const attendanceStatus = resolveAttendanceStatus(event, new Date());
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onOpenEvent(event.id)}
                  className="w-full rounded-lg border border-[#2d446a] bg-[#0f1d37] p-2.5 text-left transition hover:border-[#618cc7]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{event.title}</p>
                      <p className="mt-0.5 text-xs text-[#9ab3dc]">
                        {formatEventTime(event, timeZone)} · {event.location}
                      </p>
                    </div>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", CATEGORY_COLOR[category] ?? CATEGORY_COLOR.Uncategorized)}>
                      {category}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <AttendanceStatusChip status={attendanceStatus} />
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[#95aed8]">
                      {resolveEventType(category, event.title).replaceAll("_", " ")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ActivityDetailsPanel({
  event,
  category,
  attendanceStatus,
  adaptationTags,
  timeZone,
  onEdit,
  onDelete,
  onDuplicate
}: {
  event: EventRecord;
  category: string;
  attendanceStatus: AttendanceStatusFilter;
  adaptationTags: string[];
  timeZone: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const meta = parseEventMeta(event.adaptationsEnabled);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#2f456e] bg-[#112444] p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-white">{event.title}</p>
            <p className="mt-1 text-sm text-[#9eb5dd]">
              {formatInTimeZone(new Date(event.startAt), timeZone, {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
              })}{" "}
              -{" "}
              {formatInTimeZone(new Date(event.endAt), timeZone, {
                hour: "numeric",
                minute: "2-digit"
              })}
            </p>
            <p className="mt-1 text-sm text-[#9eb5dd]">{event.location}</p>
          </div>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", CATEGORY_COLOR[category] ?? CATEGORY_COLOR.Uncategorized)}>
            {category}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <AttendanceStatusChip status={attendanceStatus} />
          {adaptationTags.map((tag) => (
            <span
              key={`${event.id}-tag-${tag}`}
              className="rounded-full border border-[#42608f] bg-[#152b4e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d6e5ff]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {meta.description ? (
        <div className="rounded-xl border border-[#2f456e] bg-[#112444] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#92acd8]">Description</p>
          <p className="mt-1 text-sm text-[#d7e6ff]">{meta.description}</p>
        </div>
      ) : null}

      {meta.audience ? (
        <div className="rounded-xl border border-[#2f456e] bg-[#112444] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#92acd8]">Audience</p>
          <p className="mt-1 text-sm text-[#d7e6ff]">{meta.audience}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#2f456e] bg-[#112444] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#92acd8]">Quick Actions</p>
        <div className="mt-2 grid gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 items-center justify-between rounded-lg border border-[#3f608f] bg-[#13305a] px-3 text-sm font-semibold text-[#dce9ff]"
          >
            Edit Activity
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <Link
            href={`/app/calendar/${encodeURIComponent(event.id)}/attendance`}
            className="inline-flex h-9 items-center justify-between rounded-lg border border-[#3f608f] bg-[#13305a] px-3 text-sm font-semibold text-[#dce9ff]"
          >
            Take Attendance
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/app/documentation/progress-notes/new?activityId=${encodeURIComponent(event.id)}`}
            className="inline-flex h-9 items-center justify-between rounded-lg border border-[#3f608f] bg-[#13305a] px-3 text-sm font-semibold text-[#dce9ff]"
          >
            Add Progress Note
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/app/documentation/one-to-one/new"
            className="inline-flex h-9 items-center justify-between rounded-lg border border-[#3f608f] bg-[#13305a] px-3 text-sm font-semibold text-[#dce9ff]"
          >
            Add 1:1 Note
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex h-9 items-center justify-between rounded-lg border border-[#3f608f] bg-[#13305a] px-3 text-sm font-semibold text-[#dce9ff]"
          >
            Duplicate
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 items-center justify-between rounded-lg border border-rose-300/45 bg-rose-500/20 px-3 text-sm font-semibold text-rose-100"
          >
            Delete
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarWorkspaceSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 rounded-lg border border-[#2c4066] bg-[#10203d] animate-pulse" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={`head-${index}`} className="h-8 rounded-lg border border-[#2c4066] bg-[#10203d] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={`cell-${index}`} className="h-[120px] rounded-xl border border-[#2c4066] bg-[#10203d] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8fa9d4]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm text-white focus:border-cyan-300/70 focus:outline-none"
      >
        {options.map((option) => (
          <option key={`${label}-${option}`} value={option}>
            {formatFilterOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldLabel({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab2da]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function ToggleCheck({
  label,
  checked,
  onChange,
  disabled
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition",
        checked
          ? "border-cyan-300/55 bg-cyan-500/20 text-cyan-100"
          : "border-[#3d5e8d] bg-[#102241] text-[#d6e5ff] hover:border-[#628bc4]",
        disabled ? "cursor-not-allowed opacity-60" : ""
      )}
    >
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 items-center justify-center rounded border",
          checked ? "border-cyan-200 bg-cyan-300/35" : "border-[#5d7fb0]"
        )}
      >
        {checked ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#34527f] bg-[#102241] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#90a8d3]">{label}</p>
      <p className="mt-1 text-base font-black text-white">{value}</p>
    </div>
  );
}

function EmptyBlock({
  title,
  copy,
  actionLabel,
  onAction
}: {
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#3a5384] bg-[#0f1c35] px-3 py-4 text-sm text-[#9db6de]">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs">{copy}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex h-8 items-center rounded-full border border-cyan-300/45 bg-cyan-500/18 px-3 text-xs font-semibold text-cyan-100"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function AttendanceStatusChip({ status }: { status: AttendanceStatusFilter }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", attendanceChipClass(status))}>
      {formatFilterOption(status)}
    </span>
  );
}

function buildEmptyForm(dateKey: string, templateId: string | null): ActivityFormState {
  return {
    id: null,
    title: "",
    dateKey,
    startTime: "10:00",
    endTime: minutesToTime(parseTimeToMinutes("10:00") + DEFAULT_DURATION_MINUTES),
    location: DEFAULT_LOCATION,
    category: "Social",
    description: "",
    audience: "",
    templateId,
    bedBound: false,
    dementiaFriendly: false,
    lowVisionHearing: false,
    oneToOneMini: false,
    extraAdaptationTags: [],
    attendanceFollowUp: false,
    recurringEnabled: false,
    recurringFrequency: "WEEKLY",
    recurringCount: 4
  };
}

function buildFormFromTemplate(template: CalendarTemplateLite, dateKey: string): ActivityFormState {
  const base = buildEmptyForm(dateKey, template.id);
  const adaptation = parseAdaptationSource(template.adaptations);
  return {
    ...base,
    title: template.title,
    category: template.category || base.category,
    bedBound: adaptation.bedBound,
    dementiaFriendly: adaptation.dementiaFriendly,
    lowVisionHearing: adaptation.lowVisionHearing,
    oneToOneMini: adaptation.oneToOneMini,
    extraAdaptationTags: adaptation.meta.extraAdaptationTags ?? []
  };
}

function buildFormFromEvent(
  event: EventRecord,
  templateById: Map<string, CalendarTemplateLite>,
  timeZone: string
): ActivityFormState {
  const adaptation = parseAdaptationSource(event.adaptationsEnabled);
  const startDate = new Date(event.startAt);
  const endDate = new Date(event.endAt);
  const category = resolveEventCategory(event, templateById);
  const meta = adaptation.meta;

  return {
    id: event.id,
    title: event.title,
    dateKey: zonedDateKey(startDate, timeZone),
    startTime: formatInTimeZone(startDate, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    endTime: formatInTimeZone(endDate, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    location: event.location,
    category,
    description: meta.description ?? "",
    audience: meta.audience ?? "",
    templateId: event.templateId ?? null,
    bedBound: adaptation.bedBound,
    dementiaFriendly: adaptation.dementiaFriendly,
    lowVisionHearing: adaptation.lowVisionHearing,
    oneToOneMini: adaptation.oneToOneMini,
    extraAdaptationTags: meta.extraAdaptationTags ?? [],
    attendanceFollowUp: Boolean(meta.attendanceFollowUp),
    recurringEnabled: false,
    recurringFrequency: "WEEKLY",
    recurringCount: 4
  };
}

function duplicateFormFromEvent(
  event: EventRecord,
  templateById: Map<string, CalendarTemplateLite>,
  timeZone: string,
  duplicateDateKey: string
): ActivityFormState {
  const base = buildFormFromEvent(event, templateById, timeZone);
  return {
    ...base,
    id: null,
    dateKey: duplicateDateKey
  };
}

function buildChecklistPayload(form: ActivityFormState) {
  const lines = [
    form.description ? `Plan note: ${form.description}` : null,
    form.audience ? `Audience: ${form.audience}` : null,
    form.attendanceFollowUp ? "Follow-up documentation required" : null
  ].filter((line): line is string => Boolean(line));
  return lines.map((line) => ({ text: line, done: false }));
}

function buildAdaptationPayload(form: ActivityFormState) {
  return {
    bedBound: form.bedBound,
    dementiaFriendly: form.dementiaFriendly,
    lowVisionHearing: form.lowVisionHearing,
    oneToOneMini: form.oneToOneMini,
    overrides: {
      metaCategory: form.category,
      ...(form.description ? { metaDescription: form.description } : {}),
      ...(form.audience ? { metaAudience: form.audience } : {}),
      ...(form.extraAdaptationTags.length > 0 ? { metaTags: form.extraAdaptationTags.join("|") } : {}),
      ...(form.attendanceFollowUp ? { metaAttendanceFollowUp: "true" } : {})
    }
  };
}

function parseAdaptationSource(value: unknown) {
  const safe = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const overrides = safe.overrides && typeof safe.overrides === "object" ? (safe.overrides as Record<string, unknown>) : {};

  const meta: EventMeta = {
    category: typeof overrides.metaCategory === "string" ? overrides.metaCategory : undefined,
    description: typeof overrides.metaDescription === "string" ? overrides.metaDescription : undefined,
    audience: typeof overrides.metaAudience === "string" ? overrides.metaAudience : undefined,
    extraAdaptationTags:
      typeof overrides.metaTags === "string"
        ? overrides.metaTags
            .split("|")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : undefined,
    attendanceFollowUp:
      typeof overrides.metaAttendanceFollowUp === "string"
        ? overrides.metaAttendanceFollowUp === "true"
        : undefined
  };

  return {
    bedBound: Boolean(safe.bedBound),
    dementiaFriendly: Boolean(safe.dementiaFriendly),
    lowVisionHearing: Boolean(safe.lowVisionHearing),
    oneToOneMini: Boolean(safe.oneToOneMini),
    meta
  };
}

function parseEventMeta(value: unknown): EventMeta {
  return parseAdaptationSource(value).meta;
}

function resolveEventCategory(event: EventRecord, templateById: Map<string, CalendarTemplateLite>) {
  if (event.templateId) {
    const template = templateById.get(event.templateId);
    if (template?.category) return template.category;
  }
  const meta = parseEventMeta(event.adaptationsEnabled);
  if (meta.category && meta.category.trim().length > 0) return meta.category;
  return inferCategoryFromTitle(event.title);
}

function inferCategoryFromTitle(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("1:1") || normalized.includes("one-to-one") || normalized.includes("visit")) return "1:1";
  if (normalized.includes("exercise") || normalized.includes("stretch") || normalized.includes("walk")) return "Exercise";
  if (normalized.includes("bingo") || normalized.includes("social") || normalized.includes("party")) return "Social";
  if (normalized.includes("devotional") || normalized.includes("church") || normalized.includes("spiritual")) return "Spiritual";
  if (normalized.includes("trivia") || normalized.includes("word") || normalized.includes("memory")) return "Cognitive";
  if (normalized.includes("sensory")) return "Sensory";
  if (normalized.includes("outing") || normalized.includes("trip")) return "Outing";
  if (normalized.includes("birthday") || normalized.includes("special")) return "Special Event";
  if (normalized.includes("music") || normalized.includes("movie")) return "Entertainment";
  return "Uncategorized";
}

function resolveEventType(category: string, title: string): EventTypeFilter {
  if (category === "1:1") return "ONE_TO_ONE";
  const normalized = title.toLowerCase();
  if (normalized.includes("birthday") || normalized.includes("special")) return "SPECIAL_EVENT";
  return "GROUP";
}

function resolveAttendanceStatus(event: EventRecord, now: Date): AttendanceStatusFilter {
  if (event.attendanceTaken) return "ATTENDANCE_RECORDED";
  const start = new Date(event.startAt).getTime();
  const end = new Date(event.endAt).getTime();
  const nowMs = now.getTime();
  if (nowMs < start) return "SCHEDULED";
  if (nowMs >= start && nowMs <= end) return "IN_PROGRESS";
  if (nowMs > end && !event.attendanceTaken) return "NEEDS_ATTENDANCE";
  return "COMPLETED";
}

function resolveAdaptationTags(event: EventRecord) {
  const parsed = parseAdaptationSource(event.adaptationsEnabled);
  const tags: string[] = [];
  if (parsed.bedBound) tags.push("Bed-bound");
  if (parsed.dementiaFriendly) tags.push("Dementia-Friendly");
  if (parsed.lowVisionHearing) tags.push("Low Vision / Hearing");
  if (parsed.oneToOneMini) tags.push("1:1 Mini");
  if (parsed.meta.extraAdaptationTags) {
    tags.push(...parsed.meta.extraAdaptationTags);
  }
  return Array.from(new Set(tags));
}

function resolveTemplateAdaptationTags(template: CalendarTemplateLite) {
  const parsed = parseAdaptationSource(template.adaptations);
  const tags: string[] = [];
  if (parsed.bedBound) tags.push("Bed-bound");
  if (parsed.dementiaFriendly) tags.push("Dementia-Friendly");
  if (parsed.lowVisionHearing) tags.push("Low Vision / Hearing");
  if (parsed.oneToOneMini) tags.push("1:1 Mini");
  if (parsed.meta.extraAdaptationTags) tags.push(...parsed.meta.extraAdaptationTags);
  return Array.from(new Set(tags));
}

function resolveAvailableAdaptationTags(events: EventRecord[]) {
  return Array.from(new Set(events.flatMap((event) => resolveAdaptationTags(event)))).sort((a, b) => a.localeCompare(b));
}

function formatEventTime(event: EventRecord, timeZone: string) {
  const start = formatInTimeZone(new Date(event.startAt), timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
  const end = formatInTimeZone(new Date(event.endAt), timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${start} - ${end}`;
}

function positionWeekEvents(events: EventRecord[], timeZone: string) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  const laneEnds: number[] = [];
  return sorted.map((event) => {
    const start = toDayMinutes(event.startAt, timeZone);
    const end = toDayMinutes(event.endAt, timeZone);
    let lane = laneEnds.findIndex((laneEnd) => start >= laneEnd);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }

    return {
      event,
      startMinutes: start,
      endMinutes: Math.max(start + 30, end),
      column: lane,
      columns: laneEnds.length
    };
  });
}

function toDayMinutes(isoValue: string, timeZone: string) {
  const value = new Date(isoValue);
  const hour = Number(
    formatInTimeZone(value, timeZone, {
      hour: "2-digit",
      hourCycle: "h23"
    })
  );
  const minute = Number(
    formatInTimeZone(value, timeZone, {
      minute: "2-digit"
    })
  );
  return hour * 60 + minute;
}

function weekdayCodeFromDate(dateKey: string, timeZone: string) {
  const date = zonedDateStringToUtcStart(dateKey, timeZone) ?? new Date();
  const weekday = format(date, "EEE").toUpperCase();
  if (weekday.startsWith("MON")) return "MO";
  if (weekday.startsWith("TUE")) return "TU";
  if (weekday.startsWith("WED")) return "WE";
  if (weekday.startsWith("THU")) return "TH";
  if (weekday.startsWith("FRI")) return "FR";
  if (weekday.startsWith("SAT")) return "SA";
  return "SU";
}

function attendanceChipClass(status: AttendanceStatusFilter) {
  if (status === "ATTENDANCE_RECORDED") return "border-emerald-300/45 bg-emerald-500/20 text-emerald-100";
  if (status === "NEEDS_ATTENDANCE") return "border-rose-300/45 bg-rose-500/20 text-rose-100";
  if (status === "IN_PROGRESS") return "border-amber-300/45 bg-amber-500/20 text-amber-100";
  if (status === "SCHEDULED") return "border-blue-300/45 bg-blue-500/20 text-blue-100";
  return "border-[#42608f] bg-[#152b4e] text-[#d6e5ff]";
}

function formatFilterOption(value: string) {
  if (value === "ALL") return "All";
  return value.replaceAll("_", " ");
}
