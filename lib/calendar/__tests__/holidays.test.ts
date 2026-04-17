import assert from "node:assert/strict";
import test from "node:test";

import { getEasterSundayDate, getHolidaysForYear } from "@/lib/calendar/holidays";

function findHoliday(holidays: ReturnType<typeof getHolidaysForYear>, name: string, date: string) {
  return holidays.find((holiday) => holiday.name === name && holiday.date === date);
}

test("Easter is calculated correctly for 2026", () => {
  const holidays = getHolidaysForYear(2026);

  assert.equal(getEasterSundayDate(2026), "2026-04-05");
  assert.ok(findHoliday(holidays, "Easter Sunday", "2026-04-05"));
  assert.equal(findHoliday(holidays, "Easter Sunday", "2026-04-19"), undefined);
});

test("federal holidays and observed dates resolve correctly for 2026", () => {
  const holidays = getHolidaysForYear(2026);

  assert.ok(findHoliday(holidays, "New Year's Day", "2026-01-01"));
  assert.ok(findHoliday(holidays, "Martin Luther King Jr. Day", "2026-01-19"));
  assert.ok(findHoliday(holidays, "Washington's Birthday", "2026-02-16"));
  assert.ok(findHoliday(holidays, "Memorial Day", "2026-05-25"));
  assert.ok(findHoliday(holidays, "Juneteenth", "2026-06-19"));

  assert.ok(findHoliday(holidays, "Independence Day", "2026-07-04"));
  assert.ok(findHoliday(holidays, "Independence Day (Observed)", "2026-07-03"));

  assert.ok(findHoliday(holidays, "Labor Day", "2026-09-07"));
  assert.ok(findHoliday(holidays, "Columbus Day", "2026-10-12"));
  assert.ok(findHoliday(holidays, "Veterans Day", "2026-11-11"));
  assert.ok(findHoliday(holidays, "Thanksgiving", "2026-11-26"));
  assert.ok(findHoliday(holidays, "Christmas Day", "2026-12-25"));
});

test("National Skilled Nursing Care Week covers May 10-16 in 2026", () => {
  const holidays = getHolidaysForYear(2026).filter((holiday) => holiday.name === "National Skilled Nursing Care Week");
  const dates = holidays.map((holiday) => holiday.date);

  assert.equal(dates.length, 7);
  assert.equal(dates[0], "2026-05-10");
  assert.equal(dates[dates.length - 1], "2026-05-16");
});
