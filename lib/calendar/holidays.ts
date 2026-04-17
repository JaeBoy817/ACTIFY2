import { addDays, format, subDays } from "date-fns";

export type HolidayCategory = "federal" | "religious" | "seasonal" | "skilled-nursing";
export type HolidayType = "holiday" | "observed" | "event-range";

export type CalendarHoliday = {
  id: string;
  name: string;
  date: string;
  type: HolidayType;
  category: HolidayCategory;
  displayBadge: boolean;
  observedDate: string | null;
  observedFor: string | null;
};

const HOLIDAY_CACHE = new Map<number, CalendarHoliday[]>();

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function makeHolidayKey(name: string, dateIso: string, suffix?: string) {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${normalizedName}-${dateIso}${suffix ? `-${suffix}` : ""}`;
}

function getObservedDate(actualDate: Date) {
  const weekday = actualDate.getDay();
  if (weekday === 6) {
    return subDays(actualDate, 1);
  }

  if (weekday === 0) {
    return addDays(actualDate, 1);
  }

  return null;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number) {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const dayOfMonth = 1 + offset + (occurrence - 1) * 7;
  return new Date(year, month - 1, dayOfMonth);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const lastDay = new Date(year, month, 0);
  const offset = (lastDay.getDay() - weekday + 7) % 7;
  return subDays(lastDay, offset);
}

function calculateEasterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function pushHoliday(holidays: CalendarHoliday[], holiday: CalendarHoliday) {
  holidays.push(holiday);
}

function addFixedHolidayWithObserved(params: {
  holidays: CalendarHoliday[];
  year: number;
  month: number;
  day: number;
  name: string;
  category: HolidayCategory;
}) {
  const actualDate = new Date(params.year, params.month - 1, params.day);
  const actualIso = toIsoDate(actualDate);
  const observed = getObservedDate(actualDate);

  pushHoliday(params.holidays, {
    id: makeHolidayKey(params.name, actualIso),
    name: params.name,
    date: actualIso,
    type: "holiday",
    category: params.category,
    displayBadge: true,
    observedDate: observed ? toIsoDate(observed) : null,
    observedFor: null
  });

  if (observed && observed.getFullYear() === params.year && toIsoDate(observed) !== actualIso) {
    const observedIso = toIsoDate(observed);
    pushHoliday(params.holidays, {
      id: makeHolidayKey(params.name, observedIso, "observed"),
      name: `${params.name} (Observed)`,
      date: observedIso,
      type: "observed",
      category: params.category,
      displayBadge: true,
      observedDate: null,
      observedFor: params.name
    });
  }
}

function addSingleDayHoliday(params: {
  holidays: CalendarHoliday[];
  name: string;
  date: Date;
  category: HolidayCategory;
  type?: HolidayType;
}) {
  const iso = toIsoDate(params.date);
  pushHoliday(params.holidays, {
    id: makeHolidayKey(params.name, iso, params.type === "event-range" ? "range" : undefined),
    name: params.name,
    date: iso,
    type: params.type ?? "holiday",
    category: params.category,
    displayBadge: true,
    observedDate: null,
    observedFor: null
  });
}

function addRangeEvent(params: {
  holidays: CalendarHoliday[];
  name: string;
  startDate: Date;
  endDate: Date;
  category: HolidayCategory;
}) {
  for (let cursor = params.startDate; cursor <= params.endDate; cursor = addDays(cursor, 1)) {
    addSingleDayHoliday({
      holidays: params.holidays,
      name: params.name,
      date: cursor,
      category: params.category,
      type: "event-range"
    });
  }
}

function buildHolidaysForYear(year: number) {
  const holidays: CalendarHoliday[] = [];

  addFixedHolidayWithObserved({ holidays, year, month: 1, day: 1, name: "New Year's Day", category: "federal" });
  addSingleDayHoliday({ holidays, name: "Martin Luther King Jr. Day", date: nthWeekdayOfMonth(year, 1, 1, 3), category: "federal" });
  addSingleDayHoliday({ holidays, name: "Washington's Birthday", date: nthWeekdayOfMonth(year, 2, 1, 3), category: "federal" });

  const easterSunday = calculateEasterSunday(year);
  addSingleDayHoliday({ holidays, name: "Good Friday", date: subDays(easterSunday, 2), category: "religious" });
  addSingleDayHoliday({ holidays, name: "Easter Sunday", date: easterSunday, category: "religious" });

  addSingleDayHoliday({ holidays, name: "Mother's Day", date: nthWeekdayOfMonth(year, 5, 0, 2), category: "seasonal" });

  const skilledNursingWeekStart = nthWeekdayOfMonth(year, 5, 0, 2);
  const skilledNursingWeekEnd = addDays(skilledNursingWeekStart, 6);
  addRangeEvent({
    holidays,
    name: "National Skilled Nursing Care Week",
    startDate: skilledNursingWeekStart,
    endDate: skilledNursingWeekEnd,
    category: "skilled-nursing"
  });

  addSingleDayHoliday({ holidays, name: "Memorial Day", date: lastWeekdayOfMonth(year, 5, 1), category: "federal" });
  addSingleDayHoliday({ holidays, name: "Father's Day", date: nthWeekdayOfMonth(year, 6, 0, 3), category: "seasonal" });

  addFixedHolidayWithObserved({ holidays, year, month: 6, day: 19, name: "Juneteenth", category: "federal" });
  addFixedHolidayWithObserved({ holidays, year, month: 7, day: 4, name: "Independence Day", category: "federal" });

  addSingleDayHoliday({ holidays, name: "Labor Day", date: nthWeekdayOfMonth(year, 9, 1, 1), category: "federal" });
  addSingleDayHoliday({ holidays, name: "Columbus Day", date: nthWeekdayOfMonth(year, 10, 1, 2), category: "federal" });

  addFixedHolidayWithObserved({ holidays, year, month: 11, day: 11, name: "Veterans Day", category: "federal" });
  addSingleDayHoliday({ holidays, name: "Thanksgiving", date: nthWeekdayOfMonth(year, 11, 4, 4), category: "federal" });
  addFixedHolidayWithObserved({ holidays, year, month: 12, day: 25, name: "Christmas Day", category: "federal" });

  return holidays.sort((a, b) => {
    if (a.date === b.date) return a.name.localeCompare(b.name);
    return a.date.localeCompare(b.date);
  });
}

function validateHolidaysForYear(year: number, holidays: CalendarHoliday[]) {
  const seenIds = new Set<string>();

  holidays.forEach((holiday) => {
    const parsed = new Date(`${holiday.date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid holiday date '${holiday.date}' for '${holiday.name}'.`);
    }

    if (parsed.getFullYear() !== year) {
      throw new Error(`Holiday '${holiday.name}' resolved outside selected year ${year}: ${holiday.date}.`);
    }

    if (seenIds.has(holiday.id)) {
      throw new Error(`Duplicate holiday id generated for '${holiday.id}'.`);
    }

    seenIds.add(holiday.id);
  });
}

export function getHolidaysForYear(year: number) {
  if (HOLIDAY_CACHE.has(year)) {
    return HOLIDAY_CACHE.get(year) ?? [];
  }

  const holidays = buildHolidaysForYear(year);
  validateHolidaysForYear(year, holidays);
  HOLIDAY_CACHE.set(year, holidays);
  return holidays;
}

export function getEasterSundayDate(year: number) {
  return toIsoDate(calculateEasterSunday(year));
}
