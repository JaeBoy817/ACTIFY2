import { Prisma } from "@prisma/client";

export const residentListContextQuery = Prisma.validator<Prisma.ResidentDefaultArgs>()({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    room: true,
    status: true,
    birthDate: true,
    preferences: true,
    safetyNotes: true,
    tags: true,
    lastOneOnOneAt: true,
    followUpFlag: true,
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

