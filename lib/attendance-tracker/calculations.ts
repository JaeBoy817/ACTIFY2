export type SimpleAttendanceStatus = "Attended" | "Declined" | "Unavailable" | "Not Recorded";
export type SimpleActivityType = "Group" | "1:1";

export type SimpleAttendanceRecord = {
  residentId: string;
  activityType: SimpleActivityType;
  status: SimpleAttendanceStatus;
  dateKey: string;
  completed?: boolean;
};

export type SimpleResident = {
  id: string;
  name?: string;
};

export type SimpleAttendanceStats = {
  totalActiveResidents: number;
  weeklyParticipants: number;
  weeklyParticipationPercentage: number;
  monthlyParticipants: number;
  monthlyParticipationPercentage: number;
  monthlyGroupCheckIns: number;
  monthlyOneToOneVisits: number;
  notSeenThisWeek: number;
  notSeenThisMonth: number;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isAttended(record: SimpleAttendanceRecord) {
  return record.status === "Attended";
}

function isWithinDateRange(dateKey: string, startDateKey: string, endDateKey: string) {
  return dateKey >= startDateKey && dateKey <= endDateKey;
}

export function calculateParticipationPercentage(participants: number, totalResidents: number) {
  if (totalResidents <= 0) return 0;
  return Number(((participants / totalResidents) * 100).toFixed(1));
}

export function getUniqueParticipants(records: SimpleAttendanceRecord[]) {
  return new Set(records.filter(isAttended).map((record) => record.residentId));
}

export function getDailyParticipants(records: SimpleAttendanceRecord[], dateKey: string) {
  return getUniqueParticipants(records.filter((record) => record.dateKey === dateKey));
}

export function getWeeklyParticipants(records: SimpleAttendanceRecord[], weekStartDateKey: string, weekEndDateKey: string) {
  return getUniqueParticipants(records.filter((record) => isWithinDateRange(record.dateKey, weekStartDateKey, weekEndDateKey)));
}

export function getMonthlyParticipants(records: SimpleAttendanceRecord[], monthStartDateKey: string, monthEndDateKey: string) {
  return getUniqueParticipants(records.filter((record) => isWithinDateRange(record.dateKey, monthStartDateKey, monthEndDateKey)));
}

export function getGroupCheckIns(records: SimpleAttendanceRecord[], dateRange: { startDateKey: string; endDateKey: string }) {
  return records.filter(
    (record) =>
      record.activityType === "Group" &&
      record.status === "Attended" &&
      isWithinDateRange(record.dateKey, dateRange.startDateKey, dateRange.endDateKey)
  ).length;
}

export function getOneToOneVisitCount(records: SimpleAttendanceRecord[], dateRange: { startDateKey: string; endDateKey: string }) {
  return records.filter(
    (record) =>
      record.activityType === "1:1" &&
      record.status === "Attended" &&
      record.completed !== false &&
      isWithinDateRange(record.dateKey, dateRange.startDateKey, dateRange.endDateKey)
  ).length;
}

export function getResidentsNotSeenThisWeek(
  activeResidents: SimpleResident[],
  attendanceRecords: SimpleAttendanceRecord[],
  weekStartDateKey: string,
  weekEndDateKey: string
) {
  const seenResidentIds = getWeeklyParticipants(attendanceRecords, weekStartDateKey, weekEndDateKey);
  return activeResidents.filter((resident) => !seenResidentIds.has(resident.id));
}

export function getResidentsNotSeenThisMonth(
  activeResidents: SimpleResident[],
  attendanceRecords: SimpleAttendanceRecord[],
  monthStartDateKey: string,
  monthEndDateKey: string
) {
  const seenResidentIds = getMonthlyParticipants(attendanceRecords, monthStartDateKey, monthEndDateKey);
  return activeResidents.filter((resident) => !seenResidentIds.has(resident.id));
}

export function formatStateReadySummary(stats: SimpleAttendanceStats, currentDate: string) {
  if (stats.totalActiveResidents <= 0) {
    return `As of ${currentDate}, there are no active residents available for attendance tracking.`;
  }

  return `As of ${currentDate}, ${stats.weeklyParticipants} of ${stats.totalActiveResidents} active residents have participated in at least one activity this week, for a weekly participation rate of ${stats.weeklyParticipationPercentage.toFixed(1)}%. There have been ${stats.monthlyGroupCheckIns} group activity ${stats.monthlyGroupCheckIns === 1 ? "check-in" : "check-ins"} and ${stats.monthlyOneToOneVisits} completed 1:1 ${stats.monthlyOneToOneVisits === 1 ? "visit" : "visits"} this month for a monthly participation rate of ${stats.monthlyParticipationPercentage.toFixed(1)}%. ${pluralize(stats.notSeenThisWeek, "resident")} ${stats.notSeenThisWeek === 1 ? "has" : "have"} not participated this week and may need follow-up. ${stats.monthlyParticipants} of ${stats.totalActiveResidents} active residents have participated in at least one group activity or completed 1:1 visit this month. ${pluralize(stats.notSeenThisMonth, "resident")} ${stats.notSeenThisMonth === 1 ? "has" : "have"} not been seen this month and may need follow-up.`;
}
