import { Prisma, type OneOnOneQueueSkipReason, type ResidentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { compareResidentsByRoom, formatResidentStatusLabel } from "@/lib/resident-status";
import {
  addZonedDays,
  resolveTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedMonthShift,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";

const ONE_ON_ONE_TIME_ZONE = resolveTimeZone();
const DEFAULT_QUEUE_SIZE = 6;
const MIN_QUEUE_SIZE = 1;
const MAX_QUEUE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const skipReasonLabels: Record<OneOnOneQueueSkipReason, string> = {
  RESIDENT_DECLINED: "Resident declined",
  ASLEEP: "Asleep",
  IN_APPOINTMENT: "In appointment",
  CLINICAL_HOLD: "Clinical hold",
  STAFFING_CONSTRAINT: "Staffing constraint",
  OTHER: "Other"
};

type TxClient = Prisma.TransactionClient;

type DateContext = {
  timeZone: string;
  queueDate: Date;
  queueDateKey: string;
  queueDayStart: Date;
  queueDayEnd: Date;
  nextQueueDate: Date;
  monthStart: Date;
  monthEnd: Date;
};

type ResidentQueueStats = {
  residentId: string;
  firstName: string;
  lastName: string;
  room: string;
  status: ResidentStatus;
  isActive: boolean;
  monthNoteCount: number;
  monthLastNoteAt: Date | null;
  lastOneOnOneAt: Date | null;
  daysSinceLastOneOnOne: number | null;
  hasOneOnOneThisMonth: boolean;
};

type QueueRowWithResident = {
  id: string;
  residentId: string;
  queueSize: number;
  reason: string;
  isPinned: boolean;
  pinnedAt: Date | null;
  pinnedForDate: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  skipReason: OneOnOneQueueSkipReason | null;
  position: number;
  resident: {
    id: string;
    firstName: string;
    lastName: string;
    room: string;
    status: ResidentStatus;
    isActive: boolean;
  };
};

export type OneOnOneSpotlightQueueItem = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  status: ResidentStatus;
  statusLabel: string;
  reason: string;
  isPinned: boolean;
  position: number;
  queueSize: number;
  completedAt: Date | null;
  skippedAt: Date | null;
  skipReason: OneOnOneQueueSkipReason | null;
  skipReasonLabel: string | null;
  lastOneOnOneAt: Date | null;
  daysSinceLastOneOnOne: number | null;
  monthNoteCount: number;
};

export type OneOnOneSpotlightMonthlyResident = {
  residentId: string;
  residentName: string;
  room: string;
  status: ResidentStatus;
  statusLabel: string;
  monthNoteCount: number;
  monthLastNoteAt: Date | null;
  lastOneOnOneAt: Date | null;
  daysSinceLastOneOnOne: number | null;
  hasOneOnOneThisMonth: boolean;
  inTodayQueue: boolean;
};

export type OneOnOneSpotlightSnapshot = {
  dateKey: string;
  queueSize: number;
  coverage: {
    residentsWithOneOnOneThisMonth: number;
    totalEligibleResidents: number;
  };
  queue: OneOnOneSpotlightQueueItem[];
  monthlyResidents: OneOnOneSpotlightMonthlyResident[];
};

export type OneOnOneSpotlightSnapshotDTO = {
  dateKey: string;
  queueSize: number;
  coverage: {
    residentsWithOneOnOneThisMonth: number;
    totalEligibleResidents: number;
  };
  queue: Array<{
    id: string;
    residentId: string;
    residentName: string;
    room: string;
    status: ResidentStatus;
    statusLabel: string;
    reason: string;
    isPinned: boolean;
    position: number;
    queueSize: number;
    completedAt: string | null;
    skippedAt: string | null;
    skipReason: OneOnOneQueueSkipReason | null;
    skipReasonLabel: string | null;
    lastOneOnOneAt: string | null;
    daysSinceLastOneOnOne: number | null;
    monthNoteCount: number;
  }>;
  monthlyResidents: Array<{
    residentId: string;
    residentName: string;
    room: string;
    status: ResidentStatus;
    statusLabel: string;
    monthNoteCount: number;
    monthLastNoteAt: string | null;
    lastOneOnOneAt: string | null;
    daysSinceLastOneOnOne: number | null;
    hasOneOnOneThisMonth: boolean;
    inTodayQueue: boolean;
  }>;
};

function clampQueueSize(size: number | undefined) {
  if (!size || !Number.isFinite(size)) return DEFAULT_QUEUE_SIZE;
  return Math.min(MAX_QUEUE_SIZE, Math.max(MIN_QUEUE_SIZE, Math.trunc(size)));
}

function createDateContext(inputDate?: string, timeZone?: string | null): DateContext {
  const resolvedTimeZone = resolveTimeZone(timeZone);
  const parsedDate = inputDate?.trim();

  let queueDate: Date;
  if (parsedDate) {
    const parsed = zonedDateStringToUtcStart(parsedDate, resolvedTimeZone);
    if (!parsed) {
      throw new Error("Invalid queue date. Expected YYYY-MM-DD.");
    }
    queueDate = parsed;
  } else {
    queueDate = startOfZonedDay(new Date(), resolvedTimeZone);
  }

  const queueDateKey = zonedDateKey(queueDate, resolvedTimeZone);
  const queueDayStart = zonedDateStringToUtcStart(queueDateKey, resolvedTimeZone);
  if (!queueDayStart) {
    throw new Error("Unable to derive queue day start.");
  }

  const nextQueueDate = addZonedDays(queueDayStart, resolvedTimeZone, 1);
  const queueDayEnd = new Date(nextQueueDate.getTime() - 1);
  const monthStart = startOfZonedMonth(queueDayStart, resolvedTimeZone);
  const nextMonthStart = startOfZonedMonthShift(queueDayStart, resolvedTimeZone, 1);
  const monthEnd = new Date(nextMonthStart.getTime() - 1);

  return {
    timeZone: resolvedTimeZone,
    queueDate,
    queueDateKey,
    queueDayStart,
    queueDayEnd,
    nextQueueDate,
    monthStart,
    monthEnd
  };
}

function daysSince(referenceDate: Date, compareDate: Date | null, timeZone: string) {
  if (!compareDate) return null;
  const referenceStart = startOfZonedDay(referenceDate, timeZone).getTime();
  const compareStart = startOfZonedDay(compareDate, timeZone).getTime();
  const delta = referenceStart - compareStart;
  if (delta <= 0) return 0;
  return Math.floor(delta / DAY_MS);
}

function statusLabel(status: ResidentStatus) {
  if (status === "BED_BOUND") return "Bed Bound";
  if (status === "ACTIVE") return "Active";
  return formatResidentStatusLabel(status);
}

function reasonLabelForResident(resident: ResidentQueueStats) {
  if (resident.monthNoteCount === 0) {
    return "No 1:1 this month";
  }
  if (resident.status === "BED_BOUND") {
    return "Bed-bound follow-up";
  }
  if (resident.daysSinceLastOneOnOne === null) {
    return "No prior 1:1 on record";
  }
  if (resident.daysSinceLastOneOnOne >= 14) {
    return `${resident.daysSinceLastOneOnOne} days since last 1:1`;
  }
  if (resident.daysSinceLastOneOnOne >= 7) {
    return `${resident.daysSinceLastOneOnOne} days since last 1:1`;
  }
  return "Routine monthly touchpoint";
}

function scoreResidentForQueue(resident: ResidentQueueStats) {
  const noThisMonthBoost = resident.monthNoteCount === 0 ? 10_000 : 0;
  const days = resident.daysSinceLastOneOnOne ?? 365;
  const bedBoundBoost = resident.status === "BED_BOUND" ? 3 : 0;
  const tieBreaker = Math.random() * 0.25;
  return noThisMonthBoost + days + bedBoundBoost + tieBreaker;
}

async function loadResidentQueueStats(tx: TxClient, facilityId: string, dateContext: DateContext): Promise<ResidentQueueStats[]> {
  const residents = await tx.resident.findMany({
    where: {
      facilityId,
      status: { not: "DISCHARGED" }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true,
      isActive: true
    }
  });

  residents.sort(compareResidentsByRoom);

  const [monthGroups, lastNoteGroups] = await Promise.all([
    tx.progressNote.groupBy({
      by: ["residentId"],
      where: {
        type: "ONE_TO_ONE",
        resident: {
          facilityId,
          status: { not: "DISCHARGED" }
        },
        createdAt: {
          gte: dateContext.monthStart,
          lte: dateContext.monthEnd
        }
      },
      _count: {
        _all: true
      },
      _max: {
        createdAt: true
      }
    }),
    tx.progressNote.groupBy({
      by: ["residentId"],
      where: {
        type: "ONE_TO_ONE",
        resident: {
          facilityId,
          status: { not: "DISCHARGED" }
        },
        createdAt: {
          lte: dateContext.queueDayEnd
        }
      },
      _max: {
        createdAt: true
      }
    })
  ]);

  const monthByResident = new Map(
    monthGroups.map((group) => [
      group.residentId,
      {
        count: group._count._all,
        lastAt: group._max.createdAt ?? null
      }
    ])
  );

  const lastByResident = new Map(
    lastNoteGroups.map((group) => [
      group.residentId,
      group._max.createdAt ?? null
    ])
  );

  return residents.map((resident) => {
    const monthRow = monthByResident.get(resident.id);
    const monthNoteCount = monthRow?.count ?? 0;
    const monthLastNoteAt = monthRow?.lastAt ?? null;
    const lastOneOnOneAt = lastByResident.get(resident.id) ?? null;
    const daysSinceLastOneOnOne = daysSince(dateContext.queueDayStart, lastOneOnOneAt, dateContext.timeZone);

    return {
      residentId: resident.id,
      firstName: resident.firstName,
      lastName: resident.lastName,
      room: resident.room,
      status: resident.status,
      isActive: resident.isActive,
      monthNoteCount,
      monthLastNoteAt,
      lastOneOnOneAt,
      daysSinceLastOneOnOne,
      hasOneOnOneThisMonth: monthNoteCount > 0
    };
  });
}

async function getQueueRowsTx(tx: TxClient, facilityId: string, dateContext: DateContext): Promise<QueueRowWithResident[]> {
  const rows = await tx.dailyOneOnOneQueue.findMany({
    where: {
      facilityId,
      queueDate: dateContext.queueDate
    },
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          room: true,
          status: true,
          isActive: true
        }
      }
    },
    orderBy: [{ isPinned: "desc" }, { position: "asc" }, { createdAt: "asc" }]
  });
  return rows;
}

