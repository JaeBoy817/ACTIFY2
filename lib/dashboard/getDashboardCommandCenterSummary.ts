import { unstable_cache } from "next/cache";
import { AttendanceStatus, Prisma, ResidentStatus } from "@prisma/client";

import { getDashboardHomeSummary, type DashboardHomeSummary } from "@/lib/dashboard/getDashboardHomeSummary";
import { getDashboardSummaryCacheTag } from "@/lib/dashboard/getDashboardSummary";
import { prisma } from "@/lib/prisma";
import {
  addZonedDays,
  endOfZonedDay,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedMonthShift,
  subtractDays
} from "@/lib/timezone";

const INACTIVE_RESIDENT_STATUSES: ResidentStatus[] = ["DISCHARGED", "TRANSFERRED", "DECEASED"];
const ENGAGED_ATTENDANCE_STATUSES = new Set<AttendanceStatus>(["PRESENT", "ACTIVE", "LEADING"]);

type ModuleKey =
  | "calendar"
  | "attendance"
  | "notes"
  | "oneToOne"
  | "carePlan"
  | "budgetStock"
  | "volunteers"
  | "residentCouncil"
  | "reports"
  | "residents";

export type DashboardMission = {
  id: string;
  title: string;
  detail: string;
  href: string;
  ctaLabel: string;
  module: ModuleKey;
  priority: "high" | "medium" | "low";
};

export type DashboardTimelineItem = {
  id: string;
  title: string;
  location: string;
  templateSource: string | null;
  startAt: string;
  endAt: string;
  timeLabel: string;
  attendanceCompleted: boolean;
  documentationCompleted: boolean;
  isUpcoming: boolean;
  isInProgress: boolean;
  isNextUp: boolean;
  attendanceHref: string;
  openHref: string;
  editHref: string;
  noteHref: string;
};

