import { unstable_cache } from "next/cache";
import { Prisma, ResidentStatus } from "@prisma/client";

import { getAnalyticsSnapshot } from "@/lib/analytics/service";
import { computeFacilityPresenceMetrics } from "@/lib/facility-presence";
import { getDashboardSummaryCacheTag } from "@/lib/dashboard/getDashboardSummary";
import { getOneOnOneSpotlightSnapshot } from "@/lib/one-on-one-queue/service";
import { prisma } from "@/lib/prisma";
import {
  addZonedDays,
  endOfZonedDay,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedMonthShift
} from "@/lib/timezone";

type AlertTone = "default" | "warn" | "danger";

const INACTIVE_RESIDENT_STATUSES: ResidentStatus[] = ["DISCHARGED", "TRANSFERRED", "DECEASED"];

type DashboardAgendaItem = {
  id: string;
  title: string;
  location: string;
  startAt: string;
  endAt: string;
  timeLabel: string;
  attendanceCompleted: boolean;
  href: string;
};

type DashboardOneOnOneQueueItem = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  statusLabel: string;
  reason: string;
  lastOneOnOneAt: string | null;
  daysSinceLastOneOnOne: number | null;
  href: string;
};

type DashboardRecentOneOnOneNote = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  createdAt: string;
  createdBy: string;
  continueHref: string;
  duplicateHref: string;
};

export type DashboardHomeSummary = {
  generatedAt: string;
  dateLabel: string;
  quickStatusLine: string;
  nextUp: DashboardAgendaItem | null;
  todayAgenda: DashboardAgendaItem[];
  agendaInsights: {
    overlapCount: number;
    missingLocationCount: number;
  };
  dailyMetrics: {
    attendanceToday: number;
    programsToday: number;
    oneToOneCompletedToday: number;
    residentsEngagedToday: number;
    attendanceSessionsCompleted: number;
  };
  monthlyMetrics: {
    totalPrograms: number;
    averageAttendancePerProgram: number;
    totalOneToOneNotes: number;
    volunteerHours: number | null;
  };
  analytics: {
    today: {
      rangeLabel: string;
      averageDailyPercent: number;
      participationPercent: number;
      residentsParticipated: number;
      totalAttendedResidents: number;
      oneOnOneNotes: number;
      carePlanReviews: number;
    };
    month: {
      rangeLabel: string;
      averageDailyPercent: number;
      participationPercent: number;
      residentsParticipated: number;
      totalAttendedResidents: number;
      oneOnOneNotes: number;
      carePlanReviews: number;
      volunteerHours: number;
    };
  };
  participationPreview: {
    averageDailyPercent: number;
    participationPercent: number;
    residentsParticipated: number;
    totalAttendedResidents: number;
    activeResidents: number;
  };
  oneToOne: {
    queueDateKey: string;
    queueSize: number;
    dueTodayCount: number;
    missingThisMonthCount: number;
    residentsWithNoteThisMonth: number;
    totalEligibleResidents: number;
    items: DashboardOneOnOneQueueItem[];
    viewAllHref: string;
  };
  recentOneToOneNotes: DashboardRecentOneOnOneNote[];
  alerts: {
    count: number;
    items: Array<{
      id: string;
      title: string;
      detail: string;
      href: string;
      tone: AlertTone;
    }>;
  };
};

export type GetDashboardHomeSummaryOptions = {
  facilityId: string;
  timeZone: string;
};

function lowStockCountFromBudgetItems(items: Array<{ onHand: number; reorderPoint: number | null; parLevel: number }>) {
  return items.filter((item) => {
    const threshold = item.reorderPoint ?? Math.floor(item.parLevel * 0.3);
    return item.onHand <= Math.max(0, threshold);
  }).length;
}

function lowStockCountFromLegacyRows(rows: Array<{ onHand: number; reorderAt: number }>) {
  return rows.filter((row) => row.onHand < row.reorderAt).length;
}

