export interface MonthlyReportPdfActivity {
  id: string;
  title: string;
  startAt: Date;
}

export interface MonthlyReportPdfAttendance {
  id: string;
  status: string;
  barrierReason: string | null;
  createdAt: Date;
  residentId: string;
  residentName: string;
  unitName: string;
  activityTitle: string;
  activityStartAt: Date;
}

export interface MonthlyReportPdfOutcome {
  resident: string;
  createdAt: Date;
  narrative: string;
}

export interface MonthlyReportPdfData {
  monthLabel: string;
  activities: MonthlyReportPdfActivity[];
  attendance: MonthlyReportPdfAttendance[];
  attendanceCounts: {
    present: number;
    active: number;
    leading: number;
    refused: number;
    noShow: number;
  };
  engagementAvg: number;
  topPrograms: Array<{ title: string; count: number }>;
  barrierSummary: Record<string, number>;
  oneToOneTotal: number;
  notableOutcomes: MonthlyReportPdfOutcome[];
}
