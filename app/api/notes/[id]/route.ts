import { z } from "zod";

import { asNotesApiErrorResponse, NotesApiError, requireNotesApiContext } from "@/lib/notes/api-context";
import { noteBuilderPayloadSchema } from "@/lib/notes/schema";
import {
  serializeFollowUp,
  serializeNarrative,
  toDbCues,
  toDbMood,
  toDbParticipation,
  toDbResponse,
  toDbType,
  toNotesListRow
} from "@/lib/notes/serializers";
import { prisma } from "@/lib/prisma";

const patchSchema = noteBuilderPayloadSchema.extend({
  id: z.string().trim().min(1)
});

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
            id: true,
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
      throw new NotesApiError("Note not found.", 404);
    }

    return Response.json({
      note: toNotesListRow({
        id: note.id,
        type: note.type,
        createdAt: note.createdAt,
        residentId: note.residentId,
        residentName: `${note.resident.firstName} ${note.resident.lastName}`,
        residentRoom: note.resident.room,
        createdByName: note.createdByUser.name,
        narrative: note.narrative,
        followUp: note.followUp
      })
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
    const payload = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse({
      ...(payload ?? {}),
      id: params.id
    });

    if (!parsed.success) {
      throw new NotesApiError("Invalid note update payload.", 400, {
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
        id: true
      }
    });

    if (!existing) {
      throw new NotesApiError("Note not found.", 404);
    }

    const residentIds = Array.from(new Set([parsed.data.residentId, ...parsed.data.linkedResidentIds]));
    const residents = await prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        id: { in: residentIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });
    const residentMap = new Map(residents.map((resident) => [resident.id, `${resident.firstName} ${resident.lastName}`]));
    if (!residentMap.has(parsed.data.residentId)) {
      throw new NotesApiError("Resident not found in this facility.", 404);
    }

    const linkedResidentNames = parsed.data.linkedResidentIds
      .map((residentId) => residentMap.get(residentId))
      .filter((value): value is string => Boolean(value));

    const updated = await prisma.progressNote.update({
      where: { id: existing.id },
      data: {
        residentId: parsed.data.residentId,
        type: toDbType(parsed.data.noteType),
        participationLevel: toDbParticipation(parsed.data.participationLevel),
        moodAffect: toDbMood(parsed.data.mood),
        cuesRequired: toDbCues(parsed.data.cues),
        response: toDbResponse(parsed.data.responseType),
        narrative: serializeNarrative(parsed.data),
        followUp: serializeFollowUp(parsed.data, linkedResidentNames),
        createdAt: new Date(parsed.data.occurredAt)
      },
      include: {
        resident: {
          select: {
            id: true,
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

    if (parsed.data.noteType === "1on1") {
      await prisma.resident.update({
        where: { id: parsed.data.residentId },
        data: {
          lastOneOnOneAt: updated.createdAt
        }
      });
    }

    return Response.json({
      note: toNotesListRow({
        id: updated.id,
        type: updated.type,
        createdAt: updated.createdAt,
        residentId: updated.residentId,
        residentName: `${updated.resident.firstName} ${updated.resident.lastName}`,
        residentRoom: updated.resident.room,
        createdByName: updated.createdByUser.name,
        narrative: updated.narrative,
        followUp: updated.followUp
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
      select: { id: true }
    });

    if (!existing) {
      throw new NotesApiError("Note not found.", 404);
    }

    await prisma.progressNote.delete({
      where: { id: existing.id }
    });

    return Response.json({ ok: true });
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}
