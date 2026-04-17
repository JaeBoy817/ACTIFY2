"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type DragEvent
} from "react";
import { CalendarDays, CheckCircle2, Clock3, Sparkles } from "lucide-react";

import { CalendarCommandBar } from "@/components/calendar/CalendarCommandBar";
import { InspectorDrawer } from "@/components/calendar/InspectorDrawer/InspectorDrawer";
import { ScheduleModal } from "@/components/calendar/modals/ScheduleModal";
import { TemplateDock } from "@/components/calendar/TemplateDock/TemplateDock";
import { AgendaView } from "@/components/calendar/views/AgendaView";
import { MonthView } from "@/components/calendar/views/MonthView";
import type { CalendarEventLite, CalendarTemplateLite, CalendarViewMode, ScheduleFormState } from "@/components/calendar/types";
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_LOCATION,
  emptyAdaptations,
  eventCategory,
  formatRangeLabel,
  minutesToTime,
  parseAdaptations,
  parseChecklistItems,
  parseTimeToMinutes,
  shiftAnchorDate,
  SLOT_MINUTES,
  toAdaptationPayload,
  toChecklistPayload,
  toUtcIso
} from "@/components/calendar/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invalidateClientCache } from "@/lib/perf/client-cache";
import { zonedDateKey } from "@/lib/timezone";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { useCalendarQueries } from "@/hooks/useCalendarQueries";
import { useCalendarRange } from "@/hooks/useCalendarRange";
import { useCalendarUIStore, type CalendarSubsection } from "@/store/useCalendarUIStore";

const WeekView = dynamic(
  () => import("@/components/calendar/views/WeekView").then((mod) => mod.WeekView),
  {
    loading: () => <div className="h-[520px] rounded-3xl border border-cyan-400/20 bg-slate-950/75" />
  }
);

const DayView = dynamic(
  () => import("@/components/calendar/views/DayView").then((mod) => mod.DayView),
  {
    loading: () => <div className="h-[520px] rounded-3xl border border-cyan-400/20 bg-slate-950/75" />
  }
);

type CalendarShellProps = {
  templates: CalendarTemplateLite[];
  initialDateKey: string;
  initialView: CalendarViewMode;
  initialSection: CalendarSubsection;
  timeZone: string;
};

function toDraftFromEvent(event: CalendarEventLite, timeZone: string): ScheduleFormState {
  return {
    id: event.id,
    templateId: event.templateId,
    title: event.title,
    dateKey: zonedDateKey(new Date(event.startAt), timeZone),
    startTime: new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
      new Date(event.startAt)
    ),
    endTime: new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
      new Date(event.endAt)
    ),
    location: event.location,
    notes: "",
    checklistItems: parseChecklistItems(event.checklist),
    adaptations: parseAdaptations(event.adaptationsEnabled)
  };
}

function toDraftFromTemplate(template: CalendarTemplateLite, dateKey: string, startMinutes: number): ScheduleFormState {
  return {
    id: null,
    templateId: template.id,
    title: template.title,
    dateKey,
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(startMinutes + DEFAULT_DURATION_MINUTES),
    location: DEFAULT_LOCATION,
    notes: "",
    checklistItems: parseChecklistItems(template.defaultChecklist),
    adaptations: parseAdaptations(template.adaptations)
  };
}

function toDraftManual(dateKey: string, startMinutes: number): ScheduleFormState {
  return {
    id: null,
    templateId: null,
    title: "",
    dateKey,
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(startMinutes + DEFAULT_DURATION_MINUTES),
    location: DEFAULT_LOCATION,
    notes: "",
    checklistItems: [],
    adaptations: emptyAdaptations()
  };
}

