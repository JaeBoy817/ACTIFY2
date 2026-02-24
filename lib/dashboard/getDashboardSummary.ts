import { unstable_cache } from "next/cache";
import { Prisma, ResidentStatus } from "@prisma/client";

import { computeFacilityPresenceMetrics } from "@/lib/facility-presence";
import { getOneOnOneSpotlightSnapshot } from "@/lib/one-on-one-queue/service";
import { prisma } from "@/lib/prisma";
import {
  addZonedDays,
  endOfZonedDay,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedDay,
  startOfZonedMonthShift,
  subtractDays
} from "@/lib/timezone";

type DashboardChipIcon =
  | "calendar"
  | "attendance"
  | "oneOnOne"
  | "followUp"
  | "inventory"
  | "carePlan";

type DashboardAlertTone = "default" | "warn" | "danger";

export function getDashboardSummaryCacheTag(facilityId: string) {
  return `dashboard-summary:${facilityId}`;
}

export type DashboardQuickChip = {
  key: string;
  label: string;
  value: number;
  helper: string;
  href: string;
  icon: DashboardChipIcon;
};

export type DashboardFocusItem = {
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

export type DashboardRecentItem = {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
  type: "note" | "resident";
};

export type DashboardAlertItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: DashboardAlertTone;
};

export type DashboardExtendedSummary = {
  schedulePreview: Array<{
    id: string;
    title: string;
    location: string;
    timeLabel: string;
    href: string;
  }>;
  birthdaysToday: Array<{
    id: string;
    residentName: string;
    room: string;
  }>;
  participation: {
    activeResidentCount: number;
    monthParticipationPercent: number;
    averageDailyPercent: number;
    monthOverMonthDelta: number | null;
  };
  statusBreakdown: Array<{
    status: "PRESENT_ACTIVE" | "LEADING" | "REFUSED" | "NO_SHOW";
    label: string;
    count: number;
    percent: number;
  }>;
};

export type DashboardSummary = {
  generatedAt: string;
  dateLabel: string;
  quickStatusLine: string;
  participationPreview: {
    averageDailyPercent: number;
    participationPercent: number;
    residentsParticipated: number;
    totalAttendedResidents: number;
    activeResidents: number;
  };
  quickChips: DashboardQuickChip[];
  focus: {
    queueDateKey: string;
    queueSize: number;
    dueTodayCount: number;
    residentsWithNoteThisMonth: number;
    totalEligibleResidents: number;
    items: DashboardFocusItem[];
  };
  recentItems: DashboardRecentItem[];
  alerts: DashboardAlertItem[];
  links: {
    focusViewAll: string;
    activityFeed: string;
    dashboardSettings: string;
  };
  extended: DashboardExtendedSummary | null;
};

export type GetDashboardSummaryOptions = {
  facilityId: string;
  timeZone: string;
  showBirthdaysWidget: boolean;
  includeExtended?: boolean;
};

const INACTIVE_RESIDENT_STATUSES: ResidentStatus[] = ["DISCHARGED", "TRANSFERRED", "DECEASED"];
const ACTIVE_RESIDENT_STATUSES: ResidentStatus[] = ["ACTIVE", "BED_BOUND"];
const ATTENDANCE_STATUS_META = [
  { status: "PRESENT_ACTIVE" as const, label: "Present/Active" },
  { status: "LEADING" as const, label: "Leading" },
  { status: "REFUSED" as const, label: "Refused" },
  { status: "NO_SHOW" as const, label: "No Show" }
];

function lowStockCountFromBudgetItems(items: Array<{ onHand: number; reorderPoint: number | null; parLevel: number }>) {
  return items.filter((item) => {
    const threshold = item.reorderPoint ?? Math.floor(item.parLevel * 0.3);
    return item.onHand <= Math.max(0, threshold);
  }).length;
}

function lowStockCountFromLegacyRows(rows: Array<{ onHand: number; reorderAt: number }>) {
  return rows.filter((row) => row.onHand < row.reorderAt).length;
}

