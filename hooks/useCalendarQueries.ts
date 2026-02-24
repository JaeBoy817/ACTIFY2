"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths } from "date-fns";

import { cachedFetchJson, invalidateClientCache } from "@/lib/perf/client-cache";
import { zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import type { CalendarViewMode } from "@/store/useCalendarUIStore";

export type CalendarEventLite = {
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

export type CalendarRangeInput = {
  start: Date;
  end: Date;
};

function resolveApiView(view: CalendarViewMode) {
  return view === "agenda" ? "day" : view;
}

export function useCalendarQueries(params: {
  view: CalendarViewMode;
  range: CalendarRangeInput;
  anchorDateKey: string;
  timeZone: string;
}) {
  const { view, range, anchorDateKey, timeZone } = params;
  const [events, setEvents] = useState<CalendarEventLite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey = useMemo(() => {
    const startIso = range.start.toISOString();
    const endIso = range.end.toISOString();
    return {
      startIso,
      endIso,
      apiView: resolveApiView(view),
      cacheKey: `calendar-unified:${startIso}:${endIso}`
    };
  }, [range.end, range.start, view]);

  const fetchRangeEvents = useCallback(
    async (force = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const url = `/api/calendar/range?start=${encodeURIComponent(queryKey.startIso)}&end=${encodeURIComponent(queryKey.endIso)}&view=${queryKey.apiView}`;
        const payload = await cachedFetchJson<{ activities?: CalendarEventLite[] }>(queryKey.cacheKey, url, {
          ttlMs: 30_000,
          force
        });
        setEvents(Array.isArray(payload.activities) ? payload.activities : []);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load calendar range.");
      } finally {
        setIsLoading(false);
      }
    },
    [queryKey.apiView, queryKey.cacheKey, queryKey.endIso, queryKey.startIso]
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
    const prevAnchor =
      view === "month"
        ? addMonths(anchor, -1)
        : view === "day"
          ? addDays(anchor, -1)
          : addDays(anchor, -7);

    const prefetchForAnchor = (targetAnchor: Date) => {
      const targetKey = zonedDateKey(targetAnchor, timeZone);
      const targetStart = targetKey;
      const target = zonedDateStringToUtcStart(targetStart, timeZone) ?? targetAnchor;
      const [start, end] =
        view === "month"
          ? [new Date(target.getFullYear(), target.getMonth(), 1), new Date(target.getFullYear(), target.getMonth() + 1, 7)]
          : view === "day"
            ? [target, addDays(target, 1)]
            : [addDays(target, -1), addDays(target, 8)];

      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const apiView = resolveApiView(view);
      const url = `/api/calendar/range?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&view=${apiView}`;
      const cacheKey = `calendar-unified:${startIso}:${endIso}`;
      return cachedFetchJson(cacheKey, url, { ttlMs: 30_000 }).catch(() => undefined);
    };

    const runPrefetch = () => {
      void Promise.all([prefetchForAnchor(nextAnchor), prefetchForAnchor(prevAnchor)]);
    };

    const timeout = window.setTimeout(() => {
      const idleCallback = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback;
      if (typeof idleCallback === "function") {
        idleCallback(runPrefetch);
      } else {
        runPrefetch();
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [anchorDateKey, timeZone, view]);

  const refresh = useCallback(async () => {
    await fetchRangeEvents(true);
  }, [fetchRangeEvents]);

  const invalidateRange = useCallback(() => {
    invalidateClientCache(queryKey.cacheKey);
  }, [queryKey.cacheKey]);

  return {
    events,
    isLoading,
    error,
    refresh,
    invalidateRange,
    setEvents
  };
}

