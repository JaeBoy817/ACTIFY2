import { startOfMonth } from "date-fns";

import {
  inferDocumentationAssignedStaff,
  inferDocumentationAssessmentType,
  inferDocumentationDueDate,
  inferDocumentationKind,
  inferDocumentationNoMajorChange,
  inferDocumentationPriority,
  inferDocumentationReviewDate,
  inferDocumentationSectionProgress,
  inferDocumentationSectionStates,
  inferDocumentationStatus,
  parseDocumentationMeta,
  stripDocumentationMeta
} from "@/lib/documentation/meta";
import { getDocumentationOverview, getDocumentationRows } from "@/lib/documentation/service";
import type {
  DocumentationAssessmentType,
  DocumentationKind,
  DocumentationListRow,
  DocumentationPriority,
  DocumentationSectionChangeState,
  DocumentationStatus
} from "@/lib/documentation/types";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export type DocumentationResidentOption = {
  id: string;
  name: string;
  room: string;
  unit: string | null;
  age: number | null;
};

export type DocumentationEditorData = {
  id?: string;
  residentId: string;
  title: string;
  narrative: string;
  followUp: string;
  status: DocumentationStatus;
  priority: DocumentationPriority;
  dueDate: string;
  occurredAt: string;
  participationLevel: "MINIMAL" | "MODERATE" | "HIGH";
  moodAffect: "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED";
  cuesRequired: "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
};

function toLocalDateTimeInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toAge(birthDate: Date | null | undefined) {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export async function getDocumentationBaseContext() {
  const context = await requireModulePage("notes");

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      NOT: {
        status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
      }
    },
    orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      birthDate: true,
      unit: {
        select: {
          name: true
        }
      }
    }
  });

  const residentOptions: DocumentationResidentOption[] = residents.map((resident) => ({
    id: resident.id,
    name: `${resident.firstName} ${resident.lastName}`,
    room: resident.room,
    unit: resident.unit?.name ?? null,
    age: toAge(resident.birthDate)
  }));

  return {
    context,
    residents: residentOptions
  };
}

export async function getDocumentationOverviewData(facilityId: string) {
  const rows = await getDocumentationRows({
    facilityId,
    monthStart: startOfMonth(new Date()),
    limit: 900
  });

  const overview = getDocumentationOverview(rows);

  const oneToOneDue = rows
    .filter((row) => row.kind === "ONE_TO_ONE" && row.status !== "COMPLETED")
    .slice(0, 6);

  const recentProgress = rows
    .filter((row) => row.kind === "PROGRESS")
    .slice(0, 6);

  const udaDue = rows
    .filter((row) => row.kind === "UDA" && row.dueDateIso)
    .sort((a, b) => {
      const aTime = new Date(a.dueDateIso as string).getTime();
      const bTime = new Date(b.dueDateIso as string).getTime();
      return aTime - bTime;
    })
    .slice(0, 6);

  const mdsDue = rows
    .filter((row) => row.kind === "MDS" && row.dueDateIso)
    .sort((a, b) => {
      const aTime = new Date(a.dueDateIso as string).getTime();
      const bTime = new Date(b.dueDateIso as string).getTime();
      return aTime - bTime;
    })
    .slice(0, 6);

  const completionPercentage = rows.length > 0 ? Math.round((overview.statusColumns.COMPLETED.length / rows.length) * 100) : 0;

  return {
    rows,
    overview,
    oneToOneDue,
    recentProgress,
    udaDue,
    mdsDue,
    completionPercentage
  };
}

export async function getDocumentationRowsForKind(facilityId: string, kind?: DocumentationKind) {
  return getDocumentationRows({
    facilityId,
    kind,
    monthStart: startOfMonth(new Date()),
    limit: 900
  });
}

