import { formatInTimeZone, getTimeZoneOffsetMinutes, resolveTimeZone, zonedDateStringToUtcStart } from "@/lib/timezone";

const MS_PER_MINUTE = 60 * 1000;
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T\s])(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const ACTIFY_DEFAULT_TIME_ZONE = "America/Chicago";

export type ActifyTimeZoneOptions = {
  facilityTimeZone?: string | null;
  userTimeZone?: string | null;
  browserTimeZone?: string | null;
  fallbackTimeZone?: string | null;
};

export type ParseDateTimeInputOptions = {
  timeZone?: string | null;
  fallbackToNow?: boolean;
  now?: Date;
};

export type DateLike = Date | string | number;

function trimOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidDateParts(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function toUtcFromZonedDateTimeParts(
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second?: number;
    millisecond?: number;
  },
  timeZone?: string | null
) {
  const zone = resolveActifyTimeZone({ facilityTimeZone: timeZone });
  const second = input.second ?? 0;
  const millisecond = input.millisecond ?? 0;
  const baseUtcMillis = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    second,
    millisecond
  );

  let offsetMinutes = getTimeZoneOffsetMinutes(new Date(baseUtcMillis), zone);
  let utcMillis = baseUtcMillis - offsetMinutes * MS_PER_MINUTE;

  const correctedOffsetMinutes = getTimeZoneOffsetMinutes(new Date(utcMillis), zone);
  if (correctedOffsetMinutes !== offsetMinutes) {
    offsetMinutes = correctedOffsetMinutes;
    utcMillis = baseUtcMillis - offsetMinutes * MS_PER_MINUTE;
  }

  return new Date(utcMillis);
}

function parseDateLike(value: DateLike | null | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const token = trimOrNull(value);
  if (!token) return null;

  const parsed = new Date(token);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getZonedParts(value: DateLike, timeZone?: string | null) {
  const date = parseDateLike(value);
  if (!date) return null;

  const zone = resolveActifyTimeZone({ facilityTimeZone: timeZone });
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const partMap: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      partMap[part.type] = part.value;
    }
  }

  return {
    year: Number(partMap.year ?? "0"),
    month: Number(partMap.month ?? "1"),
    day: Number(partMap.day ?? "1"),
    hour: Number(partMap.hour ?? "0"),
    minute: Number(partMap.minute ?? "0"),
    second: Number(partMap.second ?? "0")
  };
}

export function getBrowserTimeZone() {
  if (typeof window === "undefined") return null;

  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return trimOrNull(value);
  } catch {
    return null;
  }
}

export function resolveActifyTimeZone(options: ActifyTimeZoneOptions = {}) {
  const candidates = [
    trimOrNull(options.facilityTimeZone),
    trimOrNull(options.userTimeZone),
    trimOrNull(options.browserTimeZone),
    getBrowserTimeZone(),
    trimOrNull(options.fallbackTimeZone),
    ACTIFY_DEFAULT_TIME_ZONE
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = resolveTimeZone(candidate);
    if (resolved) return resolved;
  }

  return resolveTimeZone(ACTIFY_DEFAULT_TIME_ZONE);
}

export function parseDateTimeInputToUtcDate(
  value: string | null | undefined,
  options: ParseDateTimeInputOptions = {}
) {
  const token = trimOrNull(value);
  if (!token) {
    return options.fallbackToNow ? options.now ?? new Date() : null;
  }

  const localMatch = token.match(LOCAL_DATE_TIME_PATTERN);
  if (localMatch) {
    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hour = Number(localMatch[4]);
    const minute = Number(localMatch[5]);
    const second = Number(localMatch[6] ?? 0);
    const millisecond = Number((localMatch[7] ?? "0").padEnd(3, "0"));

    if (
      !isValidDateParts(year, month, day) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      second < 0 ||
      second > 59 ||
      millisecond < 0 ||
      millisecond > 999
    ) {
      return options.fallbackToNow ? options.now ?? new Date() : null;
    }

    return toUtcFromZonedDateTimeParts(
      {
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond
      },
      options.timeZone
    );
  }

  const parsed = new Date(token);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return options.fallbackToNow ? options.now ?? new Date() : null;
}

export function parseDateOnlyInputToUtcStart(value: string | null | undefined, timeZone?: string | null) {
  const token = trimOrNull(value);
  if (!token) return null;

  if (DATE_ONLY_PATTERN.test(token)) {
    return zonedDateStringToUtcStart(token, resolveActifyTimeZone({ facilityTimeZone: timeZone }));
  }

  const parsed = parseDateLike(token);
  if (!parsed) return null;

  const parts = getZonedParts(parsed, timeZone);
  if (!parts || !isValidDateParts(parts.year, parts.month, parts.day)) return null;

  return toUtcFromZonedDateTimeParts(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    },
    timeZone
  );
}

export function toDateInputValueInTimeZone(value: DateLike, timeZone?: string | null) {
  const parts = getZonedParts(value, timeZone);
  if (!parts || !isValidDateParts(parts.year, parts.month, parts.day)) return "";

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function toDateTimeLocalInputValueInTimeZone(value: DateLike, timeZone?: string | null) {
  const parts = getZonedParts(value, timeZone);
  if (!parts || !isValidDateParts(parts.year, parts.month, parts.day)) return "";

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function normalizeDateOnlyInput(value: string | null | undefined, timeZone?: string | null) {
  const token = trimOrNull(value);
  if (!token) return "";

  if (DATE_ONLY_PATTERN.test(token)) {
    return token;
  }

  const parsed = parseDateLike(token);
  if (!parsed) return "";
  return toDateInputValueInTimeZone(parsed, timeZone);
}

export function formatActifyDate(value: DateLike | null | undefined, timeZone?: string | null) {
  const parsed = parseDateLike(value ?? null);
  if (!parsed) return "";

  return formatInTimeZone(parsed, resolveActifyTimeZone({ facilityTimeZone: timeZone }), {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatActifyTime(value: DateLike | null | undefined, timeZone?: string | null) {
  const parsed = parseDateLike(value ?? null);
  if (!parsed) return "";

  return formatInTimeZone(parsed, resolveActifyTimeZone({ facilityTimeZone: timeZone }), {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatActifyDateTime(value: DateLike | null | undefined, timeZone?: string | null) {
  const parsed = parseDateLike(value ?? null);
  if (!parsed) return "";

  return `${formatActifyDate(parsed, timeZone)} • ${formatActifyTime(parsed, timeZone)}`;
}
