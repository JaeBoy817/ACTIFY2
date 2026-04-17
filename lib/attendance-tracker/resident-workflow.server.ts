import { AttendanceStatus, BarrierReason } from "@prisma/client";

import { endOfZonedDay, formatInTimeZone, startOfZonedDay, startOfZonedMonth, startOfZonedMonthShift, subtractDays, zonedDateStringToUtcStart } from "@/lib/timezone";

export const WORKFLOW_TIMEFRAME_VALUES = ["THIS_MONTH", "LAST_MONTH", "LAST_30_DAYS", "LAST_90_DAYS"] as const;
export type WorkflowTimeframeKey = (typeof WORKFLOW_TIMEFRAME_VALUES)[number];

export const WORKFLOW_ATTENDANCE_STATUS_VALUES = [
  "attended",
  "refused",
  "declined",
  "missed",
  "not_appropriate",
  "in_room_asleep",
  "out_of_facility",
  "one_to_one_completed"
] as const;
export type WorkflowAttendanceStatus = (typeof WORKFLOW_ATTENDANCE_STATUS_VALUES)[number];

type TimeframeWindow = {
  timeframe: WorkflowTimeframeKey;
  startAt: Date;
  endAt: Date;
  previousStartAt: Date;
  previousEndAt: Date;
};

type AttendanceLikeRow = {
  status: AttendanceStatus;
  barrierReason: BarrierReason | null;
  notes: string | null;
  activityStartAt: Date;
};

const STATUS_TAG_PREFIX = "[ACTIFY_STATUS:";

function stripStatusTag(notes: string | null) {
  if (!notes) return null;
  const normalized = notes.replace(/\[ACTIFY_STATUS:[^\]]+\]\s*/g, "").trim();
  return normalized.length ? normalized : null;
}

function statusTagFromNotes(notes: string | null): WorkflowAttendanceStatus | null {
  if (!notes) return null;
  const match = notes.match(/\[ACTIFY_STATUS:([a-z_]+)\]/i);
  if (!match) return null;
  const value = match[1].toLowerCase();
  return WORKFLOW_ATTENDANCE_STATUS_VALUES.includes(value as WorkflowAttendanceStatus)
    ? (value as WorkflowAttendanceStatus)
    : null;
}

function addStatusTag(status: WorkflowAttendanceStatus, note: string | null | undefined) {
  const cleanNote = note?.trim() ? note.trim() : "";
  if (status !== "declined" && status !== "missed" && status !== "not_appropriate") {
    return cleanNote || null;
  }
  const tag = `${STATUS_TAG_PREFIX}${status}]`;
  return cleanNote ? `${tag} ${cleanNote}` : tag;
}

export function parseWorkflowTimeframe(value: string | null | undefined): WorkflowTimeframeKey {
  if (!value) return "THIS_MONTH";
  const normalized = value.trim().toUpperCase();
  return WORKFLOW_TIMEFRAME_VALUES.includes(normalized as WorkflowTimeframeKey)
    ? (normalized as WorkflowTimeframeKey)
    : "THIS_MONTH";
}

