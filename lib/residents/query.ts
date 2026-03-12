import { Prisma } from "@prisma/client";

export const residentListContextQuery = Prisma.validator<Prisma.ResidentDefaultArgs>()({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    preferredName: true,
    room: true,
    unitId: true,
    unit: {
      select: {
        id: true,
        name: true
      }
    },
    status: true,
    birthDate: true,
    admissionDate: true,
    mdsManualDueDate: true,
    bestTimesOfDay: true,
    notes: true,
    preferences: true,
    safetyNotes: true,
    tags: true,
    lastOneOnOneAt: true,
    followUpFlag: true,
    createdAt: true,
    updatedAt: true,
    carePlans: {
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: {
        focusAreas: true,
        nextReviewDate: true
      }
    },
    progressNotes: {
      where: { type: "ONE_TO_ONE" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        narrative: true
      }
    }
  }
});

export type ResidentListContextRow = Prisma.ResidentGetPayload<typeof residentListContextQuery>;

export const residentListContextLegacyQuery = Prisma.validator<Prisma.ResidentDefaultArgs>()({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    room: true,
    unitId: true,
    unit: {
      select: {
        id: true,
        name: true
      }
    },
    status: true,
    birthDate: true,
    bestTimesOfDay: true,
    notes: true,
    preferences: true,
    safetyNotes: true,
    tags: true,
    lastOneOnOneAt: true,
    followUpFlag: true,
    createdAt: true,
    updatedAt: true,
    carePlans: {
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: {
        focusAreas: true,
        nextReviewDate: true
      }
    },
    progressNotes: {
      where: { type: "ONE_TO_ONE" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        narrative: true
      }
    }
  }
});

export type ResidentListContextLegacyRow = Prisma.ResidentGetPayload<typeof residentListContextLegacyQuery>;

export function inflateLegacyResidentContextRow(row: ResidentListContextLegacyRow): ResidentListContextRow {
  return {
    ...row,
    preferredName: null,
    admissionDate: null,
    mdsManualDueDate: null
  } as ResidentListContextRow;
}

export function isResidentSchemaDriftError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
}
