import type { CarePlan, ProgressNote, Resident, ResidentStatus } from "@prisma/client";

import { parseFocusAreas, parseResidentTags, type ResidentListRow } from "@/lib/residents/types";

type ResidentWithRelations = Resident & {
  carePlans?: Array<Pick<CarePlan, "focusAreas" | "nextReviewDate">>;
  progressNotes?: Array<Pick<ProgressNote, "id" | "createdAt" | "narrative">>;
};

export function toResidentListRow(row: ResidentWithRelations): ResidentListRow {
  const fallbackLastOneOnOne = row.progressNotes?.[0]?.createdAt ?? null;
  const mostRecentOneOnOne =
    row.lastOneOnOneAt && fallbackLastOneOnOne
      ? row.lastOneOnOneAt.getTime() >= fallbackLastOneOnOne.getTime()
        ? row.lastOneOnOneAt
        : fallbackLastOneOnOne
      : row.lastOneOnOneAt ?? fallbackLastOneOnOne;

  const carePlan = row.carePlans?.[0];
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    room: row.room,
    status: row.status as ResidentStatus,
    birthDate: row.birthDate ? row.birthDate.toISOString() : null,
    preferences: row.preferences ?? null,
    safetyNotes: row.safetyNotes ?? null,
    tags: parseResidentTags(row.tags),
    lastOneOnOneAt: mostRecentOneOnOne ? mostRecentOneOnOne.toISOString() : null,
    followUpFlag: row.followUpFlag,
    carePlanAreas: parseFocusAreas(carePlan?.focusAreas),
    carePlanNextReviewAt: carePlan?.nextReviewDate ? carePlan.nextReviewDate.toISOString() : null,
    recentNotes:
      row.progressNotes?.map((note) => ({
        id: note.id,
        createdAt: note.createdAt.toISOString(),
        narrative: note.narrative
      })) ?? []
  };
}
