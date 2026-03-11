import { startOfMonth } from "date-fns";

import {
  inferDocumentationDueDate,
  inferDocumentationKind,
  inferDocumentationPriority,
  inferDocumentationStatus,
  stripDocumentationMeta
} from "@/lib/documentation/meta";
import { getDocumentationOverview, getDocumentationRows } from "@/lib/documentation/service";
import type { DocumentationKind, DocumentationListRow, DocumentationPriority, DocumentationStatus } from "@/lib/documentation/types";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export type DocumentationResidentOption = {
  id: string;
  name: string;
  room: string;
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
      room: true
    }
  });

  const residentOptions: DocumentationResidentOption[] = residents.map((resident) => ({
    id: resident.id,
    name: `${resident.firstName} ${resident.lastName}`,
    room: resident.room
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
