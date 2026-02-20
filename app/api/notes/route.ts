import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";

import { asNotesApiErrorResponse, NotesApiError, requireNotesApiContext } from "@/lib/notes/api-context";
import { getDashboardSummaryCacheTag } from "@/lib/dashboard/getDashboardSummary";
import { noteBuilderPayloadSchema } from "@/lib/notes/schema";
import {
  mapTemplateForBuilder,
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
import { zonedDateKey } from "@/lib/timezone";

const listQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  type: z.enum(["all", "general", "1on1"]).optional(),
  residentId: z.string().trim().optional(),
  q: z.string().trim().optional()
});

function parseDateMaybe(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(request: Request) {
  try {
    const context = await requireNotesApiContext();
    const url = new URL(request.url);

    const parsed = listQuerySchema.safeParse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      residentId: url.searchParams.get("residentId") ?? undefined,
      q: url.searchParams.get("q") ?? undefined
    });
    if (!parsed.success) {
      throw new NotesApiError("Invalid notes query.", 400, {
        details: parsed.error.flatten()
      });
    }

    const from = parseDateMaybe(parsed.data.from);
    const to = parseDateMaybe(parsed.data.to);

    const rows = await prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId: context.facilityId
        },
        ...(parsed.data.type === "general" ? { type: "GROUP" } : {}),
        ...(parsed.data.type === "1on1" ? { type: "ONE_TO_ONE" } : {}),
        ...(parsed.data.residentId ? { residentId: parsed.data.residentId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {})
      },
      orderBy: { createdAt: "desc" },
      take: 500,
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
          select: { name: true }
        }
      }
    });

    const normalizedQuery = (parsed.data.q ?? "").toLowerCase();
    const notes = rows
      .map((note) =>
        toNotesListRow({
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
      )
      .filter((row) => {
        if (!normalizedQuery) return true;
        const haystack = `${row.title} ${row.narrativeBody} ${row.residentName} ${row.residentRoom} ${row.createdByName} ${row.tags.join(" ")}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });

    const templates = await prisma.progressNoteTemplate.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        quickPhrases: true,
        bodyTemplate: true
      }
    });

    return Response.json({
      notes,
      templates: templates.map(mapTemplateForBuilder)
    });
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireNotesApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = noteBuilderPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      throw new NotesApiError("Invalid note payload.", 400, {
        details: parsed.error.flatten()
      });
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

    const occurredAt = new Date(parsed.data.occurredAt);
    const created = await prisma.$transaction(async (tx) => {
      const note = await tx.progressNote.create({
        data: {
          residentId: parsed.data.residentId,
          type: toDbType(parsed.data.noteType),
          participationLevel: toDbParticipation(parsed.data.participationLevel),
          moodAffect: toDbMood(parsed.data.mood),
          cuesRequired: toDbCues(parsed.data.cues),
          response: toDbResponse(parsed.data.responseType),
          narrative: serializeNarrative(parsed.data),
          followUp: serializeFollowUp(parsed.data, linkedResidentNames),
          createdByUserId: context.user.id,
          createdAt: occurredAt,
          activityInstanceId: null
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
        await tx.resident.update({
          where: { id: parsed.data.residentId },
          data: {
            lastOneOnOneAt: note.createdAt
          }
        });

        const queueDateKey = zonedDateKey(note.createdAt, "America/Chicago");
        await tx.dailyOneOnOneQueue.updateMany({
          where: {
            facilityId: context.facilityId,
            residentId: parsed.data.residentId,
            queueDateKey,
            completedAt: null
          },
          data: {
            completedAt: note.createdAt,
            skippedAt: null,
            skipReason: null
          }
        });
      }

      return note;
    });

    revalidateTag(getDashboardSummaryCacheTag(context.facilityId));
    revalidatePath("/app");
    revalidatePath("/app/dashboard/activity-feed");
    revalidatePath("/app/residents");
    revalidatePath(`/app/residents/${parsed.data.residentId}`);

    return Response.json(
      {
        note: toNotesListRow({
          id: created.id,
          type: created.type,
          createdAt: created.createdAt,
          residentId: created.residentId,
          residentName: `${created.resident.firstName} ${created.resident.lastName}`,
          residentRoom: created.resident.room,
          createdByName: created.createdByUser.name,
          narrative: created.narrative,
          followUp: created.followUp
        })
      },
      { status: 201 }
    );
  } catch (error) {
    return asNotesApiErrorResponse(error);
  }
}
