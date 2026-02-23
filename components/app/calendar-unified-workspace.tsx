"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { addMonths, addDays, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import {
  AlertTriangle,
  BellRing,
  BusFront,
  CalendarPlus2,
  CalendarHeart,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Cog,
  Clock3,
  Copy,
  Filter,
  GripVertical,
  Layers,
  Library,
  List,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Plus,
  SlidersHorizontal,
  Search,
  Settings2,
  Star,
  StarOff,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
  WandSparkles
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from "react";

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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cachedFetchJson, invalidateClientCache } from "@/lib/perf/client-cache";
import { useDevRenderTrace } from "@/lib/perf/devRenderTrace";
import { formatInTimeZone, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 34;
const EVENT_VERTICAL_GAP_PX = 2;
const EVENT_COLUMN_GAP_PCT = 1;
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 21;
const DEFAULT_EVENT_DURATION_MIN = 60;
const DEFAULT_LOCATION = "Activity Room";

const ADAPTATION_FIELDS = [
  { key: "bedBound", label: "Bed-bound adaptation" },
  { key: "dementiaFriendly", label: "Dementia adaptation" },
  { key: "lowVisionHearing", label: "Low-vision/hearing adaptation" },
  { key: "oneToOneMini", label: "1:1 mini adaptation" }
] as const;

type CalendarViewMode = "week" | "day" | "month" | "agenda";
type CalendarSubsection = "schedule" | "create" | "templates" | "settings";
type DockTab = "templates" | "filters";
type CalendarColorMode = "eventType" | "category" | "none";

type AdaptationKey = (typeof ADAPTATION_FIELDS)[number]["key"];
type AdaptationForm = Record<AdaptationKey, { enabled: boolean; override: string }>;

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
  templateId: string | null;
  seriesId: string | null;
  occurrenceKey: string | null;
  isOverride: boolean;
  conflictOverride: boolean;
  checklist: unknown;
  adaptationsEnabled: unknown;
};

type DrawerState = {
  mode: "create" | "edit";
  eventId: string | null;
  templateId: string | null;
  title: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  checklistItems: string[];
  checklistDraft: string;
  adaptations: AdaptationForm;
  showChecklist: boolean;
  showAdaptations: boolean;
  showAdvanced: boolean;
};

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
  successMessage: string;
  closeDrawerOnSuccess: boolean;
  closeQuickOnSuccess: boolean;
};

type QuickScheduleState = {
  templateId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  location: string;
};

type ResizeState = {
  eventId: string;
  dateKey: string;
  startMinutes: number;
  originalEndMinutes: number;
  startClientY: number;
  previousEvents: CalendarEventLite[];
};

type ResizePreview = {
  eventId: string;
  endMinutes: number;
};

type AgendaRow =
  | { kind: "header"; key: string; dateKey: string; label: string }
  | { kind: "event"; key: string; event: CalendarEventLite };

type EventTypeKey =
  | "group-activity"
  | "one-to-one"
  | "outing"
  | "facility-event"
  | "appointment"
  | "reminder";

type EventColorMeta = {
  chipClass: string;
  badgeClass: string;
  dotClass: string;
  cardClass: string;
};

type WeekEventLayout = {
  event: CalendarEventLite;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  compactCard: boolean;
  tightCard: boolean;
  isConflict: boolean;
  hasChecklist: boolean;
  hasAdaptations: boolean;
  timeRangeLabel: string;
};