export function CalendarShell({ templates, initialDateKey, initialView, initialSection, timeZone }: CalendarShellProps) {
  const router = useRouter();
  const { toast } = useToast();

  const initialize = useCalendarUIStore((state) => state.initialize);
  const viewMode = useCalendarUIStore((state) => state.viewMode);
  const setViewMode = useCalendarUIStore((state) => state.setViewMode);
  const anchorDateKey = useCalendarUIStore((state) => state.anchorDateKey);
  const setAnchorDateKey = useCalendarUIStore((state) => state.setAnchorDateKey);
  const selectedDateKey = useCalendarUIStore((state) => state.selectedDateKey);
  const setSelectedDateKey = useCalendarUIStore((state) => state.setSelectedDateKey);
  const selectedActivityId = useCalendarUIStore((state) => state.selectedActivityId);
  const setSelectedActivityId = useCalendarUIStore((state) => state.setSelectedActivityId);
  const drawerOpen = useCalendarUIStore((state) => state.drawerOpen);
  const openDrawer = useCalendarUIStore((state) => state.openDrawer);
  const closeDrawer = useCalendarUIStore((state) => state.closeDrawer);
  const drawerTab = useCalendarUIStore((state) => state.drawerTab);
  const setDrawerTab = useCalendarUIStore((state) => state.setDrawerTab);
  const templateDockOpen = useCalendarUIStore((state) => state.templateDockOpen);
  const setTemplateDockOpen = useCalendarUIStore((state) => state.setTemplateDockOpen);
  const toggleTemplateDockOpen = useCalendarUIStore((state) => state.toggleTemplateDockOpen);
  const templateDockMobileOpen = useCalendarUIStore((state) => state.templateDockMobileOpen);
  const setTemplateDockMobileOpen = useCalendarUIStore((state) => state.setTemplateDockMobileOpen);
  const filters = useCalendarUIStore((state) => state.filters);
  const setFilters = useCalendarUIStore((state) => state.setFilters);
  const resetFilters = useCalendarUIStore((state) => state.resetFilters);
  const commandSearch = useCalendarUIStore((state) => state.commandSearch);
  const setCommandSearch = useCalendarUIStore((state) => state.setCommandSearch);
  const templateSearch = useCalendarUIStore((state) => state.templateSearch);
  const setTemplateSearch = useCalendarUIStore((state) => state.setTemplateSearch);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hoveredDropDay, setHoveredDropDay] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState("ALL");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalMode, setScheduleModalMode] = useState<"create" | "edit">("create");
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);

  useEffect(() => {
    initialize({
      initialView,
      initialDateKey,
      initialSection
    });
  }, [initialize, initialDateKey, initialSection, initialView]);

  useEffect(() => {
    if (initialSection === "library") {
      setTemplateDockOpen(true);
      setDrawerTab("library");
      return;
    }
    if (initialSection === "settings") {
      setSettingsOpen(true);
    }
  }, [initialSection, setDrawerTab, setTemplateDockOpen]);

  const effectiveAnchorDateKey = anchorDateKey || initialDateKey;
  const effectiveView = viewMode || initialView;

  const { range, weekDays, dayDate } = useCalendarRange({
    view: effectiveView,
    anchorDateKey: effectiveAnchorDateKey,
    timeZone
  });

  const { events, isLoading, refresh, setEvents } = useCalendarQueries({
    view: effectiveView,
    range,
    anchorDateKey: effectiveAnchorDateKey,
    timeZone,
    includeStats: false
  });

  useEffect(() => {
    router.replace(`/app/calendar?view=${effectiveView}&date=${effectiveAnchorDateKey}`, { scroll: false });
  }, [effectiveAnchorDateKey, effectiveView, router]);

  const templateById = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates]);
  const categories = useMemo(() => Array.from(new Set(templates.map((template) => template.category))).sort((a, b) => a.localeCompare(b)), [templates]);
  const locationOptions = useMemo(() => Array.from(new Set(events.map((event) => event.location))).sort((a, b) => a.localeCompare(b)), [events]);

  const deferredSearch = useDeferredValue(commandSearch.trim().toLowerCase());

  const visibleEvents = useMemo(() => {
    return events.filter((calendarEvent) => {
      if (filters.location !== "ALL" && calendarEvent.location !== filters.location) return false;
      if (filters.categories.length > 0) {
        const category = eventCategory(calendarEvent, templateById);
        if (!filters.categories.includes(category)) return false;
      }
      if (!deferredSearch) return true;
      const category = eventCategory(calendarEvent, templateById);
      return `${calendarEvent.title} ${calendarEvent.location} ${category}`.toLowerCase().includes(deferredSearch);
    });
  }, [deferredSearch, events, filters.categories, filters.location, templateById]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDateKey) return [];
    return visibleEvents
      .filter((event) => zonedDateKey(new Date(event.startAt), timeZone) === selectedDateKey)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [selectedDateKey, timeZone, visibleEvents]);

  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null;
    return events.find((event) => event.id === selectedActivityId) ?? null;
  }, [events, selectedActivityId]);

  const rangeLabel = useMemo(() => formatRangeLabel(effectiveView, effectiveAnchorDateKey, timeZone), [effectiveAnchorDateKey, effectiveView, timeZone]);
  const todayDateKey = useMemo(() => zonedDateKey(new Date(), timeZone), [timeZone]);
  const todayEventsCount = useMemo(
    () => visibleEvents.filter((event) => zonedDateKey(new Date(event.startAt), timeZone) === todayDateKey).length,
    [todayDateKey, timeZone, visibleEvents]
  );
  const completedInView = useMemo(
    () => visibleEvents.filter((event) => new Date(event.endAt).getTime() < Date.now()).length,
    [visibleEvents]
  );
  const summaryCards = useMemo(
    () => [
      {
        label: "Scheduled In View",
        value: visibleEvents.length,
        hint: rangeLabel,
        icon: CalendarDays,
        tint: "from-cyan-500/20 to-indigo-500/10 text-cyan-100"
      },
      {
        label: "Today",
        value: todayEventsCount,
        hint: "Activities scheduled today",
        icon: Clock3,
        tint: "from-indigo-500/20 to-violet-500/10 text-indigo-100"
      },
      {
        label: "Completed",
        value: completedInView,
        hint: "Activities already held",
        icon: CheckCircle2,
        tint: "from-emerald-500/22 to-teal-500/10 text-emerald-100"
      },
      {
        label: "Saved Patterns",
        value: templates.length,
        hint: "Reusable activity patterns",
        icon: Sparkles,
        tint: "from-fuchsia-500/18 to-cyan-500/10 text-fuchsia-100"
      }
    ],
    [completedInView, rangeLabel, templates.length, todayEventsCount, visibleEvents.length]
  );

  const openDraftModal = useCallback((draft: ScheduleFormState, mode: "create" | "edit") => {
    setScheduleModalMode(mode);
    setScheduleDraft(draft);
    setScheduleModalOpen(true);
  }, []);

  const openQuickAdd = useCallback(() => {
    openDraftModal(toDraftManual(effectiveAnchorDateKey, 10 * 60), "create");
  }, [effectiveAnchorDateKey, openDraftModal]);

  const openForDay = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
    setSelectedActivityId(null);
    openDrawer("day");
  }, [openDrawer, setSelectedActivityId, setSelectedDateKey]);

  const openEvent = useCallback((activityId: string) => {
    setSelectedActivityId(activityId);
    openDrawer("activity");
    setDrawerTab("activity");
  }, [openDrawer, setDrawerTab, setSelectedActivityId]);

  const openEventEditorModal = useCallback(() => {
    if (!selectedActivity) return;
    openDraftModal(toDraftFromEvent(selectedActivity, timeZone), "edit");
  }, [openDraftModal, selectedActivity, timeZone]);

  const openTemplateSchedule = useCallback(
    (templateId: string) => {
      const template = templateById.get(templateId);
      if (!template) return;
      openDraftModal(toDraftFromTemplate(template, selectedDateKey ?? effectiveAnchorDateKey, 10 * 60), "create");
    },
    [effectiveAnchorDateKey, openDraftModal, selectedDateKey, templateById]
  );

  const createPayloadFromDraft = useCallback((draft: ScheduleFormState) => {
    const startAt = toUtcIso(draft.dateKey, draft.startTime, timeZone);
    const endAt = toUtcIso(draft.dateKey, draft.endTime, timeZone);
    if (!startAt || !endAt) return null;
    return {
      title: draft.title.trim(),
      startAt,
      endAt,
      location: draft.location.trim() || DEFAULT_LOCATION,
      checklist: toChecklistPayload(draft.checklistItems),
      adaptationsEnabled: toAdaptationPayload(draft.adaptations),
      templateId: draft.templateId ?? undefined
    };
  }, [timeZone]);

  const persistDraft = useCallback(
    async (draft: ScheduleFormState) => {
      const payload = createPayloadFromDraft(draft);
      if (!payload || !payload.title) {
        toast({
          title: "Missing required fields",
          description: "Title, date, start time, and end time are required.",
          variant: "destructive"
        });
        return;
      }

      const previousEvents = events;
      setSaving(true);
      try {
        if (draft.id) {
          const optimistic: CalendarEventLite = {
            ...(events.find((event) => event.id === draft.id) ?? {
              id: draft.id,
              templateId: draft.templateId,
              seriesId: null,
              occurrenceKey: null,
              isOverride: true,
              conflictOverride: false,
              checklist: [],
              adaptationsEnabled: {}
            }),
            title: payload.title,
            startAt: payload.startAt,
            endAt: payload.endAt,
            location: payload.location,
            checklist: payload.checklist,
            adaptationsEnabled: payload.adaptationsEnabled
          };
          setEvents((current) => current.map((event) => (event.id === optimistic.id ? optimistic : event)));

          const response = await fetch(`/api/calendar/activities/${draft.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(typeof data?.error === "string" ? data.error : "Unable to update activity.");
          }
        } else {
          const temporaryId = `temp-${Date.now()}`;
          const optimistic: CalendarEventLite = {
            id: temporaryId,
            title: payload.title,
            startAt: payload.startAt,
            endAt: payload.endAt,
            location: payload.location,
            templateId: draft.templateId ?? null,
            seriesId: null,
            occurrenceKey: null,
            isOverride: false,
            conflictOverride: false,
            checklist: payload.checklist,
            adaptationsEnabled: payload.adaptationsEnabled
          };
          setEvents((current) => [optimistic, ...current]);

          const response = await fetch("/api/calendar/activities", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(typeof data?.error === "string" ? data.error : "Unable to create activity.");
          }
        }

        invalidateClientCache("calendar-unified:");
        await refresh();
        setScheduleModalOpen(false);
        toast({
          title: "Saved",
          description: "Calendar activity was saved."
        });
      } catch (error) {
        setEvents(previousEvents);
        toast({
          title: "Save failed",
          description: error instanceof Error ? error.message : "Unable to save activity.",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
    },
    [createPayloadFromDraft, events, refresh, setEvents, toast]
  );

  const saveActivityDraftFromInspector = useCallback(
    async (draft: ScheduleFormState) => {
      await persistDraft(draft);
    },
    [persistDraft]
  );

  const saveDraftValidationGuard = useCallback(async () => {
    if (!scheduleDraft) return;
    await persistDraft(scheduleDraft);
  }, [persistDraft, scheduleDraft]);

  const deleteActivity = useCallback(
    async (activityId: string) => {
      const previousEvents = events;
      setEvents((current) => current.filter((event) => event.id !== activityId));
      try {
        const response = await fetch(`/api/calendar/activities/${activityId}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to delete activity.");
        }
        invalidateClientCache("calendar-unified:");
        await refresh();
        toast({
          title: "Deleted",
          description: "Activity removed from calendar."
        });
        if (selectedActivityId === activityId) {
          setSelectedActivityId(null);
          setDrawerTab("day");
        }
      } catch (error) {
        setEvents(previousEvents);
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unable to delete activity.",
          variant: "destructive"
        });
      }
    },
    [events, refresh, selectedActivityId, setDrawerTab, setEvents, setSelectedActivityId, toast]
  );

  const handleDropToDay = useCallback(
    async (dayKey: string, minutes: number, dropEvent: DragEvent<HTMLElement>) => {
      dropEvent.preventDefault();
      setHoveredDropDay(null);
      const raw = dropEvent.dataTransfer.getData("application/x-actify-calendar");
      if (!raw) return;
      const previousEvents = events;
      try {
        const data = JSON.parse(raw) as { type: "template" | "event"; id: string };
        if (data.type === "template") {
          const template = templateById.get(data.id);
          if (!template) return;
          openDraftModal(toDraftFromTemplate(template, dayKey, minutes), "create");
          return;
        }

        const movingEvent = events.find((event) => event.id === data.id);
        if (!movingEvent) return;
        const durationMin = Math.max(
          SLOT_MINUTES,
          parseTimeToMinutes(
            new Intl.DateTimeFormat("en-US", {
              timeZone,
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23"
            }).format(new Date(movingEvent.endAt))
          ) -
            parseTimeToMinutes(
              new Intl.DateTimeFormat("en-US", {
                timeZone,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
              }).format(new Date(movingEvent.startAt))
            )
        );

        const startAt = toUtcIso(dayKey, minutesToTime(minutes), timeZone);
        const endAt = toUtcIso(dayKey, minutesToTime(minutes + durationMin), timeZone);
        if (!startAt || !endAt) return;

        setEvents((current) =>
          current.map((event) =>
            event.id === movingEvent.id
              ? {
                  ...event,
                  startAt,
                  endAt
                }
              : event
          )
        );

        const response = await fetch(`/api/calendar/activities/${movingEvent.id}/move`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            startAt,
            endAt,
            location: movingEvent.location
          })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to move event.");
        }
        invalidateClientCache("calendar-unified:");
        await refresh();
      } catch (error) {
        setEvents(previousEvents);
        toast({
          title: "Move failed",
          description: error instanceof Error ? error.message : "Unable to move activity.",
          variant: "destructive"
        });
      }
    },
    [events, openDraftModal, refresh, setEvents, templateById, timeZone, toast]
  );

  const shiftRange = useCallback(
    (direction: -1 | 1) => {
      const next = shiftAnchorDate(effectiveAnchorDateKey, effectiveView, direction, timeZone);
      setAnchorDateKey(next);
    },
    [effectiveAnchorDateKey, effectiveView, setAnchorDateKey, timeZone]
  );

  const openCreateAt = useCallback(
    (dateKey: string, minutes: number) => {
      openDraftModal(toDraftManual(dateKey, minutes), "create");
    },
    [openDraftModal]
  );

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (templateCategory !== "ALL" && template.category !== templateCategory) return false;
      if (!query) return true;
      return `${template.title} ${template.category} ${template.difficulty}`.toLowerCase().includes(query);
    });
  }, [templateCategory, templateSearch, templates]);

  return (
    <div className="space-y-5">
      <CalendarCommandBar
        rangeLabel={rangeLabel}
        viewMode={effectiveView}
        searchValue={commandSearch}
        onSearchChange={setCommandSearch}
        onViewChange={setViewMode}
        onPrev={() => shiftRange(-1)}
        onNext={() => shiftRange(1)}
        onToday={() => setAnchorDateKey(zonedDateKey(new Date(), timeZone))}
        onOpenQuickAdd={openQuickAdd}
        onOpenLibrary={() => {
          if (window.innerWidth < 1024) {
            setTemplateDockMobileOpen(true);
            return;
          }
          setTemplateDockOpen(true);
          setDrawerTab("library");
        }}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-3xl border border-cyan-300/20 bg-slate-950/76 p-4 shadow-[0_24px_52px_-40px_rgba(56,189,248,0.95)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-300/85">{card.label}</p>
                  <p className="text-2xl font-semibold text-slate-100">{card.value}</p>
                  <p className="text-xs text-slate-400">{card.hint}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br",
                    card.tint
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className={cn("grid gap-4", templateDockOpen ? "lg:grid-cols-[320px_minmax(0,1fr)]" : "grid-cols-1")}>
            <TemplateDock
              open={templateDockOpen}
              templates={templates}
              searchValue={templateSearch}
              selectedCategory={templateCategory}
              favoriteTemplateIds={favoriteTemplateIds}
              locationFilter={filters.location}
              eventLocations={locationOptions}
              categoryFilters={filters.categories}
              showOnlyMine={filters.showOnlyMine}
              onSearchChange={setTemplateSearch}
              onSelectCategory={setTemplateCategory}
              onToggleFavorite={(templateId) =>
                setFavoriteTemplateIds((current) =>
                  current.includes(templateId) ? current.filter((value) => value !== templateId) : [...current, templateId]
                )
              }
              onScheduleTemplate={openTemplateSchedule}
              onDragTemplateStart={(templateId, event) => {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("application/x-actify-calendar", JSON.stringify({ type: "template", id: templateId }));
              }}
              onLocationFilterChange={(location) => setFilters({ location })}
              onToggleEventCategoryFilter={(category) =>
                setFilters({
                  categories: filters.categories.includes(category)
                    ? filters.categories.filter((value) => value !== category)
                    : [...filters.categories, category]
                })
              }
              onShowOnlyMineChange={(showOnlyMine) => setFilters({ showOnlyMine })}
              onResetFilters={resetFilters}
            />

            <div className="space-y-3">
              {isLoading ? (
                <div className="h-[560px] rounded-3xl border border-cyan-400/20 bg-slate-950/76" />
              ) : null}
              {!isLoading && effectiveView === "month" ? (
                <MonthView
                  anchorDateKey={effectiveAnchorDateKey}
                  events={visibleEvents}
                  templateById={templateById}
                  timeZone={timeZone}
                  hoveredDropDay={hoveredDropDay}
                  onHoverDropDay={setHoveredDropDay}
                  onDropTemplateOrEvent={(dayKey, event) => void handleDropToDay(dayKey, 10 * 60, event)}
                  onOpenDay={(dayKey) => {
                    openForDay(dayKey);
                    setDrawerTab("day");
                  }}
                  onOpenEvent={openEvent}
                />
              ) : null}
              {!isLoading && effectiveView === "week" ? (
                <WeekView
                  mode="week"
                  days={weekDays}
                  events={visibleEvents}
                  timeZone={timeZone}
                  hoveredDropDay={hoveredDropDay}
                  onHoverDropDay={setHoveredDropDay}
                  onDropToDay={(dayKey, minutes, event) => void handleDropToDay(dayKey, minutes, event)}
                  onOpenEvent={openEvent}
                  onOpenDay={openForDay}
                  onCreateAt={openCreateAt}
                />
              ) : null}
              {!isLoading && effectiveView === "day" ? (
                <DayView
                  day={dayDate}
                  events={visibleEvents}
                  timeZone={timeZone}
                  hoveredDropDay={hoveredDropDay}
                  onHoverDropDay={setHoveredDropDay}
                  onDropToDay={(dayKey, minutes, event) => void handleDropToDay(dayKey, minutes, event)}
                  onOpenEvent={openEvent}
                  onOpenDay={openForDay}
                  onCreateAt={openCreateAt}
                />
              ) : null}
              {!isLoading && effectiveView === "agenda" ? (
                <AgendaView events={visibleEvents} timeZone={timeZone} onOpenEvent={openEvent} onOpenDay={openForDay} />
              ) : null}
            </div>
          </div>
        </div>

        <div className="hidden xl:block">
          <InspectorDrawer
            layout="inline"
            open
            tab={drawerTab}
            selectedDateKey={selectedDateKey}
            selectedActivity={selectedActivity}
            selectedDayEvents={selectedDayEvents}
            templates={templates}
            templateSearchValue={templateSearch}
            timeZone={timeZone}
            saving={saving}
            onClose={() => undefined}
            onTabChange={setDrawerTab}
            onEditActivity={openEventEditorModal}
            onDeleteActivity={(activityId) => void deleteActivity(activityId)}
            onOpenActivity={openEvent}
            onCreateForDay={(dateKey) => openCreateAt(dateKey, 10 * 60)}
            onTemplateSearchChange={setTemplateSearch}
            onScheduleFromTemplate={openTemplateSchedule}
            onSaveActivityDraft={saveActivityDraftFromInspector}
          />
        </div>
      </div>

      <div className="xl:hidden">
        <InspectorDrawer
          layout="overlay"
          open={drawerOpen}
          tab={drawerTab}
          selectedDateKey={selectedDateKey}
          selectedActivity={selectedActivity}
          selectedDayEvents={selectedDayEvents}
          templates={templates}
          templateSearchValue={templateSearch}
          timeZone={timeZone}
          saving={saving}
          onClose={closeDrawer}
          onTabChange={setDrawerTab}
          onEditActivity={openEventEditorModal}
          onDeleteActivity={(activityId) => void deleteActivity(activityId)}
          onOpenActivity={openEvent}
          onCreateForDay={(dateKey) => openCreateAt(dateKey, 10 * 60)}
          onTemplateSearchChange={setTemplateSearch}
          onScheduleFromTemplate={openTemplateSchedule}
          onSaveActivityDraft={saveActivityDraftFromInspector}
        />
      </div>

      <ScheduleModal
        open={scheduleModalOpen}
        mode={scheduleModalMode}
        value={scheduleDraft}
        saving={saving}
        onClose={() => setScheduleModalOpen(false)}
        onChange={setScheduleDraft}
        onSave={() => void saveDraftValidationGuard()}
        onDelete={
          scheduleDraft?.id
            ? () => {
                setScheduleModalOpen(false);
                void deleteActivity(scheduleDraft.id as string);
              }
            : undefined
        }
      />

      <Dialog open={templateDockMobileOpen} onOpenChange={setTemplateDockMobileOpen}>
        <DialogContent className="border-cyan-300/25 bg-slate-950/96 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Saved Patterns</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-2 overflow-auto">
            {filteredTemplates.map((template) => (
              <button
                key={`mobile-template-${template.id}`}
                type="button"
                className="w-full rounded-2xl border border-cyan-300/20 bg-slate-900/85 p-3 text-left"
                onClick={() => {
                  setTemplateDockMobileOpen(false);
                  openTemplateSchedule(template.id);
                }}
              >
                <p className="text-sm font-semibold text-slate-100">{template.title}</p>
                <p className="text-xs text-slate-300/85">
                  {template.category} · {template.difficulty}
                </p>
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateDockMobileOpen(false)}
              className="w-full border-cyan-300/25 bg-slate-900/85 text-slate-100"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="border-cyan-300/25 bg-slate-950/96 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="space-y-1 text-sm text-slate-200">
              Location
              <select
                value={filters.location}
                onChange={(event) => setFilters({ location: event.target.value })}
                className="h-10 w-full rounded-md border border-cyan-300/20 bg-slate-900/85 px-3 text-sm text-slate-100"
              >
                <option value="ALL">All locations</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-300/75">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => {
                  const active = filters.categories.includes(category);
                  return (
                    <Button
                      key={category}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className={active ? "bg-cyan-500/85 text-white" : "border-cyan-300/25 bg-slate-900/80 text-slate-100"}
                      onClick={() =>
                        setFilters({
                          categories: active
                            ? filters.categories.filter((value) => value !== category)
                            : [...filters.categories, category]
                        })
                      }
                    >
                      {category}
                    </Button>
                  );
                })}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-slate-900/75 px-3 py-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={filters.showOnlyMine}
                onChange={(event) => setFilters({ showOnlyMine: event.target.checked })}
              />
              Show only my events
            </label>
            <Button type="button" variant="outline" onClick={resetFilters} className="border-cyan-300/25 bg-slate-900/80 text-slate-100">
              Clear filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-cyan-300/25 bg-slate-950/96 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Calendar Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-300/85">
            <p>This workspace keeps all existing scheduling behavior and data.</p>
            <p>Use the command bar, saved patterns library, and day context panel to keep actions in one place.</p>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-cyan-300/25 bg-slate-900/80 text-slate-100"
              onClick={toggleTemplateDockOpen}
            >
              {templateDockOpen ? "Hide saved patterns" : "Show saved patterns"}
            </Button>
            <Button type="button" onClick={() => setSettingsOpen(false)} className="bg-gradient-to-r from-cyan-500/85 to-indigo-500/85 text-white">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
