import { prisma } from "@/lib/prisma";
import { asNotesApiErrorResponse, NotesApiError, requireNotesApiContext } from "@/lib/notes/api-context";

export async function GET() {
  try {
    const context = await requireNotesApiContext();

    const [residents, templates] = await Promise.all([
      prisma.resident.findMany({
        where: {
          facilityId: context.facilityId,
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
          facilityId: context.facilityId
        },
        orderBy: [{ title: "asc" }],
        select: {
          id: true,
          title: true
        }
      })
    ]);

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
