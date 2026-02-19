import { unstable_cache } from "next/cache";
import { Prisma, ResidentStatus } from "@prisma/client";

import { computeFacilityPresenceMetrics } from "@/lib/facility-presence";
import { parseAnalyticsFilters, resolveAnalyticsDateRange } from "@/lib/analytics/filters";
import type {
  AnalyticsFilterOptions,
  AnalyticsFilters,
  AnalyticsKpi,
  AnalyticsSnapshot
} from "@/lib/analytics/types";
import { prisma } from "@/lib/prisma";
import { asAttendanceRules } from "@/lib/settings/defaults";
import { formatInTimeZone, startOfZonedWeek, zonedDateKey } from "@/lib/timezone";

const SUPPORTIVE_STATUSES = new Set(["PRESENT", "ACTIVE", "LEADING"]);
const ACTIVE_RESIDENT_STATUSES: ResidentStatus[] = [ResidentStatus.ACTIVE, ResidentStatus.BED_BOUND];
const INACTIVE_RESIDENT_STATUSES: ResidentStatus[] = [
  ResidentStatus.DISCHARGED,
  ResidentStatus.TRANSFERRED,
  ResidentStatus.DECEASED
];

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseFocusAreas(value: Prisma.JsonValue | null | undefined) {
  if (!value) return [] as string[];
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function sliceNarrative(text: string | null | undefined, max = 120) {
  if (!text) return "";
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function createPreviousRange(start: Date, end: Date) {
  const windowMs = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - windowMs + 1);
  return { previousStart, previousEnd };
}

function splitStaffFilter(value: string | null) {
  if (!value) return { userId: null as string | null, volunteerId: null as string | null };
  if (value.startsWith("user:")) {
    return { userId: value.slice(5), volunteerId: null as string | null };
  }
  if (value.startsWith("volunteer:")) {
    return { userId: null as string | null, volunteerId: value.slice(10) };
  }
  return { userId: value, volunteerId: null as string | null };
}

const getAnalyticsFilterOptionsCached = unstable_cache(
  async (facilityId: string): Promise<AnalyticsFilterOptions> => {
    const [units, residents, categories, staff, volunteers] = await Promise.all([
      prisma.unit.findMany({
        where: { facilityId },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }),
      prisma.resident.findMany({
        where: {
          facilityId,
          OR: [{ isActive: true }, { status: { in: ACTIVE_RESIDENT_STATUSES } }],
          NOT: { status: { in: INACTIVE_RESIDENT_STATUSES } }
        },
        select: { id: true, firstName: true, lastName: true, room: true },
        orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
        take: 400
      }),
      prisma.activityTemplate.findMany({
        where: { facilityId },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" }
      }),
      prisma.user.findMany({
        where: { facilityId },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" }
      }),
      prisma.volunteer.findMany({
        where: { facilityId },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    ]);

    return {
      units: units.map((unit) => ({ id: unit.id, label: unit.name })),
      residents: residents.map((resident) => ({
        id: resident.id,
        label: `${resident.lastName}, ${resident.firstName}`,
        room: resident.room
      })),
      categories: categories.map((category) => ({
        key: category.category,
        label: category.category
      })),
      staffAndVolunteers: [
        ...staff.map((user) => ({
          id: `user:${user.id}`,
          label: `${user.name} (${toTitleCase(user.role)})`,
          type: "staff" as const
        })),
        ...volunteers.map((volunteer) => ({
          id: `volunteer:${volunteer.id}`,
          label: `${volunteer.name} (Volunteer)`,
          type: "volunteer" as const
        }))
      ]
    };
  },
  ["analytics-filter-options-v2"],
  { revalidate: 300 }
);

const getAnalyticsSnapshotCoreCached = unstable_cache(
  async (
    facilityId: string,
    timeZone: string,
    startIso: string,
    endIso: string,
    unitId: string,
    residentId: string,
    category: string,
    staffId: string
  ) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const { previousStart, previousEnd } = createPreviousRange(start, end);
    const now = new Date();
    const staffFilter = splitStaffFilter(staffId || null);

    const residentWhere: Prisma.ResidentWhereInput = {
      facilityId,
      OR: [{ isActive: true }, { status: { in: ACTIVE_RESIDENT_STATUSES } }],
      NOT: { status: { in: INACTIVE_RESIDENT_STATUSES } },
      ...(unitId ? { unitId } : {}),
      ...(residentId ? { id: residentId } : {})
    };

    const residents = await prisma.resident.findMany({
      where: residentWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true
      },
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    });

    const activeResidentIds = residents.map((resident) => resident.id);
    const residentIdFilter = activeResidentIds.length > 0 ? { in: activeResidentIds } : { in: ["__none__"] };

    const attendanceWhere: Prisma.AttendanceWhereInput = {
      residentId: residentIdFilter,
      activityInstance: {
        facilityId,
        startAt: { gte: start, lte: end },
        ...(category
          ? {
              template: {
                category
              }
            }
          : {})
      }
    };

    const previousAttendanceWhere: Prisma.AttendanceWhereInput = {
      residentId: residentIdFilter,
      activityInstance: {
        facilityId,
        startAt: { gte: previousStart, lte: previousEnd },
        ...(category
          ? {
              template: {
                category
              }
            }
          : {})
      }
    };

    const noteWhere: Prisma.ProgressNoteWhereInput = {
      residentId: residentIdFilter,
      createdAt: { gte: start, lte: end },
      ...(staffFilter.userId ? { createdByUserId: staffFilter.userId } : {})
    };

    const previousNoteWhere: Prisma.ProgressNoteWhereInput = {
      residentId: residentIdFilter,
      createdAt: { gte: previousStart, lte: previousEnd },
      ...(staffFilter.userId ? { createdByUserId: staffFilter.userId } : {})
    };

    const [attendanceRows, previousAttendanceRows, noteRows, previousNoteRows, carePlans, carePlanReviews, settings, volunteerVisits] =
      await Promise.all([
        prisma.attendance.findMany({
          where: attendanceWhere,
          select: {
            residentId: true,
            status: true,
            barrierReason: true,
            createdAt: true,
            activityInstance: {
              select: {
                id: true,
                title: true,
                location: true,
                startAt: true,
                template: {
                  select: {
                    id: true,
                    category: true
                  }
                }
              }
            }
          }
        }),
        prisma.attendance.findMany({
          where: previousAttendanceWhere,
          select: {
            residentId: true,
            status: true,
            barrierReason: true,
            activityInstance: {
              select: {
                startAt: true
              }
            }
          }
        }),
        prisma.progressNote.findMany({
          where: noteWhere,
          select: {
            id: true,
            residentId: true,
            type: true,
            createdAt: true,
            followUp: true,
            narrative: true,
            response: true,
            moodAffect: true,
            createdByUserId: true,
            resident: {
              select: {
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
        prisma.progressNote.findMany({
          where: previousNoteWhere,
          select: {
            id: true,
            type: true
          }
        }),
        prisma.carePlan.findMany({
          where: {
            residentId: residentIdFilter
          },
          select: {
            id: true,
            residentId: true,
            status: true,
            nextReviewDate: true,
            focusAreas: true,
            resident: {
              select: {
                firstName: true,
                lastName: true,
                room: true
              }
            }
          },
          orderBy: [{ updatedAt: "desc" }]
        }),
        prisma.carePlanReview.findMany({
          where: {
            reviewDate: { gte: start, lte: end },
            carePlan: {
              residentId: residentIdFilter
            }
          },
          select: {
            result: true
          }
        }),
        prisma.facilitySettings.findUnique({
          where: { facilityId },
          select: { attendanceRulesJson: true }
        }),
        prisma.volunteerVisit.findMany({
          where: {
            startAt: { gte: start, lte: end },
            volunteer: {
              facilityId
            },
            ...(staffFilter.volunteerId ? { volunteerId: staffFilter.volunteerId } : {})
          },
          select: {
            id: true,
            startAt: true,
            endAt: true,
            volunteer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
      ]);

    const residentMap = new Map(
      residents.map((resident) => [
        resident.id,
        {
          name: `${resident.firstName} ${resident.lastName}`,
          room: resident.room
        }
      ])
    );

    const weights = asAttendanceRules(settings?.attendanceRulesJson).engagementWeights;
    const scoreMap: Record<string, number> = {
      PRESENT: weights.present,
      ACTIVE: weights.active,
      LEADING: weights.leading,
      REFUSED: 0,
      NO_SHOW: 0
    };

    const attendanceCounts = {
      present: 0,
      active: 0,
      leading: 0,
      refused: 0,
      noShow: 0,
      total: attendanceRows.length
    };

    const attendeeCounts = new Map<string, number>();
    const barrierCounts = new Map<string, number>();
    const previousBarrierCounts = new Map<string, number>();
    const weeklyScores = new Map<string, { sum: number; count: number }>();
    const dailyBuckets = new Map<string, { date: Date; residents: Set<string>; entries: number }>();
    const categoryMixCounts = new Map<string, number>();
    const programCounts = new Map<string, { title: string; category: string; location: string; count: number }>();
    const locationCounts = new Map<string, number>();
    const supportiveResidents = new Set<string>();

    for (const row of attendanceRows) {
      if (row.status === "PRESENT") attendanceCounts.present += 1;
      if (row.status === "ACTIVE") attendanceCounts.active += 1;
      if (row.status === "LEADING") attendanceCounts.leading += 1;
      if (row.status === "REFUSED") attendanceCounts.refused += 1;
      if (row.status === "NO_SHOW") attendanceCounts.noShow += 1;

      if (row.barrierReason) {
        barrierCounts.set(row.barrierReason, (barrierCounts.get(row.barrierReason) ?? 0) + 1);
      }

      if (!SUPPORTIVE_STATUSES.has(row.status)) {
        continue;
      }

      supportiveResidents.add(row.residentId);
      attendeeCounts.set(row.residentId, (attendeeCounts.get(row.residentId) ?? 0) + 1);

      const weekLabel = formatInTimeZone(startOfZonedWeek(row.activityInstance.startAt, timeZone, 1), timeZone, {
        month: "short",
        day: "numeric"
      });
      const score = scoreMap[row.status] ?? 0;
      const weekCurrent = weeklyScores.get(weekLabel) ?? { sum: 0, count: 0 };
      weeklyScores.set(weekLabel, { sum: weekCurrent.sum + score, count: weekCurrent.count + 1 });

      const dayKey = zonedDateKey(row.activityInstance.startAt, timeZone);
      const dayCurrent = dailyBuckets.get(dayKey) ?? {
        date: row.activityInstance.startAt,
        residents: new Set<string>(),
        entries: 0
      };
      dayCurrent.entries += 1;
      dayCurrent.residents.add(row.residentId);
      dailyBuckets.set(dayKey, dayCurrent);

      const activityCategory = row.activityInstance.template?.category ?? "Uncategorized";
      categoryMixCounts.set(activityCategory, (categoryMixCounts.get(activityCategory) ?? 0) + 1);

      const location = row.activityInstance.location || "Unassigned";
      locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1);

      const programKey = `${row.activityInstance.title}__${activityCategory}__${location}`;
      const currentProgram = programCounts.get(programKey) ?? {
        title: row.activityInstance.title,
        category: activityCategory,
        location,
        count: 0
      };
      currentProgram.count += 1;
      programCounts.set(programKey, currentProgram);
    }

    for (const row of previousAttendanceRows) {
      if (row.barrierReason) {
        previousBarrierCounts.set(row.barrierReason, (previousBarrierCounts.get(row.barrierReason) ?? 0) + 1);
      }
    }

    const previousSupportiveResidents = new Set<string>();
    for (const row of previousAttendanceRows) {
      if (!SUPPORTIVE_STATUSES.has(row.status)) continue;
      previousSupportiveResidents.add(row.residentId);
    }

    const activeResidentCount = residents.length;
    const residentsParticipated = supportiveResidents.size;
    const participationPercent = percent(residentsParticipated, activeResidentCount);
    const previousParticipationPercent = percent(previousSupportiveResidents.size, activeResidentCount);
    const monthDeltaPercent = previousAttendanceRows.length > 0
      ? Number((participationPercent - previousParticipationPercent).toFixed(1))
      : null;

    const dailyParticipation = Array.from(dailyBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dayKey, bucket]) => {
        const participation = percent(bucket.residents.size, activeResidentCount);
        return {
          dayKey,
          label: formatInTimeZone(bucket.date, timeZone, { weekday: "short", month: "short", day: "numeric" }),
          uniqueResidents: bucket.residents.size,
          totalEntries: bucket.entries,
          participationPercent: participation
        };
      });

    const averageDailyPercent = dailyParticipation.length > 0
      ? Number(
          (
            dailyParticipation.reduce((sum, day) => sum + day.participationPercent, 0) /
            Math.max(dailyParticipation.length, 1)
          ).toFixed(1)
        )
      : 0;

    const topAttendees = residents
      .map((resident) => ({
        residentId: resident.id,
        residentName: `${resident.lastName}, ${resident.firstName}`,
        room: resident.room,
        attendedCount: attendeeCounts.get(resident.id) ?? 0,
        supportiveCount: attendeeCounts.get(resident.id) ?? 0
      }))
      .sort((a, b) => b.attendedCount - a.attendedCount);

    const topBarriers = Array.from(barrierCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([barrier, count]) => {
        const previousCount = previousBarrierCounts.get(barrier) ?? 0;
        return {
          barrier,
          count,
          previousCount,
          delta: count - previousCount
        };
      });

    const engagementTrend = Array.from(weeklyScores.entries()).map(([label, value]) => ({
      label,
      score: Number((value.sum / Math.max(value.count, 1)).toFixed(2)),
      entries: value.count
    }));

    const averageEngagementScore = Number(
      (
        attendanceRows.reduce((sum, row) => sum + (scoreMap[row.status] ?? 0), 0) /
        Math.max(attendanceRows.length, 1)
      ).toFixed(2)
    );

    const categoryMix = Array.from(categoryMixCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([categoryName, count]) => ({ category: categoryName, count }));

    const topPrograms = Array.from(programCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
      .map((item) => ({
        title: item.title,
        category: item.category,
        location: item.location,
        attendedCount: item.count
      }));

    const locationMix = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([location, count]) => ({ location, count }));

    const oneOnOneRows = noteRows.filter((note) => note.type === "ONE_TO_ONE");
    const previousOneOnOneRows = previousNoteRows.filter((note) => note.type === "ONE_TO_ONE");
    const notesWithFollowUp = oneOnOneRows.filter((note) => note.followUp && note.followUp.trim().length > 0).length;

    const oneOnOneByResident = new Map<string, { count: number; lastAt: Date }>();
    const moodBreakdownMap = new Map<string, number>();
    const responseBreakdownMap = new Map<string, number>();

    for (const note of oneOnOneRows) {
      const current = oneOnOneByResident.get(note.residentId) ?? {
        count: 0,
        lastAt: note.createdAt
      };
      current.count += 1;
      if (note.createdAt > current.lastAt) {
        current.lastAt = note.createdAt;
      }
      oneOnOneByResident.set(note.residentId, current);
      moodBreakdownMap.set(note.moodAffect, (moodBreakdownMap.get(note.moodAffect) ?? 0) + 1);
      responseBreakdownMap.set(note.response, (responseBreakdownMap.get(note.response) ?? 0) + 1);
    }

    const oneOnOneTopResidents = Array.from(oneOnOneByResident.entries())
      .map(([residentKey, value]) => {
        const residentMeta = residentMap.get(residentKey);
        return {
          residentId: residentKey,
          residentName: residentMeta?.name ?? "Unknown Resident",
          room: residentMeta?.room ?? "—",
          notesCount: value.count,
          lastNoteAt: value.lastAt.toISOString()
        };
      })
      .sort((a, b) => b.notesCount - a.notesCount)
      .slice(0, 60);

    const recentNotes = oneOnOneRows
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 40)
      .map((note) => ({
        id: note.id,
        residentName: `${note.resident.lastName}, ${note.resident.firstName}`,
        room: note.resident.room,
        createdAt: note.createdAt.toISOString(),
        response: toTitleCase(note.response),
        mood: toTitleCase(note.moodAffect),
        narrativePreview: sliceNarrative(note.narrative, 140)
      }));

    const carePlanCounts = {
      noPlan: 0,
      active: 0,
      dueSoon: 0,
      overdue: 0,
      archived: 0
    };
    const dueSoonBoundary = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const residentActivePlanMap = new Map<string, boolean>();
    const focusAreaMap = new Map<string, number>();
    const upcomingReviews: Array<{
      carePlanId: string;
      residentId: string;
      residentName: string;
      room: string;
      nextReviewDate: string;
      status: "DUE_SOON" | "OVERDUE" | "ACTIVE";
    }> = [];

    for (const plan of carePlans) {
      if (plan.status === "ARCHIVED") {
        carePlanCounts.archived += 1;
        continue;
      }

      residentActivePlanMap.set(plan.residentId, true);
      const reviewDate = plan.nextReviewDate;
      let status: "DUE_SOON" | "OVERDUE" | "ACTIVE" = "ACTIVE";
      if (reviewDate < now) {
        status = "OVERDUE";
        carePlanCounts.overdue += 1;
      } else if (reviewDate <= dueSoonBoundary) {
        status = "DUE_SOON";
        carePlanCounts.dueSoon += 1;
      } else {
        carePlanCounts.active += 1;
      }

      if (status !== "ACTIVE") {
        upcomingReviews.push({
          carePlanId: plan.id,
          residentId: plan.residentId,
          residentName: `${plan.resident.lastName}, ${plan.resident.firstName}`,
          room: plan.resident.room,
          nextReviewDate: reviewDate.toISOString(),
          status
        });
      }

      for (const focusArea of parseFocusAreas(plan.focusAreas)) {
        focusAreaMap.set(focusArea, (focusAreaMap.get(focusArea) ?? 0) + 1);
      }
    }

    carePlanCounts.noPlan = residents.filter((resident) => !residentActivePlanMap.has(resident.id)).length;

    const reviewResultsMap = new Map<string, number>();
    for (const review of carePlanReviews) {
      reviewResultsMap.set(review.result, (reviewResultsMap.get(review.result) ?? 0) + 1);
    }

    const focusAreas = Array.from(focusAreaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([focus, count]) => ({
        label: toTitleCase(focus),
        count
      }));

    const reviewResults = Array.from(reviewResultsMap.entries()).map(([result, count]) => ({
      result: toTitleCase(result),
      count
    }));

    const staffMap = new Map<string, { label: string; notesCount: number }>();
    for (const note of noteRows) {
      const label = note.createdByUser.name || "Unknown Staff";
      const current = staffMap.get(note.createdByUserId) ?? { label, notesCount: 0 };
      current.notesCount += 1;
      staffMap.set(note.createdByUserId, current);
    }

    const staffActivity = Array.from(staffMap.entries())
      .map(([id, value]) => ({
        id: `user:${id}`,
        label: value.label,
        notesCount: value.notesCount
      }))
      .sort((a, b) => b.notesCount - a.notesCount);

    const volunteerMap = new Map<string, { label: string; visits: number; hours: number }>();
    for (const visit of volunteerVisits) {
      const current = volunteerMap.get(visit.volunteer.id) ?? {
        label: visit.volunteer.name,
        visits: 0,
        hours: 0
      };
      current.visits += 1;
      if (visit.endAt) {
        const durationHours = Math.max(0, (visit.endAt.getTime() - visit.startAt.getTime()) / (60 * 60 * 1000));
        current.hours += durationHours;
      }
      volunteerMap.set(visit.volunteer.id, current);
    }

    const volunteerActivity = Array.from(volunteerMap.entries())
      .map(([id, value]) => ({
        id: `volunteer:${id}`,
        label: value.label,
        visits: value.visits,
        hours: Number(value.hours.toFixed(1))
      }))
      .sort((a, b) => b.visits - a.visits);

    const volunteerTotals = {
      visits: volunteerVisits.length,
      hours: Number(
        volunteerActivity.reduce((sum, volunteer) => sum + volunteer.hours, 0).toFixed(1)
      )
    };

    const facilityPresence = computeFacilityPresenceMetrics({
      rows: [...attendanceRows, ...previousAttendanceRows].map((row) => ({
        residentId: row.residentId,
        status: row.status,
        occurredAt: row.activityInstance.startAt
      })),
      activeResidentCount: residents.length,
      activeResidentIds,
      now: end,
      timeZone
    });

    return {
      attendance: {
        counts: attendanceCounts,
        topAttendees,
        topBarriers,
        engagementTrend,
        dailyParticipation,
        totalAttendedResidents: facilityPresence.currentMonthTotalResidentsAttended,
        residentsParticipated,
        participationPercent,
        averageDailyPercent,
        previousParticipationPercent,
        monthDeltaPercent
      },
      engagement: {
        averageEngagementScore,
        topBarriers,
        weeklyScores: engagementTrend,
        categoryMix,
        insightChips: [
          {
            label: `${attendanceCounts.present + attendanceCounts.active + attendanceCounts.leading} supportive attendance entries`,
            tone: "emerald" as const
          },
          {
            label: `${attendanceCounts.refused + attendanceCounts.noShow} refused/no-show entries`,
            tone: "rose" as const
          },
          {
            label: `${categoryMix[0]?.category ?? "No category data"} leads category mix`,
            tone: "violet" as const
          },
          {
            label: `Engagement score avg ${averageEngagementScore.toFixed(2)}`,
            tone: "sky" as const
          }
        ]
      },
      oneOnOne: {
        totalNotes: oneOnOneRows.length,
        previousTotalNotes: previousOneOnOneRows.length,
        notesWithFollowUp,
        topResidents: oneOnOneTopResidents,
        moodBreakdown: Array.from(moodBreakdownMap.entries()).map(([label, count]) => ({
          label: toTitleCase(label),
          count
        })),
        responseBreakdown: Array.from(responseBreakdownMap.entries()).map(([label, count]) => ({
          label: toTitleCase(label),
          count
        })),
        recentNotes
      },
      carePlan: {
        counts: carePlanCounts,
        upcomingReviews: upcomingReviews
          .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
          .slice(0, 40),
        reviewResults,
        focusAreas
      },
      programs: {
        topPrograms,
        categoryMix,
        locationMix
      },
      staffVolunteers: {
        staffActivity,
        volunteerActivity,
        volunteerTotals
      }
    };
  },
  ["analytics-snapshot-core-v3"],
  { revalidate: 60 }
);

export async function getAnalyticsSnapshot(params: {
  facilityId: string;
  timeZone: string;
  filters: AnalyticsFilters;
}): Promise<AnalyticsSnapshot> {
  const { facilityId, timeZone, filters } = params;
  const range = resolveAnalyticsDateRange(filters, timeZone);

  const [options, core] = await Promise.all([
    getAnalyticsFilterOptionsCached(facilityId),
    getAnalyticsSnapshotCoreCached(
      facilityId,
      timeZone,
      range.start.toISOString(),
      range.end.toISOString(),
      filters.unitId ?? "",
      filters.residentId ?? "",
      filters.category ?? "",
      filters.staffId ?? ""
    )
  ]);

  const monthKey = range.startKey.slice(0, 7);
  const kpis: AnalyticsKpi[] = [
    {
      key: "total-attended",
      label: "Total Attended Residents",
      value: String(core.attendance.totalAttendedResidents),
      detail: `${core.attendance.counts.present + core.attendance.counts.active + core.attendance.counts.leading} supportive attendance rows`,
      delta: core.attendance.monthDeltaPercent === null ? "No prior period comparison" : `${core.attendance.monthDeltaPercent > 0 ? "+" : ""}${core.attendance.monthDeltaPercent.toFixed(1)} pts`,
      trend:
        core.attendance.monthDeltaPercent === null
          ? "flat"
          : core.attendance.monthDeltaPercent > 0
            ? "up"
            : core.attendance.monthDeltaPercent < 0
              ? "down"
              : "flat",
      accent: "from-sky-500/35 to-indigo-500/10",
      icon: "users"
    },
    {
      key: "residents-participated",
      label: "Residents Participated",
      value: String(core.attendance.residentsParticipated),
      detail: `${core.attendance.residentsParticipated} of ${Math.max(core.attendance.topAttendees.length, 0)} filtered residents`,
      accent: "from-violet-500/35 to-fuchsia-500/10",
      icon: "user-check"
    },
    {
      key: "participation-percent",
      label: "Participation %",
      value: `${core.attendance.participationPercent.toFixed(1)}%`,
      detail: `Prior period: ${core.attendance.previousParticipationPercent.toFixed(1)}%`,
      delta:
        core.attendance.monthDeltaPercent === null
          ? "No prior period comparison"
          : `${core.attendance.monthDeltaPercent > 0 ? "+" : ""}${core.attendance.monthDeltaPercent.toFixed(1)} pts`,
      trend:
        core.attendance.monthDeltaPercent === null
          ? "flat"
          : core.attendance.monthDeltaPercent > 0
            ? "up"
            : core.attendance.monthDeltaPercent < 0
              ? "down"
              : "flat",
      accent: "from-emerald-500/35 to-cyan-500/10",
      icon: "percent"
    },
    {
      key: "average-daily",
      label: "Average Daily %",
      value: `${core.attendance.averageDailyPercent.toFixed(1)}%`,
      detail: `Across ${core.attendance.dailyParticipation.length || 1} day(s) in selected range`,
      accent: "from-amber-500/35 to-orange-500/10",
      icon: "pulse"
    },
    {
      key: "one-on-one",
      label: "1:1 Notes",
      value: String(core.oneOnOne.totalNotes),
      detail: `${core.oneOnOne.notesWithFollowUp} with follow-up`,
      delta:
        core.oneOnOne.previousTotalNotes === 0
          ? "No prior period notes"
          : `${core.oneOnOne.totalNotes - core.oneOnOne.previousTotalNotes >= 0 ? "+" : ""}${core.oneOnOne.totalNotes - core.oneOnOne.previousTotalNotes}`,
      trend:
        core.oneOnOne.totalNotes > core.oneOnOne.previousTotalNotes
          ? "up"
          : core.oneOnOne.totalNotes < core.oneOnOne.previousTotalNotes
            ? "down"
            : "flat",
      accent: "from-rose-500/35 to-pink-500/10",
      icon: "notes"
    },
    {
      key: "care-plan-upcoming",
      label: "Care Plan Reviews",
      value: String(core.carePlan.counts.dueSoon + core.carePlan.counts.overdue),
      detail: `${core.carePlan.counts.overdue} overdue · ${core.carePlan.counts.dueSoon} due soon`,
      accent: "from-blue-500/35 to-teal-500/10",
      icon: "care-plan"
    }
  ];

  return {
    range,
    options,
    kpis,
    attendance: core.attendance,
    engagement: core.engagement,
    oneOnOne: core.oneOnOne,
    carePlan: core.carePlan,
    programs: core.programs,
    staffVolunteers: core.staffVolunteers,
    exports: {
      monthlyReportPath: `/app/reports?month=${monthKey}`,
      attendanceCsvPath: `/api/attendance/reports/monthly?month=${monthKey}&format=csv`
    }
  };
}

export function parseAnalyticsFiltersFromSearch(searchParams?: Record<string, string | string[] | undefined>) {
  return parseAnalyticsFilters(searchParams);
}