export async function getDocumentationEntryForEditor(params: {
  facilityId: string;
  id: string;
  expectedKind: DocumentationKind;
}): Promise<DocumentationEditorData | null> {
  const note = await prisma.progressNote.findFirst({
    where: {
      id: params.id,
      resident: {
        facilityId: params.facilityId
      }
    },
    select: {
      id: true,
      type: true,
      residentId: true,
      participationLevel: true,
      moodAffect: true,
      cuesRequired: true,
      response: true,
      followUp: true,
      narrative: true,
      createdAt: true
    }
  });

  if (!note) return null;

  const kind = inferDocumentationKind({ noteType: note.type, narrative: note.narrative });
  if (kind !== params.expectedKind) return null;

  const dueDateIso = inferDocumentationDueDate(note.narrative);

  return {
    id: note.id,
    residentId: note.residentId,
    title: note.followUp?.trim() || "",
    narrative: stripDocumentationMeta(note.narrative),
    followUp: note.followUp?.trim() || "",
    status: inferDocumentationStatus(note.narrative),
    priority: inferDocumentationPriority(note.narrative),
    dueDate: dueDateIso ? dueDateIso.slice(0, 10) : "",
    occurredAt: toLocalDateTimeInput(note.createdAt),
    participationLevel: note.participationLevel,
    moodAffect: note.moodAffect,
    cuesRequired: note.cuesRequired,
    response: note.response
  };
}

export function getDefaultDocumentationEditorData(params: {
  kind: DocumentationKind;
  residentId?: string;
}): DocumentationEditorData {
  const defaultResponse = params.kind === "ONE_TO_ONE" ? "POSITIVE" : "NEUTRAL";

  return {
    residentId: params.residentId ?? "",
    title: "",
    narrative: "",
    followUp: "",
    status: "DRAFT",
    priority: "MEDIUM",
    dueDate: "",
    occurredAt: toLocalDateTimeInput(new Date()),
    participationLevel: "MODERATE",
    moodAffect: "CALM",
    cuesRequired: "VERBAL",
    response: defaultResponse,
  };
}

export function mapRowsByStatus(rows: DocumentationListRow[]): Record<DocumentationStatus, DocumentationListRow[]> {
  return {
    DRAFT: rows.filter((row) => row.status === "DRAFT"),
    IN_PROGRESS: rows.filter((row) => row.status === "IN_PROGRESS"),
    READY_REVIEW: rows.filter((row) => row.status === "READY_REVIEW"),
    COMPLETED: rows.filter((row) => row.status === "COMPLETED")
  };
}

export type ClinicalAssessmentKind = "UDA" | "MDS";

export type ClinicalAssessmentQueueRow = {
  id: string;
  kind: ClinicalAssessmentKind;
  status: DocumentationStatus;
  priority: DocumentationPriority;
  residentId: string;
  residentName: string;
  residentRoom: string;
  residentUnit: string | null;
  residentAge: number | null;
  assessmentType: DocumentationAssessmentType;
  title: string;
  summary: string;
  createdAtIso: string;
  dueDateIso: string | null;
  reviewDateIso: string | null;
  authorName: string;
  assignedStaff: string | null;
  sectionProgress: number | null;
  noMajorChange: boolean | null;
  lastCompletedDateIso: string | null;
  isOverdue: boolean;
  isDueSoon: boolean;
};

export type ClinicalAssessmentHistoryRow = {
  id: string;
  kind: ClinicalAssessmentKind;
  assessmentType: DocumentationAssessmentType;
  status: DocumentationStatus;
  createdAtIso: string;
  dueDateIso: string | null;
  reviewDateIso: string | null;
  authorName: string;
  assignedStaff: string | null;
  summary: string;
  narrative: string;
  sectionStates: Record<string, DocumentationSectionChangeState> | null;
};

export type ClinicalAssessmentEditorData = DocumentationEditorData & {
  assessmentType: DocumentationAssessmentType;
  reviewDate: string;
  assignedStaff: string;
  noMajorChange: boolean;
  sectionStates: Record<string, DocumentationSectionChangeState>;
  carryForwardFromId: string;
};

function normalizeAssessmentType(kind: ClinicalAssessmentKind, value: DocumentationAssessmentType | null) {
  if (kind === "UDA") {
    if (value === "ANNUAL" || value === "QUARTERLY") return value;
    return "ANNUAL";
  }
  return "SECTION_F";
}

function normalizeDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function computeDueFlags(dueDateIso: string | null, status: DocumentationStatus) {
  if (!dueDateIso || status === "COMPLETED") {
    return {
      isOverdue: false,
      isDueSoon: false
    };
  }

  const due = new Date(dueDateIso);
  if (Number.isNaN(due.getTime())) {
    return {
      isOverdue: false,
      isDueSoon: false
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(todayStart);
  horizon.setDate(horizon.getDate() + 7);

  return {
    isOverdue: due < todayStart,
    isDueSoon: due >= todayStart && due <= horizon
  };
}

function mapToClinicalQueueRow(params: {
  note: {
    id: string;
    type: "GROUP" | "ONE_TO_ONE";
    residentId: string;
    narrative: string;
    followUp: string | null;
    createdAt: Date;
    resident: {
      firstName: string;
      lastName: string;
      room: string;
      birthDate: Date | null;
      unit: { name: string } | null;
    };
    createdByUser: { name: string };
  };
  kind: ClinicalAssessmentKind;
}): ClinicalAssessmentQueueRow {
  const kind = params.kind;
  const note = params.note;
  const assessmentType = normalizeAssessmentType(kind, inferDocumentationAssessmentType(note.narrative));
  const status = inferDocumentationStatus(note.narrative);
  const dueDateIso = inferDocumentationDueDate(note.narrative);
  const flags = computeDueFlags(dueDateIso, status);
  const summaryRaw = stripDocumentationMeta(note.narrative);
  const summary = summaryRaw.length > 180 ? `${summaryRaw.slice(0, 177)}...` : summaryRaw;

  return {
    id: note.id,
    kind,
    status,
    priority: inferDocumentationPriority(note.narrative),
    residentId: note.residentId,
    residentName: `${note.resident.firstName} ${note.resident.lastName}`,
    residentRoom: note.resident.room,
    residentUnit: note.resident.unit?.name ?? null,
    residentAge: toAge(note.resident.birthDate),
    assessmentType,
    title:
      note.followUp?.trim() ||
      (kind === "UDA"
        ? assessmentType === "QUARTERLY"
          ? "Quarterly UDA Assessment"
          : "Annual UDA Assessment"
        : "MDS Section F Support Entry"),
    summary,
    createdAtIso: note.createdAt.toISOString(),
    dueDateIso,
    reviewDateIso: inferDocumentationReviewDate(note.narrative),
    authorName: note.createdByUser.name,
    assignedStaff: inferDocumentationAssignedStaff(note.narrative),
    sectionProgress: inferDocumentationSectionProgress(note.narrative),
    noMajorChange: inferDocumentationNoMajorChange(note.narrative),
    lastCompletedDateIso: null,
    isOverdue: flags.isOverdue,
    isDueSoon: flags.isDueSoon
  };
}

function completedKey(row: Pick<ClinicalAssessmentQueueRow, "residentId" | "assessmentType">) {
  return `${row.residentId}:${row.assessmentType}`;
}

export async function getClinicalAssessmentQueueData(params: {
  facilityId: string;
  kind: ClinicalAssessmentKind;
}) {
  const notes = await prisma.progressNote.findMany({
    where: {
      resident: {
        facilityId: params.facilityId
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 1200,
    include: {
      resident: {
        select: {
          firstName: true,
          lastName: true,
          room: true,
          birthDate: true,
          unit: {
            select: {
              name: true
            }
          }
        }
      },
      createdByUser: {
        select: {
          name: true
        }
      }
    }
  });

  const rows = notes
    .map((note) => {
      const kind = inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      });
      if (kind !== params.kind) return null;
      return mapToClinicalQueueRow({
        note: {
          ...note,
          type: note.type as "GROUP" | "ONE_TO_ONE"
        },
        kind: params.kind
      });
    })
    .filter((row): row is ClinicalAssessmentQueueRow => Boolean(row));

  const latestCompletedByResident = new Map<string, string>();
  for (const row of rows) {
    if (row.status !== "COMPLETED") continue;
    const key = completedKey(row);
    if (!latestCompletedByResident.has(key)) {
      latestCompletedByResident.set(key, row.createdAtIso);
    }
  }

  const queueRows = rows.map((row) => ({
    ...row,
    lastCompletedDateIso: latestCompletedByResident.get(completedKey(row)) ?? null
  }));

  const unitOptions = Array.from(new Set(queueRows.map((row) => row.residentUnit).filter((value): value is string => Boolean(value)))).sort();
  const staffOptions = Array.from(
    new Set(queueRows.map((row) => row.assignedStaff || row.authorName).filter((value): value is string => Boolean(value)))
  ).sort();

  return {
    rows: queueRows,
    unitOptions,
    staffOptions
  };
}

function mapToClinicalHistoryRow(params: {
  note: {
    id: string;
    type: "GROUP" | "ONE_TO_ONE";
    narrative: string;
    followUp: string | null;
    createdAt: Date;
    createdByUser: { name: string };
  };
  kind: ClinicalAssessmentKind;
}): ClinicalAssessmentHistoryRow {
  const note = params.note;
  const kind = params.kind;
  const assessmentType = normalizeAssessmentType(kind, inferDocumentationAssessmentType(note.narrative));
  const summaryRaw = stripDocumentationMeta(note.narrative);
  const summary = summaryRaw.length > 180 ? `${summaryRaw.slice(0, 177)}...` : summaryRaw;

  return {
    id: note.id,
    kind,
    assessmentType,
    status: inferDocumentationStatus(note.narrative),
    createdAtIso: note.createdAt.toISOString(),
    dueDateIso: inferDocumentationDueDate(note.narrative),
    reviewDateIso: inferDocumentationReviewDate(note.narrative),
    authorName: note.createdByUser.name,
    assignedStaff: inferDocumentationAssignedStaff(note.narrative),
    summary: note.followUp?.trim() || summary,
    narrative: summaryRaw,
    sectionStates: inferDocumentationSectionStates(note.narrative)
  };
}

export async function getClinicalAssessmentHistoryForResident(params: {
  facilityId: string;
  residentId: string;
  kind: ClinicalAssessmentKind;
  limit?: number;
}) {
  const notes = await prisma.progressNote.findMany({
    where: {
      residentId: params.residentId,
      resident: {
        facilityId: params.facilityId
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: params.limit ?? 24,
    include: {
      createdByUser: {
        select: {
          name: true
        }
      }
    }
  });

  return notes
    .map((note) => {
      const kind = inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      });
      if (kind !== params.kind) return null;
      return mapToClinicalHistoryRow({
        note: {
          ...note,
          type: note.type as "GROUP" | "ONE_TO_ONE"
        },
        kind: params.kind
      });
    })
    .filter((row): row is ClinicalAssessmentHistoryRow => Boolean(row));
}

export async function getClinicalAssessmentEntryForEditor(params: {
  facilityId: string;
  id: string;
  kind: ClinicalAssessmentKind;
}): Promise<ClinicalAssessmentEditorData | null> {
  const note = await prisma.progressNote.findFirst({
    where: {
      id: params.id,
      resident: {
        facilityId: params.facilityId
      }
    },
    select: {
      id: true,
      type: true,
      residentId: true,
      participationLevel: true,
      moodAffect: true,
      cuesRequired: true,
      response: true,
      followUp: true,
      narrative: true,
      createdAt: true
    }
  });

  if (!note) return null;

  const kind = inferDocumentationKind({
    noteType: note.type,
    narrative: note.narrative
  });

  if (kind !== params.kind) return null;

  const meta = parseDocumentationMeta(note.narrative);
  const normalizedType = normalizeAssessmentType(params.kind, inferDocumentationAssessmentType(note.narrative));

  return {
    id: note.id,
    residentId: note.residentId,
    title: note.followUp?.trim() || "",
    narrative: stripDocumentationMeta(note.narrative),
    followUp: note.followUp?.trim() || "",
    status: inferDocumentationStatus(note.narrative),
    priority: inferDocumentationPriority(note.narrative),
    dueDate: normalizeDateInput(inferDocumentationDueDate(note.narrative)),
    occurredAt: toLocalDateTimeInput(note.createdAt),
    participationLevel: note.participationLevel,
    moodAffect: note.moodAffect,
    cuesRequired: note.cuesRequired,
    response: note.response,
    assessmentType: normalizedType,
    reviewDate: normalizeDateInput(inferDocumentationReviewDate(note.narrative)),
    assignedStaff: inferDocumentationAssignedStaff(note.narrative) || "",
    noMajorChange: inferDocumentationNoMajorChange(note.narrative) ?? false,
    sectionStates: meta?.sectionStates ?? {},
    carryForwardFromId: meta?.carryForwardFromId ?? ""
  };
}

export function getDefaultClinicalAssessmentEditorData(params: {
  kind: ClinicalAssessmentKind;
  residentId?: string;
  assessmentType?: DocumentationAssessmentType;
}): ClinicalAssessmentEditorData {
  const defaults = getDefaultDocumentationEditorData({
    kind: params.kind,
    residentId: params.residentId
  });

  return {
    ...defaults,
    assessmentType: normalizeAssessmentType(params.kind, params.assessmentType ?? null),
    reviewDate: "",
    assignedStaff: "",
    noMajorChange: false,
    sectionStates: {},
    carryForwardFromId: ""
  };
}
