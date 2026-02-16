const DEFAULT_TIME_ZONE = "America/New_York";
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

function parseOffsetMinutes(value: string): number {
  const normalized = value.replace("UTC", "GMT");
  if (normalized === "GMT" || normalized === "GMT+0" || normalized === "GMT-0") {
    return 0;
  }

  const match = normalized.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);

  return sign * (hours * 60 + minutes);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function resolveTimeZone(timeZone?: string | null): string {
  if (!timeZone) {
    return DEFAULT_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone?: string | null): number {
  const zone = resolveTimeZone(timeZone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const offsetLabel = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
  return parseOffsetMinutes(offsetLabel);
}

function getZonedDateParts(date: Date, timeZone?: string | null): ZonedDateParts {
  const zone = resolveTimeZone(timeZone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
    hourCycle: "h23"
  });

  const partMap: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      partMap[part.type] = part.value;
    }
  }

  const weekdayToken = (partMap.weekday ?? "sun").slice(0, 3).toLowerCase();

  return {
    year: Number(partMap.year ?? 0),
    month: Number(partMap.month ?? 1),
    day: Number(partMap.day ?? 1),
    hour: Number(partMap.hour ?? 0),
    minute: Number(partMap.minute ?? 0),
    second: Number(partMap.second ?? 0),
    weekday: WEEKDAY_INDEX[weekdayToken] ?? 0
  };
}

type LocalDateTimeInput = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
};

function zonedDateTimeToUtc(input: LocalDateTimeInput, timeZone?: string | null): Date {
  const zone = resolveTimeZone(timeZone);
  const hour = input.hour ?? 0;
  const minute = input.minute ?? 0;
  const second = input.second ?? 0;
  const baseUtcMillis = Date.UTC(input.year, input.month - 1, input.day, hour, minute, second, 0);

  let offsetMinutes = getTimeZoneOffsetMinutes(new Date(baseUtcMillis), zone);
  let utcMillis = baseUtcMillis - offsetMinutes * MS_PER_MINUTE;

  const correctedOffsetMinutes = getTimeZoneOffsetMinutes(new Date(utcMillis), zone);
  if (correctedOffsetMinutes !== offsetMinutes) {
    offsetMinutes = correctedOffsetMinutes;
    utcMillis = baseUtcMillis - offsetMinutes * MS_PER_MINUTE;
  }

  return new Date(utcMillis);
}

export function startOfZonedDay(date: Date, timeZone?: string | null): Date {
  const parts = getZonedDateParts(date, timeZone);
  return zonedDateTimeToUtc(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day
    },
    timeZone
  );
}

export function addZonedDays(date: Date, timeZone: string | null | undefined, days: number): Date {
  const parts = getZonedDateParts(date, timeZone);
  const localDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  localDay.setUTCDate(localDay.getUTCDate() + days);

  return zonedDateTimeToUtc(
    {
      year: localDay.getUTCFullYear(),
      month: localDay.getUTCMonth() + 1,
      day: localDay.getUTCDate()
    },
    timeZone
  );
}

export function endOfZonedDay(date: Date, timeZone?: string | null): Date {
  const start = startOfZonedDay(date, timeZone);
  const nextStart = addZonedDays(start, timeZone, 1);
  return new Date(nextStart.getTime() - 1);
}

export function startOfZonedWeek(date: Date, timeZone: string | null | undefined, weekStartsOn = 1): Date {
  const parts = getZonedDateParts(date, timeZone);
  const normalizedWeekStartsOn = ((weekStartsOn % 7) + 7) % 7;
  const diff = (parts.weekday - normalizedWeekStartsOn + 7) % 7;
  const localDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  localDay.setUTCDate(localDay.getUTCDate() - diff);

  return zonedDateTimeToUtc(
    {
      year: localDay.getUTCFullYear(),
      month: localDay.getUTCMonth() + 1,
      day: localDay.getUTCDate()
    },
    timeZone
  );
}

export function endOfZonedWeek(date: Date, timeZone: string | null | undefined, weekStartsOn = 1): Date {
  const weekStart = startOfZonedWeek(date, timeZone, weekStartsOn);
  const nextWeekStart = addZonedDays(weekStart, timeZone, 7);
  return new Date(nextWeekStart.getTime() - 1);
}

export function startOfZonedMonth(date: Date, timeZone?: string | null): Date {
  const parts = getZonedDateParts(date, timeZone);
  return zonedDateTimeToUtc(
    {
      year: parts.year,
      month: parts.month,
      day: 1
    },
    timeZone
  );
}

export function startOfZonedMonthShift(date: Date, timeZone: string | null | undefined, monthDelta: number): Date {
  const parts = getZonedDateParts(date, timeZone);
  const localMonth = new Date(Date.UTC(parts.year, parts.month - 1, 1, 0, 0, 0, 0));
  localMonth.setUTCMonth(localMonth.getUTCMonth() + monthDelta);

  return zonedDateTimeToUtc(
    {
      year: localMonth.getUTCFullYear(),
      month: localMonth.getUTCMonth() + 1,
      day: 1
    },
    timeZone
  );
}

export function zonedDateKey(date: Date, timeZone?: string | null): string {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function zonedDateStringToUtcStart(dateKey: string, timeZone?: string | null): Date | null {
  const match = dateKey.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return zonedDateTimeToUtc({ year, month, day }, timeZone);
}

export function formatInTimeZone(
  date: Date,
  timeZone: string | null | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  const zone = resolveTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, ...options }).format(date);
}

export function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * MS_PER_DAY);
}
