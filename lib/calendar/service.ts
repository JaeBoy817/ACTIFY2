import { addDays, startOfDay } from "date-fns";
import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { expandSeriesToRange, makeOccurrenceKey, normalizeExdates } from "@/lib/calendar/recurrence";
import { findConflicts, getSchedulingWarningPolicy, isOutsideBusinessHours, type CalendarConflict } from "@/lib/calendar/conflicts";

type PrismaExecutor = PrismaClient | typeof prisma;

const DEFAULT_LOCATION = "Activity Room";
const DEFAULT_MATERIALIZATION_HORIZON_DAYS = 180;
const DEFAULT_ADAPTATIONS = {
  bedBound: false,
  dementiaFriendly: false,
  lowVisionHearing: false,
  oneToOneMini: false,
  overrides: {}
};

type JsonLike = unknown;

function normalizeChecklist(value: JsonLike | undefined): Prisma.InputJsonValue {
  if (!Array.isArray(value)) return [];
  return value as Prisma.InputJsonValue;
}

function normalizeAdaptations(value: JsonLike | undefined): Prisma.InputJsonValue {
  if (value && typeof value === "object") return value as Prisma.InputJsonValue;
  return DEFAULT_ADAPTATIONS as Prisma.InputJsonValue;
}

function normalizeJsonForRequired(
  value: JsonLike | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function normalizeJsonForNullable(
  value: JsonLike | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function normalizeLocation(location?: string | null) {
  const trimmed = (location ?? "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_LOCATION;
}

function ensureValidRange(startAt: Date, endAt: Date) {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new Error("Invalid schedule range.");
  }
}

export class CalendarConflictError extends Error {
  conflicts: CalendarConflict[];
  outsideBusinessHours: boolean;

  constructor(message: string, options: { conflicts?: CalendarConflict[]; outsideBusinessHours?: boolean } = {}) {
    super(message);
    this.name = "CalendarConflictError";
    this.conflicts = options.conflicts ?? [];
    this.outsideBusinessHours = options.outsideBusinessHours ?? false;
  }
}

function toSeriesWindow(
  series: {
    id: string;
    dtstart: Date;
    durationMin: number;
    rrule: string;
    until: Date | null;
    exdates: unknown;
    checklist: unknown;
    adaptations: unknown;
    title: string;
    location: string | null;
    facilityId: string;
    templateId: string | null;
  },
  rangeStart: Date,
  rangeEnd: Date
) {
  const occurrences = expandSeriesToRange(
    {
      id: series.id,
      dtstart: series.dtstart,
      durationMin: series.durationMin,
      rrule: series.rrule,
      until: series.until,
      exdates: series.exdates
    },
    rangeStart,
    rangeEnd
  );

  return occurrences.map((occurrence) => ({
    occurrence,
    data: {
      facilityId: series.facilityId,
      templateId: series.templateId,
      seriesId: series.id,
      occurrenceKey: occurrence.occurrenceKey,
      isOverride: false,
      conflictOverride: false,
      title: series.title,
      startAt: occurrence.startAt,
      endAt: occurrence.endAt,
      location: normalizeLocation(series.location),
      checklist: normalizeChecklist(series.checklist as JsonLike),
      adaptationsEnabled: normalizeAdaptations(series.adaptations as JsonLike)
    }
  }));
}

async function materializeSingleSeriesWindow(params: {
  tx?: PrismaExecutor;
  series: {
    id: string;
    facilityId: string;
    templateId: string | null;
    title: string;
    location: string | null;
    dtstart: Date;
    durationMin: number;
    rrule: string;
    until: Date | null;
    checklist: unknown;
    adaptations: unknown;
    exdates: unknown;
  };
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const tx = params.tx ?? prisma;
  const occurrencesWithPayload = toSeriesWindow(params.series, params.rangeStart, params.rangeEnd);

  const expectedOccurrenceKeys = new Set(occurrencesWithPayload.map((item) => item.occurrence.occurrenceKey));

  const existing = await tx.activityInstance.findMany({
    where: {
      seriesId: params.series.id,
      startAt: { lte: params.rangeEnd },
      endAt: { gte: params.rangeStart }
    },
    select: {
      id: true,
      occurrenceKey: true,
      isOverride: true
    }
  });

  const existingByOccurrenceKey = new Map(
    existing
      .filter((row): row is typeof row & { occurrenceKey: string } => typeof row.occurrenceKey === "string" && row.occurrenceKey.length > 0)
      .map((row) => [row.occurrenceKey, row])
  );

  const createRows = occurrencesWithPayload
    .filter((item) => !existingByOccurrenceKey.has(item.occurrence.occurrenceKey))
    .map((item) => item.data);

  if (createRows.length > 0) {
    await tx.activityInstance.createMany({
      data: createRows,
      skipDuplicates: true
    });
  }

  const staleGeneratedIds = existing
    .filter((row) => !row.isOverride && row.occurrenceKey && !expectedOccurrenceKeys.has(row.occurrenceKey))
    .map((row) => row.id);

  if (staleGeneratedIds.length > 0) {
    await tx.activityInstance.deleteMany({
      where: { id: { in: staleGeneratedIds } }
    });
  }

  return {
    createdCount: createRows.length,
    deletedCount: staleGeneratedIds.length
  };
}

export async function ensureSeriesOccurrencesMaterialized(params: {
  facilityId: string;
  rangeStart: Date;
  rangeEnd: Date;
  tx?: PrismaExecutor;
}) {
  const tx = params.tx ?? prisma;
  const seriesRows = await tx.activitySeries.findMany({
    where: {
      facilityId: params.facilityId,
      dtstart: { lte: params.rangeEnd },
      OR: [{ until: null }, { until: { gte: params.rangeStart } }]
    },
    select: {
      id: true,
      facilityId: true,
      templateId: true,
      title: true,
      location: true,
      dtstart: true,
      durationMin: true,
      rrule: true,
      until: true,
      checklist: true,
      adaptations: true,
      exdates: true
    }
  });

  let createdCount = 0;
  let deletedCount = 0;
  for (const series of seriesRows) {
    const result = await materializeSingleSeriesWindow({
      tx,
      series,
      rangeStart: params.rangeStart,
      rangeEnd: params.rangeEnd
    });
    createdCount += result.createdCount;
    deletedCount += result.deletedCount;
  }

  return {
    seriesCount: seriesRows.length,
    createdCount,
    deletedCount
  };
}

export async function getCalendarRangeActivities(params: {
  facilityId: string;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  ensureValidRange(params.rangeStart, params.rangeEnd);
  const materialized = await ensureSeriesOccurrencesMaterialized({
    facilityId: params.facilityId,
    rangeStart: params.rangeStart,
    rangeEnd: params.rangeEnd
  });

  const activities = await prisma.activityInstance.findMany({
    where: {
      facilityId: params.facilityId,
      startAt: { lte: params.rangeEnd },
      endAt: { gte: params.rangeStart }
    },
    orderBy: { startAt: "asc" },
    include: {
      _count: {
        select: {
          attendance: true
        }
      }
    }
  });

  return { activities, materialized };
}

async function evaluateWarnings(params: {
  facilityId: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  excludeActivityId?: string;
}) {
  const policy = await getSchedulingWarningPolicy(params.facilityId);

  const conflicts = policy.warnTherapyOverlap
    ? await findConflicts({
        facilityId: params.facilityId,
        startAt: params.startAt,
        endAt: params.endAt,
        location: params.location,
        excludeActivityId: params.excludeActivityId,
        locationScoped: Boolean(params.location)
      })
    : [];

  const outsideBusinessHours = policy.warnOutsideBusinessHours
    ? isOutsideBusinessHours({
        startAt: params.startAt,
        endAt: params.endAt,
        timeZone: policy.timezone,
        businessHours: policy.businessHours
      })
    : false;

  return {
    conflicts,
    outsideBusinessHours
  };
}

export async function createActivityWithChecks(params: {
  facilityId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  checklist?: JsonLike;
  adaptationsEnabled?: JsonLike;
  templateId?: string | null;
  seriesId?: string | null;
  occurrenceKey?: string | null;
  isOverride?: boolean;
  allowConflictOverride?: boolean;
  allowOutsideBusinessHoursOverride?: boolean;
}) {
  ensureValidRange(params.startAt, params.endAt);
  const location = normalizeLocation(params.location);

  const warningState = await evaluateWarnings({
    facilityId: params.facilityId,
    startAt: params.startAt,
    endAt: params.endAt,
    location
  });

  if (!params.allowConflictOverride && warningState.conflicts.length > 0) {
    throw new CalendarConflictError("Scheduling conflict detected.", {
      conflicts: warningState.conflicts
    });
  }
  if (!params.allowOutsideBusinessHoursOverride && warningState.outsideBusinessHours) {
    throw new CalendarConflictError("Activity falls outside business hours.", {
      conflicts: warningState.conflicts,
      outsideBusinessHours: true
    });
  }

  return prisma.activityInstance.create({
    data: {
      facilityId: params.facilityId,
      templateId: params.templateId ?? null,
      seriesId: params.seriesId ?? null,
      occurrenceKey: params.occurrenceKey ?? null,
      isOverride: Boolean(params.isOverride),
      conflictOverride: Boolean(params.allowConflictOverride || params.allowOutsideBusinessHoursOverride),
      title: params.title,
      startAt: params.startAt,
      endAt: params.endAt,
      location,
      checklist: normalizeChecklist(params.checklist),
      adaptationsEnabled: normalizeAdaptations(params.adaptationsEnabled)
    }
  });
}

export async function updateActivityWithChecks(params: {
  activityId: string;
  facilityId: string;
  title?: string;
  startAt?: Date;
  endAt?: Date;
  location?: string | null;
  checklist?: JsonLike;
  adaptationsEnabled?: JsonLike;
  forceInstanceOverride?: boolean;
  allowConflictOverride?: boolean;
  allowOutsideBusinessHoursOverride?: boolean;
}) {
  const existing = await prisma.activityInstance.findFirst({
    where: {
      id: params.activityId,
      facilityId: params.facilityId
    }
  });
  if (!existing) {
    throw new Error("Activity not found.");
  }

  const nextStartAt = params.startAt ?? existing.startAt;
  const nextEndAt = params.endAt ?? existing.endAt;
  const nextLocation = normalizeLocation(params.location ?? existing.location);
  ensureValidRange(nextStartAt, nextEndAt);

  const warningState = await evaluateWarnings({
    facilityId: params.facilityId,
    startAt: nextStartAt,
    endAt: nextEndAt,
    location: nextLocation,
    excludeActivityId: existing.id
  });

  if (!params.allowConflictOverride && warningState.conflicts.length > 0) {
    throw new CalendarConflictError("Scheduling conflict detected.", {
      conflicts: warningState.conflicts
    });
  }
  if (!params.allowOutsideBusinessHoursOverride && warningState.outsideBusinessHours) {
    throw new CalendarConflictError("Activity falls outside business hours.", {
      conflicts: warningState.conflicts,
      outsideBusinessHours: true
    });
  }

  return prisma.activityInstance.update({
    where: { id: existing.id },
    data: {
      title: params.title ?? existing.title,
      startAt: nextStartAt,
      endAt: nextEndAt,
      location: nextLocation,
      checklist:
        params.checklist === undefined ? normalizeJsonForRequired(existing.checklist) : normalizeChecklist(params.checklist),
      adaptationsEnabled:
        params.adaptationsEnabled === undefined
          ? normalizeJsonForRequired(existing.adaptationsEnabled)
          : normalizeAdaptations(params.adaptationsEnabled),
      isOverride: params.forceInstanceOverride || existing.isOverride,
      conflictOverride: Boolean(
        params.allowConflictOverride || params.allowOutsideBusinessHoursOverride || existing.conflictOverride
      )
    }
  });
}

export async function moveActivityWithChecks(params: {
  activityId: string;
  facilityId: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  allowConflictOverride?: boolean;
  allowOutsideBusinessHoursOverride?: boolean;
}) {
  return updateActivityWithChecks({
    activityId: params.activityId,
    facilityId: params.facilityId,
    startAt: params.startAt,
    endAt: params.endAt,
    location: params.location,
    forceInstanceOverride: true,
    allowConflictOverride: params.allowConflictOverride,
    allowOutsideBusinessHoursOverride: params.allowOutsideBusinessHoursOverride
  });
}

export async function createSeriesWithChecks(params: {
  facilityId: string;
  title: string;
  location?: string | null;
  templateId?: string | null;
  dtstart: Date;
  durationMin: number;
  rrule: string;
  until?: Date | null;
  timezone?: string;
  checklist?: JsonLike;
  adaptations?: JsonLike;
  exdates?: string[];
  allowConflictOverride?: boolean;
  allowOutsideBusinessHoursOverride?: boolean;
  materializeHorizonDays?: number;
}) {
  if (!Number.isFinite(params.durationMin) || params.durationMin <= 0) {
    throw new Error("Duration must be a positive number of minutes.");
  }

  const firstOccurrenceEnd = new Date(params.dtstart.getTime() + params.durationMin * 60_000);
  ensureValidRange(params.dtstart, firstOccurrenceEnd);

  const warningState = await evaluateWarnings({
    facilityId: params.facilityId,
    startAt: params.dtstart,
    endAt: firstOccurrenceEnd,
    location: params.location
  });

  if (!params.allowConflictOverride && warningState.conflicts.length > 0) {
    throw new CalendarConflictError("Series start conflicts with existing activity.", {
      conflicts: warningState.conflicts
    });
  }
  if (!params.allowOutsideBusinessHoursOverride && warningState.outsideBusinessHours) {
    throw new CalendarConflictError("Series start is outside business hours.", {
      conflicts: warningState.conflicts,
      outsideBusinessHours: true
    });
  }

  const series = await prisma.activitySeries.create({
    data: {
      facilityId: params.facilityId,
      title: params.title,
      location: normalizeLocation(params.location),
      templateId: params.templateId ?? null,
      dtstart: params.dtstart,
      durationMin: Math.floor(params.durationMin),
      rrule: params.rrule,
      until: params.until ?? null,
      timezone: params.timezone || "America/Chicago",
      checklist: normalizeChecklist(params.checklist),
      adaptations: normalizeAdaptations(params.adaptations),
      exdates: params.exdates ?? []
    }
  });

  const rangeStart = startOfDay(series.dtstart);
  const rangeEnd = addDays(rangeStart, params.materializeHorizonDays ?? DEFAULT_MATERIALIZATION_HORIZON_DAYS);
  const materialized = await materializeSingleSeriesWindow({
    series: {
      id: series.id,
      facilityId: series.facilityId,
      templateId: series.templateId,
      title: series.title,
      location: series.location,
      dtstart: series.dtstart,
      durationMin: series.durationMin,
      rrule: series.rrule,
      until: series.until,
      checklist: series.checklist,
      adaptations: series.adaptations,
      exdates: series.exdates
    },
    rangeStart,
    rangeEnd
  });

  return {
    series,
    materialized
  };
}

export async function updateSeriesAndRefresh(params: {
  seriesId: string;
  facilityId: string;
  data: {
    title?: string;
    location?: string | null;
    templateId?: string | null;
    dtstart?: Date;
    durationMin?: number;
    rrule?: string;
    until?: Date | null;
    timezone?: string;
    checklist?: JsonLike;
    adaptations?: JsonLike;
  };
  fromDate?: Date;
  materializeHorizonDays?: number;
}) {
  const existing = await prisma.activitySeries.findFirst({
    where: {
      id: params.seriesId,
      facilityId: params.facilityId
    }
  });

  if (!existing) {
    throw new Error("Activity series not found.");
  }

  const updated = await prisma.activitySeries.update({
    where: { id: existing.id },
    data: {
      title: params.data.title ?? existing.title,
      location: params.data.location === undefined ? existing.location : normalizeLocation(params.data.location),
      templateId: params.data.templateId === undefined ? existing.templateId : params.data.templateId,
      dtstart: params.data.dtstart ?? existing.dtstart,
      durationMin: params.data.durationMin ?? existing.durationMin,
      rrule: params.data.rrule ?? existing.rrule,
      until: params.data.until === undefined ? existing.until : params.data.until,
      timezone: params.data.timezone ?? existing.timezone,
      checklist:
        params.data.checklist === undefined
          ? normalizeJsonForNullable(existing.checklist)
          : normalizeJsonForNullable(params.data.checklist),
      adaptations:
        params.data.adaptations === undefined
          ? normalizeJsonForNullable(existing.adaptations)
          : normalizeJsonForNullable(params.data.adaptations)
    }
  });

  const rangeStart = params.fromDate ?? startOfDay(updated.dtstart);
  const rangeEnd = addDays(rangeStart, params.materializeHorizonDays ?? DEFAULT_MATERIALIZATION_HORIZON_DAYS);
  const materialized = await materializeSingleSeriesWindow({
    series: {
      id: updated.id,
      facilityId: updated.facilityId,
      templateId: updated.templateId,
      title: updated.title,
      location: updated.location,
      dtstart: updated.dtstart,
      durationMin: updated.durationMin,
      rrule: updated.rrule,
      until: updated.until,
      checklist: updated.checklist,
      adaptations: updated.adaptations,
      exdates: updated.exdates
    },
    rangeStart,
    rangeEnd
  });

  return {
    series: updated,
    materialized
  };
}

export async function addSeriesExdate(params: {
  seriesId: string;
  facilityId: string;
  occurrenceStartAt: Date;
}) {
  const series = await prisma.activitySeries.findFirst({
    where: {
      id: params.seriesId,
      facilityId: params.facilityId
    }
  });
  if (!series) {
    throw new Error("Activity series not found.");
  }

  const occurrenceKey = makeOccurrenceKey(params.occurrenceStartAt);
  const existingExdates = normalizeExdates(series.exdates);
  const nextExdates = Array.from(new Set([...existingExdates, occurrenceKey]));

  const updatedSeries = await prisma.activitySeries.update({
    where: { id: series.id },
    data: { exdates: nextExdates }
  });

  await prisma.activityInstance.deleteMany({
    where: {
      seriesId: series.id,
      occurrenceKey,
      isOverride: false
    }
  });

  return {
    series: updatedSeries,
    occurrenceKey
  };
}
