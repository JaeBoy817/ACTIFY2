import { AttendanceStatus, BarrierReason, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { compareResidentsByRoom } from "@/lib/resident-status";
import { endOfZonedDay, formatInTimeZone, startOfZonedDay, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import { fromAttendanceRecord, type QuickAttendanceStatus, toAttendanceRecord } from "@/lib/attendance-tracker/status";
import type {
  AttendanceQuickResident,
  AttendanceQuickTakePayload,
  AttendanceSessionDetail,
  AttendanceSessionSummary,
  MonthlyAttendanceReportPayload,
  SessionSummaryCounts
} from "@/lib/attendance-tracker/types";

function parseDateKey(input: string | null | undefined, timeZone: string) {
  if (!input) {
    return startOfZonedDay(new Date(), timeZone);
  }
  const parsed = zonedDateStringToUtcStart(input, timeZone);
  return parsed ?? startOfZonedDay(new Date(), timeZone);
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
    where: {
      facilityId,
      NOT: {
        status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
      }
    },
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
    where: {
      facilityId: params.facilityId,
      NOT: {
        status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
      }
    }
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
    : sessions[0]?.id ?? null;

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
    where: {
      facilityId: params.facilityId,
      NOT: {
        status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
      }
    }
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