function formatTimeRange(startAt: Date, endAt: Date, timeZone: string) {
  const startLabel = formatInTimeZone(startAt, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
  const endLabel = formatInTimeZone(endAt, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${startLabel} - ${endLabel}`;
}

function calculateOverlapCount(rows: Array<{ startAt: Date; endAt: Date }>) {
  if (rows.length < 2) return 0;

  let overlapCount = 0;
  const sorted = [...rows].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (current.startAt.getTime() < previous.endAt.getTime()) {
      overlapCount += 1;
    }
  }

  return overlapCount;
}

async function computeDashboardHomeSummary(args: {
  facilityId: string;
  timeZone: string;
}): Promise<DashboardHomeSummary> {
  const now = new Date();
  const dayStart = startOfZonedDay(now, args.timeZone);
  const dayEnd = endOfZonedDay(now, args.timeZone);
  const monthStart = startOfZonedMonth(now, args.timeZone);
  const nextMonthStart = startOfZonedMonthShift(now, args.timeZone, 1);
  const sevenDaysAhead = addZonedDays(dayStart, args.timeZone, 7);

  const residentWhere: Prisma.ResidentWhereInput = {
    facilityId: args.facilityId,
    OR: [{ isActive: true }, { status: { in: ["ACTIVE", "BED_BOUND"] as ResidentStatus[] } }],
    NOT: {
      status: {
        in: INACTIVE_RESIDENT_STATUSES
      }
    }
  };

  const [
    todaysActivities,
    attendanceGroupsToday,
    attendanceRowsToday,
    oneOnOneCompletedToday,
    oneOnOneSnapshot,
    recentOneOnOneNotes,
    activeResidentCount,
    monthlyProgramCount,
    monthlyAttendanceCount,
    monthlyOneOnOneCount,
    volunteerVisits,
    carePlanDueSoonCount,
    carePlanOverdueCount,
    followUpResidentCount,
    todayAnalyticsSnapshot,
    monthAnalyticsSnapshot,
    budgetStockRows,
    inventoryLegacyRows,
    prizeLegacyRows
  ] = await Promise.all([
    prisma.activityInstance.findMany({
      where: {
        facilityId: args.facilityId,
        startAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      orderBy: [{ startAt: "asc" }],
      select: {
        id: true,
        title: true,
        location: true,
        startAt: true,
        endAt: true
      }
    }),
    prisma.attendance.groupBy({
      by: ["activityInstanceId"],
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      },
      select: {
        residentId: true,
        status: true,
        activityInstance: {
          select: {
            startAt: true
          }
        }
      }
    }),
    prisma.progressNote.count({
      where: {
        type: "ONE_TO_ONE",
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        },
        resident: {
          facilityId: args.facilityId
        }
      }
    }),
    getOneOnOneSpotlightSnapshot({
      facilityId: args.facilityId,
      timeZone: args.timeZone
    }),
    prisma.progressNote.findMany({
      where: {
        type: "ONE_TO_ONE",
        resident: {
          facilityId: args.facilityId
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        createdAt: true,
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true
          }
        },
        createdByUser: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.resident.count({
      where: residentWhere
    }),
    prisma.activityInstance.count({
      where: {
        facilityId: args.facilityId,
        startAt: {
          gte: monthStart,
          lt: nextMonthStart
        }
      }
    }),
    prisma.attendance.count({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: monthStart,
            lt: nextMonthStart
          }
        }
      }
    }),
    prisma.progressNote.count({
      where: {
        type: "ONE_TO_ONE",
        createdAt: {
          gte: monthStart,
          lt: nextMonthStart
        },
        resident: {
          facilityId: args.facilityId
        }
      }
    }),
    prisma.volunteerVisit.findMany({
      where: {
        startAt: {
          gte: monthStart,
          lt: nextMonthStart
        },
        volunteer: {
          facilityId: args.facilityId
        }
      },
      select: {
        startAt: true,
        endAt: true
      }
    }),
    prisma.carePlan.count({
      where: {
        status: "ACTIVE",
        nextReviewDate: {
          gte: dayStart,
          lte: sevenDaysAhead
        },
        resident: {
          facilityId: args.facilityId,
          status: {
            notIn: INACTIVE_RESIDENT_STATUSES
          }
        }
      }
    }),
    prisma.carePlan.count({
      where: {
        status: "ACTIVE",
        nextReviewDate: {
          lt: dayStart
        },
        resident: {
          facilityId: args.facilityId,
          status: {
            notIn: INACTIVE_RESIDENT_STATUSES
          }
        }
      }
    }),
    prisma.resident.count({
      where: {
        ...residentWhere,
        followUpFlag: true
      }
    }),
    getAnalyticsSnapshot({
      facilityId: args.facilityId,
      timeZone: args.timeZone,
      filters: {
        range: "today",
        from: null,
        to: null,
        unitId: null,
        residentId: null,
        category: null,
        staffId: null
      }
    }),
    getAnalyticsSnapshot({
      facilityId: args.facilityId,
      timeZone: args.timeZone,
      filters: {
        range: "30d",
        from: null,
        to: null,
        unitId: null,
        residentId: null,
        category: null,
        staffId: null
      }
    }),
    prisma.budgetStockItem.findMany({
      where: {
        facilityId: args.facilityId,
        isActive: true
      },
      select: {
        onHand: true,
        reorderPoint: true,
        parLevel: true
      }
    }),
    prisma.inventoryItem.findMany({
      where: {
        facilityId: args.facilityId
      },
      select: {
        onHand: true,
        reorderAt: true
      }
    }),
    prisma.prizeItem.findMany({
      where: {
        facilityId: args.facilityId
      },
      select: {
        onHand: true,
        reorderAt: true
      }
    })
  ]);

  const attendanceCompletedIds = new Set(attendanceGroupsToday.map((item) => item.activityInstanceId));
  const programsWithAttendanceSaved = attendanceCompletedIds.size;
  const attendancePendingCount = todaysActivities.reduce((count, item) => (
    attendanceCompletedIds.has(item.id) ? count : count + 1
  ), 0);

  const lowStockAlertsCount = budgetStockRows.length > 0
    ? lowStockCountFromBudgetItems(budgetStockRows)
    : lowStockCountFromLegacyRows(inventoryLegacyRows) + lowStockCountFromLegacyRows(prizeLegacyRows);

  const engagedResidentsSet = new Set(
    attendanceRowsToday
      .filter((row) => row.status !== "REFUSED" && row.status !== "NO_SHOW")
      .map((row) => row.residentId)
  );

  const participationPreviewMetrics = computeFacilityPresenceMetrics({
    rows: attendanceRowsToday.map((row) => ({
      residentId: row.residentId,
      status: row.status,
      occurredAt: row.activityInstance.startAt
    })),
    activeResidentCount,
    now,
    timeZone: args.timeZone
  });

  const nextUpActivity = todaysActivities.find((item) => item.startAt.getTime() >= now.getTime()) ?? null;
  const agendaRows = todaysActivities.slice(0, 6).map((item) => ({
    id: item.id,
    title: item.title,
    location: item.location,
    startAt: item.startAt.toISOString(),
    endAt: item.endAt.toISOString(),
    timeLabel: formatTimeRange(item.startAt, item.endAt, args.timeZone),
    attendanceCompleted: attendanceCompletedIds.has(item.id),
    href: `/app/calendar?view=day&date=${encodeURIComponent(item.startAt.toISOString())}`
  }));

  const oneOnOneDueCount = oneOnOneSnapshot.queue.filter((item) => !item.completedAt && !item.skippedAt).length;
  const missingThisMonthCount = oneOnOneSnapshot.monthlyResidents.filter((item) => !item.hasOneOnOneThisMonth).length;

  const alerts: Array<{ id: string; title: string; detail: string; href: string; tone: AlertTone }> = [];

  if (attendancePendingCount > 0) {
    alerts.push({
      id: "attendance-pending",
      title: "Attendance not completed",
      detail: `${attendancePendingCount} activities need attendance saved today.`,
      href: "/app/attendance",
      tone: attendancePendingCount >= 4 ? "warn" : "default"
    });
  }

  if (oneOnOneDueCount > 0) {
    alerts.push({
      id: "one-on-one-due",
      title: "1:1 notes due",
      detail: `${oneOnOneDueCount} residents remain in today’s queue.`,
      href: "/app/notes/new?type=1on1",
      tone: oneOnOneDueCount >= 6 ? "warn" : "default"
    });
  }

  if (carePlanOverdueCount > 0) {
    alerts.push({
      id: "careplan-overdue",
      title: "Care plan reviews overdue",
      detail: `${carePlanOverdueCount} care plans are past review date.`,
      href: "/app/care-plans?status=overdue",
      tone: "danger"
    });
  }

  if (lowStockAlertsCount > 0) {
    alerts.push({
      id: "inventory-low",
      title: "Low stock alerts",
      detail: `${lowStockAlertsCount} inventory items are below threshold.`,
      href: "/app/dashboard/budget-stock?tab=stock&mode=LOW",
      tone: lowStockAlertsCount >= 8 ? "warn" : "default"
    });
  }

  if (carePlanDueSoonCount > 0) {
    alerts.push({
      id: "careplan-due-soon",
      title: "Care plan reviews due soon",
      detail: `${carePlanDueSoonCount} care plans due in the next 7 days.`,
      href: "/app/care-plans?status=due-soon",
      tone: "default"
    });
  }

  if (followUpResidentCount > 0) {
    alerts.push({
      id: "follow-up-flagged",
      title: "Resident follow-ups flagged",
      detail: `${followUpResidentCount} residents have active follow-up flags.`,
      href: "/app/residents?filter=follow-up",
      tone: "default"
    });
  }

  let volunteerHours: number | null = null;
  if (volunteerVisits.length > 0) {
    const totalMs = volunteerVisits.reduce((sum, visit) => {
      if (!visit.endAt) return sum;
      const delta = visit.endAt.getTime() - visit.startAt.getTime();
      if (delta <= 0) return sum;
      return sum + delta;
    }, 0);
    volunteerHours = Number((totalMs / (1000 * 60 * 60)).toFixed(1));
  }

  return {
    generatedAt: now.toISOString(),
    dateLabel: formatInTimeZone(now, args.timeZone, {
      weekday: "long",
      month: "short",
      day: "numeric"
    }),
    quickStatusLine: `${todaysActivities.length} scheduled today · ${attendancePendingCount} attendance pending · ${oneOnOneDueCount} 1:1 due`,
    nextUp: nextUpActivity
      ? {
          id: nextUpActivity.id,
          title: nextUpActivity.title,
          location: nextUpActivity.location,
          startAt: nextUpActivity.startAt.toISOString(),
          endAt: nextUpActivity.endAt.toISOString(),
          timeLabel: formatTimeRange(nextUpActivity.startAt, nextUpActivity.endAt, args.timeZone),
          attendanceCompleted: attendanceCompletedIds.has(nextUpActivity.id),
          href: `/app/calendar?view=day&date=${encodeURIComponent(nextUpActivity.startAt.toISOString())}`
        }
      : null,
    todayAgenda: agendaRows,
    agendaInsights: {
      overlapCount: calculateOverlapCount(todaysActivities),
      missingLocationCount: todaysActivities.filter((item) => item.location.trim().length === 0).length
    },
    dailyMetrics: {
      attendanceToday: attendanceRowsToday.length,
      programsToday: todaysActivities.length,
      oneToOneCompletedToday: oneOnOneCompletedToday,
      residentsEngagedToday: engagedResidentsSet.size,
      attendanceSessionsCompleted: programsWithAttendanceSaved
    },
    monthlyMetrics: {
      totalPrograms: monthlyProgramCount,
      averageAttendancePerProgram:
        monthlyProgramCount === 0 ? 0 : Number((monthlyAttendanceCount / monthlyProgramCount).toFixed(1)),
      totalOneToOneNotes: monthlyOneOnOneCount,
      volunteerHours
    },
    analytics: {
      today: {
        rangeLabel: todayAnalyticsSnapshot.range.label,
        averageDailyPercent: todayAnalyticsSnapshot.attendance.averageDailyPercent,
        participationPercent: todayAnalyticsSnapshot.attendance.participationPercent,
        residentsParticipated: todayAnalyticsSnapshot.attendance.residentsParticipated,
        totalAttendedResidents: todayAnalyticsSnapshot.attendance.totalAttendedResidents,
        oneOnOneNotes: todayAnalyticsSnapshot.oneOnOne.totalNotes,
        carePlanReviews:
          todayAnalyticsSnapshot.carePlan.counts.dueSoon + todayAnalyticsSnapshot.carePlan.counts.overdue
      },
      month: {
        rangeLabel: monthAnalyticsSnapshot.range.label,
        averageDailyPercent: monthAnalyticsSnapshot.attendance.averageDailyPercent,
        participationPercent: monthAnalyticsSnapshot.attendance.participationPercent,
        residentsParticipated: monthAnalyticsSnapshot.attendance.residentsParticipated,
        totalAttendedResidents: monthAnalyticsSnapshot.attendance.totalAttendedResidents,
        oneOnOneNotes: monthAnalyticsSnapshot.oneOnOne.totalNotes,
        carePlanReviews:
          monthAnalyticsSnapshot.carePlan.counts.dueSoon + monthAnalyticsSnapshot.carePlan.counts.overdue,
        volunteerHours: Number(monthAnalyticsSnapshot.staffVolunteers.volunteerTotals.hours.toFixed(1))
      }
    },
    participationPreview: {
      averageDailyPercent: participationPreviewMetrics.currentMonthAverageDailyPercent,
      participationPercent: participationPreviewMetrics.currentMonthParticipationPercent,
      residentsParticipated: participationPreviewMetrics.currentMonthResidentsParticipated,
      totalAttendedResidents: participationPreviewMetrics.currentMonthTotalResidentsAttended,
      activeResidents: participationPreviewMetrics.activeResidentCount
    },
    oneToOne: {
      queueDateKey: oneOnOneSnapshot.dateKey,
      queueSize: oneOnOneSnapshot.queueSize,
      dueTodayCount: oneOnOneDueCount,
      missingThisMonthCount,
      residentsWithNoteThisMonth: oneOnOneSnapshot.coverage.residentsWithOneOnOneThisMonth,
      totalEligibleResidents: oneOnOneSnapshot.coverage.totalEligibleResidents,
      items: oneOnOneSnapshot.queue
        .filter((item) => !item.completedAt && !item.skippedAt)
        .slice(0, 8)
        .map((item) => ({
        id: item.id,
        residentId: item.residentId,
        residentName: item.residentName,
        room: item.room,
        statusLabel: item.statusLabel,
        reason: item.reason,
        lastOneOnOneAt: item.lastOneOnOneAt ? item.lastOneOnOneAt.toISOString() : null,
        daysSinceLastOneOnOne: item.daysSinceLastOneOnOne,
        href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(item.residentId)}`
      })),
      viewAllHref: "/app/notes/new?type=1on1"
    },
    recentOneToOneNotes: recentOneOnOneNotes.map((note) => ({
      id: note.id,
      residentId: note.resident.id,
      residentName: `${note.resident.firstName} ${note.resident.lastName}`,
      room: note.resident.room,
      createdAt: formatInTimeZone(note.createdAt, args.timeZone, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }),
      createdBy: note.createdByUser.name,
      continueHref: `/app/notes/new?type=1on1&noteId=${encodeURIComponent(note.id)}`,
      duplicateHref: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(note.resident.id)}`
    })),
    alerts: {
      count: alerts.length,
      items: alerts.slice(0, 3)
    }
  };
}

function getCachedDashboardHomeSummaryForFacility(facilityId: string) {
  return unstable_cache(
    async (timeZone: string) =>
      computeDashboardHomeSummary({
        facilityId,
        timeZone
      }),
    ["dashboard-home-summary-v1", facilityId],
    {
      revalidate: 45,
      tags: [getDashboardSummaryCacheTag(facilityId)]
    }
  );
}

export async function getDashboardHomeSummary(options: GetDashboardHomeSummaryOptions): Promise<DashboardHomeSummary> {
  const timeZone = resolveTimeZone(options.timeZone);
  const cachedForFacility = getCachedDashboardHomeSummaryForFacility(options.facilityId);
  return cachedForFacility(timeZone);
}
