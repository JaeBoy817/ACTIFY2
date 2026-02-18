"use server";

import { revalidatePath } from "next/cache";
import { type Prisma, type ReviewResult } from "@prisma/client";

import { logAudit } from "@/lib/audit";
import { focusAreaLabel } from "@/lib/care-plans/enums";
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
