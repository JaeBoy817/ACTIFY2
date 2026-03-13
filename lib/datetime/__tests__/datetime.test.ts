import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIFY_DEFAULT_TIME_ZONE,
  normalizeDateOnlyInput,
  parseDateOnlyInputToUtcStart,
  parseDateTimeInputToUtcDate,
  resolveActifyTimeZone,
  toDateInputValueInTimeZone,
  toDateTimeLocalInputValueInTimeZone
} from "@/lib/datetime";

test("resolveActifyTimeZone uses facility timezone first", () => {
  const resolved = resolveActifyTimeZone({
    facilityTimeZone: "America/Denver",
    browserTimeZone: "America/New_York",
    fallbackTimeZone: "America/Chicago"
  });

  assert.equal(resolved, "America/Denver");
});

test("resolveActifyTimeZone falls back to default when candidates are invalid", () => {
  const resolved = resolveActifyTimeZone({
    facilityTimeZone: "Invalid/Zone",
    userTimeZone: "Still/Invalid",
    browserTimeZone: "Also/Invalid"
  });

  assert.equal(resolved, ACTIFY_DEFAULT_TIME_ZONE);
});

test("parseDateTimeInputToUtcDate parses datetime-local values in provided timezone", () => {
  const parsed = parseDateTimeInputToUtcDate("2026-02-12T13:00", {
    timeZone: "America/Chicago"
  });

  assert.ok(parsed);
  assert.equal(toDateTimeLocalInputValueInTimeZone(parsed as Date, "America/Chicago"), "2026-02-12T13:00");
});

test("parseDateTimeInputToUtcDate preserves ISO timestamps", () => {
  const parsed = parseDateTimeInputToUtcDate("2026-02-12T13:00:00.000Z", {
    timeZone: "America/Chicago"
  });

  assert.ok(parsed);
  assert.equal((parsed as Date).toISOString(), "2026-02-12T13:00:00.000Z");
});

test("datetime-local round-trips through UTC conversion", () => {
  const baseline = new Date("2026-07-15T18:30:00.000Z");
  const local = toDateTimeLocalInputValueInTimeZone(baseline, "America/Chicago");
  const reparsed = parseDateTimeInputToUtcDate(local, {
    timeZone: "America/Chicago"
  });

  assert.ok(reparsed);
  assert.equal((reparsed as Date).toISOString(), baseline.toISOString());
});

test("date-only parsing keeps calendar day stable in timezone", () => {
  const parsed = parseDateOnlyInputToUtcStart("2026-02-01", "America/Chicago");
  assert.ok(parsed);
  assert.equal(toDateInputValueInTimeZone(parsed as Date, "America/Chicago"), "2026-02-01");
});

test("normalizeDateOnlyInput does not shift date-only values", () => {
  assert.equal(normalizeDateOnlyInput("2026-11-03", "America/Chicago"), "2026-11-03");
});

test("parseDateTimeInputToUtcDate handles invalid values and fallbackToNow", () => {
  const fixedNow = new Date("2026-01-01T00:00:00.000Z");

  const invalid = parseDateTimeInputToUtcDate("not-a-date", { timeZone: "America/Chicago" });
  assert.equal(invalid, null);

  const fallback = parseDateTimeInputToUtcDate("not-a-date", {
    timeZone: "America/Chicago",
    fallbackToNow: true,
    now: fixedNow
  });
  assert.ok(fallback);
  assert.equal((fallback as Date).toISOString(), fixedNow.toISOString());
});