export type DashboardResidentAttentionItem = {
  id: string;
  residentId: string;
  name: string;
  room: string;
  status: string;
  reason: string;
  chips: string[];
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export type DashboardResidentAttentionCategory = {
  key:
    | "needs-one-on-one"
    | "low-participation"
    | "new-admission"
    | "care-plan-overdue"
    | "resistant-trend"
    | "follow-up";
  title: string;
  description: string;
  module: ModuleKey;
  viewAllHref: string;
  items: DashboardResidentAttentionItem[];
};

export type DashboardMomentumSummary = {
  dailyParticipationRate: number;
  weeklyParticipationTrend: number;
  monthlyParticipationGoalProgress: number;
  monthlyOneOnOneCompletionRate: number;
  documentationCompletionRate: number;
  carePlanCompletionRate: number;
  miniSeries: number[];
};

export type DashboardInventoryPulse = {
  lowStockCount: number;
  lowStockItems: Array<{ id: string; name: string; category: string; onHand: number; threshold: number }>;
  monthSpending: number;
  mostUsedItems: Array<{ id: string; name: string; quantity: number; revenue: number; profit: number }>;
  belowThresholdCount: number;
};

export type DashboardNotesHub = {
  notesCreatedToday: number;
  oneToOneCreatedToday: number;
  overdueOneToOneCount: number;
  groupDocumentationMissingCount: number;
  recentActivity: Array<{
    id: string;
    residentName: string;
    room: string;
    type: "GROUP" | "ONE_TO_ONE";
    createdAt: string;
    href: string;
  }>;
};

export type DashboardUpcomingPlanning = {
  tomorrowActivityCount: number;
  nextOuting: {
    title: string;
    when: string;
    location: string;
    href: string;
  } | null;
  upcomingBirthdays: Array<{
    id: string;
    residentName: string;
    room: string;
    when: string;
  }>;
  volunteerCoverageSoon: {
    shifts: number;
    hours: number;
  };
  nextResidentCouncilMeeting: {
    when: string;
    attendanceCount: number;
    href: string;
  } | null;
  reportDueIndicator: {
    label: string;
    dueDate: string;
    daysRemaining: number;
    href: string;
  };
};

export type DashboardMoraleCard = {
  title: string;
  message: string;
  prompt: string;
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  href: string;
  module: ModuleKey;
};

export type DashboardCommandCenterSummary = {
  generatedAt: string;
  hero: {
    facilityName: string;
    dayOfWeek: string;
    fullDate: string;
    censusCount: number;
    scheduledTodayCount: number;
    oneToOneNeededThisMonthCount: number;
    overdueItemsCount: number;
    smartSummary: string;
  };
  base: DashboardHomeSummary;
  missions: DashboardMission[];
  timeline: DashboardTimelineItem[];
  residentAttention: DashboardResidentAttentionCategory[];
  momentum: DashboardMomentumSummary;
  inventoryPulse: DashboardInventoryPulse;
  notesHub: DashboardNotesHub;
  upcoming: DashboardUpcomingPlanning;
  morale: DashboardMoraleCard;
  quickActions: DashboardQuickAction[];
};

export type GetDashboardCommandCenterSummaryOptions = {
  facilityId: string;
  facilityName: string;
  timeZone: string;
};

const MORALE_ROTATION: readonly DashboardMoraleCard[] = [
  {
    title: "Confidence Boost",
    message: "The smallest well-run activity can reset someone’s entire day.",
    prompt: "Idea: Run a 10-minute music recall circle before lunch."
  },
  {
    title: "Activity Idea",
    message: "Try a low-prep table challenge with sensory props and color sorting.",
    prompt: "No-budget option: magazine collage stories with resident-led prompts."
  },
  {
    title: "Seasonal Prompt",
    message: "Use local weather memories to kick off conversation and life review.",
    prompt: "Prompt: “What was your favorite spring tradition growing up?”"
  },
  {
    title: "Sensory Suggestion",
    message: "Short sensory reset blocks can increase participation in the next session.",
    prompt: "Try: 8-minute tactile station before group trivia."
  }
];

function residentDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function statusLabel(status: ResidentStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toPercent(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildSmartSummary(input: {
  scheduledTodayCount: number;
  missingOneOnOneCount: number;
  overdueItemsCount: number;
  lowStockCount: number;
}) {
  const parts: string[] = [];

  if (input.scheduledTodayCount > 0) {
    parts.push(`${input.scheduledTodayCount} activities scheduled today`);
  }
  if (input.missingOneOnOneCount > 0) {
    parts.push(`${input.missingOneOnOneCount} residents still need 1:1 this month`);
  }
  if (input.overdueItemsCount > 0) {
    parts.push(`${input.overdueItemsCount} care plan or documentation items are overdue`);
  }
  if (input.lowStockCount > 0) {
    parts.push(`Prize or supply stock is low in ${input.lowStockCount} items`);
  }

  if (parts.length === 0) {
    return "Everything is caught up right now. Great position to plan ahead.";
  }

  return parts.slice(0, 3).join(" · ");
}

function hoursFromVisits(visits: Array<{ startAt: Date; endAt: Date | null }>) {
  if (visits.length === 0) return 0;
  const totalMs = visits.reduce((sum, visit) => {
    if (!visit.endAt) return sum;
    const delta = visit.endAt.getTime() - visit.startAt.getTime();
    return delta > 0 ? sum + delta : sum;
  }, 0);
  return Number((totalMs / (1000 * 60 * 60)).toFixed(1));
}

function pickMoraleCard(now: Date) {
  const index = Math.abs(Math.floor(now.getTime() / (1000 * 60 * 60 * 24))) % MORALE_ROTATION.length;
  return MORALE_ROTATION[index];
}

function isMissingPrismaResourceError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

async function withOptionalData<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (isMissingPrismaResourceError(error)) {
      return fallback;
    }
    throw error;
  }
}

async function computeDashboardCommandCenterSummary(args: {
  facilityId: string;
  facilityName: string;
  timeZone: string;
}): Promise<DashboardCommandCenterSummary> {
  const now = new Date();
  const dayStart = startOfZonedDay(now, args.timeZone);
  const dayEnd = endOfZonedDay(now, args.timeZone);
  const tomorrowStart = addZonedDays(dayStart, args.timeZone, 1);
  const tomorrowEnd = endOfZonedDay(tomorrowStart, args.timeZone);
  const weekWindowStart = addZonedDays(dayStart, args.timeZone, -6);
  const previousWeekStart = addZonedDays(dayStart, args.timeZone, -13);
  const previousWeekEnd = new Date(weekWindowStart.getTime() - 1);
  const monthStart = startOfZonedMonth(now, args.timeZone);
  const nextMonthStart = startOfZonedMonthShift(now, args.timeZone, 1);
  const monthEnd = new Date(nextMonthStart.getTime() - 1);
  const fourteenDaysAgo = subtractDays(now, 14);
  const admissionWindowStart = subtractDays(now, 45);
  const thirtyDaysAhead = addZonedDays(dayStart, args.timeZone, 30);
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

  const baseSummaryPromise = getDashboardHomeSummary({
    facilityId: args.facilityId,
    timeZone: args.timeZone
  });

  const [
    base,
    todaysActivities,
    todayAttendanceGroups,
    todayGroupNotes,
    monthlyGroupNotes,
    notesTodayTotal,
    oneToOneTodayCount,
    recentNotes,
    lowStockRows,
    monthSpendingAggregate,
    salesMonthRows,
    tomorrowActivityCount,
    nextOuting,
    activeResidentsWithBirthdays,
    volunteerSoonVisits,
    nextCouncilMeeting,
    unresolvedCouncilCount,
    residentsMissingOneToOneMonth,
    attendanceWeekRows,
    newAdmissionsMissingPrefs,
    carePlanOverdueRows,
    resistantTrendRows,
    followUpRows,
    carePlanCoverageRows,
    attendanceLast7Rows,
    attendancePrevious7Rows
  ] = await Promise.all([
    baseSummaryPromise,
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
        startAt: true,
        endAt: true,
        location: true,
        template: {
          select: {
            title: true
          }
        }
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
    prisma.progressNote.findMany({
      where: {
        type: "GROUP",
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      },
      select: {
        activityInstanceId: true
      },
      distinct: ["activityInstanceId"]
    }),
    prisma.progressNote.findMany({
      where: {
        type: "GROUP",
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: monthStart,
            lt: nextMonthStart
          }
        }
      },
      select: {
        activityInstanceId: true
      },
      distinct: ["activityInstanceId"]
    }),
    prisma.progressNote.count({
      where: {
        resident: {
          facilityId: args.facilityId
        },
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    }),
    prisma.progressNote.count({
      where: {
        resident: {
          facilityId: args.facilityId
        },
        type: "ONE_TO_ONE",
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    }),
    prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId: args.facilityId
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 6,
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
        }
      }
    }),
    withOptionalData(
      () =>
        prisma.budgetStockItem.findMany({
          where: {
            facilityId: args.facilityId,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            category: true,
            onHand: true,
            reorderPoint: true,
            parLevel: true
          }
        }),
      []
    ),
    withOptionalData(
      () =>
        prisma.budgetStockExpense.aggregate({
          where: {
            facilityId: args.facilityId,
            date: {
              gte: monthStart,
              lt: nextMonthStart
            }
          },
          _sum: {
            amount: true
          }
        }),
      { _sum: { amount: 0 } }
    ),
    withOptionalData(
      () =>
        prisma.budgetStockSale.findMany({
          where: {
            facilityId: args.facilityId,
            date: {
              gte: monthStart,
              lt: nextMonthStart
            }
          },
          select: {
            itemId: true,
            qty: true,
            revenue: true,
            profit: true,
            item: {
              select: {
                name: true
              }
            }
          }
        }),
      []
    ),
    prisma.activityInstance.count({
      where: {
        facilityId: args.facilityId,
        startAt: {
          gte: tomorrowStart,
          lte: tomorrowEnd
        }
      }
    }),
    prisma.activityInstance.findFirst({
      where: {
        facilityId: args.facilityId,
        startAt: {
          gte: now
        },
        OR: [
          { title: { contains: "outing", mode: "insensitive" } },
          { title: { contains: "trip", mode: "insensitive" } },
          { title: { contains: "special", mode: "insensitive" } }
        ]
      },
      orderBy: [{ startAt: "asc" }],
      select: {
        id: true,
        title: true,
        startAt: true,
        location: true
      }
    }),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        birthDate: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        birthDate: true
      }
    }),
    withOptionalData(
      () =>
        prisma.volunteerVisit.findMany({
          where: {
            startAt: {
              gte: dayStart,
              lte: sevenDaysAhead
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
      []
    ),
    withOptionalData(
      () =>
        prisma.residentCouncilMeeting.findFirst({
          where: {
            facilityId: args.facilityId,
            heldAt: {
              gte: now
            }
          },
          orderBy: [{ heldAt: "asc" }],
          select: {
            id: true,
            heldAt: true,
            attendanceCount: true
          }
        }),
      null
    ),
    withOptionalData(
      () =>
        prisma.residentCouncilItem.count({
          where: {
            status: "UNRESOLVED",
            meeting: {
              facilityId: args.facilityId
            }
          }
        }),
      0
    ),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        OR: [{ lastOneOnOneAt: null }, { lastOneOnOneAt: { lt: monthStart } }]
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 24,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        lastOneOnOneAt: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: weekWindowStart,
            lte: dayEnd
          }
        },
        resident: residentWhere
      },
      select: {
        residentId: true,
        status: true,
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        }
      }
    }),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        createdAt: {
          gte: admissionWindowStart
        },
        OR: [{ preferences: null }, { preferences: "" }]
      },
      orderBy: [{ createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.carePlan.findMany({
      where: {
        status: "ACTIVE",
        nextReviewDate: {
          lt: dayStart
        },
        resident: residentWhere
      },
      take: 16,
      orderBy: [{ nextReviewDate: "asc" }],
      select: {
        id: true,
        nextReviewDate: true,
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        }
      }
    }),
    prisma.progressNote.findMany({
      where: {
        type: "ONE_TO_ONE",
        createdAt: {
          gte: fourteenDaysAgo
        },
        resident: residentWhere,
        OR: [
          { response: "RESISTANT" },
          { moodAffect: "ANXIOUS" },
          { moodAffect: "AGITATED" },
          { moodAffect: "FLAT" }
        ]
      },
      orderBy: [{ createdAt: "desc" }],
      take: 30,
      select: {
        residentId: true,
        createdAt: true,
        response: true,
        moodAffect: true,
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        }
      }
    }),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        followUpFlag: true
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 16,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        updatedAt: true
      }
    }),
    prisma.carePlan.findMany({
      where: {
        status: "ACTIVE",
        resident: residentWhere
      },
      distinct: ["residentId"],
      select: {
        residentId: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: weekWindowStart,
            lte: dayEnd
          }
        },
        resident: residentWhere
      },
      select: {
        residentId: true,
        status: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: previousWeekStart,
            lte: previousWeekEnd
          }
        },
        resident: residentWhere
      },
      select: {
        residentId: true,
        status: true
      }
    })
  ]);

  const attendanceCompletedIds = new Set(todayAttendanceGroups.map((item) => item.activityInstanceId));
  const documentationCompletedIds = new Set(
    todayGroupNotes
      .map((item) => item.activityInstanceId)
      .filter((value): value is string => Boolean(value))
  );
  const monthlyDocumentationCoverageCount = monthlyGroupNotes.filter((row) => row.activityInstanceId).length;

  const timeline: DashboardTimelineItem[] = todaysActivities.map((activity): DashboardTimelineItem => {
    const isInProgress = now >= activity.startAt && now <= activity.endAt;
    const isUpcoming = now < activity.startAt;
    return {
      id: activity.id,
      title: activity.title,
      location: activity.location || "Location not set",
      templateSource: activity.template?.title ?? null,
      startAt: activity.startAt.toISOString(),
      endAt: activity.endAt.toISOString(),
      timeLabel: `${formatInTimeZone(activity.startAt, args.timeZone, {
        hour: "numeric",
        minute: "2-digit"
      })} - ${formatInTimeZone(activity.endAt, args.timeZone, {
        hour: "numeric",
        minute: "2-digit"
      })}`,
      attendanceCompleted: attendanceCompletedIds.has(activity.id),
      documentationCompleted: documentationCompletedIds.has(activity.id),
      isUpcoming,
      isInProgress,
      isNextUp: false,
      attendanceHref: `/app/attendance?activityId=${encodeURIComponent(activity.id)}`,
      openHref: `/app/calendar?view=day&date=${encodeURIComponent(activity.startAt.toISOString())}`,
      editHref: `/app/calendar?activityId=${encodeURIComponent(activity.id)}`,
      noteHref: `/app/notes/new?type=general&activityId=${encodeURIComponent(activity.id)}`
    };
  });

  const nextTimelineIndex = timeline.findIndex((row) => row.isUpcoming || row.isInProgress);
  if (nextTimelineIndex >= 0) {
    timeline[nextTimelineIndex] = {
      ...timeline[nextTimelineIndex],
      isNextUp: true
    };
  }

  const lowStockItems = lowStockRows
    .map((item) => {
      const threshold = item.reorderPoint ?? Math.floor(item.parLevel * 0.3);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        onHand: item.onHand,
        threshold: Math.max(0, threshold)
      };
    })
    .filter((item) => item.onHand <= item.threshold)
    .sort((a, b) => a.onHand - b.onHand);

  const salesByItem = new Map<string, { id: string; name: string; quantity: number; revenue: number; profit: number }>();
  for (const sale of salesMonthRows) {
    const key = sale.itemId;
    const existing = salesByItem.get(key) ?? {
      id: key,
      name: sale.item.name,
      quantity: 0,
      revenue: 0,
      profit: 0
    };
    existing.quantity += sale.qty;
    existing.revenue += sale.revenue;
    existing.profit += sale.profit;
    salesByItem.set(key, existing);
  }
  const mostUsedItems = Array.from(salesByItem.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4);

  const reportDueDaysRemaining = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const residentEngagementMap = new Map<
    string,
    {
      residentId: string;
      name: string;
      room: string;
      status: ResidentStatus;
      engagedCount: number;
      totalCount: number;
    }
  >();

  for (const row of attendanceWeekRows) {
    const resident = row.resident;
    const current = residentEngagementMap.get(row.residentId) ?? {
      residentId: row.residentId,
      name: residentDisplayName(resident.firstName, resident.lastName),
      room: resident.room,
      status: resident.status,
      engagedCount: 0,
      totalCount: 0
    };
    current.totalCount += 1;
    if (ENGAGED_ATTENDANCE_STATUSES.has(row.status)) {
      current.engagedCount += 1;
    }
    residentEngagementMap.set(row.residentId, current);
  }

  const lowParticipationItems: DashboardResidentAttentionItem[] = Array.from(residentEngagementMap.values())
    .filter((row) => row.totalCount >= 2 && row.engagedCount / row.totalCount < 0.4)
    .sort((a, b) => (a.engagedCount / a.totalCount) - (b.engagedCount / b.totalCount))
    .slice(0, 8)
    .map((row) => ({
      id: `low-part-${row.residentId}`,
      residentId: row.residentId,
      name: row.name,
      room: row.room,
      status: statusLabel(row.status),
      reason: `${row.engagedCount}/${row.totalCount} engaged sessions in the past week`,
      chips: ["Low participation"],
      primaryAction: {
        label: "Open resident",
        href: `/app/residents?residentId=${encodeURIComponent(row.residentId)}`
      },
      secondaryAction: {
        label: "Add 1:1 note",
        href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(row.residentId)}`
      }
    }));

  const resistantByResident = new Map<
    string,
    {
      residentId: string;
      name: string;
      room: string;
      status: ResidentStatus;
      count: number;
      latestAt: Date;
    }
  >();

  for (const row of resistantTrendRows) {
    const existing = resistantByResident.get(row.residentId);
    if (existing) {
      existing.count += 1;
      if (row.createdAt > existing.latestAt) {
        existing.latestAt = row.createdAt;
      }
      continue;
    }

    resistantByResident.set(row.residentId, {
      residentId: row.residentId,
      name: residentDisplayName(row.resident.firstName, row.resident.lastName),
      room: row.resident.room,
      status: row.resident.status,
      count: 1,
      latestAt: row.createdAt
    });
  }

  const resistantTrendItems: DashboardResidentAttentionItem[] = Array.from(resistantByResident.values())
    .sort((a, b) => b.count - a.count || b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, 8)
    .map((row) => ({
      id: `resist-${row.residentId}`,
      residentId: row.residentId,
      name: row.name,
      room: row.room,
      status: statusLabel(row.status),
      reason: `${row.count} resistant/withdrawn note signals in the last 14 days`,
      chips: ["Behavioral trend"],
      primaryAction: {
        label: "Start 1:1 note",
        href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(row.residentId)}`
      },
      secondaryAction: {
        label: "Open care plan",
        href: `/app/residents/${encodeURIComponent(row.residentId)}/care-plan`
      }
    }));

  const residentAttention: DashboardResidentAttentionCategory[] = [
    {
      key: "needs-one-on-one",
      title: "Needs 1:1 this month",
      description: "Residents with no logged 1:1 note in the current month.",
      module: "oneToOne",
      viewAllHref: "/app/notes/new?type=1on1",
      items: residentsMissingOneToOneMonth.slice(0, 8).map((resident) => ({
        id: `1on1-${resident.id}`,
        residentId: resident.id,
        name: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        status: statusLabel(resident.status),
        reason: resident.lastOneOnOneAt
          ? `Last 1:1 on ${formatInTimeZone(resident.lastOneOnOneAt, args.timeZone, {
              month: "short",
              day: "numeric"
            })}`
          : "No 1:1 note logged yet",
        chips: ["1:1 pending"],
        primaryAction: {
          label: "Start note",
          href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(resident.id)}`
        },
        secondaryAction: {
          label: "Resident profile",
          href: `/app/residents?residentId=${encodeURIComponent(resident.id)}`
        }
      }))
    },
    {
      key: "low-participation",
      title: "Low participation this week",
      description: "Residents with low engaged attendance ratios this week.",
      module: "attendance",
      viewAllHref: "/app/attendance/residents",
      items: lowParticipationItems
    },
    {
      key: "new-admission",
      title: "New admission missing preferences",
      description: "Recently added residents without activity preferences documented.",
      module: "residents",
      viewAllHref: "/app/residents",
      items: newAdmissionsMissingPrefs.slice(0, 8).map((resident) => ({
        id: `new-${resident.id}`,
        residentId: resident.id,
        name: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        status: statusLabel(resident.status),
        reason: `Admitted ${formatInTimeZone(resident.createdAt, args.timeZone, {
          month: "short",
          day: "numeric"
        })} with no preference profile`,
        chips: ["New admission"],
        primaryAction: {
          label: "Add preferences",
          href: `/app/residents?residentId=${encodeURIComponent(resident.id)}`
        }
      }))
    },
    {
      key: "care-plan-overdue",
      title: "Care plan review overdue",
      description: "Residents with care plans past next review date.",
      module: "carePlan",
      viewAllHref: "/app/care-plans?status=overdue",
      items: carePlanOverdueRows.slice(0, 8).map((plan) => ({
        id: `cp-${plan.id}`,
        residentId: plan.resident.id,
        name: residentDisplayName(plan.resident.firstName, plan.resident.lastName),
        room: plan.resident.room,
        status: statusLabel(plan.resident.status),
        reason: `Review due ${formatInTimeZone(plan.nextReviewDate, args.timeZone, {
          month: "short",
          day: "numeric"
        })}`,
        chips: ["Care plan overdue"],
        primaryAction: {
          label: "Open care plan",
          href: `/app/residents/${encodeURIComponent(plan.resident.id)}/care-plan`
        }
      }))
    },
    {
      key: "resistant-trend",
      title: "Recent resistant/withdrawn trend",
      description: "Residents with recurring resistant or withdrawn response markers.",
      module: "notes",
      viewAllHref: "/app/notes?type=1on1",
      items: resistantTrendItems
    },
    {
      key: "follow-up",
      title: "Follow-up recommended",
      description: "Residents flagged for follow-up from recent notes and workflows.",
      module: "notes",
      viewAllHref: "/app/residents?filter=follow-up",
      items: followUpRows.slice(0, 8).map((resident) => ({
        id: `follow-${resident.id}`,
        residentId: resident.id,
        name: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        status: statusLabel(resident.status),
        reason: `Follow-up flag active as of ${formatInTimeZone(resident.updatedAt, args.timeZone, {
          month: "short",
          day: "numeric"
        })}`,
        chips: ["Follow-up"],
        primaryAction: {
          label: "Add follow-up note",
          href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(resident.id)}`
        },
        secondaryAction: {
          label: "Open resident",
          href: `/app/residents?residentId=${encodeURIComponent(resident.id)}`
        }
      }))
    }
  ];

  const attendanceWeekEngagedCount = attendanceLast7Rows.reduce((sum, row) => (
    ENGAGED_ATTENDANCE_STATUSES.has(row.status) ? sum + 1 : sum
  ), 0);
  const attendancePrevWeekEngagedCount = attendancePrevious7Rows.reduce((sum, row) => (
    ENGAGED_ATTENDANCE_STATUSES.has(row.status) ? sum + 1 : sum
  ), 0);
  const weeklyParticipationTrend = attendancePrevWeekEngagedCount === 0
    ? attendanceWeekEngagedCount > 0 ? 100 : 0
    : Math.round(((attendanceWeekEngagedCount - attendancePrevWeekEngagedCount) / attendancePrevWeekEngagedCount) * 100);

  const monthlyParticipationGoalProgress = clampPercent((base.analytics.month.participationPercent / 70) * 100);
  const monthlyOneOnOneCompletionRate = toPercent(
    base.oneToOne.residentsWithNoteThisMonth,
    base.oneToOne.totalEligibleResidents
  );
  const documentationCompletionRate = toPercent(
    monthlyDocumentationCoverageCount,
    Math.max(1, base.monthlyMetrics.totalPrograms)
  );
  const carePlanCompletionRate = toPercent(
    carePlanCoverageRows.length,
    Math.max(1, base.participationPreview.activeResidents)
  );

  const momentum: DashboardMomentumSummary = {
    dailyParticipationRate: clampPercent(base.analytics.today.participationPercent),
    weeklyParticipationTrend,
    monthlyParticipationGoalProgress,
    monthlyOneOnOneCompletionRate,
    documentationCompletionRate,
    carePlanCompletionRate,
    miniSeries: [
      clampPercent(base.analytics.today.participationPercent),
      clampPercent(base.analytics.month.averageDailyPercent),
      clampPercent(monthlyOneOnOneCompletionRate),
      clampPercent(documentationCompletionRate),
      clampPercent(carePlanCompletionRate)
    ]
  };

  const notesHub: DashboardNotesHub = {
    notesCreatedToday: notesTodayTotal,
    oneToOneCreatedToday: oneToOneTodayCount,
    overdueOneToOneCount: base.oneToOne.missingThisMonthCount,
    groupDocumentationMissingCount: Math.max(0, timeline.filter((row) => !row.documentationCompleted).length),
    recentActivity: recentNotes.map((note) => ({
      id: note.id,
      residentName: residentDisplayName(note.resident.firstName, note.resident.lastName),
      room: note.resident.room,
      type: note.type,
      createdAt: formatInTimeZone(note.createdAt, args.timeZone, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }),
      href: `/app/notes/new?type=${note.type === "ONE_TO_ONE" ? "1on1" : "general"}&noteId=${encodeURIComponent(note.id)}`
    }))
  };

  const upcomingBirthdays = activeResidentsWithBirthdays
    .map((resident) => {
      if (!resident.birthDate) return null;
      const birthDate = resident.birthDate;
      const thisYear = Number(formatInTimeZone(now, args.timeZone, { year: "numeric" }));
      const month = Number(formatInTimeZone(birthDate, "UTC", { month: "numeric" }));
      const day = Number(formatInTimeZone(birthDate, "UTC", { day: "numeric" }));
      const thisYearBirthday = new Date(Date.UTC(thisYear, month - 1, day, 12, 0, 0));
      const nextBirthday = thisYearBirthday >= now
        ? thisYearBirthday
        : new Date(Date.UTC(thisYear + 1, month - 1, day, 12, 0, 0));
      if (nextBirthday > thirtyDaysAhead) {
        return null;
      }
      return {
        id: resident.id,
        residentName: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        when: formatInTimeZone(nextBirthday, args.timeZone, {
          month: "short",
          day: "numeric"
        }),
        dateValue: nextBirthday.getTime()
      };
    })
    .filter((item): item is { id: string; residentName: string; room: string; when: string; dateValue: number } => Boolean(item))
    .sort((a, b) => a.dateValue - b.dateValue)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      residentName: item.residentName,
      room: item.room,
      when: item.when
    }));

  const upcoming: DashboardUpcomingPlanning = {
    tomorrowActivityCount,
    nextOuting: nextOuting
      ? {
          title: nextOuting.title,
          when: formatInTimeZone(nextOuting.startAt, args.timeZone, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          }),
          location: nextOuting.location || "Location not set",
          href: `/app/calendar?view=day&date=${encodeURIComponent(nextOuting.startAt.toISOString())}`
        }
      : null,
    upcomingBirthdays,
    volunteerCoverageSoon: {
      shifts: volunteerSoonVisits.length,
      hours: hoursFromVisits(volunteerSoonVisits)
    },
    nextResidentCouncilMeeting: nextCouncilMeeting
      ? {
          when: formatInTimeZone(nextCouncilMeeting.heldAt, args.timeZone, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          }),
          attendanceCount: nextCouncilMeeting.attendanceCount,
          href: `/app/resident-council/meetings/${encodeURIComponent(nextCouncilMeeting.id)}`
        }
      : null,
    reportDueIndicator: {
      label: "Monthly reports due",
      dueDate: formatInTimeZone(monthEnd, args.timeZone, {
        month: "short",
        day: "numeric"
      }),
      daysRemaining: reportDueDaysRemaining,
      href: "/app/reports"
    }
  };

  const overdueItemsCount =
    base.oneToOne.missingThisMonthCount +
    base.alerts.items.filter((alert) => alert.id === "careplan-overdue" || alert.id === "attendance-pending").length;

  const missions: DashboardMission[] = [
    {
      id: "mission-calendar",
      title: "Run Today’s Schedule",
      detail: `${timeline.length} activities queued with ${timeline.filter((row) => !row.attendanceCompleted).length} attendance tasks open.`,
      href: "/app/calendar?view=day",
      ctaLabel: "Open calendar",
      module: "calendar",
      priority: timeline.length > 0 ? "high" : "medium"
    },
    {
      id: "mission-1on1",
      title: "Complete 1:1 Visits",
      detail: `${base.oneToOne.missingThisMonthCount} residents still need a monthly 1:1 note.`,
      href: "/app/notes/new?type=1on1",
      ctaLabel: "Start 1:1",
      module: "oneToOne",
      priority: base.oneToOne.missingThisMonthCount > 0 ? "high" : "low"
    },
    {
      id: "mission-documentation",
      title: "Document Today’s Activities",
      detail: `${notesHub.groupDocumentationMissingCount} activities still missing group documentation.`,
      href: "/app/notes/new?type=general",
      ctaLabel: "Add note",
      module: "notes",
      priority: notesHub.groupDocumentationMissingCount > 0 ? "high" : "medium"
    },
    {
      id: "mission-participation",
      title: "Review Low Participation",
      detail: `${lowParticipationItems.length} residents surfaced for low participation this week.`,
      href: "/app/attendance/residents",
      ctaLabel: "Review residents",
      module: "attendance",
      priority: lowParticipationItems.length > 0 ? "medium" : "low"
    },
    {
      id: "mission-stock",
      title: "Restock Prize Cart",
      detail: `${lowStockItems.length} inventory items are below threshold.`,
      href: "/app/dashboard/budget-stock?tab=stock&mode=LOW",
      ctaLabel: "Open stock",
      module: "budgetStock",
      priority: lowStockItems.length > 0 ? "high" : "low"
    },
    {
      id: "mission-council",
      title: "Prepare Resident Council",
      detail: `${unresolvedCouncilCount} unresolved council items need follow-through.`,
      href: "/app/resident-council",
      ctaLabel: "Open council",
      module: "residentCouncil",
      priority: unresolvedCouncilCount > 0 ? "medium" : "low"
    }
  ];

  const quickActions: DashboardQuickAction[] = [
    { id: "new-activity", label: "New Activity", href: "/app/calendar?quickAdd=1", module: "calendar" },
    { id: "new-note", label: "New Note", href: "/app/notes/new?type=general", module: "notes" },
    { id: "new-1on1", label: "New 1:1 Note", href: "/app/notes/new?type=1on1", module: "oneToOne" },
    { id: "attendance", label: "Add Attendance", href: "/app/attendance", module: "attendance" },
    { id: "search-resident", label: "Search Resident", href: "/app/residents", module: "residents" },
    { id: "update-care-plan", label: "Update Care Plan", href: "/app/care-plans", module: "carePlan" },
    { id: "inventory", label: "Add Inventory", href: "/app/dashboard/budget-stock?open=inventory", module: "budgetStock" },
    { id: "reports", label: "Open Reports", href: "/app/reports", module: "reports" }
  ];

  return {
    generatedAt: now.toISOString(),
    hero: {
      facilityName: args.facilityName,
      dayOfWeek: formatInTimeZone(now, args.timeZone, { weekday: "long" }),
      fullDate: formatInTimeZone(now, args.timeZone, {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      censusCount: base.participationPreview.activeResidents,
      scheduledTodayCount: timeline.length,
      oneToOneNeededThisMonthCount: base.oneToOne.missingThisMonthCount,
      overdueItemsCount,
      smartSummary: buildSmartSummary({
        scheduledTodayCount: timeline.length,
        missingOneOnOneCount: base.oneToOne.missingThisMonthCount,
        overdueItemsCount,
        lowStockCount: lowStockItems.length
      })
    },
    base,
    missions,
    timeline,
    residentAttention,
    momentum,
    inventoryPulse: {
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 6),
      monthSpending: Number((monthSpendingAggregate._sum.amount ?? 0).toFixed(2)),
      mostUsedItems,
      belowThresholdCount: lowStockItems.length
    },
    notesHub,
    upcoming,
    morale: pickMoraleCard(now),
    quickActions
  };
}

function getCachedDashboardCommandCenterSummary(facilityId: string, facilityName: string) {
  return unstable_cache(
    async (timeZone: string) =>
      computeDashboardCommandCenterSummary({
        facilityId,
        facilityName,
        timeZone
      }),
    ["dashboard-command-center-v1", facilityId, facilityName],
    {
      revalidate: 45,
      tags: [getDashboardSummaryCacheTag(facilityId)]
    }
  );
}

export async function getDashboardCommandCenterSummary(
  options: GetDashboardCommandCenterSummaryOptions
): Promise<DashboardCommandCenterSummary> {
  const timeZone = resolveTimeZone(options.timeZone);
  const getCached = getCachedDashboardCommandCenterSummary(options.facilityId, options.facilityName);
  return getCached(timeZone);
}
