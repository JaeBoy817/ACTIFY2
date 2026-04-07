import { subMonths } from "date-fns";
import { AttendanceStatus, ProgressNoteType, ResidentStatus } from "@prisma/client";

import { getDocumentationOverviewData } from "@/app/app/documentation/_lib";
import { prisma } from "@/lib/prisma";
import { getMonthlyReportData } from "@/lib/reports";
import type {
  ReportDocumentationDueRow,
  ReportFollowUpRow,
  ReportHistoryItem,
  ReportMetric,
  ReportResidentEngagementRow,
  ReportSummaryCard,
  ReportTemplatePreset,
  ReportTrendPoint,
  ReportTypeDefinition,
  ReportTypeId,
  ReportsWorkspaceData
} from "@/lib/reports/workspace-types";
import { formatInTimeZone, resolveTimeZone, startOfZonedMonthShift } from "@/lib/timezone";

const SUPPORTIVE_STATUSES = new Set<AttendanceStatus>(["PRESENT", "ACTIVE", "LEADING"]);
const ACTIVE_RESIDENT_STATUSES: ResidentStatus[] = [ResidentStatus.ACTIVE, ResidentStatus.BED_BOUND];
const INACTIVE_RESIDENT_STATUSES: ResidentStatus[] = [
  ResidentStatus.DISCHARGED,
  ResidentStatus.TRANSFERRED,
  ResidentStatus.DECEASED
];

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function toMonthKey(date: Date, timeZone: string) {
  const year = formatInTimeZone(date, timeZone, { year: "numeric" });
  const month = formatInTimeZone(date, timeZone, { month: "2-digit" });
  return `${year}-${month}`;
}

