"use server";

import { revalidatePath } from "next/cache";
import { type Prisma, type ReviewResult } from "@prisma/client";

import { logAudit } from "@/lib/audit";
import { focusAreaLabel } from "@/lib/care-plans/enums";
import { stripDocumentationMeta } from "@/lib/documentation/meta";
import {
  type CarePlanReviewPayload,
  type CarePlanWizardPayload,
  carePlanReviewPayloadSchema,
  carePlanWizardPayloadSchema
} from "@/lib/care-plans/validation";
import {
  computeCarePlanDisplayStatus,
  displayStatusLabel,
  displayStatusTone,
  trendFromAttendanceCounts,
  trendFromReviewResult,
  type CarePlanDisplayStatus,
  type CarePlanTrend
} from "@/lib/care-plans/status";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildResidentCompletionsMap, getResidentAssessmentSchedule } from "@/lib/residents/assessment-due";

type DashboardStatusFilter = "ALL" | "NO_PLAN" | "ACTIVE" | "DUE_SOON" | "OVERDUE" | "ARCHIVED";

export type CarePlansDashboardFilters = {
  search?: string;
  status?: DashboardStatusFilter;
  bedBound?: boolean;
  primaryFocus?: string;
  unitId?: string;
};

export type CarePlanDashboardRow = {
  residentId: string;
  residentName: string;
  room: string;
  unitName: string | null;
  residentStatus: string;
  carePlanId: string | null;
  displayStatus: CarePlanDisplayStatus;
  displayStatusLabel: string;
  displayStatusTone: string;
  primaryFocuses: string[];
  primaryFocusLabels: string[];
  nextReviewDate: string | null;
  lastReviewDate: string | null;
  trend: CarePlanTrend;
};

export type CarePlansDashboardData = {
  rows: CarePlanDashboardRow[];
  counts: {
    total: number;
    noPlan: number;
    active: number;
    dueSoon: number;
    overdue: number;
    archived: number;
  };
  templatePickerResidents: Array<{
    id: string;
    name: string;
    room: string;
    unitName: string | null;
  }>;
};

type CarePlanWithRelations = Prisma.CarePlanGetPayload<{
  include: {
    goals: true;
    interventions: { orderBy: { order: "asc" } };
    reviews: { orderBy: { reviewDate: "desc" } };
  };
}>;

