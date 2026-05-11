import { AttendanceStatus, BarrierReason, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { compareResidentsByRoom } from "@/lib/resident-status";
import {
  endOfZonedDay,
  endOfZonedWeek,
  formatInTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedMonthShift,
  startOfZonedWeek,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";
import { fromAttendanceRecord, type QuickAttendanceStatus, toAttendanceRecord } from "@/lib/attendance-tracker/status";
import { formatStateReadySummary } from "@/lib/attendance-tracker/calculations";
import type {
  AttendanceTrackerRangeSummary,
  AttendanceTrackerSummary,
  AttendanceQuickResident,
  AttendanceQuickTakePayload,
  AttendanceTrackerActivityCount,
  AttendanceTrackerRecentOneToOneVisit,
  AttendanceTrackerReportRow,
  AttendanceTrackerReportSummary,
  AttendanceTrackerResidentParticipationRow,
  AttendanceSessionDetail,
  AttendanceSessionSummary,
  MonthlyAttendanceReportPayload,
  SessionSummaryCounts
} from "@/lib/attendance-tracker/types";

const INACTIVE_RESIDENT_STATUSES = ["DISCHARGED", "TRANSFERRED", "DECEASED"] as const;
const PARTICIPATION_STATUSES = [AttendanceStatus.PRESENT, AttendanceStatus.ACTIVE, AttendanceStatus.LEADING] as const;
const PARTICIPATION_STATUS_SET = new Set<AttendanceStatus>(PARTICIPATION_STATUSES);
const ONE_TO_ONE_ACTIVITY_TITLE = "1:1 Visits";
const ONE_TO_ONE_START_MINUTES = 12 * 60;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

type AttendanceTrackerRow = {
  id: string;
  residentId: string;
  status: AttendanceStatus;
  barrierReason: BarrierReason | null;
  notes: string | null;
  createdAt: Date;
  activityInstance: {
    id: string;
    title: string;
    startAt: Date;
    endAt: Date;
    location: string;
    adaptationsEnabled: Prisma.JsonValue;
  };
  resident: {
    id: string;
    firstName: string;
    lastName: string;
    room: string;
  };
};

function activeResidentWhere(facilityId: string): Prisma.ResidentWhereInput {
  return {
    facilityId,
    NOT: {
      status: { in: [...INACTIVE_RESIDENT_STATUSES] }
    }
  };
}

function parseDateKey(input: string | null | undefined, timeZone: string) {
  if (!input) {
    return startOfZonedDay(new Date(), timeZone);
  }
  const parsed = zonedDateStringToUtcStart(input, timeZone);
  return parsed ?? startOfZonedDay(new Date(), timeZone);
}

function timeToMinutes(input: string | null | undefined, fallbackMinutes: number) {
  const match = input?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallbackMinutes;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallbackMinutes;
  }
  return hours * 60 + minutes;
}

function defaultCounts(): SessionSummaryCounts {
  return {
    present: 0,
    refused: 0,
    asleep: 0,
    outOfRoom: 0,
    oneToOne: 0,
    notApplicable: 0,
    totalEntries: 0
  };
}

function percent(participatedResidentCount: number, activeResidentCount: number) {
  if (activeResidentCount <= 0) return 0;
  return Number(((participatedResidentCount / activeResidentCount) * 100).toFixed(1));
}

function isWithinRange(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function isOneToOneRow(row: AttendanceTrackerRow) {
  return row.status === AttendanceStatus.ACTIVE || row.activityInstance.title.toLowerCase().includes("1:1");
}

function rowActivityType(row: AttendanceTrackerRow): "Group" | "1:1" {
  return isOneToOneRow(row) ? "1:1" : "Group";
}

function rowSimpleStatus(row: Pick<AttendanceTrackerRow, "status">): "Attended" | "Declined" | "Unavailable" {
  if (row.status === AttendanceStatus.REFUSED) return "Declined";
  if (row.status === AttendanceStatus.NO_SHOW) return "Unavailable";
  return "Attended";
}

function isParticipationStatus(status: AttendanceStatus) {
  return PARTICIPATION_STATUS_SET.has(status);
}

function activityProvidedFromRow(row: AttendanceTrackerRow) {
  const metadata = row.activityInstance.adaptationsEnabled;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "activityProvided" in metadata) {
    const value = (metadata as { activityProvided?: unknown }).activityProvided;
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return row.activityInstance.title.replace(/^1:1\s*[-:]\s*/i, "").trim() || "1:1 Visit";
}

function durationLabelFromRow(row: AttendanceTrackerRow) {
  const metadata = row.activityInstance.adaptationsEnabled;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "durationMinutes" in metadata) {
    const value = Number((metadata as { durationMinutes?: unknown }).durationMinutes);
    if (Number.isFinite(value) && value > 0) return `${value} min`;
  }

  const minutes = Math.max(1, Math.round((row.activityInstance.endAt.getTime() - row.activityInstance.startAt.getTime()) / 60000));
  return `${minutes} min`;
}

function formatReportDate(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function summarizeTrackerRange(params: {
  rows: AttendanceTrackerRow[];
  activeResidentIds: Set<string>;
  start: Date;
  end: Date;
  timeZone: string;
}): AttendanceTrackerRangeSummary {
  const participatedResidentIds = new Set<string>();
  let groupAttendanceCount = 0;
  let oneToOneVisitCount = 0;
  let totalParticipationMarks = 0;

  for (const row of params.rows) {
    if (!params.activeResidentIds.has(row.residentId)) continue;
    if (!isWithinRange(row.activityInstance.startAt, params.start, params.end)) continue;
    if (!PARTICIPATION_STATUS_SET.has(row.status)) continue;

    participatedResidentIds.add(row.residentId);
    totalParticipationMarks += 1;

    if (row.status === AttendanceStatus.PRESENT) {
      groupAttendanceCount += 1;
    }

    if (row.status === AttendanceStatus.ACTIVE) {
      oneToOneVisitCount += 1;
    }
  }

  return {
    startDateKey: zonedDateKey(params.start, params.timeZone),
    endDateKey: zonedDateKey(params.end, params.timeZone),
    participationPercent: percent(participatedResidentIds.size, params.activeResidentIds.size),
    participatedResidentCount: participatedResidentIds.size,
    activeResidentCount: params.activeResidentIds.size,
    groupAttendanceCount,
    oneToOneVisitCount,
    totalParticipationMarks
  };
}

function participationResidentIdsForRange(params: {
  rows: AttendanceTrackerRow[];
  activeResidentIds: Set<string>;
  start: Date;
  end: Date;
}) {
  const residentIds = new Set<string>();
  for (const row of params.rows) {
    if (!params.activeResidentIds.has(row.residentId)) continue;
    if (!isWithinRange(row.activityInstance.startAt, params.start, params.end)) continue;
    if (!PARTICIPATION_STATUS_SET.has(row.status)) continue;
    residentIds.add(row.residentId);
  }
  return residentIds;
}

function countDeclined(rows: AttendanceTrackerRow[], start: Date, end: Date) {
  return rows.filter((row) => isWithinRange(row.activityInstance.startAt, start, end) && row.status === AttendanceStatus.REFUSED).length;
}

function countUnavailable(rows: AttendanceTrackerRow[], start: Date, end: Date) {
  return rows.filter((row) => isWithinRange(row.activityInstance.startAt, start, end) && row.status === AttendanceStatus.NO_SHOW).length;
}

function groupSessionCount(rows: AttendanceTrackerRow[], start: Date, end: Date) {
  return new Set(
    rows
      .filter((row) => isWithinRange(row.activityInstance.startAt, start, end) && rowActivityType(row) === "Group")
      .map((row) => row.activityInstance.id)
  ).size;
}

function buildReportSummary(params: {
  title: string;
  dateRangeLabel: string;
  generatedLabel: string;
  range: AttendanceTrackerRangeSummary;
  rows: AttendanceTrackerRow[];
  start: Date;
  end: Date;
  notSeenResidentCount: number;
}): AttendanceTrackerReportSummary {
  return {
    title: params.title,
    dateRangeLabel: params.dateRangeLabel,
    generatedLabel: params.generatedLabel,
    totalActiveResidents: params.range.activeResidentCount,
    participatedResidentCount: params.range.participatedResidentCount,
    notSeenResidentCount: params.notSeenResidentCount,
    participationPercent: params.range.participationPercent,
    groupCheckIns: params.range.groupAttendanceCount,
    oneToOneVisits: params.range.oneToOneVisitCount,
    declined: countDeclined(params.rows, params.start, params.end),
    unavailable: countUnavailable(params.rows, params.start, params.end),
    groupSessionCount: groupSessionCount(params.rows, params.start, params.end)
  };
}

function buildReportRows(rows: AttendanceTrackerRow[], start: Date, end: Date, timeZone: string): AttendanceTrackerReportRow[] {
  return rows
    .filter((row) => isWithinRange(row.activityInstance.startAt, start, end))
    .map((row) => ({
      id: row.id,
      residentName: `${row.resident.firstName} ${row.resident.lastName}`.trim(),
      room: row.resident.room,
      activityName: row.activityInstance.title,
      activityType: rowActivityType(row),
      status: rowSimpleStatus(row),
      dateLabel: formatInTimeZone(row.activityInstance.startAt, timeZone, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    }))
    .sort((a, b) => a.residentName.localeCompare(b.residentName));
}

function buildResidentParticipationRows(params: {
  residents: AttendanceQuickResident[];
  rows: AttendanceTrackerRow[];
  monthStart: Date;
  monthEnd: Date;
  timeZone: string;
}): AttendanceTrackerResidentParticipationRow[] {
  return params.residents.map((resident) => {
    const residentRows = params.rows.filter(
      (row) =>
        row.residentId === resident.id &&
        isWithinRange(row.activityInstance.startAt, params.monthStart, params.monthEnd) &&
        isParticipationStatus(row.status)
    );

    const groupCheckIns = residentRows.filter((row) => rowActivityType(row) === "Group" && row.status === AttendanceStatus.PRESENT).length;
    const oneToOneVisits = residentRows.filter((row) => rowActivityType(row) === "1:1" && row.status === AttendanceStatus.ACTIVE).length;
    const lastParticipated = residentRows.sort((a, b) => b.activityInstance.startAt.getTime() - a.activityInstance.startAt.getTime())[0];

    return {
      residentId: resident.id,
      residentName: `${resident.firstName} ${resident.lastName}`.trim(),
      room: resident.room,
      participatedThisMonth: residentRows.length > 0,
      groupCheckIns,
      oneToOneVisits,
      lastParticipatedLabel: lastParticipated ? formatReportDate(lastParticipated.activityInstance.startAt, params.timeZone) : null
    };
  });
}

function buildMostAttendedActivities(rows: AttendanceTrackerRow[]): AttendanceTrackerActivityCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (rowActivityType(row) !== "Group" || row.status !== AttendanceStatus.PRESENT) continue;
    counts.set(row.activityInstance.title, (counts.get(row.activityInstance.title) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([activityName, count]) => ({ activityName, count }))
    .sort((a, b) => b.count - a.count || a.activityName.localeCompare(b.activityName))
    .slice(0, 5);
}

function countFromAttendanceRows(
  rows: Array<{
    status: AttendanceStatus;
    barrierReason: BarrierReason | null;
    notes: string | null;
  }>
) {
  const counts = defaultCounts();
  let hasNotes = false;

  for (const row of rows) {
    const quick = fromAttendanceRecord({
      status: row.status,
      barrierReason: row.barrierReason,
      notes: row.notes
    });

    if (row.notes?.trim()) {
      hasNotes = true;
    }

    if (quick === "PRESENT") counts.present += 1;
    if (quick === "REFUSED") counts.refused += 1;
    if (quick === "ASLEEP") counts.asleep += 1;
    if (quick === "OUT_OF_ROOM") counts.outOfRoom += 1;
    if (quick === "ONE_TO_ONE") counts.oneToOne += 1;
    if (quick === "NOT_APPLICABLE") counts.notApplicable += 1;
  }

  counts.totalEntries =
    counts.present + counts.refused + counts.asleep + counts.outOfRoom + counts.oneToOne + counts.notApplicable;

  return { counts, hasNotes };
}

export async function getAttendanceResidents(facilityId: string): Promise<AttendanceQuickResident[]> {
  const rows = await prisma.resident.findMany({
    where: activeResidentWhere(facilityId),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true,
      unit: {
        select: {
          name: true
        }
      }
    },
    orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
  });

  return rows
    .map((resident) => ({
      id: resident.id,
      firstName: resident.firstName,
      lastName: resident.lastName,
      room: resident.room,
      unitName: resident.unit?.name ?? null,
      residentStatus: resident.status
    }))
    .sort(compareResidentsByRoom);
}

export async function getAttendanceSessionsForDay(params: {
  facilityId: string;
  timeZone: string;
  dateKey?: string | null;
}) {
  const dayStart = parseDateKey(params.dateKey, params.timeZone);
  const dayEnd = endOfZonedDay(dayStart, params.timeZone);
  const dateKey = zonedDateKey(dayStart, params.timeZone);

  const sessions = await prisma.activityInstance.findMany({
    where: {
      facilityId: params.facilityId,
      startAt: {
        gte: dayStart,
        lte: dayEnd
      }
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      location: true,
      createdAt: true,
      attendance: {
        select: {
          status: true,
          barrierReason: true,
          notes: true
        }
      }
    }
  });

  const activeResidentCount = await prisma.resident.count({
    where: activeResidentWhere(params.facilityId)
  });

  const summaries: AttendanceSessionSummary[] = sessions.map((session) => {
    const { counts, hasNotes } = countFromAttendanceRows(session.attendance);
    const completionPercent = activeResidentCount > 0 ? Number(((counts.totalEntries / activeResidentCount) * 100).toFixed(1)) : 0;

    return {
      id: session.id,
      title: session.title,
      dateKey: zonedDateKey(session.startAt, params.timeZone),
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      location: session.location,
      counts,
      completionPercent,
      hasNotes,
      updatedAt: session.createdAt.toISOString()
    };
  });

  return {
    dateKey,
    sessions: summaries
  };
}

export async function getAttendanceSessionDetail(params: {
  facilityId: string;
  sessionId: string;
  timeZone: string;
}): Promise<AttendanceSessionDetail | null> {
  const [session, residents] = await Promise.all([
    prisma.activityInstance.findFirst({
      where: {
        id: params.sessionId,
        facilityId: params.facilityId
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        createdAt: true,
        attendance: {
          select: {
            residentId: true,
            status: true,
            barrierReason: true,
            notes: true
          }
        }
      }
    }),
    getAttendanceResidents(params.facilityId)
  ]);

  if (!session) return null;

  const { counts, hasNotes } = countFromAttendanceRows(session.attendance);
  const completionPercent = residents.length > 0 ? Number(((counts.totalEntries / residents.length) * 100).toFixed(1)) : 0;

  const entriesByResidentId: Record<string, { status: QuickAttendanceStatus; notes: string | null }> = {};
  for (const row of session.attendance) {
    entriesByResidentId[row.residentId] = {
      status: fromAttendanceRecord({
        status: row.status,
        barrierReason: row.barrierReason,
        notes: row.notes
      }),
      notes: row.notes ?? null
    };
  }

  return {
    session: {
      id: session.id,
      title: session.title,
      dateKey: zonedDateKey(session.startAt, params.timeZone),
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      location: session.location,
      counts,
      completionPercent,
      hasNotes,
      updatedAt: session.createdAt.toISOString()
    },
    residents,
    entriesByResidentId
  };
}

export async function getAttendanceQuickTakePayload(params: {
  facilityId: string;
  timeZone: string;
  dateKey?: string | null;
  sessionId?: string | null;
}): Promise<AttendanceQuickTakePayload> {
  const [residents, sessionsPayload] = await Promise.all([
    getAttendanceResidents(params.facilityId),
    getAttendanceSessionsForDay({
      facilityId: params.facilityId,
      timeZone: params.timeZone,
      dateKey: params.dateKey
    })
  ]);

  const sessions = sessionsPayload.sessions;
  const selectedSessionId = params.sessionId && sessions.some((session) => session.id === params.sessionId)
    ? params.sessionId
    : sessions.find((session) => session.title !== ONE_TO_ONE_ACTIVITY_TITLE)?.id ?? sessions[0]?.id ?? null;

  const detail = selectedSessionId
    ? await getAttendanceSessionDetail({
        facilityId: params.facilityId,
        sessionId: selectedSessionId,
        timeZone: params.timeZone
      })
    : null;

  return {
    dateKey: sessionsPayload.dateKey,
    sessions,
    selectedSessionId,
    residents,
    entriesByResidentId: detail?.entriesByResidentId ?? {}
  };
}

function getAttendanceQuickTakeCacheKey(params: {
  facilityId: string;
  timeZone: string;
  dateKey?: string | null;
  sessionId?: string | null;
}) {
  const parsed = parseDateKey(params.dateKey, params.timeZone);
  const normalizedDateKey = zonedDateKey(parsed, params.timeZone);
  return {
    normalizedDateKey,
    cacheSessionId: params.sessionId ?? "default"
  };
}

export function getAttendanceQuickTakeCacheTag(facilityId: string, dateKey?: string) {
  if (dateKey) {
    return `attendance:quick-take:${facilityId}:${dateKey}`;
  }
  return `attendance:quick-take:${facilityId}`;
}

export async function getAttendanceQuickTakePayloadCached(params: {
  facilityId: string;
  timeZone: string;
  dateKey?: string | null;
  sessionId?: string | null;
}) {
  const { normalizedDateKey, cacheSessionId } = getAttendanceQuickTakeCacheKey(params);
  const loadCached = unstable_cache(
    async () =>
      getAttendanceQuickTakePayload({
        facilityId: params.facilityId,
        timeZone: params.timeZone,
        dateKey: normalizedDateKey,
        sessionId: params.sessionId
      }),
    ["attendance-quick-take-v1", params.facilityId, normalizedDateKey, cacheSessionId],
    {
      revalidate: 20,
      tags: [
        getAttendanceQuickTakeCacheTag(params.facilityId),
        getAttendanceQuickTakeCacheTag(params.facilityId, normalizedDateKey)
      ]
    }
  );
  return loadCached();
}

export async function saveAttendanceBatch(params: {
  facilityId: string;
  sessionId: string;
  actorUserId: string;
  entries: Array<{
    residentId: string;
    status: QuickAttendanceStatus;
    notes?: string | null;
  }>;
}) {
  const dedupedEntries = Array.from(
    new Map(params.entries.map((entry) => [entry.residentId, entry])).values()
  );

  const session = await prisma.activityInstance.findFirst({
    where: {
      id: params.sessionId,
      facilityId: params.facilityId
    },
    select: {
      id: true
    }
  });

  if (!session) {
    throw new Error("Attendance session not found.");
  }

  const residentIds = Array.from(new Set(dedupedEntries.map((entry) => entry.residentId)));
  const [validResidents, existingRows] = await Promise.all([
    prisma.resident.findMany({
      where: {
        facilityId: params.facilityId,
        id: { in: residentIds }
      },
      select: {
        id: true,
        status: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstanceId: params.sessionId,
        residentId: { in: residentIds }
      },
      select: {
        id: true,
        residentId: true,
        status: true,
        barrierReason: true,
        notes: true
      }
    })
  ]);

  const residentStatusById = new Map(validResidents.map((resident) => [resident.id, resident.status]));
  const existingByResidentId = new Map(existingRows.map((row) => [row.residentId, row]));

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let unchanged = 0;

  const writes: Prisma.PrismaPromise<unknown>[] = [];
  for (const entry of dedupedEntries) {
    if (!residentStatusById.has(entry.residentId)) continue;

    const normalized = toAttendanceRecord({
      quickStatus: entry.status,
      residentStatus: residentStatusById.get(entry.residentId),
      notes: entry.notes
    });
    const existing = existingByResidentId.get(entry.residentId);

    if (normalized.clear) {
      if (existing) {
        writes.push(
          prisma.attendance.delete({
            where: { id: existing.id }
          })
        );
        deleted += 1;
      } else {
        unchanged += 1;
      }
      continue;
    }

    const nextStatus = normalized.status as AttendanceStatus;
    const nextBarrier = (normalized.barrierReason ?? null) as BarrierReason | null;
    const nextNotes = normalized.notes ?? null;

    if (!existing) {
      writes.push(
        prisma.attendance.create({
          data: {
            activityInstanceId: params.sessionId,
            residentId: entry.residentId,
            status: nextStatus,
            barrierReason: nextBarrier,
            notes: nextNotes
          }
        })
      );
      created += 1;
      continue;
    }

    if (existing.status === nextStatus && existing.barrierReason === nextBarrier && (existing.notes ?? null) === nextNotes) {
      unchanged += 1;
      continue;
    }

    writes.push(
      prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          barrierReason: nextBarrier,
          notes: nextNotes
        }
      })
    );
    updated += 1;
  }

  const chunkSize = 40;
  for (let index = 0; index < writes.length; index += chunkSize) {
    const chunk = writes.slice(index, index + chunkSize);
    await prisma.$transaction(chunk);
  }

  return {
    created,
    updated,
    deleted,
    unchanged
  };
}

