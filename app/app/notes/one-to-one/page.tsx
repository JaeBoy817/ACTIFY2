import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const oneToOneSchema = z.object({
  residentId: z.string().min(1),
  participationLevel: z.enum(["MINIMAL", "MODERATE", "HIGH"]),
  moodAffect: z.enum(["BRIGHT", "CALM", "FLAT", "ANXIOUS", "AGITATED"]),
  cuesRequired: z.enum(["NONE", "VERBAL", "VISUAL", "HAND_OVER_HAND"]),
  response: z.enum(["POSITIVE", "NEUTRAL", "RESISTANT"]),
  narrative: z.string().trim().min(10).max(4000),
  followUp: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(1200).optional()),
  occurredAt: z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return new Date(trimmed);
  }, z.date().optional())
});

function roleCanEdit(role: string) {
  return role === "ADMIN" || role === "AD" || role === "ASSISTANT";
}

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function OneToOneNotesPage({
  searchParams
}: {
  searchParams?: { residentId?: string; q?: string };
}) {
  const context = await requireModulePage("notes");
  const canEdit = roleCanEdit(context.role);

  const searchText = (searchParams?.q ?? "").trim();
  const requestedResidentId = (searchParams?.residentId ?? "").trim();

  const residents = await prisma.resident.findMany({
    where: { facilityId: context.facilityId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true,
      isActive: true
    },
    orderBy: [{ isActive: "desc" }, { room: "asc" }, { lastName: "asc" }]
  });

  const residentIds = new Set(residents.map((resident) => resident.id));
  const residentIdFilter = residentIds.has(requestedResidentId) ? requestedResidentId : "";

  const [notes, totalNotesCount, notesLast30Days] = await Promise.all([
    prisma.progressNote.findMany({
      where: {
        type: "ONE_TO_ONE",
        resident: { facilityId: context.facilityId },
        ...(residentIdFilter ? { residentId: residentIdFilter } : {}),
        ...(searchText
          ? {
              OR: [
                { narrative: { contains: searchText } },
                { followUp: { contains: searchText } },
                { resident: { firstName: { contains: searchText } } },
                { resident: { lastName: { contains: searchText } } },
                { resident: { room: { contains: searchText } } }
              ]
            }
          : {})
      },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        },
        createdByUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.progressNote.count({
      where: {
        type: "ONE_TO_ONE",
        resident: { facilityId: context.facilityId }
      }
    }),
    prisma.progressNote.findMany({
      where: {
        type: "ONE_TO_ONE",
        resident: { facilityId: context.facilityId },
        createdAt: { gte: subDays(new Date(), 30) }
      },
      select: { residentId: true }
    })
  ]);

  const residentsTouchedLast30 = new Set(notesLast30Days.map((row) => row.residentId)).size;

  async function createOneToOneNote(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("notes");
    assertWritable(scoped.role);

    const parsed = oneToOneSchema.parse({
      residentId: formData.get("residentId"),
      participationLevel: formData.get("participationLevel"),
      moodAffect: formData.get("moodAffect"),
      cuesRequired: formData.get("cuesRequired"),
      response: formData.get("response"),
      narrative: formData.get("narrative"),
      followUp: formData.get("followUp"),
      occurredAt: formData.get("occurredAt")
    });

    const residentScoped = await prisma.resident.findFirst({
      where: {
        id: parsed.residentId,
        facilityId: scoped.facilityId
      },
      select: { id: true }
    });

    if (!residentScoped) {
      throw new Error("Resident not found for this facility.");
    }

    const note = await prisma.progressNote.create({
      data: {
        residentId: parsed.residentId,
        activityInstanceId: null,
        type: "ONE_TO_ONE",
        participationLevel: parsed.participationLevel,
        moodAffect: parsed.moodAffect,
        cuesRequired: parsed.cuesRequired,
        response: parsed.response,
        narrative: parsed.narrative,
        followUp: parsed.followUp,
        ...(parsed.occurredAt ? { createdAt: parsed.occurredAt } : {}),
        createdByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ProgressNote",
      entityId: note.id,
      after: note
    });

    revalidatePath("/app/notes/one-to-one");
    revalidatePath(`/app/residents/${parsed.residentId}`);
    revalidatePath(`/app/residents/${parsed.residentId}/care-plan`);
    redirect(`/app/notes/one-to-one?residentId=${parsed.residentId}`);
  }

  async function deleteOneToOneNote(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("notes");
    assertWritable(scoped.role);

    const noteId = String(formData.get("noteId") || "");
    if (!noteId) return;

    const existing = await prisma.progressNote.findFirst({
      where: {
        id: noteId,
        type: "ONE_TO_ONE",
        resident: { facilityId: scoped.facilityId }
      },
      select: {
        id: true,
        residentId: true,
        type: true,
        participationLevel: true,
        moodAffect: true,
        cuesRequired: true,
        response: true,
        createdAt: true
      }
    });

    if (!existing) return;

    await prisma.activitiesCarePlanEvidenceLink.deleteMany({
      where: { progressNoteId: noteId }
    });

    await prisma.progressNote.delete({ where: { id: noteId } });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ProgressNote",
      entityId: noteId,
      before: existing
    });

    revalidatePath("/app/notes/one-to-one");
    revalidatePath(`/app/residents/${existing.residentId}`);
    revalidatePath(`/app/residents/${existing.residentId}/care-plan`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl text-foreground">1:1 Notes</h1>
          <p className="text-sm text-foreground/70">
            Document one-to-one resident activities in a dedicated workflow.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/app/notes/new">Open full note builder</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="glass glass-hover">
          <CardHeader>
            <CardTitle className="text-sm">Total 1:1 notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalNotesCount}</p>
          </CardContent>
        </Card>
        <Card className="glass glass-hover">
          <CardHeader>
            <CardTitle className="text-sm">Residents with notes (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{residentsTouchedLast30}</p>
          </CardContent>
        </Card>
        <Card className="glass glass-hover">
          <CardHeader>
            <CardTitle className="text-sm">Showing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{notes.length}</p>
            <p className="text-xs text-muted-foreground">entries in current filter</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Add 1:1 note</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOneToOneNote} className="space-y-3">
              <select
                name="residentId"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                required
                defaultValue={residentIdFilter}
              >
                <option value="">Select resident</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.room} - {resident.lastName}, {resident.firstName}
                  </option>
                ))}
              </select>

              <Input type="datetime-local" name="occurredAt" />

              <div className="grid gap-3 sm:grid-cols-2">
                <select name="participationLevel" defaultValue="MODERATE" className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="MINIMAL">Participation: Minimal</option>
                  <option value="MODERATE">Participation: Moderate</option>
                  <option value="HIGH">Participation: High</option>
                </select>
                <select name="moodAffect" defaultValue="CALM" className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="BRIGHT">Mood: Bright</option>
                  <option value="CALM">Mood: Calm</option>
                  <option value="FLAT">Mood: Flat</option>
                  <option value="ANXIOUS">Mood: Anxious</option>
                  <option value="AGITATED">Mood: Agitated</option>
                </select>
                <select name="cuesRequired" defaultValue="VERBAL" className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="NONE">Cues: None</option>
                  <option value="VERBAL">Cues: Verbal</option>
                  <option value="VISUAL">Cues: Visual</option>
                  <option value="HAND_OVER_HAND">Cues: Hand over hand</option>
                </select>
                <select name="response" defaultValue="POSITIVE" className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="POSITIVE">Response: Positive</option>
                  <option value="NEUTRAL">Response: Neutral</option>
                  <option value="RESISTANT">Response: Resistant</option>
                </select>
              </div>

              <Textarea name="narrative" placeholder="What happened during the 1:1 activity?" minLength={10} maxLength={4000} required />
              <Textarea name="followUp" placeholder="Optional follow-up" maxLength={1200} />
              <Button type="submit" className="w-full" disabled={!canEdit}>
                Save 1:1 note
              </Button>
              {!canEdit ? <p className="text-xs text-muted-foreground">Read-only role: you can view notes but cannot create or delete them.</p> : null}
            </form>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Tracked by resident</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form method="GET" className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
              <select
                name="residentId"
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                defaultValue={residentIdFilter}
              >
                <option value="">All residents</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.room} - {resident.lastName}, {resident.firstName}
                  </option>
                ))}
              </select>
              <Input name="q" defaultValue={searchText} placeholder="Search resident, room, or note text" />
              <Button type="submit" variant="outline">Apply</Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Participation</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No 1:1 notes found for this filter.
                    </TableCell>
                  </TableRow>
                ) : null}
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {note.resident.lastName}, {note.resident.firstName}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Room {note.resident.room}</span>
                          <Badge variant={note.resident.status === "DISCHARGED" ? "outline" : "secondary"}>
                            {toLabel(note.resident.status)}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-3 text-sm">{note.narrative}</p>
                      {note.followUp ? <p className="mt-1 text-xs text-muted-foreground">Follow-up: {note.followUp}</p> : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">By {note.createdByUser?.name ?? "Staff"}</p>
                    </TableCell>
                    <TableCell>{toLabel(note.participationLevel)}</TableCell>
                    <TableCell>{toLabel(note.moodAffect)}</TableCell>
                    <TableCell>{note.createdAt.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/app/residents/${note.resident.id}`}>Resident</Link>
                        </Button>
                        {canEdit ? (
                          <form action={deleteOneToOneNote}>
                            <input type="hidden" name="noteId" value={note.id} />
                            <Button type="submit" size="sm" variant="destructive">
                              Delete
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