async function rebuildQueueTx(
  tx: TxClient,
  args: {
    facilityId: string;
    queueSize: number;
    dateContext: DateContext;
    residentStats: ResidentQueueStats[];
    preservePinnedFromCurrentQueue: boolean;
    missingThisMonthOnly: boolean;
    includePinnedResidents: boolean;
  }
) {
  const {
    facilityId,
    queueSize,
    dateContext,
    residentStats,
    preservePinnedFromCurrentQueue,
    missingThisMonthOnly,
    includePinnedResidents
  } = args;

  const existingRows = await getQueueRowsTx(tx, facilityId, dateContext);
  const existingPinnedRows =
    preservePinnedFromCurrentQueue && includePinnedResidents ? existingRows.filter((row) => row.isPinned) : [];
  const existingPinnedMap = new Map(existingPinnedRows.map((row) => [row.residentId, row]));

  if (preservePinnedFromCurrentQueue) {
    await tx.dailyOneOnOneQueue.deleteMany({
      where: {
        facilityId,
        queueDate: dateContext.queueDate,
        isPinned: false
      }
    });
  } else {
    await tx.dailyOneOnOneQueue.deleteMany({
      where: {
        facilityId,
        queueDate: dateContext.queueDate
      }
    });
  }

  const carryoverPinnedRows = includePinnedResidents
    ? await tx.dailyOneOnOneQueue.findMany({
      where: {
        facilityId,
        pinnedForDate: dateContext.queueDate,
        resident: {
          status: { not: "DISCHARGED" }
        }
      },
      orderBy: [{ pinnedAt: "asc" }, { createdAt: "asc" }],
      include: {
        resident: {
          select: {
            id: true
          }
        }
      }
    })
    : [];

  const carryoverPinnedSet = new Set(carryoverPinnedRows.map((row) => row.residentId));
  const pinnedResidentSet = new Set<string>([...existingPinnedMap.keys(), ...carryoverPinnedSet]);

  const pinnedResidents = residentStats.filter((resident) => pinnedResidentSet.has(resident.residentId));
  const pinnedOrderMap = new Map<string, number>();
  let pinnedOrder = 1;

  for (const row of existingPinnedRows.sort((a, b) => a.position - b.position)) {
    pinnedOrderMap.set(row.residentId, pinnedOrder);
    pinnedOrder += 1;
  }
  for (const row of carryoverPinnedRows) {
    if (!pinnedOrderMap.has(row.residentId)) {
      pinnedOrderMap.set(row.residentId, pinnedOrder);
      pinnedOrder += 1;
    }
  }

  pinnedResidents.sort((a, b) => {
    const aOrder = pinnedOrderMap.get(a.residentId) ?? Number.POSITIVE_INFINITY;
    const bOrder = pinnedOrderMap.get(b.residentId) ?? Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return compareResidentsByRoom(a, b);
  });

  const candidateResidents = residentStats
    .filter((resident) => !pinnedResidentSet.has(resident.residentId))
    .filter((resident) => (missingThisMonthOnly ? resident.monthNoteCount === 0 : true));

  const nonPinnedResidents = candidateResidents
    .map((resident) => ({
      resident,
      score: scoreResidentForQueue(resident)
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.resident);

  const targetCount = Math.max(queueSize, pinnedResidents.length);
  const selectedResidents = [
    ...pinnedResidents,
    ...nonPinnedResidents.slice(0, Math.max(0, targetCount - pinnedResidents.length))
  ];

  for (let index = 0; index < selectedResidents.length; index += 1) {
    const resident = selectedResidents[index];
    const wasPinnedBefore = pinnedResidentSet.has(resident.residentId);
    const existingPinned = existingPinnedMap.get(resident.residentId);
    const reason = wasPinnedBefore && !existingPinned ? "Pinned to tomorrow" : reasonLabelForResident(resident);

    await tx.dailyOneOnOneQueue.upsert({
      where: {
        facilityId_queueDate_residentId: {
          facilityId,
          queueDate: dateContext.queueDate,
          residentId: resident.residentId
        }
      },
      create: {
        facilityId,
        residentId: resident.residentId,
        queueDate: dateContext.queueDate,
        queueDateKey: dateContext.queueDateKey,
        position: index + 1,
        queueSize,
        reason,
        isPinned: wasPinnedBefore,
        pinnedAt: wasPinnedBefore ? new Date() : null
      },
      update: {
        position: index + 1,
        queueSize,
        reason,
        isPinned: wasPinnedBefore
      }
    });
  }

  const staleIds = existingPinnedRows
    .filter((row) => !selectedResidents.some((resident) => resident.residentId === row.residentId))
    .map((row) => row.id);

  if (staleIds.length > 0) {
    await tx.dailyOneOnOneQueue.deleteMany({
      where: {
        id: { in: staleIds }
      }
    });
  }

  return getQueueRowsTx(tx, facilityId, dateContext);
}

async function ensureQueueTx(
  tx: TxClient,
  args: {
    facilityId: string;
    queueSize: number;
    dateContext: DateContext;
    residentStats: ResidentQueueStats[];
  }
) {
  const existing = await getQueueRowsTx(tx, args.facilityId, args.dateContext);
  if (existing.length > 0) {
    return existing;
  }

  return rebuildQueueTx(tx, {
    ...args,
    preservePinnedFromCurrentQueue: true,
    missingThisMonthOnly: false,
    includePinnedResidents: true
  });
}

function mapQueueItem(row: QueueRowWithResident, residentStatsMap: Map<string, ResidentQueueStats>): OneOnOneSpotlightQueueItem {
  const stats = residentStatsMap.get(row.residentId);
  return {
    id: row.id,
    residentId: row.residentId,
    residentName: `${row.resident.firstName} ${row.resident.lastName}`,
    room: row.resident.room,
    status: row.resident.status,
    statusLabel: statusLabel(row.resident.status),
    reason: row.reason,
    isPinned: row.isPinned,
    position: row.position,
    queueSize: row.queueSize,
    completedAt: row.completedAt,
    skippedAt: row.skippedAt,
    skipReason: row.skipReason,
    skipReasonLabel: row.skipReason ? skipReasonLabels[row.skipReason] : null,
    lastOneOnOneAt: stats?.lastOneOnOneAt ?? null,
    daysSinceLastOneOnOne: stats?.daysSinceLastOneOnOne ?? null,
    monthNoteCount: stats?.monthNoteCount ?? 0
  };
}

function mapMonthlyResident(
  resident: ResidentQueueStats,
  queueResidentIds: Set<string>
): OneOnOneSpotlightMonthlyResident {
  return {
    residentId: resident.residentId,
    residentName: `${resident.firstName} ${resident.lastName}`,
    room: resident.room,
    status: resident.status,
    statusLabel: statusLabel(resident.status),
    monthNoteCount: resident.monthNoteCount,
    monthLastNoteAt: resident.monthLastNoteAt,
    lastOneOnOneAt: resident.lastOneOnOneAt,
    daysSinceLastOneOnOne: resident.daysSinceLastOneOnOne,
    hasOneOnOneThisMonth: resident.hasOneOnOneThisMonth,
    inTodayQueue: queueResidentIds.has(resident.residentId)
  };
}

function buildSnapshot(
  args: {
    dateContext: DateContext;
    queueRows: QueueRowWithResident[];
    residentStats: ResidentQueueStats[];
  }
): OneOnOneSpotlightSnapshot {
  const residentStatsMap = new Map(args.residentStats.map((resident) => [resident.residentId, resident]));
  const queue = args.queueRows.map((row) => mapQueueItem(row, residentStatsMap));
  const queueResidentIds = new Set(queue.map((item) => item.residentId));
  const monthlyResidents = args.residentStats.map((resident) => mapMonthlyResident(resident, queueResidentIds));
  const residentsWithOneOnOneThisMonth = args.residentStats.filter((resident) => resident.monthNoteCount > 0).length;
  const totalEligibleResidents = args.residentStats.length;
  const queueSize = queue[0]?.queueSize ?? DEFAULT_QUEUE_SIZE;

  return {
    dateKey: args.dateContext.queueDateKey,
    queueSize,
    coverage: {
      residentsWithOneOnOneThisMonth,
      totalEligibleResidents
    },
    queue,
    monthlyResidents
  };
}

async function buildSnapshotTx(
  tx: TxClient,
  args: {
    facilityId: string;
    queueSize: number;
    dateContext: DateContext;
    regenerate: boolean;
    missingThisMonthOnly: boolean;
  }
) {
  const residentStats = await loadResidentQueueStats(tx, args.facilityId, args.dateContext);
  let queueRows: QueueRowWithResident[];

  if (args.regenerate) {
    queueRows = await rebuildQueueTx(tx, {
      facilityId: args.facilityId,
      queueSize: args.queueSize,
      dateContext: args.dateContext,
      residentStats,
      preservePinnedFromCurrentQueue: !args.missingThisMonthOnly,
      missingThisMonthOnly: args.missingThisMonthOnly,
      includePinnedResidents: !args.missingThisMonthOnly
    });
  } else {
    queueRows = await ensureQueueTx(tx, {
      facilityId: args.facilityId,
      queueSize: args.queueSize,
      dateContext: args.dateContext,
      residentStats
    });
  }

  return buildSnapshot({
    dateContext: args.dateContext,
    queueRows,
    residentStats
  });
}

export async function getOneOnOneSpotlightSnapshot(params: {
  facilityId: string;
  date?: string;
  queueSize?: number;
  timeZone?: string | null;
}) {
  const dateContext = createDateContext(params.date, params.timeZone);
  const queueSize = clampQueueSize(params.queueSize);

  return prisma.$transaction((tx) =>
    buildSnapshotTx(tx, {
      facilityId: params.facilityId,
      queueSize,
      dateContext,
      regenerate: false,
      missingThisMonthOnly: false
    })
  );
}

export async function regenerateOneOnOneQueueSnapshot(params: {
  facilityId: string;
  date?: string;
  queueSize?: number;
  missingThisMonthOnly?: boolean;
  timeZone?: string | null;
}) {
  const dateContext = createDateContext(params.date, params.timeZone);
  const queueSize = clampQueueSize(params.queueSize);

  return prisma.$transaction((tx) =>
    buildSnapshotTx(tx, {
      facilityId: params.facilityId,
      queueSize,
      dateContext,
      regenerate: true,
      missingThisMonthOnly: Boolean(params.missingThisMonthOnly)
    })
  );
}

async function getQueueItemOrThrow(params: {
  tx: TxClient;
  facilityId: string;
  queueItemId: string;
}) {
  const row = await params.tx.dailyOneOnOneQueue.findFirst({
    where: {
      id: params.queueItemId,
      facilityId: params.facilityId
    },
    select: {
      id: true,
      queueDateKey: true,
      queueDate: true
    }
  });

  if (!row) {
    throw new Error("Queue item not found.");
  }

  return row;
}

export async function completeOneOnOneQueueItem(params: {
  facilityId: string;
  queueItemId: string;
  timeZone?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const row = await getQueueItemOrThrow({
      tx,
      facilityId: params.facilityId,
      queueItemId: params.queueItemId
    });

    const dateContext = createDateContext(row.queueDateKey, params.timeZone);

    await tx.dailyOneOnOneQueue.update({
      where: { id: row.id },
      data: {
        completedAt: new Date(),
        skippedAt: null,
        skipReason: null
      }
    });

    return buildSnapshotTx(tx, {
      facilityId: params.facilityId,
      queueSize: DEFAULT_QUEUE_SIZE,
      dateContext,
      regenerate: false,
      missingThisMonthOnly: false
    });
  });
}

export async function skipOneOnOneQueueItem(params: {
  facilityId: string;
  queueItemId: string;
  skipReason: OneOnOneQueueSkipReason;
  timeZone?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const row = await getQueueItemOrThrow({
      tx,
      facilityId: params.facilityId,
      queueItemId: params.queueItemId
    });

    const dateContext = createDateContext(row.queueDateKey, params.timeZone);

    await tx.dailyOneOnOneQueue.update({
      where: { id: row.id },
      data: {
        completedAt: null,
        skippedAt: new Date(),
        skipReason: params.skipReason
      }
    });

    return buildSnapshotTx(tx, {
      facilityId: params.facilityId,
      queueSize: DEFAULT_QUEUE_SIZE,
      dateContext,
      regenerate: false,
      missingThisMonthOnly: false
    });
  });
}

