import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";

export type AttendanceQuickResident = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  unitName: string | null;
  residentStatus: string;
};

export type SessionSummaryCounts = {
  present: number;
  refused: number;
  asleep: number;
  outOfRoom: number;
  oneToOne: number;
  notApplicable: number;
  totalEntries: number;
};

export type AttendanceSessionSummary = {
  id: string;
  title: string;
  dateKey: string;
  startAt: string;
  endAt: string;
  location: string;
  counts: SessionSummaryCounts;
  completionPercent: number;
  hasNotes: boolean;
  updatedAt: string;
};

export type AttendanceEntriesMap = Record<string, { status: QuickAttendanceStatus; notes: string | null }>;

export type AttendanceQuickTakePayload = {
  dateKey: string;
  sessions: AttendanceSessionSummary[];
  selectedSessionId: string | null;
  residents: AttendanceQuickResident[];
  entriesByResidentId: AttendanceEntriesMap;
};

export type AttendanceSessionDetail = {
  session: AttendanceSessionSummary;
  residents: AttendanceQuickResident[];
  entriesByResidentId: AttendanceEntriesMap;
};

export type ResidentAttendanceSummaryPayload = {
  resident: {
    id: string;
    name: string;
    room: string;
    status: string;
  };
  summary7: SessionSummaryCounts;
  summary30: SessionSummaryCounts;
  topActivities: Array<{ title: string; count: number }>;
  sessions: Array<{
    id: string;
    sessionId: string | null;
    title: string;
    location: string;
    dateLabel: string;
    status: QuickAttendanceStatus;
    notes: string | null;
  }>;
};

export type MonthlyAttendanceReportPayload = {
  monthKey: string;
  totalEntries: number;
  totals: {
    present: number;
    refused: number;
    asleep: number;
    outOfRoom: number;
    oneToOne: number;
    notApplicable: number;
  };
  daily: Array<{ dateKey: string; total: number }>;
  sessions: Array<{
    title: string;
    dateKey: string;
    present: number;
    refused: number;
    noShowLike: number;
    oneToOne: number;
  }>;
};

export type AttendanceTrackerResidentSummary = {
  id: string;
  name: string;
  room: string;
  unitName: string | null;
  lastParticipatedLabel?: string | null;
  recommendedAction?: string;
};

export type AttendanceTrackerRangeSummary = {
  startDateKey: string;
  endDateKey: string;
  participationPercent: number;
  participatedResidentCount: number;
  activeResidentCount: number;
  groupAttendanceCount: number;
  oneToOneVisitCount: number;
  totalParticipationMarks: number;
};

export type AttendanceTrackerSummary = {
  dateKey: string;
  dayLabel: string;
  weekLabel: string;
  monthLabel: string;
  generatedAt: string;
  activeResidentCount: number;
  daily: AttendanceTrackerRangeSummary;
  weekly: AttendanceTrackerRangeSummary;
  monthly: AttendanceTrackerRangeSummary;
  residentsNotSeenThisWeek: AttendanceTrackerResidentSummary[];
  stateReadySummary: string;
  recentOneToOneVisits: AttendanceTrackerRecentOneToOneVisit[];
  reports: AttendanceTrackerReports;
};

export type AttendanceTrackerRecentOneToOneVisit = {
  id: string;
  dateLabel: string;
  residentName: string;
  room: string;
  activityProvided: string;
  durationLabel: string;
  completed: boolean;
};

export type AttendanceTrackerReportRow = {
  id: string;
  residentName: string;
  room: string;
  activityName: string;
  activityType: "Group" | "1:1";
  status: "Attended" | "Declined" | "Unavailable";
  dateLabel: string;
};

export type AttendanceTrackerReportResidentRef = {
  residentId: string;
  residentName: string;
  room: string;
};

export type AttendanceTrackerActivityBreakdown = {
  activityId: string;
  activityName: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  attendanceCount: number;
  residents: AttendanceTrackerReportResidentRef[];
};

export type AttendanceTrackerDaySnapshot = {
  dateLabel: string;
  groupActivityCount: number;
  groupCheckIns: number;
  uniqueParticipants: number;
  participationPercent: number;
};

export type AttendanceTrackerWeekBreakdown = {
  weekLabel: string;
  groupActivityCount: number;
  groupCheckIns: number;
  uniqueParticipants: number;
  participationPercent: number;
  oneToOneVisits: number;
};

export type AttendanceTrackerReportSummary = {
  title: string;
  dateRangeLabel: string;
  generatedLabel: string;
  summaryText: string;
  totalActiveResidents: number;
  participatedResidentCount: number;
  notSeenResidentCount: number;
  participationPercent: number;
  groupCheckIns: number;
  oneToOneVisits: number;
  declined: number;
  unavailable: number;
  groupSessionCount: number;
};

export type AttendanceTrackerResidentParticipationRow = {
  residentId: string;
  residentName: string;
  room: string;
  participatedThisMonth: boolean;
  groupCheckIns: number;
  oneToOneVisits: number;
  lastParticipatedLabel: string | null;
};

export type AttendanceTrackerActivityCount = {
  activityId?: string;
  activityName: string;
  dateLabel?: string;
  timeLabel?: string;
  count: number;
};

export type AttendanceTrackerOneToOneReportEntry = {
  sessionId: string;
  residentId: string;
  residentName: string;
  dateLabel: string;
  timeLabel: string;
  progressNote: string;
  missingDateOrTime: boolean;
};

export type AttendanceTrackerOneToOneReportSummary = {
  title: string;
  dateRangeLabel: string;
  generatedLabel: string;
  summaryText: string;
  monthLabel: string;
  totalCompletedVisits: number;
  residentsServedCount: number;
  residentsWithoutOneToOneCount: number;
  averageVisitsPerWeek: number;
  mostRecentVisitDate: string | null;
};

export type AttendanceTrackerReports = {
  daily: {
    summary: AttendanceTrackerReportSummary;
    rows: AttendanceTrackerReportRow[];
    activityBreakdowns: AttendanceTrackerActivityBreakdown[];
    residentsNotSeen: AttendanceTrackerResidentSummary[];
  };
  weekly: {
    summary: AttendanceTrackerReportSummary;
    residentsNotSeen: AttendanceTrackerResidentSummary[];
    daySnapshots: AttendanceTrackerDaySnapshot[];
    topActivities: AttendanceTrackerActivityCount[];
  };
  monthly: {
    summary: AttendanceTrackerReportSummary;
    residentsNotSeen: AttendanceTrackerResidentSummary[];
    residentParticipation: AttendanceTrackerResidentParticipationRow[];
    mostAttendedActivities: AttendanceTrackerActivityCount[];
    weekBreakdowns: AttendanceTrackerWeekBreakdown[];
  };
  oneToOneMonthly: {
    summary: AttendanceTrackerOneToOneReportSummary;
    entries: AttendanceTrackerOneToOneReportEntry[];
    missingDateOrTimeEntries: AttendanceTrackerOneToOneReportEntry[];
  };
};
