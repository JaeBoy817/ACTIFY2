import { startOfMonth } from "date-fns";

import { prisma } from "@/lib/prisma";
import { parseDateOnlyInputToUtcStart } from "@/lib/datetime";
import {
  inferDocumentationAssignedStaff,
  inferDocumentationAssessmentType,
  inferDocumentationDueDate,
  inferDocumentationNoMajorChange,
  inferDocumentationKind,
  inferDocumentationPriority,
  inferDocumentationReviewDate,
  inferDocumentationSectionProgress,
  inferDocumentationStatus,
  stripDocumentationMeta
} from "@/lib/documentation/meta";
import type {
  DocumentationComplianceStatus,
  DocumentationKind,
  DocumentationListRow,
  DocumentationOverviewCounts,
  DocumentationStatus
} from "@/lib/documentation/types";

function isDueSoonStatus(status: DocumentationComplianceStatus | null | undefined) {
  return status === "DUE_SOON" || status === "DUE_THIS_MONTH" || status === "FOLLOW_UP_NEEDED";
}

function isDueSoon(dueDateIso: string | null, now: Date, timeZone?: string | null) {
  if (!dueDateIso) return false;
  const due = parseDateOnlyInputToUtcStart(dueDateIso, timeZone) ?? new Date(dueDateIso);
  if (Number.isNaN(due.getTime())) return false;
  const horizon = new Date(now);
  horizon.setDate(now.getDate() + 7);
  return due >= now && due <= horizon;
}

export async function getDocumentationRows(params: {
  facilityId: string;
  kind?: DocumentationKind;
  monthStart?: Date;
  limit?: number;
}) {
  const monthStart = params.monthStart ?? startOfMonth(new Date());

  const notes = await prisma.progressNote.findMany({
    where: {
      resident: {
        facilityId: params.facilityId
      },
      createdAt: {
        gte: monthStart
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: params.limit ?? 700,
    include: {
      resident: {
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
      },
      createdByUser: {
        select: {
          name: true
        }
      }
    }
  });

  const rows: DocumentationListRow[] = notes
    .map((note) => {
      const kind = inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      });
      if (params.kind && params.kind !== kind) return null;

      const narrative = stripDocumentationMeta(note.narrative);
      const summary = narrative.length > 140 ? `${narrative.slice(0, 137)}...` : narrative;
      const status = inferDocumentationStatus(note.narrative);
      const dueDateIso = inferDocumentationDueDate(note.narrative);

      return {
        id: note.id,
        kind,
        status,
        priority: inferDocumentationPriority(note.narrative),
        title: kind === "ONE_TO_ONE" ? "1:1 Documentation Entry" : kind === "PROGRESS" ? "Progress Documentation Entry" : `${kind} Documentation`,
        summary,
        residentId: note.residentId,
        residentName: `${note.resident.firstName} ${note.resident.lastName}`,
        residentRoom: note.resident.room,
        residentUnit: note.resident.unit?.name ?? null,
        residentBirthDateIso: note.resident.birthDate ? note.resident.birthDate.toISOString() : null,
        createdAtIso: note.createdAt.toISOString(),
        authorName: note.createdByUser.name,
        dueDateIso,
        reviewDateIso: inferDocumentationReviewDate(note.narrative),
        assessmentType: inferDocumentationAssessmentType(note.narrative),
        assignedStaff: inferDocumentationAssignedStaff(note.narrative),
        sectionProgress: inferDocumentationSectionProgress(note.narrative),
        noMajorChange: inferDocumentationNoMajorChange(note.narrative),
        hasFollowUp: Boolean(note.followUp && note.followUp.trim().length > 0)
      } satisfies DocumentationListRow;
    })
    .filter((row): row is DocumentationListRow => Boolean(row));

  return rows;
}

export function getDocumentationOverview(rows: DocumentationListRow[]) {
  const now = new Date();
  const kinds: DocumentationKind[] = ["PROGRESS", "ONE_TO_ONE", "UDA", "MDS"];
  const byKind = new Map<DocumentationKind, DocumentationOverviewCounts>();

  for (const kind of kinds) {
    byKind.set(kind, {
      totalThisMonth: 0,
      draftCount: 0,
      completedCount: 0,
      dueSoonCount: 0
    });
  }

  for (const row of rows) {
    const current = byKind.get(row.kind);
    if (!current) continue;
    current.totalThisMonth += 1;
    if (row.status === "DRAFT") current.draftCount += 1;
    if (row.status === "COMPLETED") current.completedCount += 1;
    if (isDueSoonStatus(row.complianceStatus)) {
      current.dueSoonCount += 1;
      continue;
    }
    if (isDueSoon(row.dueDateIso, now)) current.dueSoonCount += 1;
  }

  const statusColumns: Record<DocumentationStatus, DocumentationListRow[]> = {
    DRAFT: [],
    IN_PROGRESS: [],
    READY_REVIEW: [],
    COMPLETED: []
  };

  for (const row of rows) {
    statusColumns[row.status].push(row);
  }

  return {
    byKind,
    statusColumns
  };
}