export async function pinOneOnOneQueueItemToTomorrow(params: {
  facilityId: string;
  queueItemId: string;
  timeZone?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const row = await getQueueItemOrThrow({
      tx,
      facilityId: params.facilityId,
      queueItemId: params.queueItemId
    });

    const dateContext = createDateContext(row.queueDateKey, params.timeZone);
    const tomorrow = addZonedDays(row.queueDate, dateContext.timeZone, 1);

    await tx.dailyOneOnOneQueue.update({
      where: { id: row.id },
      data: {
        pinnedForDate: tomorrow,
        pinnedAt: new Date()
      }
    });

    return buildSnapshotTx(tx, {
      facilityId: params.facilityId,
      queueSize: DEFAULT_QUEUE_SIZE,
      dateContext,
      regenerate: false,
      missingThisMonthOnly: false
    });
  });
}

export function serializeOneOnOneSpotlightSnapshot(snapshot: OneOnOneSpotlightSnapshot): OneOnOneSpotlightSnapshotDTO {
  return {
    ...snapshot,
    queue: snapshot.queue.map((item) => ({
      ...item,
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
      skippedAt: item.skippedAt ? item.skippedAt.toISOString() : null,
      lastOneOnOneAt: item.lastOneOnOneAt ? item.lastOneOnOneAt.toISOString() : null
    })),
    monthlyResidents: snapshot.monthlyResidents.map((resident) => ({
      ...resident,
      monthLastNoteAt: resident.monthLastNoteAt ? resident.monthLastNoteAt.toISOString() : null,
      lastOneOnOneAt: resident.lastOneOnOneAt ? resident.lastOneOnOneAt.toISOString() : null
    }))
  };
}

export const oneOnOneQueueConstants = {
  DEFAULT_QUEUE_SIZE,
  MIN_QUEUE_SIZE,
  MAX_QUEUE_SIZE,
  ONE_ON_ONE_TIME_ZONE
};

export const oneOnOneQueueSkipReasonOptions = Object.keys(skipReasonLabels).map((key) => ({
  value: key as OneOnOneQueueSkipReason,
  label: skipReasonLabels[key as OneOnOneQueueSkipReason]
}));
