import assert from "node:assert/strict";
import test from "node:test";

import { hasTimeOverlap } from "@/lib/calendar/conflicts";
import {
  expandSeriesToRange,
  makeOccurrenceKey,
  mergeOccurrencesWithOverrides
} from "@/lib/calendar/recurrence";

test("hasTimeOverlap handles partial and contained overlaps", () => {
  const baseStart = new Date("2026-02-16T10:00:00.000Z");
  const baseEnd = new Date("2026-02-16T11:00:00.000Z");

  assert.equal(
    hasTimeOverlap(baseStart, baseEnd, new Date("2026-02-16T10:30:00.000Z"), new Date("2026-02-16T11:30:00.000Z")),
    true
  );
  assert.equal(
    hasTimeOverlap(baseStart, baseEnd, new Date("2026-02-16T09:30:00.000Z"), new Date("2026-02-16T10:15:00.000Z")),
    true
  );
  assert.equal(
    hasTimeOverlap(baseStart, baseEnd, new Date("2026-02-16T10:10:00.000Z"), new Date("2026-02-16T10:20:00.000Z")),
    true
  );
});

test("hasTimeOverlap treats boundary touch as no conflict", () => {
  const baseStart = new Date("2026-02-16T10:00:00.000Z");
  const baseEnd = new Date("2026-02-16T11:00:00.000Z");

  assert.equal(
    hasTimeOverlap(baseStart, baseEnd, new Date("2026-02-16T09:00:00.000Z"), new Date("2026-02-16T10:00:00.000Z")),
    false
  );
  assert.equal(
    hasTimeOverlap(baseStart, baseEnd, new Date("2026-02-16T11:00:00.000Z"), new Date("2026-02-16T12:00:00.000Z")),
    false
  );
});

test("expandSeriesToRange expands weekly recurrence and respects exdates", () => {
  const generated = expandSeriesToRange(
    {
      id: "series-1",
      dtstart: new Date("2026-02-02T10:00:00.000Z"),
      durationMin: 60,
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE",
      until: null,
      exdates: [new Date("2026-02-04T10:00:00.000Z").toISOString()]
    },
    new Date("2026-02-01T00:00:00.000Z"),
    new Date("2026-02-10T23:59:59.000Z")
  );

  const startKeys = generated.map((item) => item.startAt.toISOString());
  assert.deepEqual(startKeys, ["2026-02-02T10:00:00.000Z", "2026-02-09T10:00:00.000Z"]);
});

test("mergeOccurrencesWithOverrides replaces generated instance timing for matching occurrence key", () => {
  const occurrenceKey = makeOccurrenceKey(new Date("2026-02-16T14:00:00.000Z"));
  const generated = [
    {
      seriesId: "series-1",
      startAt: new Date("2026-02-16T14:00:00.000Z"),
      endAt: new Date("2026-02-16T15:00:00.000Z"),
      occurrenceKey
    }
  ];

  const merged = mergeOccurrencesWithOverrides(generated, [
    {
      occurrenceKey,
      startAt: new Date("2026-02-16T15:00:00.000Z"),
      endAt: new Date("2026-02-16T16:00:00.000Z")
    }
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].startAt.toISOString(), "2026-02-16T15:00:00.000Z");
  assert.equal(merged[0].endAt.toISOString(), "2026-02-16T16:00:00.000Z");
});