export async function saveSimpleGroupAttendance(params: {
  facilityId: string;
  actorUserId: string;
  timeZone: string;
  sessionId?: string | null;
  activityName: string;
  dateKey: string;
  time?: string | null;
  activityType: "Group" | "1:1";
  location?: string | null;
  entries: Array<{
    residentId: string;
    status: QuickAttendanceStatus;
    notes?: string | null;
  }>;
}) {
  const title = params.activityName.trim();
  if (!title) {
    throw new Error("Please enter an activity name.");
  }

  const dayStart = parseDateKey(params.dateKey, params.timeZone);
  const startMinutes = timeToMinutes(params.time, 10 * 60);
  const startAt = new Date(dayStart.getTime() + startMinutes * 60 * 1000);
  const endAt = new Date(startAt.getTime() + THIRTY_MINUTES_MS);

  const sessionId =
    params.sessionId ??
    (
      await prisma.activityInstance.create({
        data: {
          facilityId: params.facilityId,
          title,
          startAt,
          endAt,
          location: params.location?.trim() || "Activity room",
          adaptationsEnabled: {
            source: "attendance-tracker",
            type: params.activityType
          },
          checklist: [],
          isOverride: true
        },
        select: {
          id: true
        }
      })
    ).id;

  if (params.sessionId) {
    await prisma.activityInstance.updateMany({
      where: {
        id: params.sessionId,
        facilityId: params.facilityId
      },
      data: {
        title,
        startAt,
        endAt,
        location: params.location?.trim() || "Activity room",
        adaptationsEnabled: {
          source: "attendance-tracker",
          type: params.activityType
        },
        isOverride: true
      }
    });
  }

  const result = await saveAttendanceBatch({
    facilityId: params.facilityId,
    sessionId,
    actorUserId: params.actorUserId,
    entries: params.entries
  });

  return {
    sessionId,
    result
  };
}