type CalendarRange = {
  start: Date;
  end: Date;
};

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, value));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function minutesToLabel(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, value));
  const hour24 = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return minute === 0 ? `${hour12} ${period}` : `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function parseApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof (payload as { error: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  return fallback;
}

function checklistToStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "text" in item) {
        return String((item as { text: unknown }).text ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function checklistToJson(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text) => ({ text, done: false }));
}

function emptyAdaptations(): AdaptationForm {
  return {
    bedBound: { enabled: false, override: "" },
    dementiaFriendly: { enabled: false, override: "" },
    lowVisionHearing: { enabled: false, override: "" },
    oneToOneMini: { enabled: false, override: "" }
  };
}

function parseAdaptations(value: unknown) {
  const parsed = emptyAdaptations();
  let notes = "";
  if (!value || typeof value !== "object") {
    return { adaptations: parsed, notes };
  }

  const safe = value as Record<string, unknown>;
  const overrides =
    safe.overrides && typeof safe.overrides === "object"
      ? (safe.overrides as Record<string, unknown>)
      : {};

  for (const field of ADAPTATION_FIELDS) {
    parsed[field.key] = {
      enabled: Boolean(safe[field.key]),
      override: typeof overrides[field.key] === "string" ? (overrides[field.key] as string) : ""
    };
  }

  if (typeof overrides.notes === "string") {
    notes = overrides.notes;
  } else if (typeof overrides.generalNotes === "string") {
    notes = overrides.generalNotes;
  }

  return { adaptations: parsed, notes };
}

function buildAdaptationsPayload(adaptations: AdaptationForm, notes: string) {
  const overrides: Record<string, string> = {};
  for (const field of ADAPTATION_FIELDS) {
    if (adaptations[field.key].override.trim()) {
      overrides[field.key] = adaptations[field.key].override.trim();
    }
  }
  if (notes.trim()) {
    overrides.notes = notes.trim();
  }

  return {
    bedBound: adaptations.bedBound.enabled,
    dementiaFriendly: adaptations.dementiaFriendly.enabled,
    lowVisionHearing: adaptations.lowVisionHearing.enabled,
    oneToOneMini: adaptations.oneToOneMini.enabled,
    overrides
  };
}

function getRangeForView(view: CalendarViewMode, anchorDateKey: string, timeZone: string): CalendarRange {
  const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();

  if (view === "day") {
    const start = anchor;
    const end = addDays(anchor, 1);
    return { start, end };
  }

  if (view === "week") {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    return { start, end };
  }

  if (view === "month") {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 })
    };
  }

  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = addDays(start, 34);
  return { start, end };
}

function toUtcIso(dateKey: string, hhmm: string, timeZone: string) {
  const dayStart = zonedDateStringToUtcStart(dateKey, timeZone);
  if (!dayStart) return null;
  const minutes = parseTimeToMinutes(hhmm);
  return new Date(dayStart.getTime() + minutes * 60_000).toISOString();
}

function eventCategory(event: CalendarEventLite, templateById: Map<string, CalendarTemplateLite>) {
  if (!event.templateId) return "Uncategorized";
  return templateById.get(event.templateId)?.category ?? "Uncategorized";
}

function inferEventType(event: CalendarEventLite, templateById: Map<string, CalendarTemplateLite>): EventTypeKey {
  const title = event.title.toLowerCase();
  const location = event.location.toLowerCase();
  const category = eventCategory(event, templateById).toLowerCase();
  const combined = `${title} ${location} ${category}`;

  if (combined.includes("1:1") || combined.includes("one-to-one") || combined.includes("one on one")) {
    return "one-to-one";
  }
  if (combined.includes("outing") || combined.includes("trip") || combined.includes("bus")) {
    return "outing";
  }
  if (
    combined.includes("appointment") ||
    combined.includes("medical") ||
    combined.includes("therapy") ||
    combined.includes("doctor")
  ) {
    return "appointment";
  }
  if (
    combined.includes("reminder") ||
    combined.includes("task") ||
    combined.includes("smoke break") ||
    combined.includes("check-in")
  ) {
    return "reminder";
  }
  if (combined.includes("facility") || combined.includes("holiday") || combined.includes("event")) {
    return "facility-event";
  }

  return "group-activity";
}

const NEUTRAL_EVENT_COLOR: EventColorMeta = {
  chipClass: "bg-slate-100 text-slate-700 border-slate-300/80",
  badgeClass: "bg-slate-100/85 text-slate-700 border-slate-300/80",
  dotClass: "bg-slate-500",
  cardClass: "border-slate-200/80 bg-gradient-to-br from-slate-100/65 via-white/88 to-slate-50/70"
};

const EVENT_TYPE_COLORS: Record<EventTypeKey, EventColorMeta> = {
  "group-activity": {
    chipClass: "bg-emerald-100 text-emerald-700 border-emerald-300/70",
    badgeClass: "bg-emerald-100/85 text-emerald-800 border-emerald-300/70",
    dotClass: "bg-emerald-500",
    cardClass: "border-emerald-200/80 bg-gradient-to-br from-emerald-100/70 via-white/86 to-teal-100/65"
  },
  "one-to-one": {
    chipClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300/70",
    badgeClass: "bg-fuchsia-100/85 text-fuchsia-800 border-fuchsia-300/70",
    dotClass: "bg-fuchsia-500",
    cardClass: "border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-100/70 via-white/86 to-violet-100/65"
  },
  outing: {
    chipClass: "bg-amber-100 text-amber-800 border-amber-300/75",
    badgeClass: "bg-amber-100/85 text-amber-900 border-amber-300/75",
    dotClass: "bg-amber-500",
    cardClass: "border-amber-200/80 bg-gradient-to-br from-amber-100/72 via-white/86 to-orange-100/66"
  },
  "facility-event": {
    chipClass: "bg-cyan-100 text-cyan-800 border-cyan-300/75",
    badgeClass: "bg-cyan-100/85 text-cyan-900 border-cyan-300/75",
    dotClass: "bg-cyan-500",
    cardClass: "border-cyan-200/80 bg-gradient-to-br from-cyan-100/70 via-white/86 to-sky-100/66"
  },
  appointment: {
    chipClass: "bg-rose-100 text-rose-700 border-rose-300/75",
    badgeClass: "bg-rose-100/85 text-rose-800 border-rose-300/75",
    dotClass: "bg-rose-500",
    cardClass: "border-rose-200/80 bg-gradient-to-br from-rose-100/70 via-white/86 to-pink-100/66"
  },
  reminder: {
    chipClass: "bg-indigo-100 text-indigo-700 border-indigo-300/75",
    badgeClass: "bg-indigo-100/85 text-indigo-800 border-indigo-300/75",
    dotClass: "bg-indigo-500",
    cardClass: "border-indigo-200/80 bg-gradient-to-br from-indigo-100/70 via-white/86 to-blue-100/66"
  }
};

const CATEGORY_COLOR_LOOKUP: Record<string, EventColorMeta> = {
  entertainment: {
    chipClass: "bg-violet-100 text-violet-700 border-violet-300/75",
    badgeClass: "bg-violet-100/85 text-violet-800 border-violet-300/75",
    dotClass: "bg-violet-500",
    cardClass: "border-violet-200/80 bg-gradient-to-br from-violet-100/70 via-white/86 to-purple-100/66"
  },
  fitness: {
    chipClass: "bg-lime-100 text-lime-700 border-lime-300/75",
    badgeClass: "bg-lime-100/85 text-lime-800 border-lime-300/75",
    dotClass: "bg-lime-500",
    cardClass: "border-lime-200/80 bg-gradient-to-br from-lime-100/72 via-white/86 to-emerald-100/66"
  },
  cognitive: {
    chipClass: "bg-blue-100 text-blue-700 border-blue-300/75",
    badgeClass: "bg-blue-100/85 text-blue-800 border-blue-300/75",
    dotClass: "bg-blue-500",
    cardClass: "border-blue-200/80 bg-gradient-to-br from-blue-100/70 via-white/86 to-cyan-100/66"
  },
  spiritual: {
    chipClass: "bg-indigo-100 text-indigo-700 border-indigo-300/75",
    badgeClass: "bg-indigo-100/85 text-indigo-800 border-indigo-300/75",
    dotClass: "bg-indigo-500",
    cardClass: "border-indigo-200/80 bg-gradient-to-br from-indigo-100/70 via-white/86 to-violet-100/66"
  },
  social: {
    chipClass: "bg-pink-100 text-pink-700 border-pink-300/75",
    badgeClass: "bg-pink-100/85 text-pink-800 border-pink-300/75",
    dotClass: "bg-pink-500",
    cardClass: "border-pink-200/80 bg-gradient-to-br from-pink-100/70 via-white/86 to-rose-100/66"
  },
  sensory: {
    chipClass: "bg-orange-100 text-orange-700 border-orange-300/75",
    badgeClass: "bg-orange-100/85 text-orange-800 border-orange-300/75",
    dotClass: "bg-orange-500",
    cardClass: "border-orange-200/80 bg-gradient-to-br from-orange-100/72 via-white/86 to-amber-100/66"
  },
  "resident-council": {
    chipClass: "bg-teal-100 text-teal-700 border-teal-300/75",
    badgeClass: "bg-teal-100/85 text-teal-800 border-teal-300/75",
    dotClass: "bg-teal-500",
    cardClass: "border-teal-200/80 bg-gradient-to-br from-teal-100/72 via-white/86 to-cyan-100/66"
  },
  "activity-supplies": {
    chipClass: "bg-sky-100 text-sky-700 border-sky-300/75",
    badgeClass: "bg-sky-100/85 text-sky-800 border-sky-300/75",
    dotClass: "bg-sky-500",
    cardClass: "border-sky-200/80 bg-gradient-to-br from-sky-100/72 via-white/86 to-blue-100/66"
  },
  decorations: {
    chipClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300/75",
    badgeClass: "bg-fuchsia-100/85 text-fuchsia-800 border-fuchsia-300/75",
    dotClass: "bg-fuchsia-500",
    cardClass: "border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-100/70 via-white/86 to-pink-100/66"
  },
  outings: {
    chipClass: "bg-amber-100 text-amber-800 border-amber-300/75",
    badgeClass: "bg-amber-100/85 text-amber-900 border-amber-300/75",
    dotClass: "bg-amber-500",
    cardClass: "border-amber-200/80 bg-gradient-to-br from-amber-100/72 via-white/86 to-orange-100/66"
  },
  prizes: {
    chipClass: "bg-purple-100 text-purple-700 border-purple-300/75",
    badgeClass: "bg-purple-100/85 text-purple-800 border-purple-300/75",
    dotClass: "bg-purple-500",
    cardClass: "border-purple-200/80 bg-gradient-to-br from-purple-100/72 via-white/86 to-violet-100/66"
  },
  "snack-drink": {
    chipClass: "bg-red-100 text-red-700 border-red-300/75",
    badgeClass: "bg-red-100/85 text-red-800 border-red-300/75",
    dotClass: "bg-red-500",
    cardClass: "border-red-200/80 bg-gradient-to-br from-red-100/72 via-white/86 to-rose-100/66"
  },
  snacks: {
    chipClass: "bg-red-100 text-red-700 border-red-300/75",
    badgeClass: "bg-red-100/85 text-red-800 border-red-300/75",
    dotClass: "bg-red-500",
    cardClass: "border-red-200/80 bg-gradient-to-br from-red-100/72 via-white/86 to-rose-100/66"
  },
  "snacks-drinks": {
    chipClass: "bg-red-100 text-red-700 border-red-300/75",
    badgeClass: "bg-red-100/85 text-red-800 border-red-300/75",
    dotClass: "bg-red-500",
    cardClass: "border-red-200/80 bg-gradient-to-br from-red-100/72 via-white/86 to-rose-100/66"
  },
  other: NEUTRAL_EVENT_COLOR,
  uncategorized: NEUTRAL_EVENT_COLOR
};

const CATEGORY_COLOR_FALLBACK: EventColorMeta[] = [
  EVENT_TYPE_COLORS["group-activity"],
  EVENT_TYPE_COLORS["one-to-one"],
  EVENT_TYPE_COLORS.outing,
  EVENT_TYPE_COLORS["facility-event"],
  EVENT_TYPE_COLORS.appointment,
  EVENT_TYPE_COLORS.reminder
];

function normalizeColorKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryColorMeta(category: string): EventColorMeta {
  const key = normalizeColorKey(category);
  const direct = CATEGORY_COLOR_LOOKUP[key];
  if (direct) return direct;

  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return CATEGORY_COLOR_FALLBACK[hash % CATEGORY_COLOR_FALLBACK.length] ?? NEUTRAL_EVENT_COLOR;
}

function eventColorMeta(params: {
  event: CalendarEventLite;
  templateById: Map<string, CalendarTemplateLite>;
  colorMode: CalendarColorMode;
}): EventColorMeta {
  const { event, templateById, colorMode } = params;
  if (colorMode === "none") return NEUTRAL_EVENT_COLOR;
  if (colorMode === "category") {
    return categoryColorMeta(eventCategory(event, templateById));
  }
  return EVENT_TYPE_COLORS[inferEventType(event, templateById)] ?? NEUTRAL_EVENT_COLOR;
}

function eventTypeMeta(type: EventTypeKey) {
  const colors = EVENT_TYPE_COLORS[type] ?? NEUTRAL_EVENT_COLOR;
  switch (type) {
    case "one-to-one":
      return {
        label: "1:1",
        icon: UserRound,
        ...colors
      };
    case "outing":
      return {
        label: "Outing",
        icon: BusFront,
        ...colors
      };
    case "facility-event":
      return {
        label: "Facility",
        icon: CalendarHeart,
        ...colors
      };
    case "appointment":
      return {
        label: "Appointment",
        icon: Stethoscope,
        ...colors
      };
    case "reminder":
      return {
        label: "Reminder",
        icon: BellRing,
        ...colors
      };
    default:
      return {
        label: "Group",
        icon: Users,
        ...colors
      };
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function parseEventClock(event: CalendarEventLite, timeZone: string) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const startTime = formatInTimeZone(start, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const endTime = formatInTimeZone(end, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return {
    dateKey: zonedDateKey(start, timeZone),
    startMinutes: parseTimeToMinutes(startTime),
    endMinutes: parseTimeToMinutes(endTime),
    startTime,
    endTime
  };
}

function hasChecklistItems(value: unknown) {
  return checklistToStrings(value).length > 0;
}

function hasAdaptationsEnabled(value: unknown) {
  const parsed = parseAdaptations(value);
  return ADAPTATION_FIELDS.some((field) => parsed.adaptations[field.key].enabled);
}

function eventsOverlap(
  a: { startMinutes: number; endMinutes: number },
  b: { startMinutes: number; endMinutes: number }
) {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

function buildSlots() {
  const rows: Array<{ minute: number; label: string }> = [];
  const start = GRID_START_HOUR * 60;
  const end = GRID_END_HOUR * 60;
  for (let minute = start; minute <= end; minute += SLOT_MINUTES) {
    rows.push({ minute, label: minutesToLabel(minute) });
  }
  return rows;
}

function defaultDrawerState(params: {
  dateKey: string;
  startMinutes: number;
  title?: string;
  templateId?: string | null;
  checklistItems?: string[];
  adaptations?: AdaptationForm;
  notes?: string;
  location?: string;
}): DrawerState {
  return {
    mode: "create",
    eventId: null,
    templateId: params.templateId ?? null,
    title: params.title ?? "",
    dateKey: params.dateKey,
    startTime: minutesToTime(params.startMinutes),
    endTime: minutesToTime(params.startMinutes + DEFAULT_EVENT_DURATION_MIN),
    location: params.location ?? DEFAULT_LOCATION,
    notes: params.notes ?? "",
    checklistItems: params.checklistItems ?? [],
    checklistDraft: "",
    adaptations: params.adaptations ?? emptyAdaptations(),
    showChecklist: Boolean(params.checklistItems && params.checklistItems.length > 0),
    showAdaptations: true,
    showAdvanced: false
  };
}

export function CalendarUnifiedWorkspace({
  templates,
  initialDateKey,
  initialView,
  initialSection,
  hasExplicitView,
  timeZone
}: {
  templates: CalendarTemplateLite[];
  initialDateKey: string;
  initialView: CalendarViewMode;
  initialSection: CalendarSubsection;
  hasExplicitView: boolean;
  timeZone: string;
}) {
  useDevRenderTrace("CalendarUnifiedWorkspace", {
    every: 10,
    details: { templateCount: templates.length }
  });

  const router = useRouter();
  const { toast } = useToast();
  const templateScrollRef = useRef<HTMLDivElement | null>(null);
  const agendaScrollRef = useRef<HTMLDivElement | null>(null);
  const resizePreviewRef = useRef<ResizePreview | null>(null);
  const [view, setView] = useState<CalendarViewMode>(initialView);
  const [section, setSection] = useState<CalendarSubsection>(initialSection);
  const [anchorDateKey, setAnchorDateKey] = useState<string>(
    isDateKey(initialDateKey) ? initialDateKey : zonedDateKey(new Date(), timeZone)
  );
  const [events, setEvents] = useState<CalendarEventLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const deferredGlobalSearch = useDeferredValue(globalSearch.trim());
  const deferredTemplateSearch = useDeferredValue(templateSearch.trim());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dockOpen, setDockOpen] = useState(true);
  const [dockReady, setDockReady] = useState(false);
  const [mobileDockOpen, setMobileDockOpen] = useState(false);
  const [dockTab, setDockTab] = useState<DockTab>("templates");
  const [templateCategory, setTemplateCategory] = useState("ALL");
  const [eventCategoryFilters, setEventCategoryFilters] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);

  const [drawerState, setDrawerState] = useState<DrawerState | null>(null);
  const [quickSchedule, setQuickSchedule] = useState<QuickScheduleState | null>(null);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const [quickCreate, setQuickCreate] = useState({
    eventType: "group-activity" as EventTypeKey,
    title: "",
    dateKey: initialDateKey,
    startTime: "10:00",
    endTime: "11:00",
    location: DEFAULT_LOCATION,
    templateId: "",
    notes: "",
    repeatEnabled: false,
    recurrenceFreq: "WEEKLY" as "DAILY" | "WEEKLY" | "MONTHLY",
    recurrenceInterval: 1
  });
  const [calendarSettings, setCalendarSettings] = useState({
    defaultDurationMin: DEFAULT_EVENT_DURATION_MIN,
    visibleStartHour: GRID_START_HOUR,
    visibleEndHour: GRID_END_HOUR,
    defaultLocation: DEFAULT_LOCATION,
    colorMode: "eventType" as CalendarColorMode,
    pdfLayout: "WEEKLY",
    defaultCategory: "Social"
  });

  const [draggingTemplateId, setDraggingTemplateId] = useState<string | null>(null);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [hoveredDropDay, setHoveredDropDay] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);

  useEffect(() => {
    resizePreviewRef.current = resizePreview;
  }, [resizePreview]);

  useEffect(() => {
    if (dockOpen || mobileDockOpen) {
      setDockReady(true);
    }
  }, [dockOpen, mobileDockOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("actify:calendar:settings");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<typeof calendarSettings>;
      const colorMode =
        parsed.colorMode === "eventType" || parsed.colorMode === "category" || parsed.colorMode === "none"
          ? parsed.colorMode
          : "eventType";
      setCalendarSettings((current) => ({ ...current, ...parsed, colorMode }));
    } catch {
      // ignore invalid local preferences
    }
  }, []);

  useEffect(() => {
    if (hasExplicitView) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) {
      setView("agenda");
    }
  }, [hasExplicitView]);

  useEffect(() => {
    router.replace(`/app/calendar?section=${section}&view=${view}&date=${anchorDateKey}`, { scroll: false });
  }, [anchorDateKey, router, section, view]);

  useEffect(() => {
    if (!showOnlyMine) return;
    toast({
      title: "Filter coming soon",
      description: "Show only my events will activate once owner-level event assignments are enabled."
    });
  }, [showOnlyMine, toast]);

  const range = useMemo(() => getRangeForView(view, anchorDateKey, timeZone), [anchorDateKey, timeZone, view]);

  const templateById = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates]);
  const templateCategories = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category))).sort((a, b) => a.localeCompare(b)),
    [templates]
  );

  const fetchRangeEvents = useCallback(
    async (force = false) => {
      const startIso = range.start.toISOString();
      const endIso = range.end.toISOString();
      const apiView = view === "agenda" ? "day" : view;
      const url = `/api/calendar/range?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&view=${apiView}`;
      const cacheKey = `calendar-unified:${startIso}:${endIso}`;

      setLoading(true);
      try {
        const payload = await cachedFetchJson<{ activities?: CalendarEventLite[] }>(cacheKey, url, {
          ttlMs: 30_000,
          force
        });
        setEvents(Array.isArray(payload.activities) ? payload.activities : []);
      } catch (error) {
        toast({
          title: "Unable to load calendar",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    },
    [range.end, range.start, toast, view]
  );

  useEffect(() => {
    void fetchRangeEvents();
  }, [fetchRangeEvents]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
    const nextAnchor =
      view === "month"
        ? addMonths(anchor, 1)
        : view === "day"
          ? addDays(anchor, 1)
          : addDays(anchor, 7);
    const nextRange = getRangeForView(view, zonedDateKey(nextAnchor, timeZone), timeZone);
    const nextStartIso = nextRange.start.toISOString();
    const nextEndIso = nextRange.end.toISOString();
    const nextView = view === "agenda" ? "day" : view;
    const nextUrl = `/api/calendar/range?start=${encodeURIComponent(nextStartIso)}&end=${encodeURIComponent(nextEndIso)}&view=${nextView}`;
    const nextKey = `calendar-unified:${nextStartIso}:${nextEndIso}`;

    const run = () =>
      void cachedFetchJson(nextKey, nextUrl, {
        ttlMs: 30_000
      }).catch(() => {
        // Prefetch failures are intentionally non-blocking.
      });

    const timeout = window.setTimeout(() => {
      const idleCallback = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback;
      if (typeof idleCallback === "function") {
        idleCallback(run);
      } else {
        run();
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [anchorDateKey, timeZone, view]);

  const filteredTemplates = useMemo(() => {
    const query = `${deferredGlobalSearch} ${deferredTemplateSearch}`.trim().toLowerCase();
    return templates.filter((template) => {
      if (templateCategory !== "ALL" && template.category !== templateCategory) return false;
      if (!query) return true;
      return (
        template.title.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.difficulty.toLowerCase().includes(query)
      );
    });
  }, [deferredGlobalSearch, deferredTemplateSearch, templateCategory, templates]);

  const displayEvents = useMemo(() => {
    const query = deferredGlobalSearch.toLowerCase();
    return events.filter((event) => {
      if (locationFilter !== "ALL" && event.location !== locationFilter) return false;
      if (eventCategoryFilters.length > 0) {
        const category = eventCategory(event, templateById);
        if (!eventCategoryFilters.includes(category)) return false;
      }

      if (!query) return true;
      const category = eventCategory(event, templateById);
      return (
        event.title.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
      );
    });
  }, [deferredGlobalSearch, eventCategoryFilters, events, locationFilter, templateById]);

  const eventLocations = useMemo(
    () => Array.from(new Set(events.map((event) => event.location))).sort((a, b) => a.localeCompare(b)),
    [events]
  );

  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventLite[]>();
    for (const event of displayEvents) {
      const key = zonedDateKey(new Date(event.startAt), timeZone);
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }

    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [displayEvents, timeZone]);

  const conflictingEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dayEvents of eventsByDay.values()) {
      const byLocation = new Map<string, Array<{ id: string; start: number; end: number }>>();
      for (const event of dayEvents) {
        const slot = byLocation.get(event.location) ?? [];
        slot.push({
          id: event.id,
          start: new Date(event.startAt).getTime(),
          end: new Date(event.endAt).getTime()
        });
        byLocation.set(event.location, slot);
      }

      for (const rows of byLocation.values()) {
        rows.sort((a, b) => a.start - b.start);
        for (let i = 0; i < rows.length; i += 1) {
          for (let j = i + 1; j < rows.length; j += 1) {
            if (rows[j].start >= rows[i].end) break;
            ids.add(rows[i].id);
            ids.add(rows[j].id);
          }
        }
      }
    }
    return ids;
  }, [eventsByDay]);

  const weekStart = useMemo(() => startOfWeek(range.start, { weekStartsOn: 1 }), [range.start]);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, index) => addDays(weekStart, index)), [weekStart]);
  const dayAnchor = useMemo(
    () => zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date(),
    [anchorDateKey, timeZone]
  );
  const gridDays = useMemo(() => (view === "day" ? [dayAnchor] : weekDays), [dayAnchor, view, weekDays]);

  const slots = useMemo(() => buildSlots(), []);
  const totalGridHeight = slots.length * SLOT_HEIGHT;

  const monthAnchor = useMemo(() => {
    const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
    return startOfMonth(anchor);
  }, [anchorDateKey, timeZone]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });
    const rows: Date[] = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      rows.push(cursor);
    }
    return rows;
  }, [monthAnchor]);

  const nowIndicator = useMemo(() => {
    const now = new Date();
    const nowKey = zonedDateKey(now, timeZone);
    const dayIndex = gridDays.findIndex((day) => zonedDateKey(day, timeZone) === nowKey);
    if (dayIndex === -1) return null;

    const hhmm = formatInTimeZone(now, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const minute = parseTimeToMinutes(hhmm);
    const top = ((minute - GRID_START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;

    return {
      dayIndex,
      top: clamp(top, 0, totalGridHeight - 2)
    };
  }, [gridDays, timeZone, totalGridHeight]);

  const visibleRangeCount = useMemo(() => {
    const start = startOfWeek(zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });

    if (view === "day") {
      const dayStart = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
      const dayEnd = addDays(dayStart, 1);
      return displayEvents.filter((event) => {
        const startAt = new Date(event.startAt);
        return startAt >= dayStart && startAt < dayEnd;
      }).length;
    }

    return displayEvents.filter((event) => {
      const startAt = new Date(event.startAt);
      return startAt >= start && startAt <= end;
    }).length;
  }, [anchorDateKey, displayEvents, timeZone, view]);

  const monthCount = useMemo(() => {
    const monthToken = format(monthAnchor, "yyyy-MM");
    return displayEvents.filter((event) => format(new Date(event.startAt), "yyyy-MM") === monthToken).length;
  }, [displayEvents, monthAnchor]);

  const lowDensityTemplates = useMemo(() => filteredTemplates.slice(0, 3), [filteredTemplates]);

  const templateVirtualizer = useVirtualizer({
    count: filteredTemplates.length,
    getScrollElement: () => templateScrollRef.current,
    estimateSize: () => 112,
    overscan: 10
  });

  const agendaRows = useMemo<AgendaRow[]>(() => {
    const rows: AgendaRow[] = [];
    const sorted = [...displayEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    let currentDateKey = "";
    for (const event of sorted) {
      const dateKey = zonedDateKey(new Date(event.startAt), timeZone);
      if (dateKey !== currentDateKey) {
        currentDateKey = dateKey;
        rows.push({
          kind: "header",
          key: `header-${dateKey}`,
          dateKey,
          label: formatInTimeZone(new Date(event.startAt), timeZone, {
            weekday: "long",
            month: "short",
            day: "numeric"
          })
        });
      }
      rows.push({ kind: "event", key: event.id, event });
    }
    return rows;
  }, [displayEvents, timeZone]);

  const agendaVirtualizer = useVirtualizer({
    count: agendaRows.length,
    getScrollElement: () => agendaScrollRef.current,
    estimateSize: (index) => (agendaRows[index]?.kind === "header" ? 42 : 90),
    overscan: 14
  });

  const rangeLabel = useMemo(() => {
    if (view === "month") {
      return format(monthAnchor, "MMMM yyyy");
    }
    if (view === "day") {
      const dayAnchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
      return formatInTimeZone(dayAnchor, timeZone, {
        weekday: "long",
        month: "short",
        day: "numeric"
      });
    }
    if (view === "week") {
      return `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d")}`;
    }

    const agendaStart = range.start;
    const agendaEnd = range.end;
    return `${format(agendaStart, "MMM d")} - ${format(agendaEnd, "MMM d")}`;
  }, [anchorDateKey, monthAnchor, range.end, range.start, timeZone, view, weekDays]);

  function toggleFavoriteTemplate(templateId: string) {
    setFavoriteTemplateIds((current) => {
      if (current.includes(templateId)) {
        return current.filter((id) => id !== templateId);
      }
      return [...current, templateId];
    });
  }

  function shiftDate(delta: number) {
    const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();

    if (view === "month") {
      const next = addMonths(anchor, delta);
      setAnchorDateKey(zonedDateKey(next, timeZone));
      return;
    }

    const span = view === "week" ? 7 : view === "day" ? 1 : 7;
    const next = addDays(anchor, span * delta);
    setAnchorDateKey(zonedDateKey(next, timeZone));
  }

  function goToToday() {
    setAnchorDateKey(zonedDateKey(new Date(), timeZone));
  }

  async function saveQuickCreate() {
    const title = quickCreate.title.trim();
    if (!title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const startAt = toUtcIso(quickCreate.dateKey, quickCreate.startTime, timeZone);
    const endAt = toUtcIso(quickCreate.dateKey, quickCreate.endTime, timeZone);
    if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    const selectedTemplate = quickCreate.templateId ? templateById.get(quickCreate.templateId) : null;
    const templateChecklist = selectedTemplate ? checklistToStrings(selectedTemplate.defaultChecklist) : [];
    const parsedAdaptations = selectedTemplate ? parseAdaptations(selectedTemplate.adaptations) : null;

    const payload: Record<string, unknown> = {
      title,
      startAt,
      endAt,
      location: quickCreate.location.trim() || calendarSettings.defaultLocation || DEFAULT_LOCATION,
      templateId: selectedTemplate?.id,
      checklist: checklistToJson(templateChecklist),
      adaptationsEnabled: parsedAdaptations
        ? buildAdaptationsPayload(parsedAdaptations.adaptations, parsedAdaptations.notes)
        : buildAdaptationsPayload(emptyAdaptations(), quickCreate.notes)
    };

    if (quickCreate.repeatEnabled) {
      payload.recurrence = {
        freq: quickCreate.recurrenceFreq,
        interval: Math.max(1, Math.min(365, quickCreate.recurrenceInterval)),
        timezone: timeZone
      };
    }

    setSaving(true);
    try {
      const created = await requestWithConflictHandling({
        endpoint: "/api/calendar/activities",
        method: "POST",
        payload,
        successMessage: quickCreate.repeatEnabled ? "Recurring event created" : "Event created",
        closeDrawerOnSuccess: false,
        closeQuickOnSuccess: false
      });
      if (!created) return;

      setSection("schedule");
      setView("week");
      setAnchorDateKey(quickCreate.dateKey);
      setQuickCreate((current) => ({
        ...current,
        title: "",
        notes: "",
        repeatEnabled: false,
        recurrenceInterval: 1,
        recurrenceFreq: "WEEKLY"
      }));
    } finally {
      setSaving(false);
    }
  }

  function persistCalendarSettings() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("actify:calendar:settings", JSON.stringify(calendarSettings));
    toast({ title: "Calendar settings saved" });
  }

  function openDrawerForManual(dateKey: string, startMinutes: number) {
    setSelectedDayKey(dateKey);
    setDrawerState(defaultDrawerState({ dateKey, startMinutes }));
  }

  function openDrawerFromTemplate(dateKey: string, startMinutes: number, templateId: string) {
    const template = templateById.get(templateId);
    if (!template) return;
    setSelectedDayKey(dateKey);
    const parsed = parseAdaptations(template.adaptations);
    setDrawerState(
      defaultDrawerState({
        dateKey,
        startMinutes,
        title: template.title,
        templateId,
        checklistItems: checklistToStrings(template.defaultChecklist),
        adaptations: parsed.adaptations,
        notes: parsed.notes
      })
    );
  }

  function openDrawerForEdit(event: CalendarEventLite) {
    const clock = parseEventClock(event, timeZone);
    setSelectedDayKey(clock.dateKey);
    const parsed = parseAdaptations(event.adaptationsEnabled);

    setDrawerState({
      mode: "edit",
      eventId: event.id,
      templateId: event.templateId,
      title: event.title,
      dateKey: clock.dateKey,
      startTime: clock.startTime,
      endTime: clock.endTime,
      location: event.location,
      notes: parsed.notes,
      checklistItems: checklistToStrings(event.checklist),
      checklistDraft: "",
      adaptations: parsed.adaptations,
      showChecklist: true,
      showAdaptations: true,
      showAdvanced: false
    });
  }

  function openDrawerDuplicate(event: CalendarEventLite) {
    const clock = parseEventClock(event, timeZone);
    const parsed = parseAdaptations(event.adaptationsEnabled);

    setDrawerState({
      mode: "create",
      eventId: null,
      templateId: event.templateId,
      title: `${event.title} (Copy)`,
      dateKey: clock.dateKey,
      startTime: clock.startTime,
      endTime: clock.endTime,
      location: event.location,
      notes: parsed.notes,
      checklistItems: checklistToStrings(event.checklist),
      checklistDraft: "",
      adaptations: parsed.adaptations,
      showChecklist: true,
      showAdaptations: true,
      showAdvanced: false
    });
  }

  function updateDrawer(patch: Partial<DrawerState>) {
    setDrawerState((current) => (current ? { ...current, ...patch } : current));
  }

  function addChecklistItem() {
    setDrawerState((current) => {
      if (!current) return current;
      const next = current.checklistDraft.trim();
      if (!next) return current;
      return {
        ...current,
        checklistItems: [...current.checklistItems, next],
        checklistDraft: ""
      };
    });
  }

  function moveChecklistItem(index: number, direction: -1 | 1) {
    setDrawerState((current) => {
      if (!current) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.checklistItems.length) return current;
      const cloned = [...current.checklistItems];
      const [item] = cloned.splice(index, 1);
      cloned.splice(nextIndex, 0, item);
      return {
        ...current,
        checklistItems: cloned
      };
    });
  }

  function removeChecklistItem(index: number) {
    setDrawerState((current) => {
      if (!current) return current;
      return {
        ...current,
        checklistItems: current.checklistItems.filter((_, itemIndex) => itemIndex !== index)
      };
    });
  }

  async function requestWithConflictHandling(params: {
    endpoint: string;
    method: "POST" | "PATCH";
    payload: Record<string, unknown>;
    successMessage: string;
    closeDrawerOnSuccess?: boolean;
    closeQuickOnSuccess?: boolean;
  }) {
    const response = await fetch(params.endpoint, {
      method: params.method,
      headers: { "Content-Type": "application/json" },
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
        message: parseApiErrorMessage(payload, "Scheduling conflict detected."),
        successMessage: params.successMessage,
        closeDrawerOnSuccess: Boolean(params.closeDrawerOnSuccess),
        closeQuickOnSuccess: Boolean(params.closeQuickOnSuccess)
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

    if (params.closeDrawerOnSuccess) {
      setDrawerState(null);
    }
    if (params.closeQuickOnSuccess) {
      setQuickSchedule(null);
    }

    toast({ title: params.successMessage });
    invalidateClientCache("calendar-unified:");
    await fetchRangeEvents(true);
    return true;
  }

  async function saveDrawer(addAnother = false) {
    if (!drawerState) return;

    const startAt = toUtcIso(drawerState.dateKey, drawerState.startTime, timeZone);
    const endAt = toUtcIso(drawerState.dateKey, drawerState.endTime, timeZone);
    if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    const payload = {
      title: drawerState.title.trim() || "Untitled Activity",
      startAt,
      endAt,
      location: drawerState.location.trim() || DEFAULT_LOCATION,
      checklist: checklistToJson(drawerState.checklistItems),
      adaptationsEnabled: buildAdaptationsPayload(drawerState.adaptations, drawerState.notes),
      templateId: drawerState.templateId ?? undefined,
      scope: "instance" as const
    };

    setSaving(true);
    try {
      if (drawerState.mode === "create") {
        const success = await requestWithConflictHandling({
          endpoint: "/api/calendar/activities",
          method: "POST",
          payload,
          successMessage: "Activity saved",
          closeDrawerOnSuccess: !addAnother
        });
        if (success && addAnother) {
          const nextStart = parseTimeToMinutes(drawerState.endTime);
          setDrawerState(
            defaultDrawerState({
              dateKey: drawerState.dateKey,
              startMinutes: nextStart,
              location: drawerState.location
            })
          );
        }
        return;
      }

      if (!drawerState.eventId) return;
      await requestWithConflictHandling({
        endpoint: `/api/calendar/activities/${drawerState.eventId}`,
        method: "PATCH",
        payload,
        successMessage: "Activity updated",
        closeDrawerOnSuccess: true
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveQuickSchedule() {
    if (!quickSchedule) return;
    const template = templateById.get(quickSchedule.templateId);
    if (!template) return;

    const startAt = toUtcIso(quickSchedule.dateKey, quickSchedule.startTime, timeZone);
    const endAt = toUtcIso(quickSchedule.dateKey, quickSchedule.endTime, timeZone);
    if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    const parsed = parseAdaptations(template.adaptations);

    await requestWithConflictHandling({
      endpoint: "/api/calendar/activities",
      method: "POST",
      payload: {
        title: template.title,
        startAt,
        endAt,
        location: quickSchedule.location || DEFAULT_LOCATION,
        templateId: template.id,
        checklist: checklistToJson(checklistToStrings(template.defaultChecklist)),
        adaptationsEnabled: buildAdaptationsPayload(parsed.adaptations, parsed.notes)
      },
      successMessage: "Template scheduled",
      closeQuickOnSuccess: true
    });
  }

  async function deleteActivity(eventId: string) {
    const confirmed = window.confirm("Delete this activity?");
    if (!confirmed) return;

    const response = await fetch(`/api/calendar/activities/${eventId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast({
        title: "Delete failed",
        description: parseApiErrorMessage(payload, "Could not delete activity."),
        variant: "destructive"
      });
      return;
    }

    if (drawerState?.eventId === eventId) {
      setDrawerState(null);
    }
    setEvents((current) => current.filter((event) => event.id !== eventId));
    toast({ title: "Activity deleted" });
    invalidateClientCache("calendar-unified:");
  }

  function parseDragPayload(event: DragEvent<HTMLElement>) {
    const raw = event.dataTransfer.getData("application/x-actify-calendar");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { type: "template" | "event"; id: string };
      if (!parsed || typeof parsed !== "object") return null;
      if (!parsed.id || !["template", "event"].includes(parsed.type)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function moveEventOptimistic(eventId: string, targetDateKey: string, targetStartMinutes: number) {
    const source = eventsById.get(eventId);
    if (!source) return;

    const sourceClock = parseEventClock(source, timeZone);
    const duration = Math.max(SLOT_MINUTES, sourceClock.endMinutes - sourceClock.startMinutes);
    const startAt = toUtcIso(targetDateKey, minutesToTime(targetStartMinutes), timeZone);
    const endAt = toUtcIso(targetDateKey, minutesToTime(targetStartMinutes + duration), timeZone);
    if (!startAt || !endAt) return;

    const previous = events;
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              startAt,
              endAt
            }
          : event
      )
    );

    const response = await fetch(`/api/calendar/activities/${eventId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt,
        endAt,
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
          startAt,
          endAt,
          location: source.location
        },
        conflicts: Array.isArray(payload.conflicts) ? payload.conflicts : [],
        outsideBusinessHours: Boolean(payload.outsideBusinessHours),
        message: parseApiErrorMessage(payload, "Scheduling conflict detected."),
        successMessage: "Activity moved",
        closeDrawerOnSuccess: false,
        closeQuickOnSuccess: false
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
    invalidateClientCache("calendar-unified:");
  }

  function startResize(event: CalendarEventLite, mouseEvent: ReactMouseEvent<HTMLButtonElement>) {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();

    const clock = parseEventClock(event, timeZone);
    setResizeState({
      eventId: event.id,
      dateKey: clock.dateKey,
      startMinutes: clock.startMinutes,
      originalEndMinutes: clock.endMinutes,
      startClientY: mouseEvent.clientY,
      previousEvents: events
    });
    setResizePreview({ eventId: event.id, endMinutes: clock.endMinutes });
  }

  useEffect(() => {
    if (!resizeState) return;

    const onMouseMove = (event: MouseEvent) => {
      const deltaSlots = Math.round((event.clientY - resizeState.startClientY) / SLOT_HEIGHT);
      const nextEndMinutes = clamp(
        resizeState.originalEndMinutes + deltaSlots * SLOT_MINUTES,
        resizeState.startMinutes + SLOT_MINUTES,
        GRID_END_HOUR * 60
      );

      setResizePreview({ eventId: resizeState.eventId, endMinutes: nextEndMinutes });
    };

    const onMouseUp = async () => {
      const source = eventsById.get(resizeState.eventId);
      const preview = resizePreviewRef.current;
      const endMinutes =
        preview && preview.eventId === resizeState.eventId
          ? preview.endMinutes
          : resizeState.originalEndMinutes;

      setResizeState(null);
      setResizePreview(null);

      if (!source || endMinutes === resizeState.originalEndMinutes) {
        return;
      }

      const startAt = toUtcIso(resizeState.dateKey, minutesToTime(resizeState.startMinutes), timeZone);
      const endAt = toUtcIso(resizeState.dateKey, minutesToTime(endMinutes), timeZone);
      if (!startAt || !endAt) return;

      const previous = resizeState.previousEvents;
      setEvents((current) =>
        current.map((event) =>
          event.id === resizeState.eventId
            ? {
                ...event,
                startAt,
                endAt
              }
            : event
        )
      );

      const response = await fetch(`/api/calendar/activities/${resizeState.eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt,
          endAt,
          location: source.location,
          scope: "instance"
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 409) {
        setEvents(previous);
        setConflictState({
          endpoint: `/api/calendar/activities/${resizeState.eventId}`,
          method: "PATCH",
          payload: {
            startAt,
            endAt,
            location: source.location,
            scope: "instance"
          },
          conflicts: Array.isArray(payload.conflicts) ? payload.conflicts : [],
          outsideBusinessHours: Boolean(payload.outsideBusinessHours),
          message: parseApiErrorMessage(payload, "Scheduling conflict detected."),
          successMessage: "Activity resized",
          closeDrawerOnSuccess: false,
          closeQuickOnSuccess: false
        });
        return;
      }

      if (!response.ok) {
        setEvents(previous);
        toast({
          title: "Resize failed",
          description: parseApiErrorMessage(payload, "Could not resize activity."),
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Activity resized" });
      invalidateClientCache("calendar-unified:");
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [eventsById, resizeState, timeZone, toast]);

  function handleWeekDrop(dayKey: string, event: DragEvent<HTMLDivElement>, useDefaultTime = false) {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload) return;

    const dropRect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - dropRect.top;
    const slotIndex = clamp(Math.floor(offsetY / SLOT_HEIGHT), 0, slots.length - 1);
    const startMinutes = useDefaultTime ? 10 * 60 : GRID_START_HOUR * 60 + slotIndex * SLOT_MINUTES;

    setHoveredDropDay(null);
    setDraggingTemplateId(null);
    setDraggingEventId(null);

    if (payload.type === "template") {
      openDrawerFromTemplate(dayKey, startMinutes, payload.id);
      return;
    }

    void moveEventOptimistic(payload.id, dayKey, startMinutes);
  }

  function handleMonthDrop(dayKey: string, event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload) return;

    setHoveredDropDay(null);
    setDraggingTemplateId(null);
    setDraggingEventId(null);

    if (payload.type === "template") {
      openDrawerFromTemplate(dayKey, 10 * 60, payload.id);
      return;
    }

    const source = eventsById.get(payload.id);
    if (!source) return;
    const sourceClock = parseEventClock(source, timeZone);
    void moveEventOptimistic(payload.id, dayKey, sourceClock.startMinutes);
  }

  function handleSlotKeyboardNavigation(
    event: KeyboardEvent<HTMLButtonElement>,
    dayIndex: number,
    slotIndex: number,
    dateKey: string,
    minute: number
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDrawerForManual(dateKey, minute);
      return;
    }

    let nextDay = dayIndex;
    let nextSlot = slotIndex;
    if (event.key === "ArrowUp") nextSlot -= 1;
    if (event.key === "ArrowDown") nextSlot += 1;
    if (event.key === "ArrowLeft") nextDay -= 1;
    if (event.key === "ArrowRight") nextDay += 1;

    if (nextDay === dayIndex && nextSlot === slotIndex) return;

    event.preventDefault();
    const target = document.getElementById(`week-slot-${nextDay}-${nextSlot}`);
    if (target instanceof HTMLElement) {
      target.focus();
    }
  }

  function buildDayEvents(dateKey: string) {
    return eventsByDay.get(dateKey) ?? [];
  }

  function buildDayEventLayouts(dateKey: string): WeekEventLayout[] {
    const dayEvents = buildDayEvents(dateKey);
    if (dayEvents.length === 0) return [];

    const normalized = dayEvents
      .map((event) => {
        const clock = parseEventClock(event, timeZone);
        const previewEndMinutes =
          resizePreview && resizePreview.eventId === event.id ? resizePreview.endMinutes : clock.endMinutes;
        const startMinutes = clamp(clock.startMinutes, GRID_START_HOUR * 60, GRID_END_HOUR * 60 - SLOT_MINUTES);
        const endMinutes = clamp(
          Math.max(startMinutes + SLOT_MINUTES, previewEndMinutes),
          startMinutes + SLOT_MINUTES,
          GRID_END_HOUR * 60
        );

        return {
          event,
          startMinutes,
          endMinutes,
          timeRangeLabel: `${minutesToLabel(startMinutes)} - ${minutesToLabel(endMinutes)}`
        };
      })
      .sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        if (a.endMinutes !== b.endMinutes) return a.endMinutes - b.endMinutes;
        return a.event.title.localeCompare(b.event.title);
      });

    const laneEnds: number[] = [];
    const withLanes = normalized.map((entry) => {
      let laneIndex = laneEnds.findIndex((laneEnd) => laneEnd <= entry.startMinutes);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(entry.endMinutes);
      } else {
        laneEnds[laneIndex] = entry.endMinutes;
      }

      return {
        ...entry,
        laneIndex
      };
    });

    return withLanes.map((entry) => {
      const overlapping = withLanes.filter((candidate) => eventsOverlap(entry, candidate));
      const laneIndexes = Array.from(new Set(overlapping.map((candidate) => candidate.laneIndex))).sort(
        (a, b) => a - b
      );
      const lanePosition = Math.max(0, laneIndexes.indexOf(entry.laneIndex));
      const laneCount = Math.max(1, laneIndexes.length);
      const widthPct = Math.max(18, (100 - EVENT_COLUMN_GAP_PCT * (laneCount - 1)) / laneCount);
      const rawLeft = lanePosition * (widthPct + EVENT_COLUMN_GAP_PCT);
      const leftPct = clamp(rawLeft, 0, Math.max(0, 100 - widthPct));

      const rawTop = ((entry.startMinutes - GRID_START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
      const rawHeight = ((entry.endMinutes - entry.startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT;
      const top = rawTop + EVENT_VERTICAL_GAP_PX / 2;
      const height = Math.max(rawHeight - EVENT_VERTICAL_GAP_PX, 18);

      return {
        event: entry.event,
        top,
        height,
        leftPct,
        widthPct,
        compactCard: height < 92,
        tightCard: height < 68,
        isConflict: conflictingEventIds.has(entry.event.id),
        hasChecklist: hasChecklistItems(entry.event.checklist),
        hasAdaptations: hasAdaptationsEnabled(entry.event.adaptationsEnabled),
        timeRangeLabel: entry.timeRangeLabel
      };
    });
  }

  const selectedDayEvents = selectedDayKey ? buildDayEvents(selectedDayKey) : [];

  async function applyConflictOverride() {
    if (!conflictState) return;
    const payload = {
      ...conflictState.payload,
      allowConflictOverride: true,
      allowOutsideBusinessHoursOverride: true
    };

    setConflictState(null);
    await requestWithConflictHandling({
      endpoint: conflictState.endpoint,
      method: conflictState.method,
      payload,
      successMessage: `${conflictState.successMessage} (override)`,
      closeDrawerOnSuccess: conflictState.closeDrawerOnSuccess,
      closeQuickOnSuccess: conflictState.closeQuickOnSuccess
    });
  }

  const drawerEvent = drawerState?.eventId ? eventsById.get(drawerState.eventId) ?? null : null;
  const drawerDisplayEvent = drawerState
    ? drawerEvent ?? {
        id: "new",
        title: drawerState.title,
        startAt: toUtcIso(drawerState.dateKey, drawerState.startTime, timeZone) ?? new Date().toISOString(),
        endAt: toUtcIso(drawerState.dateKey, drawerState.endTime, timeZone) ?? new Date().toISOString(),
        location: drawerState.location,
        templateId: drawerState.templateId,
        seriesId: null,
        occurrenceKey: null,
        isOverride: false,
        conflictOverride: false,
        checklist: [],
        adaptationsEnabled: {}
      }
    : null;
  const drawerTypeMeta = drawerDisplayEvent
    ? eventTypeMeta(inferEventType(drawerDisplayEvent, templateById))
    : null;
  const drawerColorMeta = drawerDisplayEvent
    ? eventColorMeta({
        event: drawerDisplayEvent,
        templateById,
        colorMode: calendarSettings.colorMode
      })
    : null;
  const drawerStatusLabel =
    drawerEvent && new Date(drawerEvent.endAt).getTime() < Date.now() ? "Completed" : "Scheduled";

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl border-white/20 p-4 shadow-xl shadow-black/15">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground/60">
              <CalendarPlus2 className="h-3.5 w-3.5 text-actifyBlue" />
              Calendar Workspace
            </p>
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">Calendar</h1>
            <p className="text-sm text-foreground/70">
              One calm workspace for scheduling, quick add, templates, and rules.
            </p>
          </div>
          <Button type="button" onClick={() => openDrawerForManual(anchorDateKey, 10 * 60)}>
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {([
            { key: "schedule", label: "Schedule", icon: CalendarHeart },
            { key: "create", label: "Create", icon: CalendarPlus2 },
            { key: "templates", label: "Templates", icon: Library },
            { key: "settings", label: "Settings", icon: Cog }
          ] as Array<{ key: CalendarSubsection; label: string; icon: typeof CalendarHeart }>).map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.key}
                type="button"
                size="sm"
                variant={section === item.key ? "default" : "outline"}
                onClick={() => setSection(item.key)}
                className={cn(section === item.key && "bg-actifyBlue text-white shadow-lg shadow-actifyBlue/30")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </section>

      {section === "schedule" ? (
        <>
      <section className="glass-panel rounded-2xl border-white/20 p-4 shadow-xl shadow-black/15">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(1)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="bg-white/70 text-sm font-semibold">
              {rangeLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/75 p-1">
            {(["week", "day", "month", "agenda"] as CalendarViewMode[]).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={view === mode ? "default" : "ghost"}
                className={cn(
                  "capitalize",
                  view === mode && "bg-actifyBlue text-white shadow-lg shadow-actifyBlue/30"
                )}
                onClick={() => setView(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[220px] max-w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
              <Input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search events/templates"
                className="bg-white/80 pl-9"
                aria-label="Search calendar"
              />
            </div>
            <label className="inline-flex h-10 items-center gap-2 rounded-md border border-white/70 bg-white/85 px-2 text-sm text-foreground/80">
              <Palette className="h-4 w-4 text-violet-600" />
              <select
                value={calendarSettings.colorMode}
                onChange={(event) =>
                  setCalendarSettings((current) => ({
                    ...current,
                    colorMode: event.target.value as CalendarColorMode
                  }))
                }
                className="h-full border-none bg-transparent pr-6 text-sm focus:outline-none"
                aria-label="Color coding mode"
              >
                <option value="eventType">Color: Type</option>
                <option value="category">Color: Category</option>
                <option value="none">Color: Neutral</option>
              </select>
            </label>
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] border-white/70 bg-white/95 p-3">
                <div className="space-y-3">
                  <label className="space-y-1 text-sm">
                    Location
                    <select
                      value={locationFilter}
                      onChange={(event) => setLocationFilter(event.target.value)}
                      className="h-10 w-full rounded-md border border-white/70 bg-white/85 px-3 text-sm"
                    >
                      <option value="ALL">All locations</option>
                      {eventLocations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {templateCategories.map((category) => {
                        const active = eventCategoryFilters.includes(category);
                        return (
                          <Button
                            key={`chip-${category}`}
                            type="button"
                            size="sm"
                            variant={active ? "default" : "outline"}
                            onClick={() =>
                              setEventCategoryFilters((current) =>
                                active ? current.filter((item) => item !== category) : [...current, category]
                              )
                            }
                          >
                            {category}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showOnlyMine}
                      onChange={(event) => setShowOnlyMine(event.target.checked)}
                    />
                    Show only my events
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLocationFilter("ALL");
                      setEventCategoryFilters([]);
                      setShowOnlyMine(false);
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button type="button" onClick={() => openDrawerForManual(anchorDateKey, 10 * 60)} className="shadow-lg shadow-actifyBlue/30">
              <Plus className="h-4 w-4" />
              New Event
            </Button>
            <Button type="button" variant="outline" onClick={() => setMobileDockOpen(true)} className="lg:hidden">
              <Layers className="h-4 w-4" />
              Templates
            </Button>
            <Button type="button" variant="outline" onClick={() => setDockOpen((current) => !current)} className="hidden lg:inline-flex">
              {dockOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              Template Dock
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground/80">
          <Badge variant="outline" className="bg-white/70">
            {view === "month" ? `${monthCount} this month` : view === "day" ? `${visibleRangeCount} this day` : `${visibleRangeCount} this week`}
          </Badge>
          <Badge variant="outline" className="bg-white/70">
            Month total: {monthCount}
          </Badge>
          <Badge variant="outline" className="bg-white/70">
            {displayEvents.length} visible after filters
          </Badge>
        </div>
      </section>

      <div className={cn("grid gap-4", dockOpen ? "lg:grid-cols-[320px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)]")}>
        {dockOpen ? (
          <aside className="hidden lg:block">
            <section className="glass-panel rounded-2xl border-white/20 p-3 shadow-xl shadow-black/15">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-actifyBlue" />
                <h2 className="text-sm font-semibold">Template Dock</h2>
                <Badge variant="outline" className="bg-white/70">
                  {filteredTemplates.length}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={dockTab === "templates" ? "default" : "outline"}
                  onClick={() => setDockTab("templates")}
                >
                  Templates
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dockTab === "filters" ? "default" : "outline"}
                  onClick={() => setDockTab("filters")}
                >
                  Filters
                </Button>
              </div>

              {dockReady ? (
                dockTab === "templates" ? (
                  <div className="mt-3 space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                      <Input
                        value={templateSearch}
                        onChange={(event) => setTemplateSearch(event.target.value)}
                        placeholder="Search templates"
                        className="bg-white/80 pl-9"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={templateCategory === "ALL" ? "default" : "outline"}
                        onClick={() => setTemplateCategory("ALL")}
                      >
                        All
                      </Button>
                      {templateCategories.map((category) => (
                        <Button
                          key={category}
                          type="button"
                          size="sm"
                          variant={templateCategory === category ? "default" : "outline"}
                          onClick={() => setTemplateCategory(category)}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>

                    {favoriteTemplateIds.length > 0 ? (
                      <div className="rounded-xl border border-white/60 bg-white/60 p-2">
                        <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-foreground/75">
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                          Favorites
                        </div>
                        <div className="space-y-1.5">
                          {lowDensityTemplates
                            .filter((template) => favoriteTemplateIds.includes(template.id))
                            .map((template) => (
                              <button
                                key={`fav-${template.id}`}
                                type="button"
                                className="w-full rounded-lg border border-white/60 bg-white/85 px-2 py-1 text-left text-xs"
                                onClick={() =>
                                  setQuickSchedule({
                                    templateId: template.id,
                                    dateKey: anchorDateKey,
                                    startTime: "10:00",
                                    endTime: "11:00",
                                    location: DEFAULT_LOCATION
                                  })
                                }
                              >
                                {template.title}
                              </button>
                            ))}
                        </div>
                      </div>
                    ) : null}

                    <div ref={templateScrollRef} className="max-h-[62vh] overflow-y-auto pr-1">
                      {filteredTemplates.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-white/70 bg-white/65 px-3 py-3 text-xs text-foreground/70">
                          No templates match your search.
                        </p>
                      ) : (
                        <div
                          className="relative"
                          style={{
                            height: `${templateVirtualizer.getTotalSize()}px`
                          }}
                        >
                          {templateVirtualizer.getVirtualItems().map((virtualItem) => {
                            const template = filteredTemplates[virtualItem.index];
                            if (!template) return null;
                            const isFavorite = favoriteTemplateIds.includes(template.id);
                            return (
                              <div
                                key={template.id}
                                className="absolute left-0 top-0 w-full pb-2"
                                style={{ transform: `translateY(${virtualItem.start}px)` }}
                              >
                                <div
                                  draggable
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "copy";
                                    event.dataTransfer.setData(
                                      "application/x-actify-calendar",
                                      JSON.stringify({ type: "template", id: template.id })
                                    );
                                    setDraggingTemplateId(template.id);
                                  }}
                                  onDragEnd={() => setDraggingTemplateId(null)}
                                  className={cn(
                                    "rounded-xl border border-white/70 bg-white/85 p-3 shadow-sm",
                                    draggingTemplateId === template.id && "opacity-60"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">{template.title}</p>
                                      <p className="text-xs text-foreground/65">
                                        {template.category} · {template.difficulty} · 60m
                                      </p>
                                    </div>
                                    <GripVertical className="h-4 w-4 text-foreground/55" />
                                  </div>
                                  <div className="mt-2 flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setQuickSchedule({
                                          templateId: template.id,
                                          dateKey: anchorDateKey,
                                          startTime: "10:00",
                                          endTime: "11:00",
                                          location: DEFAULT_LOCATION
                                        })
                                      }
                                    >
                                      Schedule
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => toggleFavoriteTemplate(template.id)}
                                      aria-label={isFavorite ? "Unfavorite template" : "Favorite template"}
                                    >
                                      {isFavorite ? (
                                        <Star className="h-4 w-4 text-amber-500" />
                                      ) : (
                                        <StarOff className="h-4 w-4 text-foreground/60" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <label className="space-y-1 text-sm">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/75">
                        <MapPin className="h-3.5 w-3.5" />
                        Location
                      </span>
                      <select
                        value={locationFilter}
                        onChange={(event) => setLocationFilter(event.target.value)}
                        className="h-10 w-full rounded-md border border-white/70 bg-white/80 px-3 text-sm"
                      >
                        <option value="ALL">All locations</option>
                        {eventLocations.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-2">
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-foreground/75">
                        <Filter className="h-3.5 w-3.5" />
                        Categories
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {templateCategories.map((category) => {
                          const active = eventCategoryFilters.includes(category);
                          return (
                            <Button
                              key={`filter-${category}`}
                              type="button"
                              size="sm"
                              variant={active ? "default" : "outline"}
                              onClick={() =>
                                setEventCategoryFilters((current) =>
                                  active ? current.filter((item) => item !== category) : [...current, category]
                                )
                              }
                            >
                              {category}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showOnlyMine}
                        onChange={(event) => setShowOnlyMine(event.target.checked)}
                      />
                      Show only my events
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setLocationFilter("ALL");
                        setEventCategoryFilters([]);
                        setShowOnlyMine(false);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-white/60 bg-white/60 p-3 text-xs text-foreground/70">
                  Open the dock to load templates and filters.
                </div>
              )}
            </section>
          </aside>
        ) : null}

        <div
          className={cn(
            "grid gap-4",
            selectedDayKey ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "xl:grid-cols-[minmax(0,1fr)]"
          )}
        >
        <section className="glass-panel rounded-2xl border-white/20 p-0 shadow-xl shadow-black/15">
          {view === "week" || view === "day" ? (
            <div className="max-h-[78vh] overflow-auto rounded-2xl">
              <div className={cn(view === "week" ? "min-w-[1020px]" : "min-w-[420px]")}>
                <div
                  className="sticky top-0 z-20 grid border-b border-white/60 bg-white/92 backdrop-blur"
                  style={{ gridTemplateColumns: `76px repeat(${gridDays.length}, minmax(130px, 1fr))` }}
                >
                  <div className="border-r border-white/60 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-foreground/60">
                    Time
                  </div>
                  {gridDays.map((day) => {
                    const dayKey = zonedDateKey(day, timeZone);
                    const count = buildDayEvents(dayKey).length;
                    const today = dayKey === zonedDateKey(new Date(), timeZone);
                    return (
                      <div
                        key={dayKey}
                        className={cn(
                          "border-r border-white/60 px-2 py-2",
                          today && "bg-actifyBlue/10",
                          hoveredDropDay === dayKey && "bg-actifyMint/20"
                        )}
                        onClick={() => setSelectedDayKey(dayKey)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setHoveredDropDay(dayKey);
                        }}
                        onDrop={(event) => handleWeekDrop(dayKey, event, true)}
                        onDragLeave={() => setHoveredDropDay((current) => (current === dayKey ? null : current))}
                      >
                        <p className="text-xs font-semibold text-foreground">{format(day, "EEE")}</p>
                        <p className="text-sm text-foreground/85">{format(day, "MMM d")}</p>
                        <p className="text-[11px] text-foreground/65">{count} activities</p>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="grid"
                  style={{ gridTemplateColumns: `76px repeat(${gridDays.length}, minmax(130px, 1fr))` }}
                >
                  <div className="border-r border-white/60 bg-white/82">
                    {slots.map((slot, slotIndex) => (
                      <div
                        key={`slot-label-${slot.minute}`}
                        className={cn(
                          "border-b border-white/50 px-2 py-1 text-[11px] text-foreground/60",
                          slotIndex % 6 === 0 && "border-b-white/80"
                        )}
                        style={{ height: SLOT_HEIGHT }}
                      >
                        {slot.minute % 60 === 0 ? slot.label : ""}
                      </div>
                    ))}
                  </div>

                  {gridDays.map((day, dayIndex) => {
                    const dayKey = zonedDateKey(day, timeZone);
                    const dayLayouts = buildDayEventLayouts(dayKey);
                    return (
                      <div
                        key={`col-${dayKey}`}
                        className={cn(
                          "relative border-r border-white/60 bg-white/58",
                          dayKey === zonedDateKey(new Date(), timeZone) && "bg-actifyBlue/5",
                          hoveredDropDay === dayKey && "bg-actifyMint/14"
                        )}
                        style={{ height: totalGridHeight }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setHoveredDropDay(dayKey);
                        }}
                        onDrop={(event) => handleWeekDrop(dayKey, event)}
                        onDragLeave={() => setHoveredDropDay((current) => (current === dayKey ? null : current))}
                      >
                        {slots.map((slot, slotIndex) => (
                          <button
                            key={`slot-${dayKey}-${slot.minute}`}
                            id={`week-slot-${dayIndex}-${slotIndex}`}
                            type="button"
                            className="absolute left-0 right-0 z-[5] border-b border-transparent bg-transparent text-left focus-visible:border-actifyBlue/50 focus-visible:bg-actifyBlue/10 focus-visible:outline-none"
                            style={{ top: slotIndex * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                            onClick={() => openDrawerForManual(dayKey, slot.minute)}
                            onKeyDown={(event) =>
                              handleSlotKeyboardNavigation(event, dayIndex, slotIndex, dayKey, slot.minute)
                            }
                            aria-label={`Create activity on ${format(day, "EEEE MMMM d")} at ${slot.label}`}
                          >
                            <span className="sr-only">Create activity</span>
                          </button>
                        ))}

                        {slots.map((slot, slotIndex) => (
                          <div
                            key={`gridline-${dayKey}-${slot.minute}`}
                            className={cn(
                              "pointer-events-none absolute left-0 right-0 border-b border-white/50",
                              slotIndex % 6 === 0 && "border-b-white/80"
                            )}
                            style={{ top: slotIndex * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                          />
                        ))}

                        {dayLayouts.map(
                          ({
                            event,
                            top,
                            height,
                            leftPct,
                            widthPct,
                            compactCard,
                            tightCard,
                            isConflict,
                            hasChecklist,
                            hasAdaptations,
                            timeRangeLabel
                          }) => {
                            if (top > totalGridHeight) return null;

                            const clampedTop = clamp(top, 0, totalGridHeight - 24);
                            const maxHeight = Math.max(18, totalGridHeight - clampedTop);
                            const typeMeta = eventTypeMeta(inferEventType(event, templateById));
                            const TypeIcon = typeMeta.icon;
                            const colorMeta = eventColorMeta({
                              event,
                              templateById,
                              colorMode: calendarSettings.colorMode
                            });

                            return (
                              <div
                                key={event.id}
                                draggable
                                onDragStart={(dragEvent) => {
                                  dragEvent.dataTransfer.effectAllowed = "move";
                                  dragEvent.dataTransfer.setData(
                                    "application/x-actify-calendar",
                                    JSON.stringify({ type: "event", id: event.id })
                                  );
                                  setDraggingEventId(event.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingEventId(null);
                                  setHoveredDropDay(null);
                                }}
                                className={cn(
                                  "group absolute z-20 overflow-hidden rounded-xl border text-xs shadow-md transition",
                                  tightCard ? "p-1.5" : compactCard ? "p-2" : "p-2.5",
                                  isConflict ? "border-amber-300 bg-amber-50/95" : colorMeta.cardClass,
                                  draggingEventId === event.id && "opacity-60"
                                )}
                                data-event-type={typeMeta.label}
                                style={{
                                  top: clampedTop,
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  height: Math.min(height, maxHeight)
                                }}
                                onClick={() => openDrawerForEdit(event)}
                              >
                              <div className={cn("flex items-start justify-between gap-2", tightCard ? "mb-0.5" : "mb-1")}>
                                <div className="min-w-0">
                                  <p className="inline-flex max-w-full items-center gap-1 truncate font-semibold text-foreground">
                                    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full border", tightCard ? "h-4 w-4" : "h-5 w-5", colorMeta.chipClass)}>
                                      <TypeIcon className={cn(tightCard ? "h-2.5 w-2.5" : "h-3 w-3")} />
                                    </span>
                                    <span className="truncate">{event.title}</span>
                                  </p>
                                  {!tightCard ? (
                                    <p className="truncate text-[11px] text-foreground/70">{timeRangeLabel}</p>
                                  ) : null}
                                  {!compactCard ? (
                                    <p className="truncate text-[11px] text-foreground/65">{event.location}</p>
                                  ) : null}
                                </div>
                                {!tightCard ? (
                                  <div className="hidden gap-1 group-hover:flex">
                                    <button
                                      type="button"
                                      className="rounded border border-white/70 bg-white/90 px-1 text-[10px]"
                                      onClick={(eventClick) => {
                                        eventClick.stopPropagation();
                                        openDrawerForEdit(event);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-white/70 bg-white/90 px-1 text-[10px]"
                                      onClick={(eventClick) => {
                                        eventClick.stopPropagation();
                                        openDrawerDuplicate(event);
                                      }}
                                    >
                                      Copy
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-white/70 bg-white/90 px-1 text-[10px]"
                                      onClick={(eventClick) => {
                                        eventClick.stopPropagation();
                                        void deleteActivity(event.id);
                                      }}
                                    >
                                      Delete
                                    </button>
                                    <Link
                                      href={`/app/calendar/${event.id}/attendance`}
                                      className="rounded border border-white/70 bg-white/90 px-1 text-[10px]"
                                      onClick={(eventClick) => eventClick.stopPropagation()}
                                    >
                                      Track
                                    </Link>
                                  </div>
                                ) : null}
                              </div>

                              {!tightCard ? (
                                <div className="flex flex-wrap gap-1">
                                  <Badge className={cn("border text-[10px]", colorMeta.badgeClass)}>
                                    {typeMeta.label}
                                  </Badge>
                                  {hasChecklist ? (
                                    <Badge className="border border-white/60 bg-white/75 text-[10px] text-foreground">
                                      <CheckSquare className="mr-1 h-3 w-3" />
                                      Checklist
                                    </Badge>
                                  ) : null}
                                  {hasAdaptations && !compactCard ? (
                                    <Badge className="border border-white/60 bg-white/75 text-[10px] text-foreground">
                                      <Settings2 className="mr-1 h-3 w-3" />
                                      Adaptations
                                    </Badge>
                                  ) : null}
                                  {isConflict ? (
                                    <Badge className="border border-amber-200 bg-amber-100 text-[10px] text-amber-900">
                                      Conflict
                                    </Badge>
                                  ) : null}
                                </div>
                              ) : isConflict ? (
                                <Badge className="border border-amber-200 bg-amber-100 text-[10px] text-amber-900">
                                  Conflict
                                </Badge>
                              ) : null}

                              <button
                                type="button"
                                className="absolute bottom-0 left-1 right-1 h-2 cursor-ns-resize rounded-b-md border-t border-white/60 bg-white/45"
                                onMouseDown={(mouseEvent) => startResize(event, mouseEvent)}
                                onClick={(eventClick) => eventClick.stopPropagation()}
                                aria-label={`Resize ${event.title}`}
                              />
                              </div>
                            );
                        }
                        )}

                        {nowIndicator && nowIndicator.dayIndex === dayIndex ? (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-rose-500/70"
                            style={{ top: nowIndicator.top }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {view === "month" ? (
            <div className="space-y-2 p-3">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-foreground/70">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <div key={label} className="rounded-lg border border-white/60 bg-white/60 px-2 py-2">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day) => {
                  const dayKey = zonedDateKey(day, timeZone);
                  const today = dayKey === zonedDateKey(new Date(), timeZone);
                  const outside = format(day, "yyyy-MM") !== format(monthAnchor, "yyyy-MM");
                  const dayEvents = buildDayEvents(dayKey);
                  const dotMeta = dayEvents
                    .slice(0, 3)
                    .map((event) =>
                      eventColorMeta({
                        event,
                        templateById,
                        colorMode: calendarSettings.colorMode
                      })
                    );
                  const overflow = dayEvents.length - dotMeta.length;

                  return (
                    <Popover key={dayKey}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "relative min-h-[138px] rounded-xl border border-white/65 bg-white/70 p-2 text-left shadow-sm transition hover:bg-white/80",
                            today && "ring-2 ring-actifyBlue/40",
                            outside && "opacity-65",
                            hoveredDropDay === dayKey && "bg-actifyMint/20"
                          )}
                          onClick={() => setSelectedDayKey(dayKey)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setHoveredDropDay(dayKey);
                          }}
                          onDragLeave={() => setHoveredDropDay((current) => (current === dayKey ? null : current))}
                          onDrop={(event) => handleMonthDrop(dayKey, event)}
                        >
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-foreground">{format(day, "d")}</span>
                            <Badge variant="outline" className="bg-white/80 text-[10px]">
                              {dayEvents.length}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center gap-1.5">
                            {dotMeta.length > 0 ? (
                              dotMeta.map((meta, index) => (
                                <span
                                  key={`${dayKey}-dot-${index}`}
                                  className={cn("inline-flex h-2.5 w-2.5 rounded-full", meta.dotClass)}
                                  aria-hidden="true"
                                />
                              ))
                            ) : (
                              <span className="text-[11px] text-foreground/55">No events</span>
                            )}
                            {overflow > 0 ? <p className="text-[11px] text-foreground/65">+{overflow} more</p> : null}
                          </div>
                          <p className="mt-2 text-[11px] text-foreground/65">{dayEvents.length} scheduled</p>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80 border-white/70 bg-white/95 p-3">
                        <div className="space-y-2">
                          <p className="font-semibold text-foreground">
                            {formatInTimeZone(day, timeZone, {
                              weekday: "short",
                              month: "short",
                              day: "numeric"
                            })}
                          </p>
                          <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                            {dayEvents.length === 0 ? (
                              <p className="text-xs text-foreground/70">No activities on this date.</p>
                            ) : (
                              dayEvents.map((event) => {
                                const typeMeta = eventTypeMeta(inferEventType(event, templateById));
                                const TypeIcon = typeMeta.icon;
                                const colorMeta = eventColorMeta({
                                  event,
                                  templateById,
                                  colorMode: calendarSettings.colorMode
                                });
                                return (
                                  <button
                                    key={`popover-${event.id}`}
                                    type="button"
                                    className={cn("w-full rounded-lg border p-2 text-left", colorMeta.cardClass)}
                                    onClick={() => openDrawerForEdit(event)}
                                  >
                                    <p className="inline-flex max-w-full items-center gap-1.5 truncate text-sm font-medium text-foreground">
                                      <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", colorMeta.chipClass)}>
                                        <TypeIcon className="h-3 w-3" />
                                      </span>
                                      <span className="truncate">{event.title}</span>
                                    </p>
                                    <p className="text-xs text-foreground/70">
                                      {formatEventTimeRange(event.startAt, event.endAt, timeZone)} · {event.location}
                                    </p>
                                  </button>
                                );
                              })
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" onClick={() => openDrawerForManual(dayKey, 10 * 60)}>
                              <Plus className="h-3.5 w-3.5" />
                              Add Activity
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setView("agenda");
                                setAnchorDateKey(dayKey);
                              }}
                            >
                              Open in Agenda
                            </Button>
                            <Button asChild type="button" size="sm" variant="outline">
                              <Link href={`/app/calendar/day/${dayKey}`}>View Day</Link>
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </div>
          ) : null}

          {view === "agenda" ? (
            <div className="p-3">
              <div ref={agendaScrollRef} className="max-h-[75vh] overflow-y-auto rounded-xl border border-white/60 bg-white/55">
                {agendaRows.length === 0 ? (
                  <div className="p-6 text-center text-sm text-foreground/70">
                    No activities found. Drag a template here or click New Activity.
                  </div>
                ) : (
                  <div
                    className="relative"
                    style={{
                      height: `${agendaVirtualizer.getTotalSize()}px`
                    }}
                  >
                    {agendaVirtualizer.getVirtualItems().map((virtualItem) => {
                      const row = agendaRows[virtualItem.index];
                      if (!row) return null;

                      return (
                        <div
                          key={row.key}
                          className="absolute left-0 top-0 w-full px-2 py-1"
                          style={{ transform: `translateY(${virtualItem.start}px)` }}
                        >
                          {row.kind === "header" ? (
                            <div className="sticky top-0 rounded-lg bg-white/75 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                              {row.label}
                            </div>
                          ) : (() => {
                            const typeMeta = eventTypeMeta(inferEventType(row.event, templateById));
                            const TypeIcon = typeMeta.icon;
                            const colorMeta = eventColorMeta({
                              event: row.event,
                              templateById,
                              colorMode: calendarSettings.colorMode
                            });
                            const statusLabel =
                              new Date(row.event.endAt).getTime() < Date.now() ? "Completed" : "Scheduled";

                            return (
                              <button
                                type="button"
                                className={cn("w-full rounded-xl border p-3 text-left", colorMeta.cardClass)}
                                onClick={() => openDrawerForEdit(row.event)}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full border", colorMeta.chipClass)}>
                                      <TypeIcon className="h-3 w-3" />
                                    </span>
                                    {row.event.title}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className={cn("text-xs", colorMeta.badgeClass)}>
                                      {eventCategory(row.event, templateById)}
                                    </Badge>
                                    <Badge variant="outline" className="bg-white/75 text-xs">
                                      {statusLabel}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="mt-1 text-xs text-foreground/70">
                                  {formatEventTimeRange(row.event.startAt, row.event.endAt, timeZone)}
                                </p>
                                <p className="text-xs text-foreground/65">{row.event.location}</p>
                              </button>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="border-t border-white/60 bg-white/80 px-4 py-2 text-xs text-foreground/70">
            {view === "week" || view === "day"
              ? "Click a slot to create. Drag templates to schedule. Drag event cards to move and use the bottom edge to resize."
              : "Use search and filters to keep this view calm. Click any item to edit in the right drawer."}
          </div>
        </section>

        {selectedDayKey ? (
          <aside className="glass-panel rounded-2xl border-white/20 p-3 shadow-xl shadow-black/15">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground/60">Agenda Drawer</p>
                <h3 className="font-[var(--font-display)] text-xl text-foreground">
                  {formatInTimeZone(
                    zonedDateStringToUtcStart(selectedDayKey, timeZone) ?? new Date(),
                    timeZone,
                    { weekday: "short", month: "short", day: "numeric" }
                  )}
                </h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedDayKey(null)}>
                Close
              </Button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => openDrawerForManual(selectedDayKey, 10 * 60)}>
                <Plus className="h-3.5 w-3.5" />
                Add Event
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setView("agenda")}>
                Open Agenda
              </Button>
            </div>

            <div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/70 bg-white/70 px-3 py-4 text-sm text-foreground/65">
                  No events for this day.
                </p>
              ) : (
                selectedDayEvents.map((event) => {
                  const typeMeta = eventTypeMeta(inferEventType(event, templateById));
                  const TypeIcon = typeMeta.icon;
                  const colorMeta = eventColorMeta({
                    event,
                    templateById,
                    colorMode: calendarSettings.colorMode
                  });
                  const statusLabel = new Date(event.endAt).getTime() < Date.now() ? "Completed" : "Scheduled";
                  return (
                    <button
                      key={`agenda-drawer-${event.id}`}
                      type="button"
                      className={cn("w-full rounded-xl border p-3 text-left", colorMeta.cardClass)}
                      onClick={() => openDrawerForEdit(event)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                          <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", colorMeta.chipClass)}>
                            <TypeIcon className="h-3 w-3" />
                          </span>
                          <span className="truncate">{event.title}</span>
                        </p>
                        <Badge variant="outline" className="bg-white/75 text-[11px]">
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-foreground/70">
                        {formatEventTimeRange(event.startAt, event.endAt, timeZone)}
                      </p>
                      <p className="text-xs text-foreground/65">{event.location}</p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        ) : null}
        </div>
      </div>
        </>
      ) : null}

      {section === "create" ? (
        <section className="glass-panel rounded-2xl border-white/20 p-4 shadow-xl shadow-black/15">
          <div className="mb-4 flex items-center gap-2">
            <CalendarPlus2 className="h-5 w-5 text-actifyBlue" />
            <h2 className="font-[var(--font-display)] text-2xl text-foreground">Quick Add</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3 rounded-xl border border-white/60 bg-white/80 p-3">
              <label className="space-y-1 text-sm">
                Event type
                <select
                  value={quickCreate.eventType}
                  onChange={(event) => setQuickCreate((current) => ({ ...current, eventType: event.target.value as EventTypeKey }))}
                  className="h-10 w-full rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                >
                  <option value="group-activity">Group Activity</option>
                  <option value="one-to-one">1:1</option>
                  <option value="outing">Outing</option>
                  <option value="facility-event">Facility Event</option>
                  <option value="appointment">Appointment</option>
                  <option value="reminder">Reminder/Task</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                Template (optional)
                <select
                  value={quickCreate.templateId}
                  onChange={(event) => {
                    const nextTemplateId = event.target.value;
                    const selected = nextTemplateId ? templateById.get(nextTemplateId) : null;
                    setQuickCreate((current) => ({
                      ...current,
                      templateId: nextTemplateId,
                      title: selected?.title ?? current.title
                    }));
                  }}
                  className="h-10 w-full rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                >
                  <option value="">No template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title} · {template.category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                Title
                <Input
                  value={quickCreate.title}
                  onChange={(event) => setQuickCreate((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Event title"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm">
                  Date
                  <Input
                    type="date"
                    value={quickCreate.dateKey}
                    onChange={(event) => setQuickCreate((current) => ({ ...current, dateKey: event.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  Start
                  <Input
                    type="time"
                    value={quickCreate.startTime}
                    onChange={(event) => setQuickCreate((current) => ({ ...current, startTime: event.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  End
                  <Input
                    type="time"
                    value={quickCreate.endTime}
                    onChange={(event) => setQuickCreate((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                Location
                <Input
                  value={quickCreate.location}
                  onChange={(event) => setQuickCreate((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Activity Room"
                />
              </label>

              <label className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/75 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={quickCreate.repeatEnabled}
                  onChange={(event) => setQuickCreate((current) => ({ ...current, repeatEnabled: event.target.checked }))}
                />
                Repeat
              </label>

              {quickCreate.repeatEnabled ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    Frequency
                    <select
                      value={quickCreate.recurrenceFreq}
                      onChange={(event) =>
                        setQuickCreate((current) => ({
                          ...current,
                          recurrenceFreq: event.target.value as "DAILY" | "WEEKLY" | "MONTHLY"
                        }))
                      }
                      className="h-10 w-full rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    Every
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={quickCreate.recurrenceInterval}
                      onChange={(event) =>
                        setQuickCreate((current) => ({
                          ...current,
                          recurrenceInterval: Number(event.target.value || 1)
                        }))
                      }
                    />
                  </label>
                </div>
              ) : null}

              <Button type="button" onClick={() => void saveQuickCreate()} disabled={saving}>
                {saving ? "Saving..." : "Create Event"}
              </Button>
            </div>

            <aside className="space-y-3">
              <div className="rounded-xl border border-white/60 bg-white/75 p-3">
                <p className="text-xs uppercase tracking-wide text-foreground/60">Fast flow</p>
                <ol className="mt-2 space-y-1 text-sm text-foreground/80">
                  <li>1. Pick type + time</li>
                  <li>2. Apply template if needed</li>
                  <li>3. Save and continue in Schedule</li>
                </ol>
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {section === "templates" ? (
        <section className="glass-panel rounded-2xl border-white/20 p-4 shadow-xl shadow-black/15">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Library className="h-5 w-5 text-actifyBlue" />
              <h2 className="font-[var(--font-display)] text-2xl text-foreground">Templates Library</h2>
            </div>
            <Button asChild type="button" variant="outline">
              <Link href="/app/templates">Open Full Templates</Link>
            </Button>
          </div>
          <div className="mb-4 space-y-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
              <Input
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Search template library"
                className="bg-white/85 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={templateCategory === "ALL" ? "default" : "outline"}
                onClick={() => setTemplateCategory("ALL")}
              >
                All
              </Button>
              {templateCategories.map((category) => (
                <Button
                  key={`library-filter-${category}`}
                  type="button"
                  size="sm"
                  variant={templateCategory === category ? "default" : "outline"}
                  onClick={() => setTemplateCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div key={`library-${template.id}`} className="rounded-xl border border-white/70 bg-white/85 p-3">
                <p className="font-semibold text-foreground">{template.title}</p>
                <p className="text-xs text-foreground/70">{template.category} · {template.difficulty}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setQuickSchedule({
                        templateId: template.id,
                        dateKey: anchorDateKey,
                        startTime: "10:00",
                        endTime: "11:00",
                        location: calendarSettings.defaultLocation || DEFAULT_LOCATION
                      })
                    }
                  >
                    Use
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setSection("create")}>
                    Quick Add
                  </Button>
                </div>
              </div>
            ))}
            {filteredTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/70 bg-white/70 p-4 text-sm text-foreground/65">
                No templates match current search.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {section === "settings" ? (
        <section className="glass-panel rounded-2xl border-white/20 p-4 shadow-xl shadow-black/15">
          <div className="mb-4 flex items-center gap-2">
            <Cog className="h-5 w-5 text-actifyBlue" />
            <h2 className="font-[var(--font-display)] text-2xl text-foreground">Calendar Rules</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              Default duration (minutes)
              <Input
                type="number"
                min={15}
                max={240}
                value={calendarSettings.defaultDurationMin}
                onChange={(event) =>
                  setCalendarSettings((current) => ({
                    ...current,
                    defaultDurationMin: Number(event.target.value || DEFAULT_EVENT_DURATION_MIN)
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              Default location
              <Input
                value={calendarSettings.defaultLocation}
                onChange={(event) => setCalendarSettings((current) => ({ ...current, defaultLocation: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              Color coding mode
              <select
                value={calendarSettings.colorMode}
                onChange={(event) =>
                  setCalendarSettings((current) => ({
                    ...current,
                    colorMode: event.target.value as CalendarColorMode
                  }))
                }
                className="h-10 w-full rounded-md border border-white/70 bg-white/90 px-3 text-sm"
              >
                <option value="eventType">By event type</option>
                <option value="category">By template category</option>
                <option value="none">Neutral glass</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Visible start hour
              <Input
                type="number"
                min={0}
                max={23}
                value={calendarSettings.visibleStartHour}
                onChange={(event) =>
                  setCalendarSettings((current) => ({ ...current, visibleStartHour: Number(event.target.value || GRID_START_HOUR) }))
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              Visible end hour
              <Input
                type="number"
                min={1}
                max={23}
                value={calendarSettings.visibleEndHour}
                onChange={(event) =>
                  setCalendarSettings((current) => ({ ...current, visibleEndHour: Number(event.target.value || GRID_END_HOUR) }))
                }
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button type="button" onClick={persistCalendarSettings}>
              Save settings
            </Button>
            <Button type="button" variant="outline" onClick={() => setSection("schedule")}>
              Back to Schedule
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog open={mobileDockOpen} onOpenChange={setMobileDockOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/70 bg-white/96 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Template Dock</DialogTitle>
            <DialogDescription>Search templates and schedule quickly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="Search templates"
            />
            {filteredTemplates.map((template) => (
              <button
                key={`mobile-template-${template.id}`}
                type="button"
                className="w-full rounded-lg border border-white/70 bg-white/85 p-3 text-left"
                onClick={() => {
                  setMobileDockOpen(false);
                  setQuickSchedule({
                    templateId: template.id,
                    dateKey: anchorDateKey,
                    startTime: "10:00",
                    endTime: "11:00",
                    location: DEFAULT_LOCATION
                  });
                }}
              >
                <p className="text-sm font-medium text-foreground">{template.title}</p>
                <p className="text-xs text-foreground/65">{template.category} · {template.difficulty}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMobileDockOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quickSchedule)} onOpenChange={(open) => (!open ? setQuickSchedule(null) : undefined)}>
        <DialogContent className="border-white/70 bg-white/96">
          <DialogHeader>
            <DialogTitle>Quick Schedule Template</DialogTitle>
            <DialogDescription>
              Save this template directly to your calendar.
            </DialogDescription>
          </DialogHeader>
          {quickSchedule ? (
            <div className="space-y-3">
              <label className="space-y-1 text-sm">
                Date
                <Input
                  type="date"
                  value={quickSchedule.dateKey}
                  onChange={(event) =>
                    setQuickSchedule((current) =>
                      current
                        ? {
                            ...current,
                            dateKey: event.target.value
                          }
                        : current
                    )
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  Start
                  <Input
                    type="time"
                    value={quickSchedule.startTime}
                    onChange={(event) =>
                      setQuickSchedule((current) =>
                        current
                          ? {
                              ...current,
                              startTime: event.target.value
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  End
                  <Input
                    type="time"
                    value={quickSchedule.endTime}
                    onChange={(event) =>
                      setQuickSchedule((current) =>
                        current
                          ? {
                              ...current,
                              endTime: event.target.value
                            }
                          : current
                      )
                    }
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm">
                Location
                <Input
                  value={quickSchedule.location}
                  onChange={(event) =>
                    setQuickSchedule((current) =>
                      current
                        ? {
                            ...current,
                            location: event.target.value
                          }
                        : current
                    )
                  }
                />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQuickSchedule(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveQuickSchedule()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {drawerState ? (
        <div className="fixed inset-x-0 bottom-0 top-auto z-50 flex h-[86vh] w-full flex-col border-t border-white/50 bg-white/96 shadow-2xl shadow-black/25 backdrop-blur md:inset-y-0 md:right-0 md:left-auto md:h-auto md:max-w-[460px] md:border-l md:border-t-0">
          <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/60">
                {drawerState.mode === "create" ? "Create Activity" : "Edit Activity"}
              </p>
              <h3 className="text-lg font-semibold text-foreground">Calendar Activity</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {drawerTypeMeta ? (
                  <Badge className={cn("border text-[11px]", drawerColorMeta?.badgeClass ?? drawerTypeMeta.badgeClass)}>
                    {drawerTypeMeta.label}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="bg-white/75 text-[11px]">
                  {drawerStatusLabel}
                </Badge>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setDrawerState(null)}>
              Close
            </Button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <section className="space-y-3 rounded-xl border border-white/60 bg-white/80 p-3">
              <p className="text-sm font-semibold text-foreground">Basics</p>
              <label className="space-y-1 text-sm">
                Title
                <Input
                  value={drawerState.title}
                  onChange={(event) => updateDrawer({ title: event.target.value })}
                  placeholder="Activity title"
                />
              </label>
              <label className="space-y-1 text-sm">
                Date
                <Input
                  type="date"
                  value={drawerState.dateKey}
                  onChange={(event) => updateDrawer({ dateKey: event.target.value })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  Start time
                  <Input
                    type="time"
                    value={drawerState.startTime}
                    onChange={(event) => updateDrawer({ startTime: event.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  End time
                  <Input
                    type="time"
                    value={drawerState.endTime}
                    onChange={(event) => updateDrawer({ endTime: event.target.value })}
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm">
                Location
                <Input
                  value={drawerState.location}
                  onChange={(event) => updateDrawer({ location: event.target.value })}
                />
              </label>
              <details className="rounded-lg border border-white/60 bg-white/70 p-2">
                <summary className="cursor-pointer text-sm font-medium text-foreground">Notes (optional)</summary>
                <Textarea
                  value={drawerState.notes}
                  onChange={(event) => updateDrawer({ notes: event.target.value })}
                  className="mt-2 min-h-[88px] bg-white/90"
                  placeholder="Add optional planning notes"
                />
              </details>
            </section>

            <section className="rounded-xl border border-white/60 bg-white/80 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => updateDrawer({ showChecklist: !drawerState.showChecklist })}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <List className="h-4 w-4 text-actifyBlue" />
                  Checklist
                </span>
                <Badge variant="outline" className="bg-white/70">{drawerState.checklistItems.length}</Badge>
              </button>
              {drawerState.showChecklist ? (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={drawerState.checklistDraft}
                      onChange={(event) => updateDrawer({ checklistDraft: event.target.value })}
                      placeholder="Add checklist item"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addChecklistItem();
                        }
                      }}
                    />
                    <Button type="button" onClick={addChecklistItem}>
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {drawerState.checklistItems.map((item, index) => (
                      <div key={`checklist-${item}-${index}`} className="rounded-lg border border-white/60 bg-white/90 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-foreground">{item}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => moveChecklistItem(index, -1)}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => moveChecklistItem(index, 1)}
                              disabled={index === drawerState.checklistItems.length - 1}
                            >
                              ↓
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => removeChecklistItem(index)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {drawerState.checklistItems.length === 0 ? (
                      <p className="text-xs text-foreground/65">No checklist items yet.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-white/60 bg-white/80 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => updateDrawer({ showAdaptations: !drawerState.showAdaptations })}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Settings2 className="h-4 w-4 text-actifyBlue" />
                  Adaptations
                </span>
                <Badge variant="outline" className="bg-white/70">
                  {
                    ADAPTATION_FIELDS.filter((field) => drawerState.adaptations[field.key].enabled)
                      .length
                  }
                </Badge>
              </button>
              {drawerState.showAdaptations ? (
                <div className="mt-3 space-y-2">
                  {ADAPTATION_FIELDS.map((field) => {
                    const value = drawerState.adaptations[field.key];
                    return (
                      <div key={field.key} className="rounded-lg border border-white/60 bg-white/88 p-2">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={value.enabled}
                            onChange={(event) =>
                              setDrawerState((current) =>
                                current
                                  ? {
                                      ...current,
                                      adaptations: {
                                        ...current.adaptations,
                                        [field.key]: {
                                          ...current.adaptations[field.key],
                                          enabled: event.target.checked
                                        }
                                      }
                                    }
                                  : current
                              )
                            }
                          />
                          {field.label}
                        </label>
                        {value.enabled ? (
                          <Input
                            value={value.override}
                            onChange={(event) =>
                              setDrawerState((current) =>
                                current
                                  ? {
                                      ...current,
                                      adaptations: {
                                        ...current.adaptations,
                                        [field.key]: {
                                          ...current.adaptations[field.key],
                                          override: event.target.value
                                        }
                                      }
                                    }
                                  : current
                              )
                            }
                            className="mt-2"
                            placeholder="Optional override text"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-white/60 bg-white/80 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => updateDrawer({ showAdvanced: !drawerState.showAdvanced })}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <WandSparkles className="h-4 w-4 text-actifyBlue" />
                  Advanced
                </span>
                <span className="text-xs text-foreground/65">Optional</span>
              </button>
              {drawerState.showAdvanced ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!drawerState) return;
                      setDrawerState({
                        ...drawerState,
                        mode: "create",
                        eventId: null,
                        title: `${drawerState.title} (Copy)`
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/app/templates">Save as template</Link>
                  </Button>
                  {drawerState.mode === "edit" && drawerState.eventId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void deleteActivity(drawerState.eventId as string)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <div className="border-t border-white/60 bg-white/92 px-4 py-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDrawerState(null)}>
                Cancel
              </Button>
              {drawerState.mode === "create" ? (
                <Button type="button" variant="outline" onClick={() => void saveDrawer(true)} disabled={saving}>
                  Save & Add Another
                </Button>
              ) : null}
              <Button type="button" onClick={() => void saveDrawer(false)} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(conflictState)} onOpenChange={(open) => (!open ? setConflictState(null) : undefined)}>
        <DialogContent className="border-white/70 bg-white/96 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Scheduling warning
            </DialogTitle>
            <DialogDescription>{conflictState?.message ?? "There is a scheduling conflict."}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {conflictState?.outsideBusinessHours ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                This schedule is outside configured business hours.
              </p>
            ) : null}

            {conflictState?.conflicts?.length ? (
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-white/65 bg-white/85 p-2">
                {conflictState.conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded-md border border-white/60 bg-white/90 px-2 py-2">
                    <p className="text-sm font-medium text-foreground">{conflict.title}</p>
                    <p className="text-xs text-foreground/70">
                      {formatEventTimeRange(conflict.startAt, conflict.endAt, timeZone)} · {conflict.location}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground/70">No overlapping items listed.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConflictState(null)}>
              Adjust time
            </Button>
            <Button type="button" onClick={() => void applyConflictOverride()}>
              Override anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {view === "agenda" ? (
        <Button
          type="button"
          onClick={() => openDrawerForManual(anchorDateKey, 10 * 60)}
          className="fixed bottom-6 right-6 z-40 md:hidden"
        >
          <Plus className="h-4 w-4" />
          Add Activity
        </Button>
      ) : null}

      {loading ? (
        <div className="fixed bottom-4 right-4 rounded-full border border-white/70 bg-white/95 p-3 shadow-xl">
          <Clock3 className="h-5 w-5 animate-pulse text-actifyBlue" />
        </div>
      ) : null}
    </div>
  );
}
