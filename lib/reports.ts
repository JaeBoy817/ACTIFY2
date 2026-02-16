import { endOfMonth, startOfMonth } from "date-fns";

import { prisma } from "@/lib/prisma";
import { asAttendanceRules } from "@/lib/settings/defaults";
import { zonedDateKey } from "@/lib/timezone";

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export function parseMonthParam(month?: string) {
  if (!month) return new Date();
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return new Date();
  return new Date(year, m - 1, 1);
}

export async function getMonthlyReportData(facilityId: string, monthDate: Date) {
  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);

  const [activities, attendance, notes, settings, facility, activeResidents] = await Promise.all([
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
        activityInstance: {
          facilityId,
          startAt: { gte: from, lte: to }
        }
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
    }),
    prisma.facility.findUnique({
      where: { id: facilityId },
      select: { timezone: true }
    }),
    prisma.resident.findMany({
      where: {
        facilityId,
        OR: [
          { isActive: true },
          { status: { in: ["ACTIVE", "BED_BOUND"] } }
        ],
        NOT: {
          status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
        }
      },
      select: { id: true }
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

  const activeResidentCount = activeResidents.length;
  const activeResidentIds = new Set(activeResidents.map((resident) => resident.id));
  const supportiveStatuses = new Set(["PRESENT", "ACTIVE", "LEADING"]);
  const monthResidentParticipants = new Set<string>();
  const dailyParticipants = new Map<string, Set<string>>();
  const monthTimeZone = facility?.timezone ?? "UTC";

  for (const row of attendance) {
    if (!supportiveStatuses.has(row.status)) continue;
    if (!activeResidentIds.has(row.residentId)) continue;

    monthResidentParticipants.add(row.residentId);
    const dayKey = zonedDateKey(row.activityInstance.startAt, monthTimeZone);
    const daySet = dailyParticipants.get(dayKey) ?? new Set<string>();
    daySet.add(row.residentId);
    dailyParticipants.set(dayKey, daySet);
  }

  const residentsParticipated = monthResidentParticipants.size;
  const participationPercent = percent(residentsParticipated, activeResidentCount);
  const averageDailyPercent = dailyParticipants.size === 0
    ? 0
    : Number(
        (
          Array.from(dailyParticipants.values()).reduce(
            (sum, daySet) => sum + percent(daySet.size, activeResidentCount),
            0
          ) / dailyParticipants.size
        ).toFixed(1)
      );

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
    notableOutcomes,
    monthlyParticipation: {
      totalResidentsInCurrentMonthThatHaveAttended: residentsParticipated,
      residentsParticipated,
      participationPercent,
      averageDailyPercent,
      activeResidentCount
    }
  };
}

export function toCsv(data: Awaited<ReturnType<typeof getMonthlyReportData>>) {
  const lines = [
    ["Section", "Metric", "Value"].join(","),
    [
      "Attendance",
      "Total Attended Residents",
      String(data.monthlyParticipation.totalResidentsInCurrentMonthThatHaveAttended)
    ].join(","),
    ["Attendance", "Residents Participated", String(data.monthlyParticipation.residentsParticipated)].join(","),
    ["Attendance", "Participation %", String(data.monthlyParticipation.participationPercent)].join(","),
    ["Attendance", "Average Daily %", String(data.monthlyParticipation.averageDailyPercent)].join(","),
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
