import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { asNotesApiErrorResponse, NotesApiError, requireNotesApiContext } from "@/lib/notes/api-context";

function getCachedQuickNoteOptionsByFacility(facilityId: string) {
  return unstable_cache(
    async () =>
      Promise.all([
        prisma.resident.findMany({
          where: {
            facilityId,
            NOT: {
              status: {
                in: ["DISCHARGED", "TRANSFERRED", "DECEASED"]
              }
            }
          },
          orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true
          }
        }),
        prisma.progressNoteTemplate.findMany({
          where: {
            facilityId
          },
          orderBy: [{ title: "asc" }],
          select: {
            id: true,
            title: true
          }
        })
      ]),
    ["dashboard-quick-note-options-v1", facilityId],
    {
      revalidate: 45,
      tags: [`dashboard:quick-note-options:${facilityId}`]
    }
  );
}

export async function GET() {
  try {
    const context = await requireNotesApiContext();
    const [residents, templates] = await getCachedQuickNoteOptionsByFacility(context.facilityId)();

    return Response.json(
      {
        residents,
        templates
      },
      {
        headers: {
          "cache-control": "private, max-age=60"
        }
      }
    );
  } catch (error) {
    if (error instanceof NotesApiError) {
      return asNotesApiErrorResponse(error);
    }
    return Response.json({ error: "Could not load quick note options." }, { status: 500 });
  }
}
