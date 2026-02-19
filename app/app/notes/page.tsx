import { NotesListWorkspace } from "@/components/notes/NotesListWorkspace";
import { NotesShell } from "@/components/notes/NotesShell";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { toNotesListRow } from "@/lib/notes/serializers";

export default async function NotesListPage() {
  const context = await requireModulePage("notes");

  const [notes, residents, users] = await Promise.all([
    prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId: context.facilityId
        }
      },
      orderBy: { createdAt: "desc" },
      take: 700,
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
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.resident.findMany({
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
    }),
    prisma.user.findMany({
      where: {
        facilityId: context.facilityId
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true
      }
    })
  ]);

  const initialNotes = notes.map((note) =>
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
  );

  return (
    <NotesShell
      title="Notes"
      description="Fast documentation workspace for general and 1:1 notes with clean filtering and quick editing."
    >
      <NotesListWorkspace
        initialNotes={initialNotes}
        residents={residents.map((resident) => ({
          id: resident.id,
          name: `${resident.firstName} ${resident.lastName}`,
          room: resident.room
        }))}
        authors={users.map((user) => ({
          id: user.id,
          name: user.name
        }))}
      />
    </NotesShell>
  );
}