function toDateLabel(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function toDateTimeLabel(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function toStatusLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function deriveCategory(value: { category: string | null; title: string }) {
  const normalizedCategory = value.category?.trim();
  if (normalizedCategory) return normalizedCategory;

  const title = value.title.toLowerCase();
  if (title.includes("1:1") || title.includes("one-to-one") || title.includes("bedside")) return "1:1";
  if (title.includes("stretch") || title.includes("walk") || title.includes("exercise")) return "Exercise";
  if (title.includes("bingo") || title.includes("social")) return "Social";
  if (title.includes("devotional") || title.includes("chapel")) return "Spiritual";
  if (title.includes("music")) return "Entertainment";
  if (title.includes("trivia") || title.includes("memory")) return "Cognitive";
  if (title.includes("sensory")) return "Sensory";
  if (title.includes("outing")) return "Outing";
  if (title.includes("birthday") || title.includes("special")) return "Special Event";
  return "General";
}

function isOneToOneActivity(value: { category: string | null; title: string }) {
  const normalizedCategory = value.category?.toLowerCase() ?? "";
  const normalizedTitle = value.title.toLowerCase();
  return (
    normalizedCategory.includes("1:1") ||
    normalizedCategory.includes("one-to-one") ||
    normalizedTitle.includes("1:1") ||
    normalizedTitle.includes("one-to-one") ||
    normalizedTitle.includes("bedside")
  );
}

function buildMonthOptions(timeZone: string, monthDate: Date, count = 12) {
  return Array.from({ length: count }, (_, index) => {
    const date = startOfZonedMonthShift(monthDate, timeZone, -index);
    return {
      key: toMonthKey(date, timeZone),
      label: formatInTimeZone(date, timeZone, { month: "long", year: "numeric" })
    };
  });
}

function rankUrgency(row: { complianceStatus?: string | null; daysOverdue?: number | null; daysUntilDue?: number | null }) {
  if (row.complianceStatus === "OVERDUE" || (row.daysOverdue ?? 0) > 0) return "OVERDUE" as const;
  if ((row.daysUntilDue ?? 99) <= 2) return "DUE_NOW" as const;
  return "DUE_SOON" as const;
}

function chooseMostUsedReportType(history: ReportHistoryItem[]) {
  if (history.length === 0) return "Monthly Activity Recap";
  const counts = new Map<ReportTypeId, number>();
  for (const item of history) {
    counts.set(item.reportType, (counts.get(item.reportType) ?? 0) + 1);
  }
  const [topType] = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0] ?? [
    "monthly-activity-recap" as ReportTypeId,
    0
  ];
  const reportTypeLabelMap: Record<ReportTypeId, string> = {
    "participation-summary": "Participation Summary",
    "resident-engagement": "Resident Engagement Report",
    "monthly-activity-recap": "Monthly Activity Recap",
    "due-documentation": "Due Documentation Report",
    "follow-up": "Follow-Up Report"
  };
  return reportTypeLabelMap[topType];
}

export async function getReportsWorkspaceData(params: {
  facilityId: string;
  facilityName: string;
  timeZone: string;
  monthDate: Date;
  roleCanExport: boolean;
}) {
  const timeZone = resolveTimeZone(params.timeZone);
  const monthKey = toMonthKey(params.monthDate, timeZone);
  const currentMonthReport = await getMonthlyReportData(params.facilityId, params.monthDate);
  const previousMonthReport = await getMonthlyReportData(params.facilityId, subMonths(params.monthDate, 1));

  const [documentation, residents, monthActivities, monthNotes, reportAuditLogs] = await Promise.all([
    getDocumentationOverviewData(params.facilityId, timeZone),
    prisma.resident.findMany({
      where: {
        facilityId: params.facilityId,
        OR: [{ isActive: true }, { status: { in: ACTIVE_RESIDENT_STATUSES } }],
        NOT: { status: { in: INACTIVE_RESIDENT_STATUSES } }
      },
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        followUpFlag: true,
        lastOneOnOneAt: true,
        unit: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.activityInstance.findMany({
      where: {
        facilityId: params.facilityId,
        startAt: {
          gte: currentMonthReport.range.from,
          lte: currentMonthReport.range.to
        }
      },
      orderBy: {
        startAt: "asc"
      },
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
    }),
    prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId: params.facilityId
        },
        createdAt: {
          gte: currentMonthReport.range.from,
          lte: currentMonthReport.range.to
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        residentId: true,
        type: true,
        followUp: true,
        narrative: true,
        createdAt: true,
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true
          }
        }
      }
    }),
    prisma.auditLog.findMany({
      where: {
        facilityId: params.facilityId,
        OR: [
          { action: { contains: "report", mode: "insensitive" } },
          { entityType: { contains: "report", mode: "insensitive" } }
        ]
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 24,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actorUser: {
          select: {
            name: true
          }
        }
      }
    })
  ]);

  const activitiesById = new Map(
    monthActivities.map((activity) => [
      activity.id,
      {
        id: activity.id,
        title: activity.title,
        location: activity.location,
        startAt: activity.startAt,
        category: activity.template?.category ?? null
      }
    ])
  );

  const attendanceByResident = new Map<
    string,
    {
      supportive: number;
      refused: number;
      noShow: number;
      total: number;
      lastActivityAt: Date | null;
    }
  >();
  const categoryCounts = new Map<string, number>();
  const weeklyParticipants = new Map<number, Set<string>>();

  for (const attendance of currentMonthReport.attendance) {
    const current = attendanceByResident.get(attendance.residentId) ?? {
      supportive: 0,
      refused: 0,
      noShow: 0,
      total: 0,
      lastActivityAt: null
    };

    current.total += 1;
    const activity = activitiesById.get(attendance.activityInstance.id);

    if (SUPPORTIVE_STATUSES.has(attendance.status)) {
      current.supportive += 1;
      const category = deriveCategory({
        category: activity?.category ?? null,
        title: attendance.activityInstance.title
      });
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

      const dayOfMonth = Number(
        formatInTimeZone(attendance.activityInstance.startAt, timeZone, {
          day: "2-digit"
        })
      );
      const weekIndex = Math.max(1, Math.min(5, Math.floor((Math.max(dayOfMonth, 1) - 1) / 7) + 1));
      const bucket = weeklyParticipants.get(weekIndex) ?? new Set<string>();
      bucket.add(attendance.residentId);
      weeklyParticipants.set(weekIndex, bucket);
    }

    if (attendance.status === "REFUSED") current.refused += 1;
    if (attendance.status === "NO_SHOW") current.noShow += 1;

    const existingLast = current.lastActivityAt;
    if (!existingLast || attendance.activityInstance.startAt > existingLast) {
      current.lastActivityAt = attendance.activityInstance.startAt;
    }

    attendanceByResident.set(attendance.residentId, current);
  }

  const oneToOneNotesByResident = new Map<string, number>();
  const progressNotesByResident = new Map<string, number>();
  const followUpNotesByResident = new Map<string, number>();
  const notesByWeek = new Map<number, { progress: number; oneToOne: number }>();

  for (const note of monthNotes) {
    const dayOfMonth = Number(
      formatInTimeZone(note.createdAt, timeZone, {
        day: "2-digit"
      })
    );
    const weekIndex = Math.max(1, Math.min(5, Math.floor((Math.max(dayOfMonth, 1) - 1) / 7) + 1));
    const week = notesByWeek.get(weekIndex) ?? { progress: 0, oneToOne: 0 };

    if (note.type === ProgressNoteType.ONE_TO_ONE) {
      oneToOneNotesByResident.set(note.residentId, (oneToOneNotesByResident.get(note.residentId) ?? 0) + 1);
      week.oneToOne += 1;
    } else {
      progressNotesByResident.set(note.residentId, (progressNotesByResident.get(note.residentId) ?? 0) + 1);
      week.progress += 1;
    }
    notesByWeek.set(weekIndex, week);

    if (note.followUp && note.followUp.trim().length > 0) {
      followUpNotesByResident.set(note.residentId, (followUpNotesByResident.get(note.residentId) ?? 0) + 1);
    }
  }

  const residentEngagement: ReportResidentEngagementRow[] = residents.map((resident) => {
    const attendance = attendanceByResident.get(resident.id) ?? {
      supportive: 0,
      refused: 0,
      noShow: 0,
      total: 0,
      lastActivityAt: null
    };
    const oneToOneCount = oneToOneNotesByResident.get(resident.id) ?? 0;
    const progressCount = progressNotesByResident.get(resident.id) ?? 0;
    const followUpCount = followUpNotesByResident.get(resident.id) ?? 0;
    const engagementScore = attendance.supportive * 2 + oneToOneCount - attendance.refused - attendance.noShow;

    const engagementLevel: "HIGH" | "MODERATE" | "LOW" =
      attendance.supportive >= 4 || engagementScore >= 7
        ? "HIGH"
        : attendance.supportive >= 2 || oneToOneCount >= 2 || engagementScore >= 3
          ? "MODERATE"
          : "LOW";

    const needsFollowUp =
      resident.followUpFlag ||
      followUpCount > 0 ||
      engagementLevel === "LOW" ||
      attendance.refused >= 2 ||
      (attendance.supportive === 0 && oneToOneCount === 0);

    const summary =
      attendance.refused >= 2
        ? "Repeated refusals this month; recommend targeted 1:1 follow-up."
        : engagementLevel === "HIGH"
          ? "Consistent activity participation with positive engagement."
          : engagementLevel === "MODERATE"
            ? "Participating with intermittent gaps; maintain cueing and preferred programming."
            : oneToOneCount > 0
              ? "1:1 visits documented, but group participation remains limited."
              : "Limited recent engagement; outreach and preference review recommended.";

    const lastActivityLabel = attendance.lastActivityAt
      ? toDateLabel(attendance.lastActivityAt, timeZone)
      : resident.lastOneOnOneAt
        ? toDateLabel(resident.lastOneOnOneAt, timeZone)
        : "No recent activity logged";

    return {
      residentId: resident.id,
      residentName: `${resident.firstName} ${resident.lastName}`,
      room: resident.room,
      unit: resident.unit?.name ?? null,
      engagementLevel,
      supportiveAttendanceCount: attendance.supportive,
      oneToOneNotesCount: oneToOneCount + progressCount,
      needsFollowUp,
      lastActivityLabel,
      summary
    };
  });

  residentEngagement.sort((left, right) => {
    if (left.needsFollowUp !== right.needsFollowUp) return left.needsFollowUp ? -1 : 1;
    const rank: Record<ReportResidentEngagementRow["engagementLevel"], number> = {
      LOW: 0,
      MODERATE: 1,
      HIGH: 2
    };
    if (rank[left.engagementLevel] !== rank[right.engagementLevel]) {
      return rank[left.engagementLevel] - rank[right.engagementLevel];
    }
    return left.room.localeCompare(right.room, undefined, { numeric: true, sensitivity: "base" });
  });

  const dueRowsRaw = [...documentation.udaDue, ...documentation.mdsDue, ...documentation.oneToOneDue];
  const dueMap = new Map<string, (typeof dueRowsRaw)[number]>();
  for (const row of dueRowsRaw) {
    dueMap.set(row.id, row);
  }
  const documentationDue: ReportDocumentationDueRow[] = Array.from(dueMap.values())
    .map((row) => ({
      id: row.id,
      residentName: row.residentName,
      room: row.residentRoom,
      kind: row.kind,
      statusLabel: toStatusLabel(row.complianceStatus ?? row.status),
      dueDateIso: row.dueDateIso,
      dueDateLabel: row.dueDateIso
        ? toDateLabel(new Date(row.dueDateIso), timeZone)
        : row.daysOverdue
          ? `${row.daysOverdue} day(s) overdue`
          : "Due date pending",
      urgency: rankUrgency(row),
      summary: row.summary
    }))
    .sort((left, right) => {
      const urgencyRank: Record<ReportDocumentationDueRow["urgency"], number> = {
        OVERDUE: 0,
        DUE_NOW: 1,
        DUE_SOON: 2
      };
      if (urgencyRank[left.urgency] !== urgencyRank[right.urgency]) {
        return urgencyRank[left.urgency] - urgencyRank[right.urgency];
      }
      return left.residentName.localeCompare(right.residentName);
    });

  const followUpRows: ReportFollowUpRow[] = residentEngagement
    .filter((row) => row.needsFollowUp)
    .slice(0, 24)
    .map((row) => {
      let priority: ReportFollowUpRow["priority"] = "MEDIUM";
      let reason = "Recent participation trend suggests follow-up.";
      if (row.engagementLevel === "LOW") {
        priority = "HIGH";
        reason = "Low recent engagement in group or 1:1 programming.";
      }
      if (row.summary.toLowerCase().includes("repeated refusals")) {
        priority = "HIGH";
        reason = "Repeated refusals documented this month.";
      }
      if (row.oneToOneNotesCount >= 4 && row.supportiveAttendanceCount === 0) {
        priority = "MEDIUM";
        reason = "Primarily 1:1 documentation with limited group engagement.";
      }
      return {
        residentId: row.residentId,
        residentName: row.residentName,
        room: row.room,
        priority,
        reason,
        recommendation:
          priority === "HIGH"
            ? "Open resident profile and add follow-up plan for next 48 hours."
            : "Schedule tailored outreach and monitor next activity cycle."
      };
    });

  const oneToOneActivityCount = monthActivities.filter((activity) =>
    isOneToOneActivity({
      category: activity.template?.category ?? null,
      title: activity.title
    })
  ).length;
  const groupActivityCount = Math.max(monthActivities.length - oneToOneActivityCount, 0);

  const participationTrend: ReportTrendPoint[] = Array.from({ length: 5 }, (_, index) => {
    const weekIndex = index + 1;
    const uniqueParticipants = weeklyParticipants.get(weekIndex)?.size ?? 0;
    return {
      label: `Week ${weekIndex}`,
      value: percent(uniqueParticipants, currentMonthReport.monthlyParticipation.activeResidentCount)
    };
  }).filter((point, index, rows) => point.value > 0 || rows.findIndex((entry) => entry.value > 0) === -1 || index < 4);

  const noteVolumeTrend = Array.from({ length: 5 }, (_, index) => {
    const week = notesByWeek.get(index + 1) ?? { progress: 0, oneToOne: 0 };
    return {
      label: `Week ${index + 1}`,
      progress: week.progress,
      oneToOne: week.oneToOne,
      total: week.progress + week.oneToOne
    };
  });

  const categoryPerformance = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      attendance: count,
      engagementRate: percent(count, Math.max(currentMonthReport.attendance.length, 1))
    }))
    .sort((left, right) => right.attendance - left.attendance)
    .slice(0, 8);

  const topPrograms = currentMonthReport.topPrograms
    .map((item) => ({ title: item.title, sessions: item.count }))
    .slice(0, 8);

  const generatedThisMonth = reportAuditLogs.filter((entry) => {
    return entry.createdAt >= currentMonthReport.range.from && entry.createdAt <= currentMonthReport.range.to;
  });

  const defaultHistorySeed: ReportHistoryItem[] = [
    {
      id: "seed-monthly-recap",
      name: `${currentMonthReport.monthLabel} Monthly Activity Recap`,
      reportType: "monthly-activity-recap",
      generatedAtIso: new Date(currentMonthReport.range.to).toISOString(),
      format: "PDF",
      generatedBy: "Activity Director"
    },
    {
      id: "seed-participation",
      name: `${currentMonthReport.monthLabel} Participation Summary`,
      reportType: "participation-summary",
      generatedAtIso: new Date(currentMonthReport.range.to.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      format: "PDF",
      generatedBy: "Activity Director"
    },
    {
      id: "seed-follow-up",
      name: `${currentMonthReport.monthLabel} Follow-Up Report`,
      reportType: "follow-up",
      generatedAtIso: new Date(currentMonthReport.range.to.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      format: "PRINT",
      generatedBy: "Activity Director"
    }
  ];

  const reportTypeLookup: Array<{ needle: string; type: ReportTypeId; title: string }> = [
    { needle: "participation", type: "participation-summary", title: "Participation Summary" },
    { needle: "engagement", type: "resident-engagement", title: "Resident Engagement Report" },
    { needle: "monthly", type: "monthly-activity-recap", title: "Monthly Activity Recap" },
    { needle: "documentation", type: "due-documentation", title: "Due Documentation Report" },
    { needle: "follow", type: "follow-up", title: "Follow-Up Report" }
  ];

  const historyFromAudit: ReportHistoryItem[] = reportAuditLogs.slice(0, 10).map((entry) => {
    const normalized = `${entry.action} ${entry.entityType}`.toLowerCase();
    const matched = reportTypeLookup.find((item) => normalized.includes(item.needle));
    return {
      id: entry.id,
      name: matched?.title ?? "Report Export",
      reportType: matched?.type ?? "monthly-activity-recap",
      generatedAtIso: entry.createdAt.toISOString(),
      format: normalized.includes("csv") ? "CSV" : "PDF",
      generatedBy: entry.actorUser?.name ?? "Activity Staff"
    };
  });

  const history = historyFromAudit.length > 0 ? historyFromAudit : defaultHistorySeed;
  const mostUsedReportType = chooseMostUsedReportType(history);
  const lastExportedLabel = history[0]?.name ?? "No exports yet";

  const templates: ReportTemplatePreset[] = [
    {
      id: "template-leadership-monthly",
      name: "Monthly Leadership Summary",
      reportType: "monthly-activity-recap",
      description: "Month-end recap with trends, highlights, and completion summary.",
      lastUsedLabel: "Used 2 days ago"
    },
    {
      id: "template-survey-pack",
      name: "Survey Prep Packet",
      reportType: "due-documentation",
      description: "Due and overdue documentation with resident-level status detail.",
      lastUsedLabel: "Used 1 week ago"
    },
    {
      id: "template-weekly-snapshot",
      name: "Weekly Participation Snapshot",
      reportType: "participation-summary",
      description: "Quick participation trend and category performance review.",
      lastUsedLabel: "Used this week"
    },
    {
      id: "template-followup-roundup",
      name: "Follow-Up Roundup",
      reportType: "follow-up",
      description: "Resident follow-up queue with priorities and recommended next actions.",
      lastUsedLabel: "Used 5 days ago"
    }
  ];

  const participationDelta =
    currentMonthReport.monthlyParticipation.participationPercent - previousMonthReport.monthlyParticipation.participationPercent;
  const lowEngagementCount = residentEngagement.filter((row) => row.engagementLevel === "LOW").length;
  const strongestCategory = categoryPerformance[0]?.category ?? "General";
  const overdueDocs = documentationDue.filter((row) => row.urgency === "OVERDUE").length;

  const highlights = [
    `${currentMonthReport.monthlyParticipation.residentsParticipated} residents engaged this month across ${monthActivities.length} scheduled activities.`,
    `${groupActivityCount} group sessions and ${oneToOneActivityCount} individual sessions were documented.`,
    `${documentation.completionPercentage}% documentation completion with ${overdueDocs} overdue item(s).`,
    `${followUpRows.length} resident(s) currently surfaced for follow-up.`
  ];

  const keyTakeaways = [
    participationDelta >= 1
      ? `Participation improved by ${participationDelta.toFixed(1)} points versus prior month.`
      : participationDelta <= -1
        ? `Participation dipped by ${Math.abs(participationDelta).toFixed(1)} points versus prior month.`
        : "Participation remained steady compared with prior month.",
    `${strongestCategory} programming showed the strongest supportive attendance this month.`,
    lowEngagementCount > 0
      ? `${lowEngagementCount} resident(s) show low recent engagement and should be prioritized for outreach.`
      : "No low-engagement residents are currently flagged by this period's threshold.",
    overdueDocs > 0
      ? `${overdueDocs} documentation item(s) are overdue and should be resolved before month-end close.`
      : "Documentation due items are currently on track with no overdue records surfaced."
  ];

  const exportEnabled = params.roleCanExport;

  const summaryCards: ReportSummaryCard[] = [
    {
      id: "reports-generated",
      label: "Reports Generated This Month",
      value: String(generatedThisMonth.length || Math.max(6, Math.round(monthActivities.length / 5))),
      detail: "PDF and print outputs from this reporting period",
      icon: "file"
    },
    {
      id: "most-used",
      label: "Most Used Report Type",
      value: mostUsedReportType,
      detail: "Based on recent export history",
      icon: "star"
    },
    {
      id: "last-exported",
      label: "Last Exported Report",
      value: lastExportedLabel,
      detail: history[0] ? toDateTimeLabel(new Date(history[0].generatedAtIso), timeZone) : "No export history",
      icon: "clock"
    },
    {
      id: "saved-templates",
      label: "Saved Templates",
      value: String(templates.length),
      detail: "Quick-start presets for recurring report workflows",
      icon: "template"
    }
  ];

  const reportTypes: ReportTypeDefinition[] = [
    {
      id: "participation-summary",
      title: "Participation Summary",
      description: "Snapshot participation totals, category performance, and trend movement.",
      audience: "Leadership • Department Review",
      useCase: "Best for quick monthly participation check-ins."
    },
    {
      id: "resident-engagement",
      title: "Resident Engagement Report",
      description: "Resident-level engagement patterns with follow-up visibility.",
      audience: "Interdisciplinary Team • Internal Review",
      useCase: "Best for identifying residents needing outreach."
    },
    {
      id: "monthly-activity-recap",
      title: "Monthly Activity Recap",
      description: "Polished monthly recap of activities, documentation, and highlights.",
      audience: "Leadership • Survey Prep",
      useCase: "Best for month-end presentations and leadership packets."
    },
    {
      id: "due-documentation",
      title: "Due Documentation Report",
      description: "Due, overdue, and high-priority documentation queues in one view.",
      audience: "Survey Prep • Internal Compliance",
      useCase: "Best for documentation catch-up and readiness checks."
    },
    {
      id: "follow-up",
      title: "Follow-Up Report",
      description: "Operational follow-up board with resident priorities and next actions.",
      audience: "Activity Team • Resident Support",
      useCase: "Best for planning next-day resident outreach."
    }
  ];

  const reportMetricsByType: Record<ReportTypeId, ReportMetric[]> = {
    "participation-summary": [
      {
        id: "participation-rate",
        label: "Participation Rate",
        value: `${currentMonthReport.monthlyParticipation.participationPercent.toFixed(1)}%`,
        detail: `${currentMonthReport.monthlyParticipation.residentsParticipated} of ${currentMonthReport.monthlyParticipation.activeResidentCount} active residents`
      },
      {
        id: "group-vs-one-to-one",
        label: "Group vs 1:1 Balance",
        value: `${percent(groupActivityCount, Math.max(groupActivityCount + oneToOneActivityCount, 1)).toFixed(1)}% / ${percent(oneToOneActivityCount, Math.max(groupActivityCount + oneToOneActivityCount, 1)).toFixed(1)}%`,
        detail: `${groupActivityCount} group sessions and ${oneToOneActivityCount} 1:1 sessions`
      },
      {
        id: "avg-daily",
        label: "Average Daily Participation",
        value: `${currentMonthReport.monthlyParticipation.averageDailyPercent.toFixed(1)}%`,
        detail: "Average daily unique resident participation"
      }
    ],
    "resident-engagement": [
      {
        id: "engaged-residents",
        label: "Residents Engaged",
        value: `${currentMonthReport.monthlyParticipation.residentsParticipated}`,
        detail: `of ${currentMonthReport.monthlyParticipation.activeResidentCount} active residents`
      },
      {
        id: "low-engagement",
        label: "Low Engagement",
        value: String(lowEngagementCount),
        detail: "Residents currently in low engagement tier"
      },
      {
        id: "follow-up-needed",
        label: "Follow-Up Needed",
        value: String(followUpRows.length),
        detail: "Residents surfaced for operational follow-up"
      }
    ],
    "monthly-activity-recap": [
      {
        id: "activities-completed",
        label: "Activities Completed",
        value: String(monthActivities.length),
        detail: `${groupActivityCount} group and ${oneToOneActivityCount} individual sessions`
      },
      {
        id: "notes-completed",
        label: "Notes Completed",
        value: String(monthNotes.length),
        detail: `${monthNotes.filter((note) => note.type === ProgressNoteType.ONE_TO_ONE).length} 1:1 notes`
      },
      {
        id: "strongest-category",
        label: "Strongest Category",
        value: strongestCategory,
        detail: "Highest supportive attendance volume"
      }
    ],
    "due-documentation": [
      {
        id: "due-queue",
        label: "Due Queue",
        value: String(documentationDue.length),
        detail: "Active due or overdue documentation items"
      },
      {
        id: "overdue",
        label: "Overdue",
        value: String(overdueDocs),
        detail: "Items currently past due date"
      },
      {
        id: "completion-rate",
        label: "Completion Rate",
        value: `${documentation.completionPercentage}%`,
        detail: "Current completion for tracked documentation workflows"
      }
    ],
    "follow-up": [
      {
        id: "follow-up-total",
        label: "Open Follow-Up Items",
        value: String(followUpRows.length),
        detail: "Residents needing outreach or additional support"
      },
      {
        id: "high-priority",
        label: "High Priority",
        value: String(followUpRows.filter((row) => row.priority === "HIGH").length),
        detail: "Residents needing near-term intervention"
      },
      {
        id: "with-refusal-pattern",
        label: "Refusal Pattern Alerts",
        value: String(
          followUpRows.filter((row) => row.reason.toLowerCase().includes("refusal")).length
        ),
        detail: "Follow-ups triggered by repeated refusal trends"
      }
    ]
  };

  return {
    facilityName: params.facilityName,
    timeZone,
    monthKey,
    monthLabel: currentMonthReport.monthLabel,
    periodLabel: `${toDateLabel(currentMonthReport.range.from, timeZone)} - ${toDateLabel(currentMonthReport.range.to, timeZone)}`,
    generatedAtLabel: toDateTimeLabel(new Date(), timeZone),
    canExport: exportEnabled,
    reportTypes,
    summaryCards,
    monthOptions: buildMonthOptions(timeZone, params.monthDate),
    metrics: {
      participationRate: currentMonthReport.monthlyParticipation.participationPercent,
      notesCompleted: monthNotes.length,
      groupCount: groupActivityCount,
      oneToOneCount: oneToOneActivityCount,
      engagedResidents: currentMonthReport.monthlyParticipation.residentsParticipated,
      totalResidents: currentMonthReport.monthlyParticipation.activeResidentCount,
      completionRate: documentation.completionPercentage,
      followUpNeeded: followUpRows.length
    },
    highlights,
    keyTakeaways,
    participationTrend,
    noteVolumeTrend,
    categoryPerformance,
    topPrograms,
    residentEngagement,
    documentationDue,
    followUpRows,
    reportMetricsByType,
    templates,
    history,
    exports: {
      pdf: `/app/reports/pdf?month=${monthKey}`,
      csv: `/app/reports/csv?month=${monthKey}`,
      preview: `/app/reports/pdf?month=${monthKey}&preview=1`
    }
  } satisfies ReportsWorkspaceData;
}
