import { PrismaClient } from "@prisma/client";

import { formatInTimeZone, zonedDateKey, zonedDateStringToUtcStart } from "../lib/timezone";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

const TARGET_MONTH_START = "2026-02-01";
const TARGET_MONTH_END = "2026-02-28";
const DEFAULT_LOCATION = "Activity Room";
const FALLBACK_TIME_ZONE = "America/Chicago";

type ActivityTemplate = {
  time: string;
  title: string;
};

const WEEKDAY_DEFAULTS: Record<number, ActivityTemplate[]> = {
  0: [
    { time: "10:00", title: "Sunday Service" },
    { time: "14:00", title: "Coloring" },
    { time: "15:30", title: "Smoke Break" },
    { time: "16:00", title: "Board Games" }
  ],
  1: [
    { time: "10:00", title: "Bingo" },
    { time: "11:00", title: "Trivia" },
    { time: "14:00", title: "Word Search" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  2: [
    { time: "10:00", title: "Trivia" },
    { time: "11:00", title: "Bingo" },
    { time: "14:00", title: "Deal or No Deal" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Board Games" }
  ],
  3: [
    { time: "10:00", title: "Bingo" },
    { time: "11:00", title: "Bible Study" },
    { time: "14:00", title: "Word Search" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  4: [
    { time: "10:00", title: "Trivia" },
    { time: "11:00", title: "Bingo" },
    { time: "14:00", title: "Deal or No Deal" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Board Games" }
  ],
  5: [
    { time: "10:00", title: "Jeopardy" },
    { time: "11:00", title: "The Price Is Right" },
    { time: "14:00", title: "Word Search" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Movie Night!" }
  ],
  6: [
    { time: "10:00", title: "Story Telling" },
    { time: "14:00", title: "Coloring" },
    { time: "15:30", title: "Smoke Break" },
    { time: "16:00", title: "Board Games" }
  ]
};

const DATE_OVERRIDES: Record<string, ActivityTemplate[]> = {
  "2026-02-08": [
    { time: "10:00", title: "Sunday Service" },
    { time: "14:00", title: "Card Games" },
    { time: "15:30", title: "Smoke Break" },
    { time: "17:30", title: "SUPER BOWL WATCH PARTY!" }
  ],
  "2026-02-09": [
    { time: "10:00", title: "Bingo" },
    { time: "12:00", title: "Pizza Party!" },
    { time: "14:00", title: "Wheel of Fortune" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  "2026-02-10": [
    { time: "10:00", title: "Trivia" },
    { time: "11:00", title: "Bingo" },
    { time: "14:00", title: "Puzzles" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  "2026-02-11": [
    { time: "10:00", title: "Bingo" },
    { time: "11:00", title: "Bible Study" },
    { time: "14:00", title: "Wheel of Fortune" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Dominos" }
  ],
  "2026-02-12": [
    { time: "10:00", title: "Trivia" },
    { time: "11:00", title: "Bingo" },
    { time: "14:00", title: "Puzzles" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  "2026-02-13": [
    { time: "10:00", title: "Jeopardy" },
    { time: "11:00", title: "Coloring" },
    { time: "14:00", title: "Trivia" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Movie Night!" }
  ],
  "2026-02-14": [
    { time: "10:00", title: "Board Games" },
    { time: "14:00", title: "Card Games" },
    { time: "15:30", title: "Smoke Break" },
    { time: "16:00", title: "Dominos" }
  ],
  "2026-02-20": [
    { time: "10:00", title: "Jeopardy" },
    { time: "11:00", title: "Wheel of Fortune" },
    { time: "14:00", title: "Word Search" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Movie Night!" }
  ],
  "2026-02-22": [
    { time: "10:00", title: "Sunday Service" },
    { time: "14:00", title: "Card Games" },
    { time: "15:30", title: "Smoke Break" },
    { time: "16:00", title: "Dominos" }
  ],
  "2026-02-23": [
    { time: "10:00", title: "Bingo" },
    { time: "14:00", title: "Resident Council!" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  "2026-02-24": [
    { time: "10:00", title: "Trivia" },
    { time: "11:00", title: "Bingo" },
    { time: "14:00", title: "Puzzles" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  "2026-02-25": [
    { time: "10:00", title: "Bingo" },
    { time: "11:00", title: "Bible Study" },
    { time: "14:00", title: "Wheel of Fortune" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Dominos" }
  ],
  "2026-02-26": [
    { time: "10:00", title: "Trivia" },
    { time: "11:00", title: "Bingo" },
    { time: "14:00", title: "Puzzles" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Card Games" }
  ],
  "2026-02-27": [
    { time: "10:00", title: "Jeopardy" },
    { time: "14:00", title: "Resident Birthdays!" },
    { time: "15:30", title: "Smoke Break" },
    { time: "18:00", title: "Movie Night!" }
  ],
  "2026-02-28": [
    { time: "10:00", title: "Board Games" },
    { time: "14:00", title: "Card Games" },
    { time: "15:30", title: "Smoke Break" },
    { time: "16:00", title: "Dominos" }
  ]
};

type PlannedEvent = {
  dateKey: string;
  time: string;
  title: string;
  startAt: Date;
  endAt: Date;
  dedupeKey: string;
};

const STANDARD_TIME_SLOTS = ["10:00", "11:00", "14:00", "15:30", "18:00"] as const;

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTimeToMinutes(time: string) {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time value "${time}". Expected HH:MM.`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time value "${time}".`);
  }

  return hour * 60 + minute;
}

function dateKeysBetweenInclusive(startDateKey: string, endDateKey: string) {
  const keys: string[] = [];
  const cursor = new Date(`${startDateKey}T00:00:00Z`);
  const end = new Date(`${endDateKey}T00:00:00Z`);

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const day = String(cursor.getUTCDate()).padStart(2, "0");
    keys.push(`${year}-${month}-${day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function buildDedupeKey(dateKey: string, time: string, title: string) {
  return `${dateKey}-${time}-${slugifyTitle(title)}`;
}

function weekdayForDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function getTemplateForDate(dateKey: string) {
  const override = DATE_OVERRIDES[dateKey];
  if (override) return override;

  const weekday = weekdayForDateKey(dateKey);
  const weekdayTemplate = WEEKDAY_DEFAULTS[weekday];
  if (!weekdayTemplate) {
    throw new Error(`No weekday template found for weekday ${weekday} on ${dateKey}.`);
  }
  return weekdayTemplate;
}

function normalizeTemplateTimeSlots(template: ActivityTemplate[]) {
  return template.map((item, index) => {
    const normalizedTime = STANDARD_TIME_SLOTS[index] ?? item.time;
    if (item.title.toLowerCase().includes("smoke break")) {
      return {
        ...item,
        time: "13:30"
      };
    }
    return {
      ...item,
      time: normalizedTime
    };
  });
}

function buildMonthPlan(timeZone: string): PlannedEvent[] {
  const events: PlannedEvent[] = [];
  const keys = dateKeysBetweenInclusive(TARGET_MONTH_START, TARGET_MONTH_END);

  for (const dateKey of keys) {
    const dayStartUtc = zonedDateStringToUtcStart(dateKey, timeZone);
    if (!dayStartUtc) {
      throw new Error(`Could not parse date key ${dateKey}.`);
    }

    const template = normalizeTemplateTimeSlots(getTemplateForDate(dateKey));

    for (const item of template) {
      const minutesFromStart = parseTimeToMinutes(item.time);
      const startAt = new Date(dayStartUtc.getTime() + minutesFromStart * 60_000);
      const durationMinutes = item.title.toLowerCase().includes("smoke break") ? 30 : 60;
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      events.push({
        dateKey,
        time: item.time,
        title: item.title,
        startAt,
        endAt,
        dedupeKey: buildDedupeKey(dateKey, item.time, item.title)
      });
    }
  }

  return events;
}

async function resolveTargetFacility() {
  if (process.env.FACILITY_ID) {
    const facility = await prisma.facility.findUnique({
      where: { id: process.env.FACILITY_ID },
      select: { id: true, name: true, timezone: true }
    });

    if (!facility) {
      throw new Error(`FACILITY_ID "${process.env.FACILITY_ID}" was not found.`);
    }

    return {
      facilityId: facility.id,
      facilityName: facility.name,
      timeZone: facility.timezone || FALLBACK_TIME_ZONE,
      scopedBy: `facility:${facility.id}`
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: "Jason Addington", mode: "insensitive" } },
        { email: { contains: "jasonaddington817", mode: "insensitive" } },
        { email: { contains: "jaeboy", mode: "insensitive" } }
      ]
    },
    select: {
      name: true,
      email: true,
      facilityId: true,
      facility: {
        select: {
          name: true,
          timezone: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('Could not find "Jason Addington". Set FACILITY_ID to target a facility explicitly.');
  }

  return {
    facilityId: user.facilityId,
    facilityName: user.facility.name,
    timeZone: user.facility.timezone || FALLBACK_TIME_ZONE,
    scopedBy: `user:${user.name} <${user.email}>`
  };
}

function localTimeKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
}

async function main() {
  const scope = await resolveTargetFacility();

  const planned = buildMonthPlan(scope.timeZone);
  if (planned.length !== 130) {
    throw new Error(`Expected 130 events, generated ${planned.length}.`);
  }

  const monthStart = zonedDateStringToUtcStart(TARGET_MONTH_START, scope.timeZone);
  const nextMonthStart = zonedDateStringToUtcStart("2026-03-01", scope.timeZone);
  if (!monthStart || !nextMonthStart) {
    throw new Error("Failed to compute February 2026 range boundaries.");
  }
  const monthEnd = new Date(nextMonthStart.getTime() - 1);

  const existing = await prisma.activityInstance.findMany({
    where: {
      facilityId: scope.facilityId,
      startAt: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      location: true,
      createdAt: true
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "asc" }]
  });

  const existingByKey = new Map<string, Array<(typeof existing)[number]>>();
  const existingByDateAndTitle = new Map<string, Array<(typeof existing)[number]>>();
  for (const row of existing) {
    const dateKey = zonedDateKey(row.startAt, scope.timeZone);
    const time = localTimeKey(row.startAt, scope.timeZone);
    const key = buildDedupeKey(dateKey, time, row.title);
    const list = existingByKey.get(key) ?? [];
    list.push(row);
    existingByKey.set(key, list);

    const dateAndTitleKey = `${dateKey}::${slugifyTitle(row.title)}`;
    const dateAndTitleList = existingByDateAndTitle.get(dateAndTitleKey) ?? [];
    dateAndTitleList.push(row);
    existingByDateAndTitle.set(dateAndTitleKey, dateAndTitleList);
  }

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let existingDuplicateCount = 0;

  const consumedIds = new Set<string>();
  for (const event of planned) {
    const matches = (existingByKey.get(event.dedupeKey) ?? []).filter((item) => !consumedIds.has(item.id));
    const fallbackDateAndTitleMatches = (existingByDateAndTitle.get(`${event.dateKey}::${slugifyTitle(event.title)}`) ?? []).filter(
      (item) => !consumedIds.has(item.id)
    );
    const candidateMatches = matches.length > 0 ? matches : fallbackDateAndTitleMatches;
    if (candidateMatches.length > 0) {
      const primary = candidateMatches[0];
      consumedIds.add(primary.id);
      if (candidateMatches.length > 1) {
        existingDuplicateCount += candidateMatches.length - 1;
      }

      const needsUpdate =
        primary.title !== event.title ||
        primary.startAt.getTime() !== event.startAt.getTime() ||
        primary.endAt.getTime() !== event.endAt.getTime() ||
        primary.location !== DEFAULT_LOCATION;

      if (needsUpdate) {
        await prisma.activityInstance.update({
          where: { id: primary.id },
          data: {
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            location: DEFAULT_LOCATION
          }
        });
        updatedCount += 1;
      } else {
        unchangedCount += 1;
      }
      continue;
    }

    await prisma.activityInstance.create({
      data: {
        facilityId: scope.facilityId,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        location: DEFAULT_LOCATION,
        adaptationsEnabled: {
          bedBound: false,
          dementiaFriendly: false,
          lowVisionHearing: false,
          oneToOneMini: false,
          overrides: {}
        },
        checklist: []
      }
    });

    createdCount += 1;
  }

  const afterImport = await prisma.activityInstance.findMany({
    where: {
      facilityId: scope.facilityId,
      startAt: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    select: {
      id: true,
      title: true,
      startAt: true
    }
  });

  const targetKeys = new Set(planned.map((event) => event.dedupeKey));
  const targetDateKeys = new Set(planned.map((event) => event.dateKey));
  let matchedRows = 0;
  const matchedUniqueKeys = new Set<string>();
  const countsByDay = new Map<string, number>();
  for (const row of afterImport) {
    const rowDateKey = zonedDateKey(row.startAt, scope.timeZone);
    const key = buildDedupeKey(
      rowDateKey,
      localTimeKey(row.startAt, scope.timeZone),
      row.title
    );
    if (targetKeys.has(key)) {
      matchedRows += 1;
      matchedUniqueKeys.add(key);
      countsByDay.set(rowDateKey, (countsByDay.get(rowDateKey) ?? 0) + 1);
    }
  }

  const missingDateKeys = Array.from(targetDateKeys).filter((dateKey) => !countsByDay.has(dateKey)).sort();
  const countsByDayObject = Object.fromEntries(
    Array.from(countsByDay.entries()).sort(([a], [b]) => a.localeCompare(b))
  );

  console.log("Imported February 2026 calendar events.");
  console.log(
    JSON.stringify(
      {
        facilityId: scope.facilityId,
        facilityName: scope.facilityName,
        scopedBy: scope.scopedBy,
        timeZone: scope.timeZone,
        expectedEvents: planned.length,
        uniqueTargetKeys: targetKeys.size,
        matchedUniqueKeysAfterImport: matchedUniqueKeys.size,
        matchedRowsAfterImport: matchedRows,
        daysWithImportedEvents: countsByDay.size,
        missingDateKeys,
        countsByDay: countsByDayObject,
        createdCount,
        updatedCount,
        unchangedCount,
        existingDuplicateCount
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("February 2026 calendar import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