export async function getAttendanceTrackerSummary(params: {
  facilityId: string;
  timeZone: string;
  dateKey?: string | null;
}): Promise<AttendanceTrackerSummary> {
  const dayStart = parseDateKey(params.dateKey, params.timeZone);
  const dayEnd = endOfZonedDay(dayStart, params.timeZone);
  const weekStart = startOfZonedWeek(dayStart, params.timeZone, 0);
  const weekEnd = endOfZonedWeek(dayStart, params.timeZone, 0);
  const monthStart = startOfZonedMonth(dayStart, params.timeZone);
  const monthEnd = new Date(startOfZonedMonthShift(dayStart, params.timeZone, 1).getTime() - 1);
  const queryStart = new Date(Math.min(dayStart.getTime(), weekStart.getTime(), monthStart.getTime()));
  const queryEnd = new Date(Math.max(dayEnd.getTime(), weekEnd.getTime(), monthEnd.getTime()));

  const [residents, rows] = await Promise.all([
    getAttendanceResidents(params.facilityId),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: params.facilityId,
          startAt: {
            gte: queryStart,
            lte: queryEnd
          }
        }
      },
      select: {
        id: true,
        residentId: true,
        status: true,
        barrierReason: true,
        notes: true,
        createdAt: true,
        activityInstance: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            location: true,
            adaptationsEnabled: true
          }
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true
          }
        }
      }
    })
  ]);

  const activeResidentIds = new Set(residents.map((resident) => resident.id));
  const weeklyParticipantIds = participationResidentIdsForRange({
    rows,
    activeResidentIds,
    start: weekStart,
    end: weekEnd
  });
  const monthlyParticipantIds = participationResidentIdsForRange({
    rows,
    activeResidentIds,
    start: monthStart,
    end: monthEnd
  });
  const notSeenResidentIds = residents.filter((resident) => !weeklyParticipantIds.has(resident.id)).map((resident) => resident.id);

  const lastParticipationRows = notSeenResidentIds.length
    ? await prisma.attendance.findMany({
        where: {
          residentId: { in: notSeenResidentIds },
          status: { in: [...PARTICIPATION_STATUSES] },
          activityInstance: {
            facilityId: params.facilityId,
            startAt: {
              lt: weekStart
            }
          }
        },
        orderBy: {
          activityInstance: {
            startAt: "desc"
          }
        },
        take: Math.max(50, notSeenResidentIds.length * 3),
        select: {
          residentId: true,
          activityInstance: {
            select: {
              startAt: true
            }
          }
        }
      })
    : [];

  const lastParticipationByResidentId = new Map<string, Date>();
  for (const row of lastParticipationRows) {
    if (!lastParticipationByResidentId.has(row.residentId)) {
      lastParticipationByResidentId.set(row.residentId, row.activityInstance.startAt);
    }
  }

  const residentsNotSeenThisWeek = residents
    .filter((resident) => !weeklyParticipantIds.has(resident.id))
    .map((resident) => ({
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName}`.trim(),
      room: resident.room,
      unitName: resident.unitName,
      lastParticipatedLabel: lastParticipationByResidentId.has(resident.id)
        ? formatReportDate(lastParticipationByResidentId.get(resident.id) as Date, params.timeZone)
        : null,
      recommendedAction: "Offer 1:1 visit"
    }));

  const residentsNotSeenThisMonth = residents
    .filter((resident) => !monthlyParticipantIds.has(resident.id))
    .map((resident) => ({
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName}`.trim(),
      room: resident.room,
      unitName: resident.unitName,
      lastParticipatedLabel: null,
      recommendedAction: "Follow up this month"
    }));

  const daily = summarizeTrackerRange({
    rows,
    activeResidentIds,
    start: dayStart,
    end: dayEnd,
    timeZone: params.timeZone
  });
  const weekly = summarizeTrackerRange({
    rows,
    activeResidentIds,
    start: weekStart,
    end: weekEnd,
    timeZone: params.timeZone
  });
  const monthly = summarizeTrackerRange({
    rows,
    activeResidentIds,
    start: monthStart,
    end: monthEnd,
    timeZone: params.timeZone
  });

  const dayLabel = formatInTimeZone(dayStart, params.timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const weekLabel = `${formatInTimeZone(weekStart, params.timeZone, { month: "short", day: "numeric" })} - ${formatInTimeZone(
    weekEnd,
    params.timeZone,
    { month: "short", day: "numeric", year: "numeric" }
  )}`;
  const monthLabel = formatInTimeZone(monthStart, params.timeZone, {
    month: "long",
    year: "numeric"
  });
  const generatedLabel = formatInTimeZone(new Date(), params.timeZone, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const recentOneToOneVisits: AttendanceTrackerRecentOneToOneVisit[] = rows
    .filter((row) => rowActivityType(row) === "1:1")
    .sort((a, b) => b.activityInstance.startAt.getTime() - a.activityInstance.startAt.getTime())
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      dateLabel: formatInTimeZone(row.activityInstance.startAt, params.timeZone, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }),
      residentName: `${row.resident.firstName} ${row.resident.lastName}`.trim(),
      room: row.resident.room,
      activityProvided: activityProvidedFromRow(row),
      durationLabel: durationLabelFromRow(row),
      completed: row.status === AttendanceStatus.ACTIVE
    }));

  const monthlyRows = rows.filter((row) => isWithinRange(row.activityInstance.startAt, monthStart, monthEnd));
  const reports = {
    daily: {
      summary: buildReportSummary({
        title: "Daily Attendance Report",
        dateRangeLabel: dayLabel,
        generatedLabel,
        range: daily,
        rows,
        start: dayStart,
        end: dayEnd,
        notSeenResidentCount: activeResidentIds.size - daily.participatedResidentCount
      }),
      rows: buildReportRows(rows, dayStart, dayEnd, params.timeZone)
    },
    weekly: {
      summary: buildReportSummary({
        title: "Weekly Participation Report",
        dateRangeLabel: weekLabel,
        generatedLabel,
        range: weekly,
        rows,
        start: weekStart,
        end: weekEnd,
        notSeenResidentCount: residentsNotSeenThisWeek.length
      }),
      residentsNotSeen: residentsNotSeenThisWeek
    },
    monthly: {
      summary: buildReportSummary({
        title: "Monthly Participation Report",
        dateRangeLabel: monthLabel,
        generatedLabel,
        range: monthly,
        rows,
        start: monthStart,
        end: monthEnd,
        notSeenResidentCount: residentsNotSeenThisMonth.length
      }),
      residentsNotSeen: residentsNotSeenThisMonth,
      residentParticipation: buildResidentParticipationRows({
        residents,
        rows,
        monthStart,
        monthEnd,
        timeZone: params.timeZone
      }),
      mostAttendedActivities: buildMostAttendedActivities(monthlyRows)
    }
  };

  return {
    dateKey: zonedDateKey(dayStart, params.timeZone),
    dayLabel,
    weekLabel,
    monthLabel,
    generatedAt: new Date().toISOString(),
    activeResidentCount: activeResidentIds.size,
    daily,
    weekly,
    monthly,
    residentsNotSeenThisWeek,
    stateReadySummary: formatStateReadySummary(
      {
        totalActiveResidents: activeResidentIds.size,
        weeklyParticipants: weekly.participatedResidentCount,
        weeklyParticipationPercentage: weekly.participationPercent,
        monthlyParticipationPercentage: monthly.participationPercent,
        monthlyGroupCheckIns: monthly.groupAttendanceCount,
        monthlyOneToOneVisits: monthly.oneToOneVisitCount,
        notSeenThisWeek: residentsNotSeenThisWeek.length
      },
      dayLabel
    ),
    recentOneToOneVisits,
    reports
  };
}

