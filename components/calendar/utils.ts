import { addDays, addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";

import { formatInTimeZone, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import type { AdaptationFormState, CalendarEventLite, CalendarTemplateLite, CalendarViewMode } from "@/components/calendar/types";

export const SLOT_MINUTES = 30;
export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 21;
export const SLOT_HEIGHT = 34;
export const DEFAULT_LOCATION = "Activity Room";
export const DEFAULT_DURATION_MINUTES = 60;

export function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(value)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function minutesToLabel(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(value)));
  const hour24 = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  if (minute === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function toUtcIso(dateKey: string, hhmm: string, timeZone: string) {
  const dayStart = zonedDateStringToUtcStart(dateKey, timeZone);
  if (!dayStart) return null;
  const minutes = parseTimeToMinutes(hhmm);
  return new Date(dayStart.getTime() + minutes * 60_000).toISOString();
}

export function getRangeForView(view: CalendarViewMode, anchorDateKey: string, timeZone: string) {
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

export function shiftAnchorDate(currentDateKey: string, view: CalendarViewMode, direction: -1 | 1, timeZone: string) {
  const current = zonedDateStringToUtcStart(currentDateKey, timeZone) ?? new Date();
  if (view === "month") {
    return zonedDateKey(addMonths(current, direction), timeZone);
  }
  if (view === "day") {
    return zonedDateKey(addDays(current, direction), timeZone);
  }
  return zonedDateKey(addDays(current, direction * 7), timeZone);
}

export function formatRangeLabel(view: CalendarViewMode, anchorDateKey: string, timeZone: string) {
  const range = getRangeForView(view, anchorDateKey, timeZone);
  if (view === "month") {
    return formatInTimeZone(range.start, timeZone, { month: "long", year: "numeric" });
  }
  if (view === "day") {
    return formatInTimeZone(range.start, timeZone, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
  const start = formatInTimeZone(range.start, timeZone, { month: "short", day: "numeric" });
  const end = formatInTimeZone(range.end, timeZone, { month: "short", day: "numeric", year: "numeric" });
  return `${start} - ${end}`;
}

export function parseChecklistItems(value: unknown): string[] {
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

export function toChecklistPayload(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text) => ({ text, done: false }));
}

export function emptyAdaptations(): AdaptationFormState {
  return {
    bedBound: { enabled: false, override: "" },
    dementiaFriendly: { enabled: false, override: "" },
    lowVisionHearing: { enabled: false, override: "" },
    oneToOneMini: { enabled: false, override: "" }
  };
}

export function parseAdaptations(value: unknown): AdaptationFormState {
  const base = emptyAdaptations();
  if (!value || typeof value !== "object") return base;
  const safe = value as Record<string, unknown>;
  const overrides = safe.overrides && typeof safe.overrides === "object" ? (safe.overrides as Record<string, unknown>) : {};

  return {
    bedBound: {
      enabled: Boolean(safe.bedBound),
      override: typeof overrides.bedBound === "string" ? overrides.bedBound : ""
    },
    dementiaFriendly: {
      enabled: Boolean(safe.dementiaFriendly),
      override: typeof overrides.dementiaFriendly === "string" ? overrides.dementiaFriendly : ""
    },
    lowVisionHearing: {
      enabled: Boolean(safe.lowVisionHearing),
      override: typeof overrides.lowVisionHearing === "string" ? overrides.lowVisionHearing : ""
    },
    oneToOneMini: {
      enabled: Boolean(safe.oneToOneMini),
      override: typeof overrides.oneToOneMini === "string" ? overrides.oneToOneMini : ""
    }
  };
}

export function toAdaptationPayload(state: AdaptationFormState) {
  return {
    bedBound: state.bedBound.enabled,
    dementiaFriendly: state.dementiaFriendly.enabled,
    lowVisionHearing: state.lowVisionHearing.enabled,
    oneToOneMini: state.oneToOneMini.enabled,
    overrides: {
      ...(state.bedBound.override ? { bedBound: state.bedBound.override } : {}),
      ...(state.dementiaFriendly.override ? { dementiaFriendly: state.dementiaFriendly.override } : {}),
      ...(state.lowVisionHearing.override ? { lowVisionHearing: state.lowVisionHearing.override } : {}),
      ...(state.oneToOneMini.override ? { oneToOneMini: state.oneToOneMini.override } : {})
    }
  };
}

export function formatEventTimeRange(event: CalendarEventLite, timeZone: string) {
  const startAt = new Date(event.startAt);
  const endAt = new Date(event.endAt);
  return `${formatInTimeZone(startAt, timeZone, { hour: "numeric", minute: "2-digit" })} - ${formatInTimeZone(endAt, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export function eventCategory(event: CalendarEventLite, templateById: Map<string, CalendarTemplateLite>) {
  const template = event.templateId ? templateById.get(event.templateId) : null;
  if (template?.category) return template.category;
  return "Uncategorized";
}
