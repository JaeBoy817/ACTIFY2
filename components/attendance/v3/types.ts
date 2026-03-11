import type { AttendanceEntriesMap, AttendanceQuickResident, AttendanceSessionSummary } from "@/lib/attendance-tracker/types";
import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";

export type AttendanceMode = "today" | "activity" | "resident" | "history";

export type AttendanceStatusFilter =
  | "all"
  | "present"
  | "refused"
  | "asleep"
  | "out_of_room"
  | "one_to_one"
  | "not_applicable"
  | "clear"
  | "not_started"
  | "in_progress"
  | "complete";

export type AttendancePageBootstrapData = {
  dateKey: string;
  sessions: AttendanceSessionSummary[];
  selectedSessionId: string | null;
  residents: AttendanceQuickResident[];
  entriesByResidentId: AttendanceEntriesMap;
  historySessions: AttendanceSessionSummary[];
  historyLocations: string[];
  historyFrom: string;
  historyTo: string;
};

export type AttendanceSummaryMetric = {
  label: string;
  value: string;
  helpText: string;
  tone: "blue" | "violet" | "sky" | "emerald" | "amber";
};

export function toStatusFilterValue(status: QuickAttendanceStatus): AttendanceStatusFilter {
  if (status === "PRESENT") return "present";
  if (status === "REFUSED") return "refused";
  if (status === "ASLEEP") return "asleep";
  if (status === "OUT_OF_ROOM") return "out_of_room";
  if (status === "ONE_TO_ONE") return "one_to_one";
  if (status === "NOT_APPLICABLE") return "not_applicable";
  return "clear";
}