export async function logOneToOneVisit(params: {
  facilityId: string;
  residentId: string;
  timeZone: string;
  dateKey?: string | null;
  time?: string | null;
  durationMinutes?: number | null;
  activityProvided?: string | null;
  completed?: boolean | null;
  incompleteStatus?: "Declined" | "Unavailable" | null;
  shortNote?: string | null;
}) {
  const dayStart = parseDateKey(params.dateKey, params.timeZone);
  const nowMinutes = timeToMinutes(params.time, ONE_TO_ONE_START_MINUTES);
  const durationMinutes = Math.max(5, Math.min(240, Number(params.durationMinutes ?? 15) || 15));
  const activityProvided = params.activityProvided?.trim() || "Conversation";
  const completed = params.completed !== false;
  const startAt = new Date(dayStart.getTime() + nowMinutes * 60 * 1000);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const nextStatus = completed
    ? AttendanceStatus.ACTIVE
    : params.incompleteStatus === "Unavailable"
      ? AttendanceStatus.NO_SHOW
      : AttendanceStatus.REFUSED;
  const nextBarrier = completed ? null : params.incompleteStatus === "Unavailable" ? BarrierReason.OTHER : BarrierReason.REFUSED;
  const shortNote = params.shortNote?.trim() ? params.shortNote.trim() : null;

  return prisma.$transaction(async (tx) => {
    const resident = await tx.resident.findFirst({
      where: {
        id: params.residentId,
        ...activeResidentWhere(params.facilityId)
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true
      }
    });

    if (!resident) {
      throw new Error("Resident not found or no longer active.");
    }

    const activity = await tx.activityInstance.create({
      data: {
        facilityId: params.facilityId,
        title: `1:1 - ${activityProvided}`,
        startAt,
        endAt,
        location: `Room ${resident.room}`,
        adaptationsEnabled: {
          source: "attendance-tracker",
          type: "one-to-one",
          activityProvided,
          durationMinutes,
          completed,
          shortNote
        },
        checklist: [],
        isOverride: true
      },
      select: {
        id: true
      }
    });

    const attendance = await tx.attendance.create({
      data: {
        activityInstanceId: activity.id,
        residentId: resident.id,
        status: nextStatus,
        barrierReason: nextBarrier,
        notes: shortNote
      },
      select: {
        id: true,
        activityInstanceId: true,
        residentId: true,
        status: true
      }
    });

    return {
      dateKey: zonedDateKey(dayStart, params.timeZone),
      activityInstanceId: activity.id,
      attendance,
      resident: {
        id: resident.id,
        name: `${resident.firstName} ${resident.lastName}`.trim(),
        room: resident.room
      }
    };
  });
}

