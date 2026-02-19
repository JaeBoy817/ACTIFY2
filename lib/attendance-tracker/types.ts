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
