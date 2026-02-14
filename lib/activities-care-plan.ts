import {
  ActivitiesCarePlanGoal,
  ActivitiesCarePlanEvidenceLink,
  Attendance,
  AttendanceStatus,
  BarrierReason,
  ProgressNote
} from "@prisma/client";

export const engagementScoreMap: Record<AttendanceStatus, number> = {
  PRESENT: 1,
  ACTIVE: 2,
  LEADING: 3,
  REFUSED: 0,
  NO_SHOW: 0
};

export function getEngagementScore(status: AttendanceStatus) {
  return engagementScoreMap[status] ?? 0;
}

export function calculateGoalProgress(
  goal: ActivitiesCarePlanGoal,
  links: ActivitiesCarePlanEvidenceLink[],
  attendanceById: Map<string, Pick<Attendance, "status" | "createdAt" | "barrierReason">>
) {
  const target = Math.max(goal.targetValue ?? 0, 0);

  if (goal.measurementMethod === "ATTENDANCE_COUNT") {
    const count = links.filter((link) => {
      if (!link.attendanceId) return false;
      const row = attendanceById.get(link.attendanceId);
      if (!row) return false;
      return row.status === "PRESENT" || row.status === "ACTIVE" || row.status === "LEADING";
    }).length;

    if (!target) return { current: count, percent: count > 0 ? 100 : 0 };
    return { current: count, percent: Math.min(100, Number(((count / target) * 100).toFixed(1))) };
  }

  if (goal.measurementMethod === "ENGAGEMENT_SCORE_AVG") {
    const rows = links
      .map((link) => (link.attendanceId ? attendanceById.get(link.attendanceId) : undefined))
      .filter((row): row is Pick<Attendance, "status" | "createdAt" | "barrierReason"> => Boolean(row));
    const avg = rows.length
      ? Number((rows.reduce((sum, row) => sum + getEngagementScore(row.status), 0) / rows.length).toFixed(2))
      : 0;

    if (!target) return { current: avg, percent: avg > 0 ? 100 : 0 };
    return { current: avg, percent: Math.min(100, Number(((avg / target) * 100).toFixed(1))) };
  }

  const totalLinked = links.length;
  if (!target) return { current: totalLinked, percent: totalLinked > 0 ? 100 : 0 };
  return { current: totalLinked, percent: Math.min(100, Number(((totalLinked / target) * 100).toFixed(1))) };
}

export function summarizeBarriers(rows: Array<Pick<Attendance, "barrierReason">>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.barrierReason) return acc;
    acc[row.barrierReason] = (acc[row.barrierReason] ?? 0) + 1;
    return acc;
  }, {});
}

export function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildQuickEvidence(
  attendance: Array<Attendance & { activityInstance: { title: string } }>,
  notes: Array<ProgressNote & { activityInstance: { title: string } | null }>
) {
  const attendanceRows = attendance.map((item) => ({
    id: `attendance-${item.id}`,
    date: item.createdAt,
    label: item.activityInstance.title,
    type: item.status,
    source: "ATTENDANCE" as const,
    engagement: getEngagementScore(item.status),
    barrier: item.barrierReason,
    note: item.notes
  }));

  const noteRows = notes.map((note) => ({
    id: `note-${note.id}`,
    date: note.createdAt,
    label: note.activityInstance?.title ?? "Progress Note",
    type: note.type,
    source: "PROGRESS_NOTE" as const,
    engagement: note.participationLevel,
    barrier: null,
    note: note.narrative
  }));

  return [...attendanceRows, ...noteRows].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getRiskAlerts(input: {
  recentAttendance: Array<Pick<Attendance, "status" | "barrierReason" | "createdAt">>;
  activeResidentCount: number;
}) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentRows = input.recentAttendance.filter((row) => row.createdAt.getTime() >= sevenDaysAgo);

  const attendanceInSevenDays = recentRows.filter((row) => row.status === "PRESENT" || row.status === "ACTIVE" || row.status === "LEADING").length;
  const refusals = recentRows.filter((row) => row.status === "REFUSED").length;
  const painOrIsolation = recentRows.filter(
    (row) => row.barrierReason === BarrierReason.PAIN || row.barrierReason === BarrierReason.ISOLATION_PRECAUTIONS
  ).length;

  const alerts: Array<{ title: string; detail: string; action: "ADD_INTERVENTION" | "ADJUST_SCHEDULE" }> = [];

  if (attendanceInSevenDays === 0) {
    alerts.push({
      title: "No participation in 7+ days",
      detail: "No present/active/leading attendance events were captured in the last 7 days.",
      action: "ADD_INTERVENTION"
    });
  }

  if (refusals >= 3) {
    alerts.push({
      title: "Refusals trending",
      detail: `${refusals} refusals captured in the last 7 days.`,
      action: "ADJUST_SCHEDULE"
    });
  }

  if (painOrIsolation >= 3) {
    alerts.push({
      title: "Barrier trend: pain/isolation",
      detail: `${painOrIsolation} recent barriers are pain or isolation precautions.`,
      action: "ADD_INTERVENTION"
    });
  }

  if (alerts.length === 0 && input.activeResidentCount > 0) {
    alerts.push({
      title: "No major risk triggers",
      detail: "Current attendance and barrier trends look stable.",
      action: "ADJUST_SCHEDULE"
    });
  }

  return alerts;
}
