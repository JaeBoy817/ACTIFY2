import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { z } from "zod";

import { OneToOneLiveWorkspace } from "./one-to-one-live-workspace";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { ResidentStatusValue } from "@/lib/resident-status";

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
        resident: { facilityId: context.facilityId }
      },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true,
            status: true,
            isActive: true
          }
        },
        createdByUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 400
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
    <OneToOneLiveWorkspace
      residents={residents.map((resident) => ({
        id: resident.id,
        firstName: resident.firstName,
        lastName: resident.lastName,
        room: resident.room,
        status: resident.status as ResidentStatusValue,
        isActive: resident.isActive
      }))}
      notes={notes.map((note) => ({
        id: note.id,
        residentId: note.residentId,
        participationLevel: note.participationLevel,
        moodAffect: note.moodAffect,
        cuesRequired: note.cuesRequired,
        response: note.response,
        narrative: note.narrative,
        followUp: note.followUp,
        createdAt: note.createdAt.toISOString(),
        createdByName: note.createdByUser?.name ?? null,
        resident: {
          id: note.resident.id,
          firstName: note.resident.firstName,
          lastName: note.resident.lastName,
          room: note.resident.room,
          status: note.resident.status as ResidentStatusValue,
          isActive: note.resident.isActive
        }
      }))}
      canEdit={canEdit}
      initialResidentId={residentIdFilter}
      initialQuery={searchText}
      totalNotesCount={totalNotesCount}
      residentsTouchedLast30={residentsTouchedLast30}
      createOneToOneNote={createOneToOneNote}
      deleteOneToOneNote={deleteOneToOneNote}
    />
  );
}
