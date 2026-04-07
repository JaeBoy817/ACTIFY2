export type ReportTypeId =
  | "participation-summary"
  | "resident-engagement"
  | "monthly-activity-recap"
  | "due-documentation"
  | "follow-up";

export type ReportAudiencePreset =
  | "LEADERSHIP"
  | "SURVEY_PREP"
  | "INTERNAL_REVIEW"
  | "DEPARTMENT_SUMMARY"
  | "RESIDENT_SPECIFIC";

export type ReportTypeDefinition = {
  id: ReportTypeId;
  title: string;
  description: string;
  audience: string;
  useCase: string;
};

export type ReportTemplatePreset = {
  id: string;
  name: string;
  reportType: ReportTypeId;
  description: string;
  lastUsedLabel: string;
};

export type ReportHistoryItem = {
  id: string;
  name: string;
  reportType: ReportTypeId;
  generatedAtIso: string;
  format: "PDF" | "CSV" | "PRINT";
  generatedBy: string;
};

export type ReportSummaryCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: "file" | "star" | "clock" | "template";
};

export type ReportMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type ReportTrendPoint = {
  label: string;
  value: number;
};

export type ReportCategoryPerformance = {
  category: string;
  attendance: number;
  engagementRate: number;
};

export type ReportResidentEngagementRow = {
  residentId: string;
  residentName: string;
  room: string;
  unit: string | null;
  engagementLevel: "HIGH" | "MODERATE" | "LOW";
  supportiveAttendanceCount: number;
  oneToOneNotesCount: number;
  needsFollowUp: boolean;
  lastActivityLabel: string;
  summary: string;
};

export type ReportDocumentationDueRow = {
  id: string;
  residentName: string;
  room: string;
  kind: "PROGRESS" | "ONE_TO_ONE" | "UDA" | "MDS";
  statusLabel: string;
  dueDateLabel: string;
  dueDateIso: string | null;
  urgency: "OVERDUE" | "DUE_NOW" | "DUE_SOON";
  summary: string;
};

export type ReportFollowUpRow = {
  residentId: string;
  residentName: string;
  room: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  recommendation: string;
};

export type ReportsWorkspaceData = {
  facilityName: string;
  timeZone: string;
  monthKey: string;
  monthLabel: string;
  periodLabel: string;
  generatedAtLabel: string;
  canExport: boolean;
  reportTypes: ReportTypeDefinition[];
  summaryCards: ReportSummaryCard[];
  monthOptions: Array<{ key: string; label: string }>;
  metrics: {
    participationRate: number;
    notesCompleted: number;
    groupCount: number;
    oneToOneCount: number;
    engagedResidents: number;
    totalResidents: number;
    completionRate: number;
    followUpNeeded: number;
  };
  highlights: string[];
  keyTakeaways: string[];
  participationTrend: ReportTrendPoint[];
  noteVolumeTrend: Array<{ label: string; progress: number; oneToOne: number; total: number }>;
  categoryPerformance: ReportCategoryPerformance[];
  topPrograms: Array<{ title: string; sessions: number }>;
  residentEngagement: ReportResidentEngagementRow[];
  documentationDue: ReportDocumentationDueRow[];
  followUpRows: ReportFollowUpRow[];
  reportMetricsByType: Record<ReportTypeId, ReportMetric[]>;
  templates: ReportTemplatePreset[];
  history: ReportHistoryItem[];
  exports: {
    pdf: string;
    csv: string;
    preview: string;
  };
};