function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isoOrNull(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function filterStatuses(status: DashboardStatusFilter | undefined, rowStatus: CarePlanDisplayStatus) {
  if (!status || status === "ALL") return true;
  return status === rowStatus;
}

function compareByRoomThenName(
  a: { room: string; residentName: string },
  b: { room: string; residentName: string }
) {
  return a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" }) ||
    a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
}

function getTrendFromCountsOrReview(input: {
  currentWindowCount: number;
  previousWindowCount: number;
  latestReviewResult?: ReviewResult | null;
}): CarePlanTrend {
  if (input.currentWindowCount > 0 || input.previousWindowCount > 0) {
    return trendFromAttendanceCounts(input.currentWindowCount, input.previousWindowCount);
  }
  return trendFromReviewResult(input.latestReviewResult);
}

function getPrimaryFocusKeys(plan: CarePlanWithRelations | null): string[] {
  if (!plan) return [];
  return toStringArray(plan.focusAreas).slice(0, 5);
}

async function getResidentAndFacilityResidentId(residentId: string, facilityId: string) {
  const resident = await prisma.resident.findFirst({
    where: { id: residentId, facilityId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true
    }
  });
  if (!resident) {
    throw new Error("Resident not found for this facility.");
  }
  return resident;
}

function parseWizardPayload(payload: unknown): CarePlanWizardPayload {
  return carePlanWizardPayloadSchema.parse(payload);
}

function parseReviewPayload(payload: unknown): CarePlanReviewPayload {
  return carePlanReviewPayloadSchema.parse(payload);
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfCurrentMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAge(birthDate: Date | null, now: Date) {
  if (!birthDate) return null;
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function parseResidentTags(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function participationTrendLabel(trend: CarePlanTrend) {
  if (trend === "UP") return "Improving";
  if (trend === "DOWN") return "Needs attention";
  return "Stable";
}

function formatDueLabelFromIso(iso: string | null, now: Date) {
  if (!iso) return "Not scheduled";
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return "Not scheduled";
  const deltaDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (deltaDays < 0) return `Overdue by ${Math.abs(deltaDays)}d`;
  if (deltaDays === 0) return "Due today";
  if (deltaDays === 1) return "Due tomorrow";
  return `Due in ${deltaDays}d`;
}

export async function getCarePlansDashboardData(
  filters: CarePlansDashboardFilters = {}
): Promise<CarePlansDashboardData> {
  const context = await getFacilityContextWithSubscription("carePlan");
  const now = new Date();
  const fourteenDaysAgo = addDays(now, -14);
  const twentyEightDaysAgo = addDays(now, -28);

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      status: {
        notIn: ["DISCHARGED", "TRANSFERRED", "DECEASED"]
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
          id: true,
          name: true
        }
      }
    }
  });

  if (residents.length === 0) {
    return {
      rows: [],
      counts: { total: 0, noPlan: 0, active: 0, dueSoon: 0, overdue: 0, archived: 0 },
      templatePickerResidents: []
    };
  }

  const residentIds = residents.map((resident) => resident.id);
  const [plans, attendanceRows] = await Promise.all([
    prisma.carePlan.findMany({
      where: {
        residentId: { in: residentIds }
      },
      include: {
        goals: true,
        interventions: {
          orderBy: { order: "asc" }
        },
        reviews: {
          orderBy: { reviewDate: "desc" }
        }
      },
      orderBy: [{ updatedAt: "desc" }]
    }),
    prisma.attendance.findMany({
      where: {
        residentId: { in: residentIds },
        createdAt: { gte: twentyEightDaysAgo },
        status: { in: ["PRESENT", "ACTIVE", "LEADING"] }
      },
      select: {
        residentId: true,
        createdAt: true
      }
    })
  ]);

  const plansByResident = new Map<string, CarePlanWithRelations[]>();
  for (const plan of plans) {
    const bucket = plansByResident.get(plan.residentId) ?? [];
    bucket.push(plan);
    plansByResident.set(plan.residentId, bucket);
  }

  const attendanceCountMap = new Map<string, { current: number; previous: number }>();
  for (const row of attendanceRows) {
    const bucket = attendanceCountMap.get(row.residentId) ?? { current: 0, previous: 0 };
    if (row.createdAt >= fourteenDaysAgo) {
      bucket.current += 1;
    } else {
      bucket.previous += 1;
    }
    attendanceCountMap.set(row.residentId, bucket);
  }

  const allRows: CarePlanDashboardRow[] = residents.map((resident) => {
    const residentPlans = plansByResident.get(resident.id) ?? [];
    const activePlan = residentPlans.find((plan) => plan.status === "ACTIVE") ?? null;
    const chosenPlan = activePlan ?? residentPlans[0] ?? null;
    const primaryFocuses = getPrimaryFocusKeys(chosenPlan);
    const status = computeCarePlanDisplayStatus({
      hasPlan: Boolean(chosenPlan),
      archived: chosenPlan?.status === "ARCHIVED",
      nextReviewDate: chosenPlan?.nextReviewDate ?? null,
      now
    });

    const counts = attendanceCountMap.get(resident.id) ?? { current: 0, previous: 0 };
    const trend = getTrendFromCountsOrReview({
      currentWindowCount: counts.current,
      previousWindowCount: counts.previous,
      latestReviewResult: chosenPlan?.reviews[0]?.result ?? null
    });

    return {
      residentId: resident.id,
      residentName: `${resident.firstName} ${resident.lastName}`,
      room: resident.room,
      unitName: resident.unit?.name ?? null,
      residentStatus: resident.status,
      carePlanId: chosenPlan?.id ?? null,
      displayStatus: status,
      displayStatusLabel: displayStatusLabel(status),
      displayStatusTone: displayStatusTone(status),
      primaryFocuses,
      primaryFocusLabels: primaryFocuses.map((item) => focusAreaLabel(item)),
      nextReviewDate: isoOrNull(chosenPlan?.nextReviewDate),
      lastReviewDate: isoOrNull(chosenPlan?.reviews[0]?.reviewDate ?? null),
      trend
    };
  });

  const search = filters.search?.trim().toLowerCase() ?? "";
  const rows = allRows
    .filter((row) => {
      if (!search) return true;
      return row.residentName.toLowerCase().includes(search) || row.room.toLowerCase().includes(search);
    })
    .filter((row) => filterStatuses(filters.status, row.displayStatus))
    .filter((row) => (filters.bedBound ? row.residentStatus === "BED_BOUND" : true))
    .filter((row) => (filters.primaryFocus ? row.primaryFocuses.includes(filters.primaryFocus) : true))
    .filter((row) => (filters.unitId ? residents.find((item) => item.id === row.residentId)?.unit?.id === filters.unitId : true))
    .sort(compareByRoomThenName);

  const counts = {
    total: allRows.length,
    noPlan: allRows.filter((row) => row.displayStatus === "NO_PLAN").length,
    active: allRows.filter((row) => row.displayStatus === "ACTIVE").length,
    dueSoon: allRows.filter((row) => row.displayStatus === "DUE_SOON").length,
    overdue: allRows.filter((row) => row.displayStatus === "OVERDUE").length,
    archived: allRows.filter((row) => row.displayStatus === "ARCHIVED").length
  };

  return {
    rows,
    counts,
    templatePickerResidents: residents
      .map((resident) => ({
        id: resident.id,
        name: `${resident.firstName} ${resident.lastName}`,
        room: resident.room,
        unitName: resident.unit?.name ?? null
      }))
      .sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" }))
  };
}

