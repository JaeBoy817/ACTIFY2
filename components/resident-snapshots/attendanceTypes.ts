export const ATTENDANCE_TIMEFRAME_OPTIONS = [
  { key: "THIS_MONTH", label: "This Month" },
  { key: "LAST_MONTH", label: "Last Month" },
  { key: "LAST_30_DAYS", label: "Last 30 Days" },
  { key: "LAST_90_DAYS", label: "Last 90 Days" }
] as const;

export type AttendanceTimeframeKey = (typeof ATTENDANCE_TIMEFRAME_OPTIONS)[number]["key"];

export const ATTENDANCE_STATUS_OPTIONS = [
  { key: "attended", label: "Attended", countsTowardParticipation: true },
  { key: "refused", label: "Refused", countsTowardParticipation: false },
  { key: "declined", label: "Declined", countsTowardParticipation: false },
  { key: "missed", label: "Missed", countsTowardParticipation: false },
  { key: "not_appropriate", label: "Not Appropriate", countsTowardParticipation: false },
  { key: "in_room_asleep", label: "In Room / Asleep", countsTowardParticipation: false },
  { key: "out_of_facility", label: "At Appointment / Out of Facility", countsTowardParticipation: false },
  { key: "one_to_one_completed", label: "1:1 Completed", countsTowardParticipation: true }
] as const;

export type AttendanceWorkflowStatus = (typeof ATTENDANCE_STATUS_OPTIONS)[number]["key"];

export type ResidentAttendanceSummary = {
  timeframe: AttendanceTimeframeKey;
  rangeStart: string;
  rangeEnd: string;
  totalTrackedOpportunities: number;
  attendedCount: number;
  oneToOneCompletedCount: number;
  refusalCount: number;
  missedCount: number;
  participatedCount: number;
  participationPercentage: number | null;
  previousParticipationPercentage: number | null;
  trend: "up" | "flat" | "down";
  lastTrackedAt: string | null;
};

export type ResidentAttendanceRecord = {
  id: string;
  activityId: string | null;
  activityTitle: string;
  date: string;
  timeLabel: string;
  location: string | null;
  category: string;
  status: AttendanceWorkflowStatus;
  note: string | null;
  countsTowardParticipation: boolean;
};

export type ResidentDayActivity = {
  activityId: string;
  activityTitle: string;
  startAt: string;
  endAt: string;
  timeLabel: string;
  location: string | null;
  category: string;
  status: AttendanceWorkflowStatus | null;
  note: string | null;
};

export type ResidentAttendanceWorkflowPayload = {
  ok: true;
  resident: {
    id: string;
    fullName: string;
    room: string;
    status: string;
  };
  timeframe: AttendanceTimeframeKey;
  selectedDate: string;
  summary: ResidentAttendanceSummary;
  records: ResidentAttendanceRecord[];
  dayActivities: ResidentDayActivity[];
};

export type BulkResidentParticipationPayload = {
  ok: true;
  timeframe: AttendanceTimeframeKey;
  rangeStart: string;
  rangeEnd: string;
  summaries: Array<{
    residentId: string;
    totalTrackedOpportunities: number;
    attendedCount: number;
    oneToOneCompletedCount: number;
    refusalCount: number;
    missedCount: number;
    participatedCount: number;
    participationPercentage: number | null;
    previousParticipationPercentage: number | null;
    trend: "up" | "flat" | "down";
    lastTrackedAt: string | null;
  }>;
};

export function attendanceStatusLabel(status: AttendanceWorkflowStatus) {
  return ATTENDANCE_STATUS_OPTIONS.find((option) => option.key === status)?.label ?? "Unknown";
}

export function defaultAttendanceSummary(timeframe: AttendanceTimeframeKey): ResidentAttendanceSummary {
  return {
    timeframe,
    rangeStart: "",
    rangeEnd: "",
    totalTrackedOpportunities: 0,
    attendedCount: 0,
    oneToOneCompletedCount: 0,
    refusalCount: 0,
    missedCount: 0,
    participatedCount: 0,
    participationPercentage: null,
    previousParticipationPercentage: null,
    trend: "flat",
    lastTrackedAt: null
  };
}