export function getWorkflowWindow(timeZone: string, timeframe: WorkflowTimeframeKey, now = new Date()): TimeframeWindow {
  if (timeframe === "THIS_MONTH") {
    const startAt = startOfZonedMonth(now, timeZone);
    const nextMonthStart = startOfZonedMonthShift(now, timeZone, 1);
    const endAt = new Date(nextMonthStart.getTime() - 1);

    const previousStartAt = startOfZonedMonthShift(now, timeZone, -1);
    const previousEndAt = new Date(startAt.getTime() - 1);

    return {
      timeframe,
      startAt,
      endAt,
      previousStartAt,
      previousEndAt
    };
  }

  if (timeframe === "LAST_MONTH") {
    const startAt = startOfZonedMonthShift(now, timeZone, -1);
    const thisMonthStart = startOfZonedMonth(now, timeZone);
    const endAt = new Date(thisMonthStart.getTime() - 1);
    const previousStartAt = startOfZonedMonthShift(now, timeZone, -2);
    const previousEndAt = new Date(startAt.getTime() - 1);

    return {
      timeframe,
      startAt,
      endAt,
      previousStartAt,
      previousEndAt
    };
  }

  if (timeframe === "LAST_90_DAYS") {
    const endAt = endOfZonedDay(now, timeZone);
    const startAt = startOfZonedDay(subtractDays(now, 89), timeZone);
    const previousEndAt = new Date(startAt.getTime() - 1);
    const previousStartAt = startOfZonedDay(subtractDays(startAt, 90), timeZone);
    return {
      timeframe,
      startAt,
      endAt,
      previousStartAt,
      previousEndAt
    };
  }

  const endAt = endOfZonedDay(now, timeZone);
  const startAt = startOfZonedDay(subtractDays(now, 29), timeZone);
  const previousEndAt = new Date(startAt.getTime() - 1);
  const previousStartAt = startOfZonedDay(subtractDays(startAt, 30), timeZone);
  return {
    timeframe,
    startAt,
    endAt,
    previousStartAt,
    previousEndAt
  };
}

export function parseDateKeyForWorkflow(value: string | null | undefined, timeZone: string) {
  if (!value) return startOfZonedDay(new Date(), timeZone);
  return zonedDateStringToUtcStart(value, timeZone) ?? startOfZonedDay(new Date(), timeZone);
}