function mapRecentTimestamp(value: Date, timeZone: string) {
  return formatInTimeZone(value, timeZone, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

async function computeDashboardSummary(args: {
  facilityId: string;
  timeZone: string;
  showBirthdaysWidget: boolean;
  includeExtended: boolean;
}): Promise<DashboardSummary> {
  const now = new Date();
  const dayStart = startOfZonedDay(now, args.timeZone);
  const dayEnd = endOfZonedDay(now, args.timeZone);
  const nextWeekStart = addZonedDays(dayStart, args.timeZone, 7);
  const nextWeekEnd = new Date(nextWeekStart.getTime() - 1);
  const attendanceWindowStart = startOfZonedMonthShift(now, args.timeZone, -1);
  const last30Start = subtractDays(now, 30);

  const residentWhere: Prisma.ResidentWhereInput = {
    facilityId: args.facilityId,
    OR: [{ isActive: true }, { status: { in: ACTIVE_RESIDENT_STATUSES } }],
    NOT: {
      status: {
        in: INACTIVE_RESIDENT_STATUSES
      }
    }
  };

  const [
    activeResidentCount,
    followUpResidentCount,
    todaysActivities,
    attendanceGroupsToday,
    carePlanDueSoonCount,
    carePlanOverdueCount,
    attendanceRowsForPreview,
    oneOnOneSnapshot,
    budgetStockRows,
    inventoryLegacyRows,
    prizeLegacyRows,
    recentNotes,
    recentResidents
  ] = await Promise.all([
    prisma.resident.count({ where: residentWhere }),
    prisma.resident.count({
      where: {
        ...residentWhere,
        followUpFlag: true
      }
    }),
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
        startAt: true
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
    prisma.carePlan.count({
      where: {
        status: "ACTIVE",
        nextReviewDate: {
          gte: dayStart,
          lte: nextWeekEnd
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
    prisma.attendance.findMany({
      where: {
        resident: residentWhere,
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: attendanceWindowStart,
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
    getOneOnOneSpotlightSnapshot({
      facilityId: args.facilityId,
      timeZone: args.timeZone
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
    }),
    prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId: args.facilityId
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        type: true,
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
    prisma.resident.findMany({
      where: residentWhere,
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        updatedAt: true
      }
    })
  ]);

  const lowStockAlertsCount = budgetStockRows.length > 0
    ? lowStockCountFromBudgetItems(budgetStockRows)
    : lowStockCountFromLegacyRows(inventoryLegacyRows) + lowStockCountFromLegacyRows(prizeLegacyRows);

  const attendanceCompletedIds = new Set(attendanceGroupsToday.map((item) => item.activityInstanceId));
  const attendancePendingCount = todaysActivities.reduce((count, item) => (
    attendanceCompletedIds.has(item.id) ? count : count + 1
  ), 0);

  const oneOnOneDueCount = oneOnOneSnapshot.queue.filter((item) => !item.completedAt && !item.skippedAt).length;
  const participationPreviewMetrics = computeFacilityPresenceMetrics({
    rows: attendanceRowsForPreview.map((row) => ({
      residentId: row.residentId,
      status: row.status,
      occurredAt: row.activityInstance.startAt
    })),
    activeResidentCount,
    now,
    timeZone: args.timeZone
  });

  const quickChips: DashboardQuickChip[] = [
    {
      key: "scheduled",
      label: "Today Scheduled",
      value: todaysActivities.length,
      helper: "Calendar",
      href: "/app/calendar?section=schedule&view=week",
      icon: "calendar"
    },
    {
      key: "attendancePending",
      label: "Attendance Pending",
      value: attendancePendingCount,
      helper: "Not completed",
      href: "/app/attendance",
      icon: "attendance"
    },
    {
      key: "oneOnOneDue",
      label: "1:1 Due Today",
      value: oneOnOneDueCount,
      helper: `${oneOnOneSnapshot.coverage.residentsWithOneOnOneThisMonth}/${oneOnOneSnapshot.coverage.totalEligibleResidents} this month`,
      href: "/app/notes/new?type=1on1",
      icon: "oneOnOne"
    },
    {
      key: "followUps",
      label: "Follow-ups",
      value: followUpResidentCount,
      helper: "Residents flagged",
      href: "/app/residents?filter=follow-up",
      icon: "followUp"
    },
    {
      key: "lowStock",
      label: "Low Stock",
      value: lowStockAlertsCount,
      helper: "Inventory alerts",
      href: "/app/dashboard/budget-stock?tab=stock&mode=LOW",
      icon: "inventory"
    },
    {
      key: "carePlanDue",
      label: "Care Plan Reviews",
      value: carePlanDueSoonCount,
      helper: "Due in next 7 days",
      href: "/app/care-plans?status=due-soon",
      icon: "carePlan"
    }
  ];

  const focusItems = oneOnOneSnapshot.queue.slice(0, 10).map((item) => ({
    id: item.id,
    residentId: item.residentId,
    residentName: item.residentName,
    room: item.room,
    statusLabel: item.statusLabel,
    reason: item.reason,
    lastOneOnOneAt: item.lastOneOnOneAt ? item.lastOneOnOneAt.toISOString() : null,
    daysSinceLastOneOnOne: item.daysSinceLastOneOnOne,
    href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(item.residentId)}`
  }));

  const recentFeed = [
    ...recentNotes.map((note) => ({
      id: `note:${note.id}`,
      title: `${note.type === "ONE_TO_ONE" ? "1:1" : "General"} note · ${note.resident.firstName} ${note.resident.lastName}`,
      subtitle: `Room ${note.resident.room} · ${note.createdByUser.name}`,
      timestamp: note.createdAt,
      href: `/app/notes/new?noteId=${encodeURIComponent(note.id)}&type=${note.type === "ONE_TO_ONE" ? "1on1" : "general"}`,
      type: "note" as const
    })),
    ...recentResidents.map((resident) => ({
      id: `resident:${resident.id}`,
      title: `Resident update · ${resident.firstName} ${resident.lastName}`,
      subtitle: `Room ${resident.room}`,
      timestamp: resident.updatedAt,
      href: `/app/residents?id=${encodeURIComponent(resident.id)}`,
      type: "resident" as const
    }))
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      timestamp: mapRecentTimestamp(item.timestamp, args.timeZone),
      href: item.href,
      type: item.type
    }));

  const alerts: DashboardAlertItem[] = [];

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
      detail: `${oneOnOneDueCount} residents remain in today’s 1:1 queue.`,
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

  if (followUpResidentCount > 0) {
    alerts.push({
      id: "follow-up-flagged",
      title: "Resident follow-ups flagged",
      detail: `${followUpResidentCount} residents have active follow-up flags.`,
      href: "/app/residents?filter=follow-up",
      tone: "default"
    });
  }

  let extended: DashboardExtendedSummary | null = null;

  if (args.includeExtended) {
    const [attendanceRowsLast30, birthdaysCandidates] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          resident: residentWhere,
          activityInstance: {
            facilityId: args.facilityId,
            startAt: {
              gte: last30Start,
              lte: now
            }
          }
        },
        select: {
          status: true
        }
      }),
      args.showBirthdaysWidget
        ? prisma.resident.findMany({
            where: {
              facilityId: args.facilityId,
              birthDate: {
                not: null
              },
              NOT: {
                status: {
                  in: INACTIVE_RESIDENT_STATUSES
                }
              }
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              room: true,
              birthDate: true
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
          })
        : Promise.resolve([])
    ]);

    const statusCounts: Record<"PRESENT_ACTIVE" | "LEADING" | "REFUSED" | "NO_SHOW", number> = {
      PRESENT_ACTIVE: 0,
      LEADING: 0,
      REFUSED: 0,
      NO_SHOW: 0
    };

    for (const row of attendanceRowsLast30) {
      if (row.status === "PRESENT" || row.status === "ACTIVE") {
        statusCounts.PRESENT_ACTIVE += 1;
      } else if (row.status === "LEADING") {
        statusCounts.LEADING += 1;
      } else if (row.status === "REFUSED") {
        statusCounts.REFUSED += 1;
      } else {
        statusCounts.NO_SHOW += 1;
      }
    }

    const totalAttendance30 = attendanceRowsLast30.length;
    const statusBreakdown = ATTENDANCE_STATUS_META.map((item) => {
      const count = statusCounts[item.status] ?? 0;
      const percent = totalAttendance30 === 0 ? 0 : Number(((count / totalAttendance30) * 100).toFixed(1));
      return {
        ...item,
        count,
        percent
      };
    });

    const todayMonthDay = formatInTimeZone(now, args.timeZone, {
      month: "2-digit",
      day: "2-digit"
    });

    const birthdaysToday = birthdaysCandidates
      .filter((resident) => {
        if (!resident.birthDate) return false;
        const residentMonthDay = formatInTimeZone(resident.birthDate, "UTC", {
          month: "2-digit",
          day: "2-digit"
        });
        return residentMonthDay === todayMonthDay;
      })
      .map((resident) => ({
        id: resident.id,
        residentName: `${resident.firstName} ${resident.lastName}`,
        room: resident.room
      }));

    extended = {
      schedulePreview: todaysActivities.slice(0, 6).map((item) => ({
        id: item.id,
        title: item.title,
        location: item.location,
        timeLabel: formatInTimeZone(item.startAt, args.timeZone, {
          hour: "numeric",
          minute: "2-digit"
        }),
        href: `/app/calendar?section=schedule&view=day&date=${encodeURIComponent(item.startAt.toISOString())}`
      })),
      birthdaysToday,
      participation: {
        activeResidentCount: participationPreviewMetrics.activeResidentCount,
        monthParticipationPercent: participationPreviewMetrics.currentMonthParticipationPercent,
        averageDailyPercent: participationPreviewMetrics.currentMonthAverageDailyPercent,
        monthOverMonthDelta: participationPreviewMetrics.monthOverMonthDelta
      },
      statusBreakdown
    };
  }

  return {
    generatedAt: now.toISOString(),
    dateLabel: formatInTimeZone(now, args.timeZone, {
      weekday: "long",
      month: "short",
      day: "numeric"
    }),
    quickStatusLine: `${todaysActivities.length} scheduled today · ${attendancePendingCount} attendance pending · ${oneOnOneDueCount} 1:1 due`,
    participationPreview: {
      averageDailyPercent: participationPreviewMetrics.currentMonthAverageDailyPercent,
      participationPercent: participationPreviewMetrics.currentMonthParticipationPercent,
      residentsParticipated: participationPreviewMetrics.currentMonthResidentsParticipated,
      totalAttendedResidents: participationPreviewMetrics.currentMonthTotalResidentsAttended,
      activeResidents: participationPreviewMetrics.activeResidentCount
    },
    quickChips,
    focus: {
      queueDateKey: oneOnOneSnapshot.dateKey,
      queueSize: oneOnOneSnapshot.queueSize,
      dueTodayCount: oneOnOneDueCount,
      residentsWithNoteThisMonth: oneOnOneSnapshot.coverage.residentsWithOneOnOneThisMonth,
      totalEligibleResidents: oneOnOneSnapshot.coverage.totalEligibleResidents,
      items: focusItems
    },
    recentItems: recentFeed,
    alerts: alerts.slice(0, 6),
    links: {
      focusViewAll: "/app/notes/new?type=1on1",
      activityFeed: "/app/dashboard/activity-feed",
      dashboardSettings: "/app/dashboard/settings"
    },
    extended
  };
}

function getCachedDashboardSummaryForFacility(facilityId: string) {
  return unstable_cache(
    async (timeZone: string, showBirthdaysWidget: boolean, includeExtended: boolean) =>
      computeDashboardSummary({
        facilityId,
        timeZone,
        showBirthdaysWidget,
        includeExtended
      }),
    ["dashboard-summary-v4", facilityId],
    {
      revalidate: 45,
      tags: [getDashboardSummaryCacheTag(facilityId)]
    }
  );
}

export async function getDashboardSummary(options: GetDashboardSummaryOptions): Promise<DashboardSummary> {
  const timeZone = resolveTimeZone(options.timeZone);
  const cachedForFacility = getCachedDashboardSummaryForFacility(options.facilityId);
  return cachedForFacility(
    timeZone,
    Boolean(options.showBirthdaysWidget),
    Boolean(options.includeExtended)
  );
}