export async function getResidentCarePlan(residentId: string) {
  const context = await getFacilityContextWithSubscription("carePlan");
  const now = new Date();
  const fourteenDaysAgo = addDays(now, -14);
  const twentyEightDaysAgo = addDays(now, -28);

  const resident = await prisma.resident.findFirst({
    where: {
      id: residentId,
      facilityId: context.facilityId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true,
      unit: { select: { name: true } }
    }
  });

  if (!resident) {
    return null;
  }

  const plans = await prisma.carePlan.findMany({
    where: { residentId },
    include: {
      goals: true,
      interventions: { orderBy: { order: "asc" } },
      reviews: { orderBy: { reviewDate: "desc" }, take: 30 }
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  const activePlan = plans.find((plan) => plan.status === "ACTIVE") ?? null;
  const selectedPlan = activePlan ?? plans[0] ?? null;

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      residentId,
      createdAt: { gte: twentyEightDaysAgo },
      status: { in: ["PRESENT", "ACTIVE", "LEADING"] }
    },
    select: { createdAt: true }
  });

  let currentCount = 0;
  let previousCount = 0;
  for (const row of attendanceRows) {
    if (row.createdAt >= fourteenDaysAgo) {
      currentCount += 1;
    } else {
      previousCount += 1;
    }
  }

  const displayStatus = computeCarePlanDisplayStatus({
    hasPlan: Boolean(selectedPlan),
    archived: selectedPlan?.status === "ARCHIVED",
    nextReviewDate: selectedPlan?.nextReviewDate ?? null,
    now
  });

  const trend = getTrendFromCountsOrReview({
    currentWindowCount: currentCount,
    previousWindowCount: previousCount,
    latestReviewResult: selectedPlan?.reviews[0]?.result ?? null
  });

  return {
    resident: {
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName}`,
      room: resident.room,
      status: resident.status,
      unitName: resident.unit?.name ?? null
    },
    plan: selectedPlan
      ? {
          ...selectedPlan,
          focusAreasList: toStringArray(selectedPlan.focusAreas),
          barriersList: toStringArray(selectedPlan.barriers),
          supportsList: toStringArray(selectedPlan.supports)
        }
      : null,
    displayStatus,
    displayStatusLabel: displayStatusLabel(displayStatus),
    displayStatusTone: displayStatusTone(displayStatus),
    trend
  };
}

export async function createCarePlan(residentId: string, payload: unknown) {
  const context = await getFacilityContextWithSubscription("carePlan");
  assertWritable(context.role);
  const parsed = parseWizardPayload(payload);
  await getResidentAndFacilityResidentId(residentId, context.facilityId);

  const created = await prisma.$transaction(async (tx) => {
    await tx.carePlan.updateMany({
      where: {
        residentId,
        status: "ACTIVE"
      },
      data: {
        status: "ARCHIVED",
        updatedByUserId: context.user.id
      }
    });

    const plan = await tx.carePlan.create({
      data: {
        residentId,
        status: parsed.status,
        focusAreas: parsed.focusAreas,
        barriers: parsed.barriers,
        supports: parsed.supports,
        preferencesText: parsed.preferencesText ?? null,
        safetyNotes: parsed.safetyNotes ?? null,
        frequency: parsed.frequency,
        frequencyCustom: parsed.frequency === "CUSTOM" ? parsed.frequencyCustom ?? null : null,
        nextReviewDate: parsed.nextReviewDate,
        createdByUserId: context.user.id,
        updatedByUserId: context.user.id
      }
    });

    await tx.carePlanGoalItem.createMany({
      data: parsed.goals.map((goal) => ({
        carePlanId: plan.id,
        templateKey: goal.templateKey ?? null,
        customText: goal.customText ?? null,
        baseline: goal.baseline,
        target: goal.target,
        timeframeDays: goal.timeframeDays
      }))
    });

    await tx.carePlanIntervention.createMany({
      data: parsed.interventions.map((intervention, index) => ({
        carePlanId: plan.id,
        title: intervention.title,
        type: intervention.type,
        bedBoundFriendly: intervention.bedBoundFriendly ?? false,
        dementiaFriendly: intervention.dementiaFriendly ?? false,
        lowVisionFriendly: intervention.lowVisionFriendly ?? false,
        hardOfHearingFriendly: intervention.hardOfHearingFriendly ?? false,
        order: index
      }))
    });

    return plan;
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "CREATE",
    entityType: "CarePlan2",
    entityId: created.id,
    after: created
  });

  revalidatePath("/app/care-plans");
  revalidatePath(`/app/residents/${residentId}/care-plan`);
  return created;
}

export async function updateCarePlan(carePlanId: string, payload: unknown) {
  const context = await getFacilityContextWithSubscription("carePlan");
  assertWritable(context.role);
  const parsed = parseWizardPayload(payload);

  const existing = await prisma.carePlan.findFirst({
    where: {
      id: carePlanId,
      resident: {
        facilityId: context.facilityId
      }
    }
  });

  if (!existing) {
    throw new Error("Care plan not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.carePlan.update({
      where: { id: carePlanId },
      data: {
        status: parsed.status,
        focusAreas: parsed.focusAreas,
        barriers: parsed.barriers,
        supports: parsed.supports,
        preferencesText: parsed.preferencesText ?? null,
        safetyNotes: parsed.safetyNotes ?? null,
        frequency: parsed.frequency,
        frequencyCustom: parsed.frequency === "CUSTOM" ? parsed.frequencyCustom ?? null : null,
        nextReviewDate: parsed.nextReviewDate,
        updatedByUserId: context.user.id
      }
    });

    await tx.carePlanGoalItem.deleteMany({ where: { carePlanId } });
    await tx.carePlanIntervention.deleteMany({ where: { carePlanId } });

    await tx.carePlanGoalItem.createMany({
      data: parsed.goals.map((goal) => ({
        carePlanId,
        templateKey: goal.templateKey ?? null,
        customText: goal.customText ?? null,
        baseline: goal.baseline,
        target: goal.target,
        timeframeDays: goal.timeframeDays
      }))
    });

    await tx.carePlanIntervention.createMany({
      data: parsed.interventions.map((intervention, index) => ({
        carePlanId,
        title: intervention.title,
        type: intervention.type,
        bedBoundFriendly: intervention.bedBoundFriendly ?? false,
        dementiaFriendly: intervention.dementiaFriendly ?? false,
        lowVisionFriendly: intervention.lowVisionFriendly ?? false,
        hardOfHearingFriendly: intervention.hardOfHearingFriendly ?? false,
        order: index
      }))
    });
  });

  const updated = await prisma.carePlan.findUnique({
    where: { id: carePlanId }
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "UPDATE",
    entityType: "CarePlan2",
    entityId: carePlanId,
    before: existing,
    after: updated
  });

  revalidatePath("/app/care-plans");
  revalidatePath(`/app/residents/${existing.residentId}/care-plan`);
  return updated;
}

export async function archiveCarePlan(carePlanId: string) {
  const context = await getFacilityContextWithSubscription("carePlan");
  assertWritable(context.role);

  const existing = await prisma.carePlan.findFirst({
    where: {
      id: carePlanId,
      resident: {
        facilityId: context.facilityId
      }
    }
  });

  if (!existing) {
    throw new Error("Care plan not found.");
  }

  const updated = await prisma.carePlan.update({
    where: { id: carePlanId },
    data: {
      status: "ARCHIVED",
      updatedByUserId: context.user.id
    }
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "ARCHIVE",
    entityType: "CarePlan2",
    entityId: carePlanId,
    before: existing,
    after: updated
  });

  revalidatePath("/app/care-plans");
  revalidatePath(`/app/residents/${existing.residentId}/care-plan`);
  return updated;
}

export async function createCarePlanReview(carePlanId: string, payload: unknown) {
  const context = await getFacilityContextWithSubscription("carePlan");
  assertWritable(context.role);
  const parsed = parseReviewPayload(payload);

  const existingPlan = await prisma.carePlan.findFirst({
    where: {
      id: carePlanId,
      resident: {
        facilityId: context.facilityId
      }
    },
    select: {
      id: true,
      residentId: true,
      nextReviewDate: true
    }
  });

  if (!existingPlan) {
    throw new Error("Care plan not found.");
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.carePlanReview.create({
      data: {
        carePlanId,
        reviewDate: parsed.reviewDate,
        result: parsed.result,
        participation: parsed.participation,
        response: parsed.response,
        workedChips: parsed.workedChips,
        adjustChips: parsed.adjustChips,
        note: parsed.note ?? null,
        nextReviewDateAfter: parsed.nextReviewDateAfter,
        createdByUserId: context.user.id
      }
    });

    await tx.carePlan.update({
      where: { id: carePlanId },
      data: {
        nextReviewDate: parsed.nextReviewDateAfter,
        updatedByUserId: context.user.id
      }
    });

    return created;
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "CREATE",
    entityType: "CarePlan2Review",
    entityId: review.id,
    after: review
  });

  revalidatePath("/app/care-plans");
  revalidatePath(`/app/residents/${existingPlan.residentId}/care-plan`);
  return review;
}

export async function exportCarePlanPdf(carePlanId: string) {
  const context = await getFacilityContextWithSubscription("carePlan");

  const carePlan = await prisma.carePlan.findFirst({
    where: {
      id: carePlanId,
      resident: {
        facilityId: context.facilityId
      }
    },
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          room: true
        }
      },
      goals: true,
      interventions: {
        orderBy: [{ type: "asc" }, { order: "asc" }]
      },
      reviews: {
        orderBy: { reviewDate: "desc" },
        take: 3
      }
    }
  });

  if (!carePlan) {
    throw new Error("Care plan not found.");
  }

  const displayStatus = computeCarePlanDisplayStatus({
    hasPlan: true,
    archived: carePlan.status === "ARCHIVED",
    nextReviewDate: carePlan.nextReviewDate
  });

  return {
    carePlanId: carePlan.id,
    resident: {
      id: carePlan.resident.id,
      name: `${carePlan.resident.firstName} ${carePlan.resident.lastName}`,
      room: carePlan.resident.room
    },
    status: displayStatusLabel(displayStatus),
    frequency: carePlan.frequency === "CUSTOM" ? carePlan.frequencyCustom || "Custom" : carePlan.frequency,
    nextReviewDate: carePlan.nextReviewDate,
    focusAreas: toStringArray(carePlan.focusAreas).map((item) => focusAreaLabel(item)),
    barriers: toStringArray(carePlan.barriers),
    supports: toStringArray(carePlan.supports),
    preferencesText: carePlan.preferencesText ?? "",
    safetyNotes: carePlan.safetyNotes ?? "",
    goals: carePlan.goals,
    interventions: carePlan.interventions,
    reviews: carePlan.reviews
  };
}

export async function getResidentActivitiesCarePlanData(residentId: string) {
  const context = await getFacilityContextWithSubscription("carePlan");
  const now = new Date();
  const thirtyDaysAgo = addDays(now, -30);
  const sevenDaysAgo = addDays(now, -7);
  const monthStart = startOfCurrentMonth(now);

  const base = await getResidentCarePlan(residentId);
  if (!base) return null;

  const [residentMeta, notes, attendanceRows] = await Promise.all([
    prisma.resident.findFirst({
      where: {
        id: residentId,
        facilityId: context.facilityId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        room: true,
        status: true,
        birthDate: true,
        admissionDate: true,
        mdsManualDueDate: true,
        preferences: true,
        safetyNotes: true,
        bestTimesOfDay: true,
        notes: true,
        tags: true,
        lastOneOnOneAt: true,
        followUpFlag: true,
        createdAt: true,
        unit: { select: { name: true } }
      }
    }),
    prisma.progressNote.findMany({
      where: {
        residentId,
        resident: {
          facilityId: context.facilityId
        }
      },
      orderBy: { createdAt: "desc" },
      take: 220,
      select: {
        id: true,
        type: true,
        narrative: true,
        createdAt: true,
        moodAffect: true,
        response: true,
        participationLevel: true,
        followUp: true,
        createdByUser: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.attendance.findMany({
      where: {
        residentId,
        resident: {
          facilityId: context.facilityId
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 260,
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
            startAt: true,
            template: {
              select: {
                category: true
              }
            }
          }
        }
      }
    })
  ]);

  if (!residentMeta) return null;

  const completionsMap = buildResidentCompletionsMap(
    notes.map((item) => ({
      residentId,
      narrative: item.narrative,
      createdAt: item.createdAt
    }))
  );

  const assessmentSchedule = getResidentAssessmentSchedule({
    admissionDate: residentMeta.admissionDate,
    residentCreatedAt: residentMeta.createdAt,
    mdsManualDueDate: residentMeta.mdsManualDueDate,
    status: residentMeta.status,
    completions: completionsMap.get(residentId) ?? null,
    now
  });

  const notesThisMonth = notes.filter((item) => item.createdAt >= monthStart);
  const oneToOneThisMonth = notesThisMonth.filter((item) => item.type === "ONE_TO_ONE").length;

  const attendance30 = attendanceRows;
  const attendance7 = attendanceRows.filter((item) => item.createdAt >= sevenDaysAgo);
  const present30 = attendance30.filter((item) => item.status === "PRESENT" || item.status === "ACTIVE" || item.status === "LEADING").length;
  const present7 = attendance7.filter((item) => item.status === "PRESENT" || item.status === "ACTIVE" || item.status === "LEADING").length;
  const refused30 = attendance30.filter((item) => item.status === "REFUSED").length;
  const total30 = attendance30.length;
  const total7 = attendance7.length;
  const participation30 = total30 > 0 ? clampPercent((present30 / total30) * 100) : 0;
  const participation7 = total7 > 0 ? clampPercent((present7 / total7) * 100) : 0;

  const oneOnOneNeededDays = residentMeta.lastOneOnOneAt
    ? Math.floor((now.getTime() - residentMeta.lastOneOnOneAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const oneOnOneNeeded = oneOnOneNeededDays == null ? true : oneOnOneNeededDays >= 30;

  const documentationCompletionPercent = clampPercent(
    ((notesThisMonth.filter((item) => !item.followUp).length || 0) / Math.max(1, notesThisMonth.length)) * 100
  );

  const responseCounts = {
    POSITIVE: notesThisMonth.filter((item) => item.response === "POSITIVE").length,
    NEUTRAL: notesThisMonth.filter((item) => item.response === "NEUTRAL").length,
    RESISTANT: notesThisMonth.filter((item) => item.response === "RESISTANT").length
  };
  const responseTotal = responseCounts.POSITIVE + responseCounts.NEUTRAL + responseCounts.RESISTANT;

  const categoryCounts = new Map<string, number>();
  const hourCounts = new Map<string, number>();
  for (const row of attendance30) {
    if (row.status !== "PRESENT" && row.status !== "ACTIVE" && row.status !== "LEADING") continue;
    const category = row.activityInstance.template?.category || "General";
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

    const hour = row.activityInstance.startAt.getHours();
    const bucket = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
    hourCounts.set(bucket, (hourCounts.get(bucket) ?? 0) + 1);
  }

  const mostAttendedCategory =
    [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Not enough data";
  const bestTimeWindow = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Not enough data";

  const latestMood = notesThisMonth[0]?.moodAffect ? titleCase(notesThisMonth[0].moodAffect) : "Baseline stable";
  const tags = parseResidentTags(residentMeta.tags);
  const residentChips = [
    ...tags.slice(0, 5),
    residentMeta.preferences?.toLowerCase().includes("music") ? "Enjoys music" : null,
    oneOnOneNeeded ? "1:1 needed" : "1:1 current"
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);

  const docs = notes.slice(0, 18).map((item) => {
    const kind =
      item.type === "ONE_TO_ONE"
        ? "ONE_TO_ONE"
        : item.narrative.includes("\"kind\":\"UDA\"")
          ? "UDA"
          : item.narrative.includes("\"kind\":\"MDS\"")
            ? "MDS"
            : "PROGRESS";

    const href =
      kind === "PROGRESS"
        ? `/app/documentation/progress-notes/${item.id}`
        : kind === "ONE_TO_ONE"
          ? `/app/documentation/one-to-one/${item.id}`
          : kind === "UDA"
            ? `/app/documentation/uda/${item.id}`
            : `/app/documentation/mds/${item.id}`;

    return {
      id: item.id,
      kind,
      title:
        kind === "PROGRESS"
          ? "Progress Note"
          : kind === "ONE_TO_ONE"
            ? "1:1 Note"
            : kind === "UDA"
              ? "UDA Assessment"
              : "MDS Section F",
      status: item.narrative.includes("\"status\":\"DRAFT\"")
        ? "Draft"
        : item.narrative.includes("\"status\":\"READY_REVIEW\"")
          ? "Ready Review"
          : "Completed",
      createdAtIso: item.createdAt.toISOString(),
      author: item.createdByUser.name,
      summary: stripDocumentationMeta(item.narrative),
      href
    };
  });

  const interdisciplinary = [
    {
      key: "activities",
      label: "Activities",
      state: notesThisMonth.length > 0 ? "Reviewed" : "Pending"
    },
    {
      key: "nursing",
      label: "Nursing",
      state: attendance30.length > 0 ? "Reviewed" : "Pending"
    },
    {
      key: "social",
      label: "Social Services",
      state: notesThisMonth.some((item) => stripDocumentationMeta(item.narrative).toLowerCase().includes("family")) ? "Reviewed" : "Pending"
    },
    {
      key: "therapy",
      label: "Therapy",
      state: attendance30.some((item) => item.barrierReason === "THERAPY") ? "Reviewed" : "Not Required"
    },
    {
      key: "dietary",
      label: "Dietary",
      state: "Not Required"
    },
    {
      key: "mds",
      label: "MDS Coordinator",
      state: docs.some((item) => item.kind === "MDS") ? "Reviewed" : "Pending"
    },
    {
      key: "resident",
      label: "Resident / Responsible Party",
      state: notesThisMonth.some((item) => Boolean(item.followUp && item.followUp.trim())) ? "Reviewed" : "Pending"
    }
  ] as const;

  return {
    resident: {
      id: residentMeta.id,
      name: `${residentMeta.firstName} ${residentMeta.lastName}`,
      firstName: residentMeta.firstName,
      lastName: residentMeta.lastName,
      preferredName: residentMeta.preferredName,
      room: residentMeta.room,
      status: residentMeta.status,
      unitName: residentMeta.unit?.name ?? null,
      birthDateIso: isoOrNull(residentMeta.birthDate),
      admissionDateIso: isoOrNull(residentMeta.admissionDate),
      createdAtIso: residentMeta.createdAt.toISOString(),
      age: formatAge(residentMeta.birthDate, now),
      tags,
      chips: residentChips,
      preferences: residentMeta.preferences,
      safetyNotes: residentMeta.safetyNotes,
      bestTimesOfDay: residentMeta.bestTimesOfDay,
      notes: residentMeta.notes,
      followUpFlag: residentMeta.followUpFlag,
      oneToOneNeeded: oneOnOneNeeded
    },
    plan: base.plan,
    displayStatus: base.displayStatus,
    displayStatusLabel: base.displayStatusLabel,
    displayStatusTone: base.displayStatusTone,
    trend: base.trend,
    summary: {
      activeFocuses: base.plan?.focusAreasList.length ?? 0,
      currentGoals: base.plan?.goals.length ?? 0,
      openInterventions: base.plan?.interventions.length ?? 0,
      oneToOneNeeded: oneOnOneNeeded,
      participationTrendLabel: participationTrendLabel(base.trend),
      refusalsThisMonth: refused30,
      nextReviewDateIso: base.plan ? base.plan.nextReviewDate.toISOString() : null,
      quarterlyLabel: formatDueLabelFromIso(assessmentSchedule.quarterly.dueDateIso, now),
      annualLabel: formatDueLabelFromIso(assessmentSchedule.annual.dueDateIso, now),
      mdsLabel: formatDueLabelFromIso(assessmentSchedule.mds.dueDateIso, now),
      documentationCompletionPercent
    },
    baseline: {
      communication: tags.some((item) => item.toLowerCase().includes("non verbal")) ? "Communication support needed" : "Verbal communication",
      cognition:
        notesThisMonth.some((item) => stripDocumentationMeta(item.narrative).toLowerCase().includes("cue"))
          ? "Cueing often needed"
          : "Consistent with baseline",
      mobility:
        residentMeta.status === "BED_BOUND"
          ? "Bedbound / room-based programming"
          : residentMeta.status === "ON_LEAVE"
            ? "On leave / variable attendance"
            : "Ambulates with support as needed",
      mood: latestMood,
      participation: participation30 >= 60 ? "Participation stable" : participation30 >= 40 ? "Participation variable" : "Low participation risk"
    },
    participation: {
      sevenDayPercent: participation7,
      thirtyDayPercent: participation30,
      groupAttendance30d: present30,
      oneToOneThisMonth,
      independentEngagement30d: notesThisMonth.filter((item) =>
        stripDocumentationMeta(item.narrative).toLowerCase().includes("independent")
      ).length,
      refusalsThisMonth: refused30,
      mostAttendedCategory,
      bestTimeWindow,
      responseBreakdown: {
        positivePercent: responseTotal ? clampPercent((responseCounts.POSITIVE / responseTotal) * 100) : 0,
        neutralPercent: responseTotal ? clampPercent((responseCounts.NEUTRAL / responseTotal) * 100) : 0,
        resistantPercent: responseTotal ? clampPercent((responseCounts.RESISTANT / responseTotal) * 100) : 0
      }
    },
    assessmentSchedule,
    docs,
    reviewTimeline: (base.plan?.reviews ?? []).map((review) => ({
      id: review.id,
      reviewDateIso: review.reviewDate.toISOString(),
      result: review.result,
      participation: review.participation,
      response: review.response,
      note: review.note,
      nextReviewDateAfterIso: review.nextReviewDateAfter.toISOString(),
      reason:
        review.note && review.note.toLowerCase().includes("annual")
          ? "Annual"
          : review.note && review.note.toLowerCase().includes("quarter")
            ? "Quarterly"
            : "Care Plan Review"
    })),
    interdisciplinary
  };
}
