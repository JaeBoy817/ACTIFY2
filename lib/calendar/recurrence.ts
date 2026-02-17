import { addDays, addMonths, addWeeks, startOfWeek } from "date-fns";

const WEEKDAY_TOKEN_TO_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6
};

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type ParsedRRule = {
  freq: RecurrenceFrequency;
  interval: number;
  byDay: number[];
  count?: number;
  until?: Date;
};

export type SeriesRecurrenceLike = {
  id: string;
  dtstart: Date;
  durationMin: number;
  rrule: string;
  until: Date | null;
  exdates: unknown;
};

export type ExpandedOccurrence = {
  seriesId: string;
  startAt: Date;
  endAt: Date;
  occurrenceKey: string;
};

export type OccurrenceOverrideLike = {
  occurrenceKey: string;
  startAt: Date;
  endAt: Date;
};

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseUntilToken(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const rfcDateOnly = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (rfcDateOnly) {
    const iso = `${rfcDateOnly[1]}-${rfcDateOnly[2]}-${rfcDateOnly[3]}T23:59:59.999Z`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const rfcDateTimeUtc = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (rfcDateTimeUtc) {
    const iso = `${rfcDateTimeUtc[1]}-${rfcDateTimeUtc[2]}-${rfcDateTimeUtc[3]}T${rfcDateTimeUtc[4]}:${rfcDateTimeUtc[5]}:${rfcDateTimeUtc[6]}.000Z`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseByDayTokens(value: string | undefined): number[] {
  if (!value) return [];
  const tokens = value
    .split(",")
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);

  const days = tokens
    .map((token) => WEEKDAY_TOKEN_TO_INDEX[token])
    .filter((value): value is number => typeof value === "number");

  return Array.from(new Set(days)).sort((a, b) => a - b);
}

function normalizeUntil(parsed: ParsedRRule, seriesUntil: Date | null): Date | undefined {
  if (parsed.until && seriesUntil) {
    return parsed.until < seriesUntil ? parsed.until : seriesUntil;
  }
  return parsed.until ?? seriesUntil ?? undefined;
}

export function makeOccurrenceKey(startAtUtc: Date) {
  return startAtUtc.toISOString();
}

export function parseRRule(rrule: string, dtstart: Date): ParsedRRule {
  const parts = rrule
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const values = new Map<string, string>();
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.split("=");
    if (!rawKey || rawValue.length === 0) continue;
    values.set(rawKey.toUpperCase(), rawValue.join("=").trim());
  }

  const freqToken = values.get("FREQ")?.toUpperCase();
  const freq: RecurrenceFrequency =
    freqToken === "DAILY" || freqToken === "WEEKLY" || freqToken === "MONTHLY"
      ? freqToken
      : "WEEKLY";

  const interval = parsePositiveInteger(values.get("INTERVAL"), 1);
  const parsedCount = values.get("COUNT");
  const count = parsedCount ? parsePositiveInteger(parsedCount, 0) : undefined;
  const until = parseUntilToken(values.get("UNTIL"));

  const byDay = freq === "WEEKLY"
    ? (() => {
        const parsedByDay = parseByDayTokens(values.get("BYDAY"));
        return parsedByDay.length > 0 ? parsedByDay : [dtstart.getUTCDay()];
      })()
    : [];

  return {
    freq,
    interval,
    byDay,
    ...(count && count > 0 ? { count } : {}),
    ...(until ? { until } : {})
  };
}

export function normalizeExdates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export function applyExdates(occurrences: ExpandedOccurrence[], exdates: string[]) {
  if (exdates.length === 0) return occurrences;
  const skip = new Set(exdates);
  return occurrences.filter((occurrence) => !skip.has(occurrence.occurrenceKey));
}

function expandDaily(
  series: SeriesRecurrenceLike,
  rangeStart: Date,
  rangeEnd: Date,
  parsed: ParsedRRule
) {
  const occurrences: ExpandedOccurrence[] = [];
  const durationMs = series.durationMin * 60_000;
  const until = normalizeUntil(parsed, series.until);

  let emitted = 0;
  let cursor = new Date(series.dtstart);
  const safetyLimit = 10_000;

  while (cursor <= rangeEnd && emitted < safetyLimit) {
    if (until && cursor > until) break;
    if (parsed.count && emitted >= parsed.count) break;

    if (cursor >= rangeStart) {
      occurrences.push({
        seriesId: series.id,
        startAt: new Date(cursor),
        endAt: new Date(cursor.getTime() + durationMs),
        occurrenceKey: makeOccurrenceKey(cursor)
      });
    }

    emitted += 1;
    cursor = addDays(cursor, parsed.interval);
  }

  return occurrences;
}

function expandWeekly(
  series: SeriesRecurrenceLike,
  rangeStart: Date,
  rangeEnd: Date,
  parsed: ParsedRRule
) {
  const occurrences: ExpandedOccurrence[] = [];
  const durationMs = series.durationMin * 60_000;
  const until = normalizeUntil(parsed, series.until);
  const byDayOffsets = parsed.byDay
    .map((dayIndex) => ((dayIndex + 6) % 7))
    .sort((a, b) => a - b);
  const baseWeekStart = startOfWeek(series.dtstart, { weekStartsOn: 1 });
  const safetyLimit = 10_000;

  let emitted = 0;
  let weekCursor = new Date(baseWeekStart);
  let guard = 0;

  while (weekCursor <= rangeEnd && guard < safetyLimit) {
    if (parsed.count && emitted >= parsed.count) break;

    for (const offset of byDayOffsets) {
      if (parsed.count && emitted >= parsed.count) break;

      const candidateDay = addDays(weekCursor, offset);
      const candidate = new Date(candidateDay);
      candidate.setUTCHours(
        series.dtstart.getUTCHours(),
        series.dtstart.getUTCMinutes(),
        series.dtstart.getUTCSeconds(),
        series.dtstart.getUTCMilliseconds()
      );

      if (candidate < series.dtstart) continue;
      if (candidate > rangeEnd) continue;
      if (until && candidate > until) continue;

      if (candidate >= rangeStart) {
        occurrences.push({
          seriesId: series.id,
          startAt: new Date(candidate),
          endAt: new Date(candidate.getTime() + durationMs),
          occurrenceKey: makeOccurrenceKey(candidate)
        });
      }

      emitted += 1;
    }

    weekCursor = addWeeks(weekCursor, parsed.interval);
    guard += 1;
  }

  return occurrences;
}

function expandMonthly(
  series: SeriesRecurrenceLike,
  rangeStart: Date,
  rangeEnd: Date,
  parsed: ParsedRRule
) {
  const occurrences: ExpandedOccurrence[] = [];
  const durationMs = series.durationMin * 60_000;
  const until = normalizeUntil(parsed, series.until);
  const safetyLimit = 10_000;

  let emitted = 0;
  let cursor = new Date(series.dtstart);
  let guard = 0;

  while (cursor <= rangeEnd && guard < safetyLimit) {
    if (until && cursor > until) break;
    if (parsed.count && emitted >= parsed.count) break;

    if (cursor >= rangeStart) {
      occurrences.push({
        seriesId: series.id,
        startAt: new Date(cursor),
        endAt: new Date(cursor.getTime() + durationMs),
        occurrenceKey: makeOccurrenceKey(cursor)
      });
    }

    emitted += 1;
    cursor = addMonths(cursor, parsed.interval);
    guard += 1;
  }

  return occurrences;
}

export function expandSeriesToRange(
  series: SeriesRecurrenceLike,
  rangeStart: Date,
  rangeEnd: Date
): ExpandedOccurrence[] {
  if (rangeEnd < rangeStart) return [];

  const parsed = parseRRule(series.rrule, series.dtstart);
  let generated: ExpandedOccurrence[];

  if (parsed.freq === "DAILY") {
    generated = expandDaily(series, rangeStart, rangeEnd, parsed);
  } else if (parsed.freq === "MONTHLY") {
    generated = expandMonthly(series, rangeStart, rangeEnd, parsed);
  } else {
    generated = expandWeekly(series, rangeStart, rangeEnd, parsed);
  }

  return applyExdates(generated, normalizeExdates(series.exdates));
}

export function mergeOccurrencesWithOverrides(
  generated: ExpandedOccurrence[],
  overrides: OccurrenceOverrideLike[]
) {
  if (generated.length === 0) return [];
  if (overrides.length === 0) return generated;

  const overrideMap = new Map(overrides.map((override) => [override.occurrenceKey, override]));

  return generated.map((occurrence) => {
    const override = overrideMap.get(occurrence.occurrenceKey);
    if (!override) return occurrence;
    return {
      ...occurrence,
      startAt: override.startAt,
      endAt: override.endAt
    };
  });
}
