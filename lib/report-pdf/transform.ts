import { getMonthlyReportData } from "@/lib/reports";

import { type MonthlyReportPdfData } from "./types";

type RawMonthlyReport = Awaited<ReturnType<typeof getMonthlyReportData>>;

export function toReportPdfData(raw: RawMonthlyReport): MonthlyReportPdfData {
  return {
    monthLabel: raw.monthLabel,
    activities: raw.activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      startAt: activity.startAt
    })),
    attendance: raw.attendance.map((row) => ({
      id: row.id,
      status: row.status,
      barrierReason: row.barrierReason,
      createdAt: row.createdAt,
      residentId: row.residentId,
      residentName: `${row.resident.firstName} ${row.resident.lastName}`,
      unitName: row.resident.unit?.name ?? "Unassigned",
      activityTitle: row.activityInstance.title,
      activityStartAt: row.activityInstance.startAt
    })),
    monthlyParticipation: raw.monthlyParticipation,
    attendanceCounts: raw.attendanceCounts,
    engagementAvg: raw.engagementAvg,
    topPrograms: raw.topPrograms,
    barrierSummary: raw.barrierSummary,
    oneToOneTotal: raw.oneToOneTotal,
    notableOutcomes: raw.notableOutcomes
  };
}