export function formatActivityTimeLabel(startAt: Date, endAt: Date, timeZone: string) {
  const start = formatInTimeZone(startAt, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
  const end = formatInTimeZone(endAt, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${start} - ${end}`;
}

export function inferActivityCategory(title: string) {
  const lower = title.toLowerCase();
  if (/1:1|one[-\s]?to[-\s]?one|room visit|bedside/.test(lower)) return "1:1";
  if (/bingo|group|music|exercise|craft|social|trivia|game|devotion|study/.test(lower)) return "Group";
  return "General";
}

export function statusCountsTowardParticipation(status: WorkflowAttendanceStatus) {
  return status === "attended" || status === "one_to_one_completed";
}

export function fromAttendanceRow(row: {
  status: AttendanceStatus;
  barrierReason: BarrierReason | null;
  notes: string | null;
}) {
  const tagged = statusTagFromNotes(row.notes);

  if (row.status === "PRESENT") {
    return {
      status: "attended" as WorkflowAttendanceStatus,
      note: stripStatusTag(row.notes),
      countsTowardParticipation: true
    };
  }

  if (row.status === "ACTIVE" || row.status === "LEADING") {
    return {
      status: "one_to_one_completed" as WorkflowAttendanceStatus,
      note: stripStatusTag(row.notes),
      countsTowardParticipation: true
    };
  }

  if (row.status === "REFUSED") {
    return {
      status: tagged === "declined" ? ("declined" as WorkflowAttendanceStatus) : ("refused" as WorkflowAttendanceStatus),
      note: stripStatusTag(row.notes),
      countsTowardParticipation: false
    };
  }

  if (row.status === "NO_SHOW") {
    if (tagged) {
      return {
        status: tagged,
        note: stripStatusTag(row.notes),
        countsTowardParticipation: statusCountsTowardParticipation(tagged)
      };
    }

    if (row.barrierReason === "ASLEEP" || row.barrierReason === "BED_BOUND") {
      return {
        status: "in_room_asleep" as WorkflowAttendanceStatus,
        note: stripStatusTag(row.notes),
        countsTowardParticipation: false
      };
    }

    if (row.barrierReason === "AT_APPOINTMENT" || row.barrierReason === "THERAPY") {
      return {
        status: "out_of_facility" as WorkflowAttendanceStatus,
        note: stripStatusTag(row.notes),
        countsTowardParticipation: false
      };
    }

    if (row.barrierReason === "NOT_INFORMED") {
      return {
        status: "missed" as WorkflowAttendanceStatus,
        note: stripStatusTag(row.notes),
        countsTowardParticipation: false
      };
    }

    return {
      status: "not_appropriate" as WorkflowAttendanceStatus,
      note: stripStatusTag(row.notes),
      countsTowardParticipation: false
    };
  }

  return {
    status: "not_appropriate" as WorkflowAttendanceStatus,
    note: stripStatusTag(row.notes),
    countsTowardParticipation: false
  };
}

export function toAttendanceRow(status: WorkflowAttendanceStatus, note?: string | null) {
  const taggedNote = addStatusTag(status, note);

  if (status === "attended") {
    return {
      status: "PRESENT" as AttendanceStatus,
      barrierReason: null as BarrierReason | null,
      notes: taggedNote,
      countsTowardParticipation: true
    };
  }

  if (status === "one_to_one_completed") {
    return {
      status: "ACTIVE" as AttendanceStatus,
      barrierReason: null as BarrierReason | null,
      notes: taggedNote,
      countsTowardParticipation: true
    };
  }

  if (status === "refused" || status === "declined") {
    return {
      status: "REFUSED" as AttendanceStatus,
      barrierReason: "REFUSED" as BarrierReason,
      notes: taggedNote,
      countsTowardParticipation: false
    };
  }

  if (status === "in_room_asleep") {
    return {
      status: "NO_SHOW" as AttendanceStatus,
      barrierReason: "ASLEEP" as BarrierReason,
      notes: taggedNote,
      countsTowardParticipation: false
    };
  }

  if (status === "out_of_facility") {
    return {
      status: "NO_SHOW" as AttendanceStatus,
      barrierReason: "AT_APPOINTMENT" as BarrierReason,
      notes: taggedNote,
      countsTowardParticipation: false
    };
  }

  if (status === "missed") {
    return {
      status: "NO_SHOW" as AttendanceStatus,
      barrierReason: "NOT_INFORMED" as BarrierReason,
      notes: taggedNote,
      countsTowardParticipation: false
    };
  }

  return {
    status: "NO_SHOW" as AttendanceStatus,
    barrierReason: "OTHER" as BarrierReason,
    notes: taggedNote ?? "Not appropriate",
    countsTowardParticipation: false
  };
}

export function summarizeAttendance(rows: AttendanceLikeRow[]) {
  let totalTrackedOpportunities = 0;
  let attendedCount = 0;
  let oneToOneCompletedCount = 0;
  let refusalCount = 0;
  let missedCount = 0;
  let participatedCount = 0;
  let lastTrackedAt: string | null = null;
  let maxTrackedAt = 0;

  for (const row of rows) {
    const mapped = fromAttendanceRow(row);
    totalTrackedOpportunities += 1;

    if (mapped.status === "attended") attendedCount += 1;
    if (mapped.status === "one_to_one_completed") oneToOneCompletedCount += 1;
    if (mapped.status === "refused" || mapped.status === "declined") refusalCount += 1;
    if (
      mapped.status === "missed" ||
      mapped.status === "in_room_asleep" ||
      mapped.status === "out_of_facility" ||
      mapped.status === "not_appropriate"
    ) {
      missedCount += 1;
    }

    if (mapped.countsTowardParticipation) participatedCount += 1;

    const trackedAt = row.activityStartAt.getTime();
    if (trackedAt > maxTrackedAt) {
      maxTrackedAt = trackedAt;
      lastTrackedAt = row.activityStartAt.toISOString();
    }
  }

  const participationPercentage =
    totalTrackedOpportunities > 0
      ? Math.round((participatedCount / totalTrackedOpportunities) * 100)
      : null;

  return {
    totalTrackedOpportunities,
    attendedCount,
    oneToOneCompletedCount,
    refusalCount,
    missedCount,
    participatedCount,
    participationPercentage,
    lastTrackedAt
  };
}

export function inferParticipationTrend(current: number | null, previous: number | null): "up" | "flat" | "down" {
  if (current === null && previous === null) return "flat";
  if (current !== null && previous === null) return current >= 50 ? "up" : "flat";
  if (current === null && previous !== null) return "down";

  const delta = (current ?? 0) - (previous ?? 0);
  if (delta >= 5) return "up";
  if (delta <= -5) return "down";
  return "flat";
}
