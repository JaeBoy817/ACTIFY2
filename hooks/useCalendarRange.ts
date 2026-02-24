"use client";

import { useMemo } from "react";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

import { formatInTimeZone, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import type { CalendarViewMode } from "@/store/useCalendarUIStore";

export type CalendarRange = {
  start: Date;
  end: Date;
};

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

export function useCalendarRange(params: {
  view: CalendarViewMode;
  anchorDateKey: string;
  timeZone: string;
}) {
  const { view, anchorDateKey, timeZone } = params;

  const range = useMemo(() => getRangeForView(view, anchorDateKey, timeZone), [anchorDateKey, timeZone, view]);

  const rangeLabel = useMemo(() => {
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
  }, [range.end, range.start, timeZone, view]);

  const monthKey = useMemo(() => zonedDateKey(range.start, timeZone).slice(0, 7), [range.start, timeZone]);

  const monthAnchor = useMemo(() => startOfMonth(zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date()), [anchorDateKey, timeZone]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });
    const rows: Date[] = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      rows.push(cursor);
    }
    return rows;
  }, [monthAnchor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchorDateKey, timeZone]);

  const dayDate = useMemo(() => zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date(), [anchorDateKey, timeZone]);

  return {
    range,
    rangeLabel,
    monthKey,
    monthAnchor,
    monthDays,
    weekDays,
    dayDate,
    formatWeekdayLabel: (date: Date) => format(date, "EEE"),
    formatMonthDayLabel: (date: Date) => format(date, "MMM d")
  };
}

