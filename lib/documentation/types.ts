export type DocumentationKind = "PROGRESS" | "ONE_TO_ONE" | "UDA" | "MDS";

export type DocumentationStatus = "DRAFT" | "IN_PROGRESS" | "READY_REVIEW" | "COMPLETED";

export type DocumentationPriority = "LOW" | "MEDIUM" | "HIGH";

export type DocumentationMeta = {
  kind: DocumentationKind;
  status?: DocumentationStatus;
  dueDate?: string | null;
  priority?: DocumentationPriority;
  template?: string | null;
  sectionProgress?: number | null;
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
  createdAtIso: string;
  authorName: string;
  dueDateIso: string | null;
  hasFollowUp: boolean;
};

export type DocumentationOverviewCounts = {
  totalThisMonth: number;
  draftCount: number;
  completedCount: number;
  dueSoonCount: number;
};

