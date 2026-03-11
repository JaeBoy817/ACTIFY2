import { revalidatePath } from "next/cache";
import { z } from "zod";

import { asNotesApiErrorResponse, NotesApiError, requireNotesApiContext } from "@/lib/notes/api-context";
import { prisma } from "@/lib/prisma";
import {
  attachDocumentationMeta,
  inferDocumentationDueDate,
  inferDocumentationKind,
  inferDocumentationPriority,
  inferDocumentationStatus,
  stripDocumentationMeta
} from "@/lib/documentation/meta";
import type { DocumentationPriority, DocumentationStatus } from "@/lib/documentation/types";

const patchSchema = z.object({
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
  sectionProgress: z.number().min(0).max(100).optional().nullable()
});

function mapEntry(note: {
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
    summary: stripDocumentationMeta(note.narrative),
    residentId: note.residentId,
    residentName: `${note.resident.firstName} ${note.resident.lastName}`,
    residentRoom: note.resident.room,
    createdAtIso: note.createdAt.toISOString(),
    authorName: note.createdByUser.name,
    dueDateIso: inferDocumentationDueDate(note.narrative),
    hasFollowUp: Boolean(note.followUp && note.followUp.trim().length > 0),
    participationLevel: note.participationLevel,
    moodAffect: note.moodAffect,
    cuesRequired: note.cuesRequired,
    response: note.response
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireNotesApiContext();
    const note = await prisma.progressNote.findFirst({
      where: {
        id: params.id,
        resident: {
          facilityId: context.facilityId
        }
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

    if (!note) {
      throw new NotesApiError("Documentation entry not found.", 404);
    }

    return Response.json({
      entry: mapEntry({
        ...note,
        type: note.type as "GROUP" | "ONE_TO_ONE"
      }),
      narrativeBody: stripDocumentationMeta(note.narrative),
      followUpTitle: note.followUp
    });
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireNotesApiContext({ writable: true });
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new NotesApiError("Invalid documentation update payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const existing = await prisma.progressNote.findFirst({
      where: {
        id: params.id,
        resident: {
          facilityId: context.facilityId
        }
      },
      select: {
        id: true,
        narrative: true,
        type: true,
        residentId: true
      }
    });

    if (!existing) {
      throw new NotesApiError("Documentation entry not found.", 404);
    }

    const kind = inferDocumentationKind({
      noteType: existing.type,
      narrative: existing.narrative
    });

    const narrative = attachDocumentationMeta(parsed.data.narrative, {
      kind,
      status: parsed.data.status as DocumentationStatus,
      dueDate: parsed.data.dueDate?.trim() || null,
      priority: parsed.data.priority as DocumentationPriority,
      sectionProgress: parsed.data.sectionProgress ?? null
    });

    const updated = await prisma.progressNote.update({
      where: {
        id: existing.id
      },
      data: {
        narrative,
        followUp: parsed.data.followUp?.trim() || parsed.data.title || null,
        participationLevel: parsed.data.participationLevel,
        moodAffect: parsed.data.moodAffect,
        cuesRequired: parsed.data.cuesRequired,
        response: parsed.data.response
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
    revalidatePath("/app/documentation/uda");
    revalidatePath("/app/documentation/mds");

    return Response.json({
      entry: mapEntry({
        ...updated,
        type: updated.type as "GROUP" | "ONE_TO_ONE"
      })
    });
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireNotesApiContext({ writable: true });
    const existing = await prisma.progressNote.findFirst({
      where: {
        id: params.id,
        resident: {
          facilityId: context.facilityId
        }
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      throw new NotesApiError("Documentation entry not found.", 404);
    }

    await prisma.progressNote.delete({
      where: { id: existing.id }
    });

    revalidatePath("/app/documentation");
    revalidatePath("/app/documentation/uda");
    revalidatePath("/app/documentation/mds");

    return Response.json({ ok: true });
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}
