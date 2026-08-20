"use client";

import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getYear,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  Eye,
  Gift,
  GripVertical,
  History,
  ImagePlus,
  Layers3,
  Loader2,
  Palette,
  Printer,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  WandSparkles
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CalendarTemplateLite } from "@/components/calendar/types";
import {
  CALENDAR_BUILDER_PAPER_PRESETS,
  type CalendarBuilderDesign,
  type CalendarBuilderPaperPreset,
  asCalendarBuilderDesign,
  defaultCalendarBuilderDesign,
  getPdfPaperOptions
} from "@/lib/calendar/builder-design";
import { buildHolidayLookup, getHolidayBadgeForDate } from "@/lib/calendar/getHolidayBadgeForDate";
import { getHolidaysForYear, type HolidayCategory } from "@/lib/calendar/holidays";
import {
  buildResidentBirthdayLookup,
  getBirthdayBadgeForDate,
  type ResidentBirthdaySource
} from "@/lib/calendar/resident-birthdays";
import { useToast } from "@/lib/use-toast";
import { formatInTimeZone, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { CalendarEventLite } from "@/hooks/useCalendarQueries";

type BuilderMode = "builder" | "preview";

type CalendarBuilderWorkspaceProps = {
  mode: BuilderMode;
  facilityName: string;
  timeZone: string;
  anchorDateKey: string;
  selectedDateKey: string;
  events: CalendarEventLite[];
  templates: CalendarTemplateLite[];
  isLoading: boolean;
  calendarLoadError: string | null;
  onModeChange: (mode: BuilderMode | "schedule") => void;
  onAnchorDateChange: (dateKey: string) => void;
  onSelectedDateChange: (dateKey: string) => void;
  onNewActivity: (dateKey?: string) => void;
  onUseTemplate: (template: CalendarTemplateLite, dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
  onMoveEvent: (event: CalendarEventLite, dateKey: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

type SaveStatus = "loading" | "saved" | "unsaved" | "saving" | "failed" | "conflict";

type DragPayload =
  | { kind: "activity"; id: string }
  | { kind: "template"; id: string };

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOLIDAY_CATEGORIES: Array<{ key: HolidayCategory; label: string }> = [
  { key: "federal", label: "Federal" },
  { key: "religious", label: "Religious" },
  { key: "seasonal", label: "Seasonal" },
  { key: "skilled-nursing", label: "SNF" }
];

const PAPER_LABELS: Record<CalendarBuilderPaperPreset, string> = {
  LETTER_PORTRAIT: "Letter Portrait",
  LETTER_LANDSCAPE: "Letter Landscape",
  LEGAL_PORTRAIT: "Legal Portrait",
  LEGAL_LANDSCAPE: "Legal Landscape",
  TABLOID_PORTRAIT: "Tabloid Portrait",
  TABLOID_LANDSCAPE: "Tabloid Landscape"
};

const CHIP_COLORS = [
  "border-cyan-200 bg-cyan-50 text-cyan-950",
  "border-blue-200 bg-blue-50 text-blue-950",
  "border-violet-200 bg-violet-50 text-violet-950",
  "border-emerald-200 bg-emerald-50 text-emerald-950",
  "border-amber-200 bg-amber-50 text-amber-950",
  "border-rose-200 bg-rose-50 text-rose-950"
];

function designJson(design: CalendarBuilderDesign) {
  return JSON.stringify(design);
}

function getMonthKey(anchorDateKey: string, timeZone: string) {
  const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
  return format(startOfMonth(anchor), "yyyy-MM");
}

function buildSundayMonthDays(anchorDateKey: string, timeZone: string) {
  const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return { monthStart, days };
}

function parseDragPayload(value: string): DragPayload | null {
  try {
    const parsed = JSON.parse(value) as DragPayload;
    if (parsed.kind === "activity" || parsed.kind === "template") return parsed;
    return null;
  } catch {
    return null;
  }
}

function getPaperClass(preset: CalendarBuilderPaperPreset) {
  const { paperSize, orientation } = getPdfPaperOptions(preset);
  if (paperSize === "LEGAL" && orientation === "landscape") return "aspect-[14/8.5]";
  if (paperSize === "LEGAL" && orientation === "portrait") return "aspect-[8.5/14]";
  if (paperSize === "TABLOID" && orientation === "landscape") return "aspect-[17/11]";
  if (paperSize === "TABLOID" && orientation === "portrait") return "aspect-[11/17]";
  if (orientation === "portrait") return "aspect-[8.5/11]";
  return "aspect-[11/8.5]";
}

function getEventColor(event: CalendarEventLite, index: number) {
  const text = `${event.templateId ?? ""}${event.title}${event.location}`;
  const seed = text.split("").reduce((sum, char) => sum + char.charCodeAt(0), index);
  return CHIP_COLORS[Math.abs(seed) % CHIP_COLORS.length];
}

function formatEventTime(event: CalendarEventLite, timeZone: string) {
  return formatInTimeZone(new Date(event.startAt), timeZone, { hour: "numeric", minute: "2-digit" });
}

function getSelectedPaperPageSize(preset: CalendarBuilderPaperPreset) {
  const { paperSize, orientation } = getPdfPaperOptions(preset);
  const label = `${paperSize.toLowerCase()} ${orientation}`;
  if (paperSize === "LEGAL") return label.includes("landscape") ? "14 x 8.5" : "8.5 x 14";
  if (paperSize === "TABLOID") return label.includes("landscape") ? "17 x 11" : "11 x 17";
  return label.includes("landscape") ? "11 x 8.5" : "8.5 x 11";
}

export function CalendarBuilderWorkspace({
  mode,
  facilityName,
  timeZone,
  anchorDateKey,
  selectedDateKey,
  events,
  templates,
  isLoading,
  calendarLoadError,
  onModeChange,
  onAnchorDateChange,
  onSelectedDateChange,
  onUseTemplate,
  onOpenEvent,
  onMoveEvent,
  onRefresh
}: CalendarBuilderWorkspaceProps) {
  const { toast } = useToast();
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("ALL");
  const [libraryLocation, setLibraryLocation] = useState("ALL");
  const [zoom, setZoom] = useState(0.86);
  const [design, setDesign] = useState<CalendarBuilderDesign>(() =>
    defaultCalendarBuilderDesign(getMonthKey(anchorDateKey, timeZone), facilityName)
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [undoStack, setUndoStack] = useState<CalendarBuilderDesign[]>([]);
  const [redoStack, setRedoStack] = useState<CalendarBuilderDesign[]>([]);
  const [birthdays, setBirthdays] = useState<ResidentBirthdaySource[]>([]);
  const [selectedElement, setSelectedElement] = useState<"calendar" | "header" | "footer" | "day" | "activity">("calendar");

  const loadedMonthRef = useRef<string | null>(null);
  const lastSavedDesignRef = useRef("");
  const saveRequestIdRef = useRef(0);

  const { monthStart, days } = useMemo(
    () => buildSundayMonthDays(anchorDateKey, timeZone),
    [anchorDateKey, timeZone]
  );
  const monthKey = useMemo(() => format(monthStart, "yyyy-MM"), [monthStart]);
  const monthLabel = useMemo(() => format(monthStart, "MMMM yyyy"), [monthStart]);
  const yearsInGrid = useMemo(() => Array.from(new Set(days.map((day) => getYear(day)))), [days]);

  const visibleEvents = useMemo(() => {
    const monthEnd = endOfMonth(monthStart);
    return events
      .filter((event) => {
        const date = new Date(event.startAt);
        return date >= startOfWeek(monthStart, { weekStartsOn: 0 }) && date <= endOfWeek(monthEnd, { weekStartsOn: 0 });
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, monthStart]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEventLite[]>();
    visibleEvents.forEach((event) => {
      const dateKey = zonedDateKey(new Date(event.startAt), timeZone);
      const current = grouped.get(dateKey) ?? [];
      current.push(event);
      grouped.set(dateKey, current.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    });
    return grouped;
  }, [timeZone, visibleEvents]);

  const holidayLookup = useMemo(() => {
    if (!design.showHolidays) return buildHolidayLookup([]);
    const holidays = yearsInGrid
      .flatMap((year) => getHolidaysForYear(year))
      .filter((holiday) => design.holidayCategories[holiday.category]);
    return buildHolidayLookup(holidays);
  }, [design.holidayCategories, design.showHolidays, yearsInGrid]);

  const birthdayLookup = useMemo(() => {
    if (!design.showBirthdays) return buildResidentBirthdayLookup({ residents: [], years: yearsInGrid });
    return buildResidentBirthdayLookup({ residents: birthdays, years: yearsInGrid });
  }, [birthdays, design.showBirthdays, yearsInGrid]);

  const templateCategories = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category).filter(Boolean))).sort(),
    [templates]
  );
  const locations = useMemo(
    () => Array.from(new Set(visibleEvents.map((event) => event.location).filter(Boolean))).sort(),
    [visibleEvents]
  );

  const filteredTemplates = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (libraryCategory !== "ALL" && template.category !== libraryCategory) return false;
      if (!query) return true;
      return `${template.title} ${template.category} ${template.difficulty}`.toLowerCase().includes(query);
    });
  }, [libraryCategory, librarySearch, templates]);

  const filteredLibraryEvents = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    return visibleEvents.filter((event) => {
      if (libraryLocation !== "ALL" && event.location !== libraryLocation) return false;
      if (!query) return true;
      return `${event.title} ${event.location}`.toLowerCase().includes(query);
    });
  }, [libraryLocation, librarySearch, visibleEvents]);

  const updateDesign = useCallback((updater: (current: CalendarBuilderDesign) => CalendarBuilderDesign) => {
    setDesign((current) => {
      const next = updater(current);
      setUndoStack((stack) => [...stack.slice(-24), current]);
      setRedoStack([]);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSaveStatus("loading");
    loadedMonthRef.current = null;

    fetch(`/api/calendar/design?month=${encodeURIComponent(monthKey)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load calendar design.");
        return (await response.json()) as { design?: CalendarBuilderDesign };
      })
      .then((payload) => {
        if (cancelled) return;
        const nextDesign = asCalendarBuilderDesign(payload.design, monthKey, facilityName);
        setDesign(nextDesign);
        setUndoStack([]);
        setRedoStack([]);
        lastSavedDesignRef.current = designJson(nextDesign);
        loadedMonthRef.current = monthKey;
        setSaveStatus("saved");
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = defaultCalendarBuilderDesign(monthKey, facilityName);
        setDesign(fallback);
        lastSavedDesignRef.current = designJson(fallback);
        loadedMonthRef.current = monthKey;
        setSaveStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [facilityName, monthKey]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar/birthdays")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load birthdays.");
        return (await response.json()) as { residents?: ResidentBirthdaySource[] };
      })
      .then((payload) => {
        if (!cancelled) setBirthdays(Array.isArray(payload.residents) ? payload.residents : []);
      })
      .catch(() => {
        if (!cancelled) setBirthdays([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadedMonthRef.current !== monthKey) return;
    const nextJson = designJson(design);
    if (nextJson === lastSavedDesignRef.current) return;
    setSaveStatus("unsaved");

    const timeout = window.setTimeout(() => {
      const requestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = requestId;
      setSaveStatus("saving");

      fetch("/api/calendar/design", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, baseVersion: design.version, design })
      })
        .then(async (response) => {
          if (response.status === 409) {
            const payload = (await response.json()) as { design?: CalendarBuilderDesign };
            const currentServerDesign = asCalendarBuilderDesign(payload.design, monthKey, facilityName);
            throw Object.assign(new Error("Design conflict"), { conflictDesign: currentServerDesign });
          }
          if (!response.ok) throw new Error("Unable to save design.");
          return (await response.json()) as { design?: CalendarBuilderDesign };
        })
        .then((payload) => {
          if (saveRequestIdRef.current !== requestId) return;
          const saved = asCalendarBuilderDesign(payload.design, monthKey, facilityName);
          lastSavedDesignRef.current = designJson(saved);
          setDesign(saved);
          setSaveStatus("saved");
        })
        .catch((error: Error & { conflictDesign?: CalendarBuilderDesign }) => {
          if (saveRequestIdRef.current !== requestId) return;
          if (error.conflictDesign) {
            setSaveStatus("conflict");
            toast({
              title: "Calendar design changed elsewhere",
              description: "Reload this month before saving more design changes.",
              variant: "destructive"
            });
            return;
          }
          setSaveStatus("failed");
        });
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [design, facilityName, monthKey, toast]);

  useEffect(() => {
    const hasUnsavedChanges = saveStatus === "unsaved" || saveStatus === "saving" || saveStatus === "failed";
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  const shiftMonth = (delta: -1 | 1) => {
    const next = addMonths(monthStart, delta);
    onAnchorDateChange(format(next, "yyyy-MM-dd"));
    onSelectedDateChange(format(next, "yyyy-MM-dd"));
  };

  const undo = () => {
    setUndoStack((stack) => {
      const previous = stack.at(-1);
      if (!previous) return stack;
      setRedoStack((redo) => [...redo.slice(-24), design]);
      setDesign(previous);
      return stack.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((stack) => {
      const next = stack.at(-1);
      if (!next) return stack;
      setUndoStack((undoHistory) => [...undoHistory.slice(-24), design]);
      setDesign(next);
      return stack.slice(0, -1);
    });
  };

  const exportHref = useMemo(() => {
    const paper = getPdfPaperOptions(design.paperPreset);
    const params = new URLSearchParams({
      audience: "resident",
      view: "monthly",
      month: monthKey,
      paperSize: paper.paperSize,
      orientation: paper.orientation
    });
    return `/app/calendar/pdf?${params.toString()}`;
  }, [design.paperPreset, monthKey]);

  const printCalendar = () => {
    if (mode !== "preview") {
      onModeChange("preview");
      window.setTimeout(() => window.print(), 100);
      return;
    }
    window.print();
  };

  const handleDropOnDate = async (dateKey: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = parseDragPayload(event.dataTransfer.getData("application/x-actify-calendar"));
    if (!payload) return;
    onSelectedDateChange(dateKey);
    if (payload.kind === "template") {
      const template = templates.find((item) => item.id === payload.id);
      if (template) onUseTemplate(template, dateKey);
      return;
    }
    const draggedEvent = events.find((item) => item.id === payload.id);
    if (!draggedEvent) return;
    await onMoveEvent(draggedEvent, dateKey);
  };

  const saveStatusLabel = {
    loading: "Loading design...",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving...",
    failed: "Save failed — retry",
    conflict: "Version conflict"
  }[saveStatus];

  return (
    <section className="space-y-4">
      <div className="no-print sticky top-2 z-20 rounded-2xl border border-[#2a3d62] bg-[#081225]/95 p-3 shadow-[0_18px_60px_-34px_rgba(34,211,238,0.42)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="builder-toolbar-button" aria-label="Previous month">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const today = zonedDateKey(new Date(), timeZone);
                onAnchorDateChange(today);
                onSelectedDateChange(today);
              }}
              className="builder-toolbar-pill"
            >
              Today
            </button>
            <button type="button" onClick={() => shiftMonth(1)} className="builder-toolbar-button" aria-label="Next month">
              <ArrowRight className="h-4 w-4" />
            </button>
            <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#36527e] bg-[#0f1d37] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#d7e7ff]">
              Month
              <input
                type="month"
                value={monthKey}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  onAnchorDateChange(`${value}-01`);
                  onSelectedDateChange(`${value}-01`);
                }}
                className="bg-transparent text-sm normal-case tracking-normal text-white focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={undo} disabled={undoStack.length === 0} className="builder-toolbar-pill disabled:opacity-40">
              <RotateCcw className="h-4 w-4" /> Undo
            </button>
            <button type="button" onClick={redo} disabled={redoStack.length === 0} className="builder-toolbar-pill disabled:opacity-40">
              <RotateCw className="h-4 w-4" /> Redo
            </button>
            <span
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold uppercase tracking-[0.12em]",
                saveStatus === "saved"
                  ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
                  : saveStatus === "saving" || saveStatus === "loading"
                    ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                    : "border-amber-300/40 bg-amber-500/15 text-amber-100"
              )}
            >
              {saveStatus === "saving" || saveStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saveStatusLabel}
            </span>
            <button type="button" onClick={() => onModeChange(mode === "preview" ? "builder" : "preview")} className="builder-toolbar-pill">
              <Eye className="h-4 w-4" /> {mode === "preview" ? "Builder" : "Preview"}
            </button>
            <a href={exportHref} className="builder-toolbar-pill">
              <Download className="h-4 w-4" /> Export
            </a>
            <button type="button" onClick={printCalendar} className="builder-toolbar-primary">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button type="button" onClick={() => onModeChange("builder")} className="builder-toolbar-pill">
              <CalendarDays className="h-4 w-4" /> Calendar Builder
            </button>
          </div>
        </div>
      </div>

      {calendarLoadError ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100" role="alert">
          Calendar data could not load: {calendarLoadError}
        </div>
      ) : null}

      <div className={cn("grid gap-4", mode === "preview" ? "grid-cols-1" : "xl:grid-cols-[280px_minmax(0,1fr)_300px]")}> 
        {mode === "builder" ? (
          <aside className="no-print space-y-3 rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ca7d4]">Activity Library</p>
              <h3 className="mt-1 text-lg font-bold text-white">Templates and scheduled activities</h3>
              <p className="mt-1 text-xs leading-5 text-[#9bb2d8]">Drag a saved activity to another date or use a template to schedule a new one.</p>
            </div>
            <label className="inline-flex h-10 w-full items-center gap-2 rounded-xl border border-[#34527f] bg-[#0f1c35] px-3 text-sm text-[#d3e3ff]">
              <Search className="h-4 w-4 text-[#95add6]" />
              <input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Search activities..."
                className="h-full w-full bg-transparent text-sm text-white placeholder:text-[#8ca5cf] focus:outline-none"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <BuilderSelect label="Category" value={libraryCategory} onChange={setLibraryCategory} options={["ALL", ...templateCategories]} />
              <BuilderSelect label="Location" value={libraryLocation} onChange={setLibraryLocation} options={["ALL", ...locations]} />
            </div>
            <a
              href={`/app/assistant?prompt=${encodeURIComponent(`Help me fill empty activity calendar dates for ${monthLabel}. Keep suggestions realistic, low-budget, and present them as drafts for review.`)}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/35 bg-violet-500/15 px-3 py-2 text-sm font-semibold text-violet-100 transition hover:border-violet-200/60"
            >
              <WandSparkles className="h-4 w-4" /> Ask Actify for drafts
            </a>
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              <LibrarySection title="Templates" count={filteredTemplates.length}>
                {filteredTemplates.length === 0 ? <BuilderEmptyState text="No templates matched." /> : null}
                {filteredTemplates.slice(0, 18).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-actify-calendar", JSON.stringify({ kind: "template", id: template.id }));
                    }}
                    onClick={() => onUseTemplate(template, selectedDateKey)}
                    className="w-full rounded-xl border border-[#2f446a] bg-[#0f1b34] p-3 text-left transition hover:border-cyan-300/55"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-[#8ea8d5]" />
                      <div>
                        <p className="text-sm font-semibold text-white">{template.title}</p>
                        <p className="mt-0.5 text-xs text-[#9db5dd]">{template.category} · {template.difficulty}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </LibrarySection>
              <LibrarySection title="This month" count={filteredLibraryEvents.length}>
                {isLoading ? <BuilderEmptyState text="Loading scheduled activities..." /> : null}
                {!isLoading && filteredLibraryEvents.length === 0 ? <BuilderEmptyState text="No scheduled activities found for this month." /> : null}
                {filteredLibraryEvents.slice(0, 24).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    draggable
                    onDragStart={(dragEvent) => {
                      dragEvent.dataTransfer.setData("application/x-actify-calendar", JSON.stringify({ kind: "activity", id: event.id }));
                    }}
                    onClick={() => onOpenEvent(event.id)}
                    className="w-full rounded-xl border border-[#2f446a] bg-[#0f1b34] p-3 text-left transition hover:border-cyan-300/55"
                  >
                    <p className="text-sm font-semibold text-white">{event.title}</p>
                    <p className="mt-0.5 text-xs text-[#9db5dd]">
                      {formatInTimeZone(new Date(event.startAt), timeZone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {event.location}
                    </p>
                  </button>
                ))}
              </LibrarySection>
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 space-y-3">
          <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8da8d4]">Print Canvas</p>
              <p className="mt-0.5 text-sm text-[#c7d9f6]">{PAPER_LABELS[design.paperPreset]} · {getSelectedPaperPageSize(design.paperPreset)} in · Sunday through Saturday</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom((value) => Math.max(0.45, Number((value - 0.08).toFixed(2))))} className="builder-toolbar-pill">-</button>
              <span className="min-w-16 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#d7e7ff]">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(1.25, Number((value + 0.08).toFixed(2))))} className="builder-toolbar-pill">+</button>
              <button type="button" onClick={() => setZoom(0.86)} className="builder-toolbar-pill">Fit</button>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-[#223859] bg-[#071023] p-3 md:p-6">
            <div className="mx-auto origin-top" style={{ width: `${100 / zoom}%`, transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <CalendarPrintCanvas
                design={design}
                monthStart={monthStart}
                days={days}
                eventsByDate={eventsByDate}
                holidayLookup={holidayLookup}
                birthdayLookup={birthdayLookup}
                timeZone={timeZone}
                selectedDateKey={selectedDateKey}
                selectedElement={selectedElement}
                onSelectDate={(dateKey) => {
                  onSelectedDateChange(dateKey);
                  setSelectedElement("day");
                }}
                onSelectHeader={() => setSelectedElement("header")}
                onSelectFooter={() => setSelectedElement("footer")}
                onOpenEvent={(eventId) => {
                  setSelectedElement("activity");
                  onOpenEvent(eventId);
                }}
                onDropOnDate={handleDropOnDate}
              />
            </div>
          </div>
        </main>

        {mode === "builder" ? (
          <aside className="no-print space-y-3 rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8ca7d4]">Inspector</p>
              <h3 className="mt-1 text-lg font-bold text-white">{selectedElement === "calendar" ? "Calendar style" : `${selectedElement[0].toUpperCase()}${selectedElement.slice(1)} settings`}</h3>
            </div>
            <div className="space-y-3">
              <InspectorField label="Title">
                <input value={design.title} onChange={(event) => updateDesign((current) => ({ ...current, title: event.target.value }))} className="builder-input" />
              </InspectorField>
              <InspectorField label="Subtitle">
                <input value={design.subtitle} onChange={(event) => updateDesign((current) => ({ ...current, subtitle: event.target.value }))} className="builder-input" />
              </InspectorField>
              <InspectorField label="Disclaimer">
                <textarea value={design.disclaimer} onChange={(event) => updateDesign((current) => ({ ...current, disclaimer: event.target.value }))} className="builder-textarea" />
              </InspectorField>
              <InspectorField label="Footer">
                <textarea value={design.footer} onChange={(event) => updateDesign((current) => ({ ...current, footer: event.target.value }))} className="builder-textarea" />
              </InspectorField>
              <BuilderSelect
                label="Paper"
                value={design.paperPreset}
                onChange={(value) => updateDesign((current) => ({ ...current, paperPreset: value as CalendarBuilderPaperPreset }))}
                options={[...CALENDAR_BUILDER_PAPER_PRESETS]}
                labels={PAPER_LABELS}
              />
              <BuilderSelect
                label="Layout"
                value={design.layoutPreset}
                onChange={(value) => updateDesign((current) => ({ ...current, layoutPreset: value as CalendarBuilderDesign["layoutPreset"] }))}
                options={["STANDARD_GRID", "HERO_BLANKS"]}
                labels={{ STANDARD_GRID: "Standard full grid", HERO_BLANKS: "Hero blank cells" }}
              />
              <BuilderSelect
                label="Font scale"
                value={design.fontScale}
                onChange={(value) => updateDesign((current) => ({ ...current, fontScale: value as CalendarBuilderDesign["fontScale"] }))}
                options={["SM", "MD", "LG"]}
                labels={{ SM: "Compact", MD: "Standard", LG: "Large print" }}
              />
              <div className="grid grid-cols-2 gap-2">
                <ColorField label="Accent" value={design.accentColor} onChange={(value) => updateDesign((current) => ({ ...current, accentColor: value }))} />
                <ColorField label="Border" value={design.borderColor} onChange={(value) => updateDesign((current) => ({ ...current, borderColor: value }))} />
                <ColorField label="Page" value={design.backgroundColor} onChange={(value) => updateDesign((current) => ({ ...current, backgroundColor: value }))} />
                <ColorField label="Cells" value={design.cellBackgroundColor} onChange={(value) => updateDesign((current) => ({ ...current, cellBackgroundColor: value }))} />
              </div>
              <div className="rounded-xl border border-[#2f446a] bg-[#0f1b34] p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9bb2d8]"><Layers3 className="h-4 w-4" /> Visibility</p>
                <ToggleRow label="Verified holidays" checked={design.showHolidays} onChange={(checked) => updateDesign((current) => ({ ...current, showHolidays: checked }))} />
                <ToggleRow label="Resident birthdays" checked={design.showBirthdays} onChange={(checked) => updateDesign((current) => ({ ...current, showBirthdays: checked }))} />
                <ToggleRow label="Auto-fit text" checked={design.autoFitText} onChange={(checked) => updateDesign((current) => ({ ...current, autoFitText: checked }))} />
                <ToggleRow label="Compact event lines" checked={design.compactEvents} onChange={(checked) => updateDesign((current) => ({ ...current, compactEvents: checked }))} />
              </div>
              <div className="rounded-xl border border-[#2f446a] bg-[#0f1b34] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9bb2d8]">Holiday categories</p>
                {HOLIDAY_CATEGORIES.map((category) => (
                  <ToggleRow
                    key={category.key}
                    label={category.label}
                    checked={design.holidayCategories[category.key]}
                    onChange={(checked) =>
                      updateDesign((current) => ({
                        ...current,
                        holidayCategories: { ...current.holidayCategories, [category.key]: checked }
                      }))
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => updateDesign(() => defaultCalendarBuilderDesign(monthKey, facilityName))}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#3d5e8c] bg-[#112344] px-3 py-2 text-sm font-semibold text-[#d6e5ff] transition hover:border-[#5a82be]"
              >
                <History className="h-4 w-4" /> Restore theme defaults
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void onRefresh()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/60 disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Refresh calendar data
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function CalendarPrintCanvas({
  design,
  monthStart,
  days,
  eventsByDate,
  holidayLookup,
  birthdayLookup,
  timeZone,
  selectedDateKey,
  selectedElement,
  onSelectDate,
  onSelectHeader,
  onSelectFooter,
  onOpenEvent,
  onDropOnDate
}: {
  design: CalendarBuilderDesign;
  monthStart: Date;
  days: Date[];
  eventsByDate: Map<string, CalendarEventLite[]>;
  holidayLookup: ReturnType<typeof buildHolidayLookup>;
  birthdayLookup: ReturnType<typeof buildResidentBirthdayLookup>;
  timeZone: string;
  selectedDateKey: string;
  selectedElement: string;
  onSelectDate: (dateKey: string) => void;
  onSelectHeader: () => void;
  onSelectFooter: () => void;
  onOpenEvent: (eventId: string) => void;
  onDropOnDate: (dateKey: string, event: React.DragEvent<HTMLDivElement>) => void;
}) {
  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      rows.push(days.slice(index, index + 7));
    }
    return rows;
  }, [days]);
  const fontClass = design.fontScale === "LG" ? "text-[12px]" : design.fontScale === "SM" ? "text-[9px]" : "text-[10px]";
  const maxEventsPerDay = design.compactEvents ? (weeks.length > 5 ? 3 : 4) : (weeks.length > 5 ? 2 : 3);
  const firstMonthDayIndex = days.findIndex((day) => isSameMonth(day, monthStart) && format(day, "d") === "1");

  return (
    <article
      className={cn(
        "actify-calendar-builder-print-source mx-auto overflow-hidden rounded-[22px] border bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,0.72)] print:shadow-none",
        getPaperClass(design.paperPreset)
      )}
      style={{
        backgroundColor: design.backgroundColor,
        borderColor: design.borderColor,
        color: design.textColor
      }}
      aria-label={`Printable activity calendar for ${format(monthStart, "MMMM yyyy")}`}
    >
      <button
        type="button"
        onClick={onSelectHeader}
        className={cn(
          "w-full border-b p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 print:pointer-events-none",
          selectedElement === "header" ? "ring-2 ring-cyan-300" : ""
        )}
        style={{ borderColor: design.borderColor }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: design.accentColor }}>{design.subtitle}</p>
            <h2 className="mt-1 text-4xl font-black leading-none md:text-6xl" style={{ color: design.accentColor }}>
              {format(monthStart, "MMMM yyyy")}
            </h2>
            <p className="mt-2 text-lg font-bold">{design.title}</p>
          </div>
          <div className="hidden rounded-2xl border px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block" style={{ borderColor: design.borderColor }}>
            <ImagePlus className="ml-auto h-5 w-5" />
            Facility logo / art area
          </div>
        </div>
        {design.disclaimer ? <p className="mt-3 text-sm text-slate-600">{design.disclaimer}</p> : null}
      </button>

      <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${design.borderColor}` }}>
        {DAY_LABELS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-black uppercase tracking-[0.16em]" style={{ color: design.accentColor }}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-cols-7">
            {week.map((day, dayIndex) => {
              const key = zonedDateKey(day, timeZone);
              const inMonth = isSameMonth(day, monthStart);
              const events = eventsByDate.get(key) ?? [];
              const holidays = getHolidayBadgeForDate(key, holidayLookup);
              const birthdayBadges = getBirthdayBadgeForDate(key, birthdayLookup);
              const selected = key === selectedDateKey;
              const isHeroBlank = design.layoutPreset === "HERO_BLANKS" && !inMonth && firstMonthDayIndex > 1 && dayIndex < firstMonthDayIndex;
              const visibleEvents = events.slice(0, maxEventsPerDay);
              const overflowCount = Math.max(0, events.length - visibleEvents.length);

              return (
                <div
                  key={key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDropOnDate(key, event)}
                  className={cn(
                    "min-h-[92px] border-r border-b p-1.5 transition print:min-h-0",
                    inMonth ? "" : "opacity-55",
                    selected ? "ring-2 ring-cyan-300" : "",
                    isHeroBlank ? "bg-gradient-to-br from-cyan-50 to-blue-50" : ""
                  )}
                  style={{
                    backgroundColor: isHeroBlank ? undefined : design.cellBackgroundColor,
                    borderColor: design.borderColor
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDate(key)}
                    className="flex w-full items-center justify-between rounded px-1 text-left text-[11px] font-black focus:outline-none focus:ring-2 focus:ring-cyan-300 print:pointer-events-none"
                  >
                    <span>{format(day, "d")}</span>
                    {inMonth && events.length > 5 ? (
                      <span className="no-print rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-800">Tight</span>
                    ) : null}
                  </button>

                  {isHeroBlank ? (
                    <div className="mt-2 rounded-xl border border-cyan-200/70 bg-white/70 p-2 text-center text-xs font-semibold text-cyan-900">
                      {format(monthStart, "MMMM")} programming
                    </div>
                  ) : null}

                  <div className={cn("mt-1 space-y-1 leading-tight", fontClass)}>
                    {holidays.slice(0, 1).map((holiday) => (
                      <p key={holiday.id} className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 font-semibold text-amber-900">
                        {holiday.name}
                      </p>
                    ))}
                    {birthdayBadges.slice(0, 1).map((birthday) => (
                      <p key={birthday.key} className="rounded border border-violet-200 bg-violet-50 px-1 py-0.5 font-semibold text-violet-900">
                        <Gift className="mr-1 inline h-3 w-3" />{birthday.residentName}
                      </p>
                    ))}
                    {visibleEvents.map((event, index) => (
                      <button
                        key={event.id}
                        type="button"
                        draggable
                        onDragStart={(dragEvent) => {
                          dragEvent.dataTransfer.setData("application/x-actify-calendar", JSON.stringify({ kind: "activity", id: event.id }));
                        }}
                        onClick={() => onOpenEvent(event.id)}
                        className={cn(
                          "block w-full rounded border px-1 py-0.5 text-left leading-tight transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-cyan-300 print:pointer-events-none",
                          getEventColor(event, index)
                        )}
                      >
                        <span className="font-black">{formatEventTime(event, timeZone)}</span> {event.title}
                      </button>
                    ))}
                    {overflowCount > 0 ? <p className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-semibold text-slate-600">+{overflowCount} more</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onSelectFooter}
        className={cn(
          "flex w-full items-center justify-between gap-3 border-t px-5 py-3 text-left text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-300 print:pointer-events-none",
          selectedElement === "footer" ? "ring-2 ring-cyan-300" : ""
        )}
        style={{ borderColor: design.borderColor }}
      >
        <span>{design.footer || "Generated by Actify"}</span>
        <span>Activities subject to facility schedule changes.</span>
      </button>
    </article>
  );
}

function LibrarySection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9bb2d8]">{title}</p>
        <span className="rounded-full border border-[#34527f] bg-[#112344] px-2 py-0.5 text-[10px] font-semibold text-[#d6e5ff]">{count}</span>
      </div>
      {children}
    </section>
  );
}

function BuilderEmptyState({ text }: { text: string }) {
  return <p className="rounded-xl border border-[#2f446a] bg-[#0f1b34] p-3 text-sm text-[#9db5dd]">{text}</p>;
}

function BuilderSelect({
  label,
  value,
  onChange,
  options,
  labels
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.13em] text-[#93acd6]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-[#3d5e8d] bg-[#102241] px-3 text-sm normal-case tracking-normal text-white focus:border-cyan-300/70 focus:outline-none">
        {options.map((option) => (
          <option key={option} value={option}>{labels?.[option] ?? option}</option>
        ))}
      </select>
    </label>
  );
}

function InspectorField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.13em] text-[#93acd6]">{label}{children}</label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.13em] text-[#93acd6]">
      <span className="inline-flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> {label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-[#3d5e8d] bg-[#102241] p-1" />
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 text-sm font-medium text-[#d7e6ff]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-300" />
    </label>
  );
}
