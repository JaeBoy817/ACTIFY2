import type { CalendarHoliday } from "@/lib/calendar/holidays";

export type HolidayLookup = Map<string, CalendarHoliday[]>;

export function buildHolidayLookup(holidays: CalendarHoliday[]) {
  const lookup: HolidayLookup = new Map<string, CalendarHoliday[]>();

  holidays.forEach((holiday) => {
    const existing = lookup.get(holiday.date) ?? [];
    lookup.set(holiday.date, [...existing, holiday]);
  });

  return lookup;
}

export function getHolidayBadgeForDate(dateISO: string, lookup: HolidayLookup) {
  const badges = lookup.get(dateISO) ?? [];
  return badges.filter((holiday) => holiday.displayBadge);
}
