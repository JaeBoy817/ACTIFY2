import {
  addZonedDays,
  endOfZonedDay,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedDay,
  subtractDays,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";
import type { AnalyticsDateRange, AnalyticsFilters, AnalyticsRangePreset } from "@/lib/analytics/types";

type SearchParamRecord = Record<string, string | string[] | undefined>;

const RANGE_PRESETS: AnalyticsRangePreset[] = ["today", "7d", "30d", "custom"];

function readSearchValue(source: SearchParamRecord | undefined, key: string) {
  const value = source?.[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNullable(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseAnalyticsFilters(searchParams?: SearchParamRecord): AnalyticsFilters {
  const rangeValue = readSearchValue(searchParams, "range");
  const range = RANGE_PRESETS.includes(rangeValue as AnalyticsRangePreset)
    ? (rangeValue as AnalyticsRangePreset)
    : "30d";

  return {
    range,
    from: toNullable(readSearchValue(searchParams, "from")),
    to: toNullable(readSearchValue(searchParams, "to")),
    unitId: toNullable(readSearchValue(searchParams, "unitId")),
    residentId: toNullable(readSearchValue(searchParams, "residentId")),
    category: toNullable(readSearchValue(searchParams, "category")),
    staffId: toNullable(readSearchValue(searchParams, "staffId"))
  };
}

function dateDiffDaysInclusive(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 1;
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

export function resolveAnalyticsDateRange(filters: AnalyticsFilters, timeZoneRaw: string | null | undefined): AnalyticsDateRange {
  const timeZone = resolveTimeZone(timeZoneRaw);
  const now = new Date();

  if (filters.range === "today") {
    const start = startOfZonedDay(now, timeZone);
    const end = endOfZonedDay(now, timeZone);
    return {
      start,
      end,
      startKey: zonedDateKey(start, timeZone),
      endKey: zonedDateKey(end, timeZone),
      label: `Today • ${formatInTimeZone(start, timeZone, { month: "short", day: "numeric", year: "numeric" })}`,
      totalDays: 1
    };
  }

  if (filters.range === "7d" || filters.range === "30d") {
    const days = filters.range === "7d" ? 7 : 30;
    const start = startOfZonedDay(subtractDays(now, days - 1), timeZone);
    const end = endOfZonedDay(now, timeZone);
    return {
      start,
      end,
      startKey: zonedDateKey(start, timeZone),
      endKey: zonedDateKey(end, timeZone),
      label: `Last ${days} days`,
      totalDays: days
    };
  }

  const customStart = filters.from ? zonedDateStringToUtcStart(filters.from, timeZone) : null;
  const customEndStart = filters.to ? zonedDateStringToUtcStart(filters.to, timeZone) : null;

  if (customStart && customEndStart) {
    const start = customStart;
    const end = new Date(addZonedDays(customEndStart, timeZone, 1).getTime() - 1);
    const totalDays = dateDiffDaysInclusive(start, end);
    return {
      start,
      end,
      startKey: zonedDateKey(start, timeZone),
      endKey: zonedDateKey(end, timeZone),
      label: `${formatInTimeZone(start, timeZone, { month: "short", day: "numeric" })} – ${formatInTimeZone(end, timeZone, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })}`,
      totalDays
    };
  }

  const fallbackStart = startOfZonedDay(subtractDays(now, 29), timeZone);
  const fallbackEnd = endOfZonedDay(now, timeZone);
  return {
    start: fallbackStart,
    end: fallbackEnd,
    startKey: zonedDateKey(fallbackStart, timeZone),
    endKey: zonedDateKey(fallbackEnd, timeZone),
    label: "Last 30 days",
    totalDays: 30
  };
}

export function analyticsFiltersToQueryString(filters: AnalyticsFilters) {
  const params = new URLSearchParams();

  params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }

  if (filters.unitId) params.set("unitId", filters.unitId);
  if (filters.residentId) params.set("residentId", filters.residentId);
  if (filters.category) params.set("category", filters.category);
  if (filters.staffId) params.set("staffId", filters.staffId);

  return params.toString();
}

export function buildAnalyticsPath(pathname: string, filters: AnalyticsFilters) {
  const query = analyticsFiltersToQueryString(filters);
  return query ? `${pathname}?${query}` : pathname;
}