export async function getAttendanceSessionsHistory(params: {
  facilityId: string;
  timeZone: string;
  from?: string | null;
  to?: string | null;
  activityQuery?: string | null;
  hasNotes?: boolean;
  location?: string | null;
}) {
  const now = new Date();
  const fallbackTo = endOfZonedDay(now, params.timeZone);
  const fallbackFrom = new Date(fallbackTo.getTime() - 30 * 24 * 60 * 60 * 1000);

  const fromStart = params.from ? zonedDateStringToUtcStart(params.from, params.timeZone) ?? fallbackFrom : fallbackFrom;
  const toStart = params.to ? zonedDateStringToUtcStart(params.to, params.timeZone) ?? fallbackTo : fallbackTo;
  const toEnd = endOfZonedDay(toStart, params.timeZone);

  const sessions = await prisma.activityInstance.findMany({
    where: {
      facilityId: params.facilityId,
      startAt: {
        gte: fromStart,
        lte: toEnd
      },
      ...(params.location && params.location !== "all"
        ? {
            location: {
              equals: params.location,
              mode: "insensitive"
            }
          }
        : {}),
      ...(params.activityQuery
        ? {
            title: {
              contains: params.activityQuery,
              mode: "insensitive"
            }
          }
        : {})
    },
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      location: true,
      createdAt: true,
      attendance: {
        select: {
          status: true,
          barrierReason: true,
          notes: true
        }
      }
    }
  });

  const residentCount = await prisma.resident.count({
    where: activeResidentWhere(params.facilityId)
  });

  const mapped = sessions
    .map((session) => {
      const { counts, hasNotes } = countFromAttendanceRows(session.attendance);
      const completionPercent = residentCount > 0 ? Number(((counts.totalEntries / residentCount) * 100).toFixed(1)) : 0;
      return {
        id: session.id,
        title: session.title,
        dateKey: zonedDateKey(session.startAt, params.timeZone),
        startAt: session.startAt.toISOString(),
        endAt: session.endAt.toISOString(),
        location: session.location,
        counts,
        completionPercent,
        hasNotes,
        updatedAt: session.createdAt.toISOString()
      } as AttendanceSessionSummary;
    })
    .filter((session) => {
      if (params.hasNotes === undefined) return true;
      return params.hasNotes ? session.hasNotes : !session.hasNotes;
    });

  const locations = Array.from(new Set(mapped.map((session) => session.location).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  return {
    sessions: mapped,
    locations
  };
}

export async function getResidentAttendanceSummary(params: {
  facilityId: string;
  residentId: string;
  timeZone: string;
}) {
  const resident = await prisma.resident.findFirst({
    where: {
      id: params.residentId,
      facilityId: params.facilityId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true
    }
  });

  if (!resident) return null;

  const [last30Rows, topActivityRows] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        residentId: resident.id
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 120,
      select: {
        id: true,
        status: true,
        barrierReason: true,
        notes: true,
        createdAt: true,
        activityInstance: {
          select: {
            id: true,
            title: true,
            location: true,
            startAt: true
          }
        }
      }
    }),
    prisma.attendance.groupBy({
      by: ["activityInstanceId"],
      where: {
        residentId: resident.id
      },
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          activityInstanceId: "desc"
        }
      },
      take: 5
    })
  ]);

  const now = new Date();
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const last7 = last30Rows.filter((row) => row.createdAt >= day7);
  const last30 = last30Rows.filter((row) => row.createdAt >= day30);

  function summarize(rows: typeof last30Rows) {
    const totals = defaultCounts();
    for (const row of rows) {
      const quick = fromAttendanceRecord({
        status: row.status,
        barrierReason: row.barrierReason,
        notes: row.notes
      });
      if (quick === "PRESENT") totals.present += 1;
      if (quick === "REFUSED") totals.refused += 1;
      if (quick === "ASLEEP") totals.asleep += 1;
      if (quick === "OUT_OF_ROOM") totals.outOfRoom += 1;
      if (quick === "ONE_TO_ONE") totals.oneToOne += 1;
      if (quick === "NOT_APPLICABLE") totals.notApplicable += 1;
    }
    totals.totalEntries =
      totals.present + totals.refused + totals.asleep + totals.outOfRoom + totals.oneToOne + totals.notApplicable;
    return totals;
  }

  const topActivityIds = topActivityRows.map((row) => row.activityInstanceId).filter(Boolean);
  const activityMap = new Map<string, { title: string; count: number }>();
  if (topActivityIds.length > 0) {
    const activities = await prisma.activityInstance.findMany({
      where: {
        id: { in: topActivityIds as string[] }
      },
      select: {
        id: true,
        title: true
      }
    });
    const activityById = new Map(activities.map((activity) => [activity.id, activity.title]));
    for (const row of topActivityRows) {
      const id = row.activityInstanceId;
      if (!id) continue;
      const title = activityById.get(id) ?? "Unknown activity";
      activityMap.set(id, {
        title,
        count: row._count._all
      });
    }
  }

  const sessions = last30Rows.map((row) => ({
    id: row.id,
    sessionId: row.activityInstance?.id ?? null,
    title: row.activityInstance?.title ?? "Unknown activity",
    location: row.activityInstance?.location ?? "",
    dateLabel: row.activityInstance
      ? formatInTimeZone(row.activityInstance.startAt, params.timeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })
      : formatInTimeZone(row.createdAt, params.timeZone, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }),
    status: fromAttendanceRecord({
      status: row.status,
      barrierReason: row.barrierReason,
      notes: row.notes
    }),
    notes: row.notes ?? null
  }));

  return {
    resident: {
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName}`,
      room: resident.room,
      status: resident.status
    },
    summary7: summarize(last7),
    summary30: summarize(last30),
    topActivities: Array.from(activityMap.values()).sort((a, b) => b.count - a.count),
    sessions
  };
}

export async function getMonthlyAttendanceReport(params: {
  facilityId: string;
  timeZone: string;
  monthStart: Date;
  monthEnd: Date;
}): Promise<MonthlyAttendanceReportPayload> {
  const monthKey = zonedDateKey(params.monthStart, params.timeZone).slice(0, 7);
  const rows = await prisma.attendance.findMany({
    where: {
      activityInstance: {
        facilityId: params.facilityId,
        startAt: {
          gte: params.monthStart,
          lte: params.monthEnd
        }
      }
    },
    select: {
      status: true,
      barrierReason: true,
      notes: true,
      activityInstance: {
        select: {
          id: true,
          title: true,
          startAt: true
        }
      }
    }
  });

  const totals: MonthlyAttendanceReportPayload["totals"] = {
    present: 0,
    refused: 0,
    asleep: 0,
    outOfRoom: 0,
    oneToOne: 0,
    notApplicable: 0
  };

  const dailyMap = new Map<string, number>();
  const sessionMap = new Map<
    string,
    { title: string; dateKey: string; present: number; refused: number; noShowLike: number; oneToOne: number }
  >();

  for (const row of rows) {
    const quick = fromAttendanceRecord({
      status: row.status,
      barrierReason: row.barrierReason,
      notes: row.notes
    });

    if (quick === "PRESENT") totals.present += 1;
    if (quick === "REFUSED") totals.refused += 1;
    if (quick === "ASLEEP") totals.asleep += 1;
    if (quick === "OUT_OF_ROOM") totals.outOfRoom += 1;
    if (quick === "ONE_TO_ONE") totals.oneToOne += 1;
    if (quick === "NOT_APPLICABLE") totals.notApplicable += 1;

    const dateKey = zonedDateKey(row.activityInstance.startAt, params.timeZone);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);

    const sessionKey = row.activityInstance.id;
    const existing = sessionMap.get(sessionKey) ?? {
      title: row.activityInstance.title,
      dateKey,
      present: 0,
      refused: 0,
      noShowLike: 0,
      oneToOne: 0
    };
    if (quick === "PRESENT") existing.present += 1;
    if (quick === "REFUSED") existing.refused += 1;
    if (quick === "ASLEEP" || quick === "OUT_OF_ROOM" || quick === "NOT_APPLICABLE") {
      existing.noShowLike += 1;
    }
    if (quick === "ONE_TO_ONE") existing.oneToOne += 1;
    sessionMap.set(sessionKey, existing);
  }

  return {
    monthKey,
    totalEntries: rows.length,
    totals,
    daily: Array.from(dailyMap.entries())
      .map(([dateKey, total]) => ({ dateKey, total }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    sessions: Array.from(sessionMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  };
}
