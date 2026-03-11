export type DocumentationKind = "PROGRESS" | "ONE_TO_ONE" | "UDA" | "MDS";

export type DocumentationStatus = "DRAFT" | "IN_PROGRESS" | "READY_REVIEW" | "COMPLETED";

export type DocumentationPriority = "LOW" | "MEDIUM" | "HIGH";

export type DocumentationAssessmentType = "ANNUAL" | "QUARTERLY" | "SECTION_F";

export type DocumentationSectionChangeState = "NO_CHANGE" | "UPDATED" | "SIGNIFICANT_CHANGE";

export type DocumentationMeta = {
  kind: DocumentationKind;
  status?: DocumentationStatus;
  dueDate?: string | null;
  priority?: DocumentationPriority;
  template?: string | null;
  sectionProgress?: number | null;
  assessmentType?: DocumentationAssessmentType | null;
  reviewDate?: string | null;
  assignedStaff?: string | null;
  noMajorChange?: boolean | null;
  sectionStates?: Record<string, DocumentationSectionChangeState> | null;
  carryForwardFromId?: string | null;
};

export type DocumentationListRow = {
  id: string;
  kind: DocumentationKind;
  status: DocumentationStatus;
  priority: DocumentationPriority;
  title: string;
  summary: string;
  residentId: string;
  residentName: string;
  residentRoom: string;
  residentUnit: string | null;
  residentBirthDateIso: string | null;
  createdAtIso: string;
  authorName: string;
  dueDateIso: string | null;
  reviewDateIso: string | null;
  assessmentType: DocumentationAssessmentType | null;
  assignedStaff: string | null;
  sectionProgress: number | null;
  noMajorChange: boolean | null;
  hasFollowUp: boolean;
};

export type DocumentationOverviewCounts = {
  totalThisMonth: number;
  draftCount: number;
  completedCount: number;
  dueSoonCount: number;
};
