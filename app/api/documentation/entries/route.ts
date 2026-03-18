import { revalidatePath } from "next/cache";
import { z } from "zod";

import { asNotesApiErrorResponse, NotesApiError, requireNotesApiContext } from "@/lib/notes/api-context";
import { parseDateTimeInputToUtcDate } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import {
  attachDocumentationMeta,
  inferDocumentationAssignedStaff,
  inferDocumentationAssessmentType,
  inferDocumentationDueDate,
  inferDocumentationKind,
  inferDocumentationNoMajorChange,
  inferDocumentationPriority,
  inferDocumentationReviewDate,
  inferDocumentationSectionProgress,
  inferDocumentationStatus,
  stripDocumentationMeta
} from "@/lib/documentation/meta";
import type { DocumentationKind, DocumentationPriority, DocumentationStatus } from "@/lib/documentation/types";

const listSchema = z.object({
  kind: z.enum(["PROGRESS", "ONE_TO_ONE", "UDA", "MDS"]).optional()
});

const createSchema = z.object({
  kind: z.enum(["PROGRESS", "ONE_TO_ONE", "UDA", "MDS"]),
  residentId: z.string().trim().min(1),
  title: z.string().trim().max(180).default(""),
  narrative: z.string().trim().min(4),
  followUp: z.string().trim().max(1200).optional().nullable(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "READY_REVIEW", "COMPLETED"]).default("DRAFT"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  participationLevel: z.enum(["MINIMAL", "MODERATE", "HIGH"]).default("MODERATE"),
  moodAffect: z.enum(["BRIGHT", "CALM", "FLAT", "ANXIOUS", "AGITATED"]).default("CALM"),
  cuesRequired: z.enum(["NONE", "VERBAL", "VISUAL", "HAND_OVER_HAND"]).default("VERBAL"),
  response: z.enum(["POSITIVE", "NEUTRAL", "RESISTANT"]).default("NEUTRAL"),
  dueDate: z.string().trim().optional().nullable(),
  occurredAt: z.string().trim().optional().nullable(),
  sectionProgress: z.number().min(0).max(100).optional().nullable(),
  assessmentType: z.enum(["ADMISSION", "ANNUAL", "QUARTERLY", "SECTION_F"]).optional().nullable(),
  reviewDate: z.string().trim().optional().nullable(),
  assignedStaff: z.string().trim().max(120).optional().nullable(),
  noMajorChange: z.boolean().optional().nullable(),
  sectionStates: z.record(z.enum(["NO_CHANGE", "UPDATED", "SIGNIFICANT_CHANGE"])).optional().nullable(),
  carryForwardFromId: z.string().trim().optional().nullable()
});

function mapNoteToEntry(note: {
  id: string;
  type: "GROUP" | "ONE_TO_ONE";
  narrative: string;
  followUp: string | null;
  participationLevel: "MINIMAL" | "MODERATE" | "HIGH";
  moodAffect: "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED";
  cuesRequired: "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
  residentId: string;
  createdAt: Date;
  resident: { firstName: string; lastName: string; room: string };
  createdByUser: { name: string };
}) {
  return {
    id: note.id,
    kind: inferDocumentationKind({
      noteType: note.type,
      narrative: note.narrative
    }),
    status: inferDocumentationStatus(note.narrative),
    priority: inferDocumentationPriority(note.narrative),
    title: note.followUp?.trim() || "Documentation Entry",
    summary: stripDocumentationMeta(note.narrative).slice(0, 220),
    residentId: note.residentId,
    residentName: `${note.resident.firstName} ${note.resident.lastName}`,
    residentRoom: note.resident.room,
    createdAtIso: note.createdAt.toISOString(),
    authorName: note.createdByUser.name,
    dueDateIso: inferDocumentationDueDate(note.narrative),
    reviewDateIso: inferDocumentationReviewDate(note.narrative),
    assessmentType: inferDocumentationAssessmentType(note.narrative),
    assignedStaff: inferDocumentationAssignedStaff(note.narrative),
    sectionProgress: inferDocumentationSectionProgress(note.narrative),
    noMajorChange: inferDocumentationNoMajorChange(note.narrative),
    residentUnit: null,
    residentBirthDateIso: null,
    hasFollowUp: Boolean(note.followUp && note.followUp.trim().length > 0),
    participationLevel: note.participationLevel,
    moodAffect: note.moodAffect,
    cuesRequired: note.cuesRequired,
    response: note.response
  };
}

