import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAnalyticsDashboardFilters,
  resolveAnalyticsDashboardRange,
  resolveComparisonRange,
  type AnalyticsDashboardFilters
} from "@/lib/analytics/dashboard-command-center";
import { zonedDateKey } from "@/lib/timezone";

const TIME_ZONE = "America/Chicago";

function makeFilters(overrides: Partial<AnalyticsDashboardFilters> = {}): AnalyticsDashboardFilters {
  return {
    preset: "this-month",
    selectedMonth: "2026-03",
    customFrom: null,
    customTo: null,
    compare: false,
    unitId: null,
    activityCategory: null,
    participationScope: "all",
    residentStatus: "all-active",
    participationLevel: null,
    responseType: null,
    mood: null,
    staffId: null,
    docType: "all",
    ...overrides
  };
}

test("parseAnalyticsDashboardFilters defaults selected month to current zoned month", () => {
  const parsed = parseAnalyticsDashboardFilters(undefined, TIME_ZONE, new Date("2026-03-12T18:30:00.000Z"));
  assert.equal(parsed.preset, "this-month");
  assert.equal(parsed.selectedMonth, "2026-03");
});

test("resolveAnalyticsDashboardRange uses strict calendar month boundaries", () => {
  const range = resolveAnalyticsDashboardRange(makeFilters({ preset: "this-month", selectedMonth: "2026-02" }), TIME_ZONE);

  assert.equal(zonedDateKey(range.start, TIME_ZONE), "2026-02-01");
  assert.equal(zonedDateKey(range.endExclusive, TIME_ZONE), "2026-03-01");

  const atStart = range.start;
  const justBeforeEnd = new Date(range.endExclusive.getTime() - 1);
  const atEnd = range.endExclusive;

  assert.equal(atStart >= range.start && atStart < range.endExclusive, true);
  assert.equal(justBeforeEnd >= range.start && justBeforeEnd < range.endExclusive, true);
  assert.equal(atEnd >= range.start && atEnd < range.endExclusive, false);
});

test("last-month range handles January to December transition", () => {
  const range = resolveAnalyticsDashboardRange(makeFilters({ preset: "last-month", selectedMonth: "2026-01" }), TIME_ZONE);

  assert.equal(zonedDateKey(range.start, TIME_ZONE), "2025-12-01");
  assert.equal(zonedDateKey(range.endExclusive, TIME_ZONE), "2026-01-01");
  assert.equal(range.selectedMonth, "2025-12");
});

test("quarter preset resolves quarter start and end boundaries", () => {
  const range = resolveAnalyticsDashboardRange(makeFilters({ preset: "quarter", selectedMonth: "2026-05" }), TIME_ZONE);

  assert.equal(zonedDateKey(range.start, TIME_ZONE), "2026-04-01");
  assert.equal(zonedDateKey(range.endExclusive, TIME_ZONE), "2026-07-01");
  assert.equal(range.label, "Q2 2026");
});

test("custom range uses inclusive dates with exclusive next-day end", () => {
  const range = resolveAnalyticsDashboardRange(
    makeFilters({
      preset: "custom",
      selectedMonth: "2026-02",
      customFrom: "2026-02-10",
      customTo: "2026-02-12"
    }),
    TIME_ZONE
  );

  assert.equal(zonedDateKey(range.start, TIME_ZONE), "2026-02-10");
  assert.equal(zonedDateKey(range.endExclusive, TIME_ZONE), "2026-02-13");
});

test("resolveComparisonRange stays isolated from current period dataset", () => {
  const current = resolveAnalyticsDashboardRange(makeFilters({ preset: "this-month", selectedMonth: "2026-03" }), TIME_ZONE);
  const previous = resolveComparisonRange(current);

  assert.equal(zonedDateKey(previous.start, TIME_ZONE), "2026-02-01");
  assert.equal(zonedDateKey(previous.endExclusive, TIME_ZONE), "2026-03-01");
  assert.equal(previous.label, "February 2026");
});

