import { endOfMonth, startOfMonth } from "date-fns";

import { prisma } from "@/lib/prisma";
import { asAttendanceRules } from "@/lib/settings/defaults";

export function parseMonthParam(month?: string) {
  if (!month) return new Date();
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return new Date();
  return new Date(year, m - 1, 1);
}

export async function getMonthlyReportData(facilityId: string, monthDate: Date) {
  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);

  const [activities, attendance, notes, settings] = await Promise.all([
    prisma.activityInstance.findMany({
      where: {
        facilityId,
        startAt: { gte: from, lte: to }
      },
      include: {
        attendance: true
      },
      orderBy: { startAt: "asc" }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: { facilityId },
        createdAt: { gte: from, lte: to }
      },
      include: {
        resident: {
          include: {
            unit: true
          }
        },
        activityInstance: true
      }
    }),
    prisma.progressNote.findMany({
      where: {
        resident: { facilityId },
        createdAt: { gte: from, lte: to }
      },
      include: {
        resident: true,
        activityInstance: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.facilitySettings.findUnique({
      where: { facilityId },
      select: { attendanceRulesJson: true }
    })
  ]);

  const weights = asAttendanceRules(settings?.attendanceRulesJson).engagementWeights;
  const engagementScoreMap: Record<string, number> = {
    PRESENT: weights.present,
    ACTIVE: weights.active,
    LEADING: weights.leading,
    REFUSED: 0,
    NO_SHOW: 0
  };

  const attendanceCounts = {
    present: attendance.filter((row) => row.status === "PRESENT").length,
    active: attendance.filter((row) => row.status === "ACTIVE").length,
    leading: attendance.filter((row) => row.status === "LEADING").length,
    refused: attendance.filter((row) => row.status === "REFUSED").length,
    noShow: attendance.filter((row) => row.status === "NO_SHOW").length
  };

  const engagementAvg = Number(
    (
      attendance.reduce((sum, row) => sum + (engagementScoreMap[row.status] ?? 0), 0) /
      Math.max(attendance.length, 1)
    ).toFixed(2)
  );

  const programCounts = new Map<string, number>();
  attendance.forEach((row) => {
    if (row.status === "REFUSED" || row.status === "NO_SHOW") return;
    const title = row.activityInstance.title;
    programCounts.set(title, (programCounts.get(title) ?? 0) + 1);
  });

  const topPrograms = Array.from(programCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([title, count]) => ({ title, count }));

  const barrierSummary = attendance.reduce<Record<string, number>>((acc, row) => {
    if (!row.barrierReason) return acc;
    acc[row.barrierReason] = (acc[row.barrierReason] ?? 0) + 1;
    return acc;
  }, {});

  const oneToOneTotal = notes.filter((note) => note.type === "ONE_TO_ONE").length;

  const notableOutcomes = notes
    .filter((note) => note.narrative)
    .slice(0, 12)
    .map((note) => ({
      resident: `${note.resident.firstName} ${note.resident.lastName}`,
      createdAt: note.createdAt,
      narrative: note.narrative
    }));

  return {
    monthLabel: from.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    range: { from, to },
    activities,
    attendance,
    notes,
    attendanceCounts,
    engagementAvg,
    topPrograms,
    barrierSummary,
    oneToOneTotal,
    notableOutcomes
  };
}

export function toCsv(data: Awaited<ReturnType<typeof getMonthlyReportData>>) {
  const lines = [
    ["Section", "Metric", "Value"].join(","),
    ["Attendance", "Present/Active", data.attendanceCounts.present + data.attendanceCounts.active].join(","),
    ["Attendance", "Leading", data.attendanceCounts.leading].join(","),
    ["Attendance", "Refused", data.attendanceCounts.refused].join(","),
    ["Attendance", "No Show", data.attendanceCounts.noShow].join(","),
    ["Attendance", "Engagement Avg", data.engagementAvg].join(","),
    ["Notes", "1:1 Totals", data.oneToOneTotal].join(",")
  ];

  data.topPrograms.forEach((program) => {
    lines.push(["Top Program", program.title, String(program.count)].join(","));
  });

  Object.entries(data.barrierSummary).forEach(([barrier, count]) => {
    lines.push(["Barrier", barrier, String(count)].join(","));
  });

  data.notableOutcomes.forEach((outcome) => {
    lines.push(["Outcome", outcome.resident, `"${outcome.narrative.replaceAll('"', '""')}"`].join(","));
  });

  return lines.join("\n");
}
