import { getResidentAssessmentSchedule, type ResidentAssessmentCompletionSummary } from "@/lib/residents/assessment-due";
import { parseFocusAreas, parseResidentTags, type ResidentListRow } from "@/lib/residents/types";
import type { ResidentListContextRow } from "@/lib/residents/query";

export type ResidentAttendanceSummary = {
  total30d: number;
  engaged30d: number;
  refused30d: number;
  noShow30d: number;
};

type ResidentSerializationOptions = {
  completionByResident?: Map<string, ResidentAssessmentCompletionSummary>;
  attendanceByResident?: Map<string, ResidentAttendanceSummary>;
  now?: Date;
};

function toParticipationPercent(summary: ResidentAttendanceSummary | undefined) {
  if (!summary || summary.total30d <= 0) return null;
  return Math.round((summary.engaged30d / summary.total30d) * 100);
}

export function toResidentListRow(row: ResidentListContextRow, options?: ResidentSerializationOptions): ResidentListRow {
  const fallbackLastOneOnOne = row.progressNotes?.[0]?.createdAt ?? null;
  const mostRecentOneOnOne =
    row.lastOneOnOneAt && fallbackLastOneOnOne
      ? row.lastOneOnOneAt.getTime() >= fallbackLastOneOnOne.getTime()
        ? row.lastOneOnOneAt
        : fallbackLastOneOnOne
      : row.lastOneOnOneAt ?? fallbackLastOneOnOne;

  const carePlan = row.carePlans?.[0];
  const attendanceSummary = options?.attendanceByResident?.get(row.id);
  const completionSummary = options?.completionByResident?.get(row.id);

  const assessmentSchedule = getResidentAssessmentSchedule({
    admissionDate: row.admissionDate,
    residentCreatedAt: row.createdAt,
    mdsManualDueDate: row.mdsManualDueDate,
    status: row.status,
    completions: completionSummary,
    now: options?.now
  });

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    preferredName: row.preferredName ?? null,
    room: row.room,
    unitId: row.unitId ?? null,
    unitName: row.unit?.name ?? null,
    status: row.status,
    birthDate: row.birthDate ? row.birthDate.toISOString() : null,
    admissionDate: row.admissionDate ? row.admissionDate.toISOString() : null,
    mdsManualDueDate: row.mdsManualDueDate ? row.mdsManualDueDate.toISOString() : null,
    preferences: row.preferences ?? null,
    safetyNotes: row.safetyNotes ?? null,
    bestTimesOfDay: row.bestTimesOfDay ?? null,
    notes: row.notes ?? null,
    tags: parseResidentTags(row.tags),
    lastOneOnOneAt: mostRecentOneOnOne ? mostRecentOneOnOne.toISOString() : null,
    followUpFlag: row.followUpFlag,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    carePlanAreas: parseFocusAreas(carePlan?.focusAreas),
    carePlanNextReviewAt: carePlan?.nextReviewDate ? carePlan.nextReviewDate.toISOString() : null,
    attendanceSnapshot: {
      total30d: attendanceSummary?.total30d ?? 0,
      engaged30d: attendanceSummary?.engaged30d ?? 0,
      refused30d: attendanceSummary?.refused30d ?? 0,
      noShow30d: attendanceSummary?.noShow30d ?? 0,
      participationPercent30d: toParticipationPercent(attendanceSummary)
    },
    assessmentSchedule,
    assessmentFlags: {
      overdueCount: assessmentSchedule.overdueCount,
      dueSoonCount: assessmentSchedule.dueSoonCount,
      documentationCurrent: assessmentSchedule.overdueCount === 0
    },
    recentNotes:
      row.progressNotes?.map((note) => ({
        id: note.id,
        createdAt: note.createdAt.toISOString(),
        narrative: note.narrative
      })) ?? []
  };
}