function toProgressNoteType(kind: DocumentationKind) {
  return kind === "ONE_TO_ONE" ? "ONE_TO_ONE" : "GROUP";
}

export async function GET(request: Request) {
  try {
    const context = await requireNotesApiContext();
    const url = new URL(request.url);
    const parsed = listSchema.safeParse({
      kind: url.searchParams.get("kind") ?? undefined
    });
    if (!parsed.success) {
      throw new NotesApiError("Invalid documentation query.", 400, {
        details: parsed.error.flatten()
      });
    }

    const rows = await prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId: context.facilityId
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 800,
      include: {
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true
          }
        },
        createdByUser: {
          select: {
            name: true
          }
        }
      }
    });

    const entries = rows.map(mapNoteToEntry).filter((entry) => {
      if (!parsed.data.kind) return true;
      return entry.kind === parsed.data.kind;
    });

    return Response.json({
      entries
    });
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireNotesApiContext({ writable: true });
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new NotesApiError("Invalid documentation payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const resident = await prisma.resident.findFirst({
      where: {
        id: parsed.data.residentId,
        facilityId: context.facilityId
      },
      select: {
        id: true
      }
    });
    if (!resident) {
      throw new NotesApiError("Resident not found in this facility.", 404);
    }

    const dueDate = parsed.data.dueDate && parsed.data.dueDate.trim() ? parsed.data.dueDate.trim() : null;
    const status = parsed.data.status as DocumentationStatus;
    const priority = parsed.data.priority as DocumentationPriority;

    const narrative = attachDocumentationMeta(parsed.data.narrative, {
      kind: parsed.data.kind as DocumentationKind,
      status,
      dueDate,
      priority,
      sectionProgress: parsed.data.sectionProgress ?? null,
      assessmentType: parsed.data.assessmentType ?? null,
      reviewDate: parsed.data.reviewDate?.trim() || null,
      assignedStaff: parsed.data.assignedStaff?.trim() || null,
      noMajorChange: parsed.data.noMajorChange ?? null,
      sectionStates: parsed.data.sectionStates ?? null,
      carryForwardFromId: parsed.data.carryForwardFromId?.trim() || null
    });

    const createdAt = parseDateTimeInputToUtcDate(parsed.data.occurredAt, {
      timeZone: context.timeZone,
      fallbackToNow: true
    });
    if (!createdAt) {
      throw new NotesApiError("Invalid documentation timestamp.", 400);
    }

    const note = await prisma.progressNote.create({
      data: {
        residentId: parsed.data.residentId,
        type: toProgressNoteType(parsed.data.kind as DocumentationKind),
        participationLevel: parsed.data.participationLevel,
        moodAffect: parsed.data.moodAffect,
        cuesRequired: parsed.data.cuesRequired,
        response: parsed.data.response,
        narrative,
        followUp: parsed.data.followUp?.trim() || parsed.data.title || null,
        createdByUserId: context.user.id,
        createdAt
      },
      include: {
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true
          }
        },
        createdByUser: {
          select: {
            name: true
          }
        }
      }
    });

    revalidatePath("/app/documentation");
    revalidatePath("/app/documentation/progress-notes");
    revalidatePath("/app/documentation/one-to-one");
    revalidatePath("/app/documentation/uda");
    revalidatePath("/app/documentation/mds");
    revalidatePath("/app/residents");
    revalidatePath(`/app/residents/${resident.id}`);

    return Response.json({
      entry: mapNoteToEntry({
        ...note,
        type: note.type as "GROUP" | "ONE_TO_ONE"
      })
    });
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}
