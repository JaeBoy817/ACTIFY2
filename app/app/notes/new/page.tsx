import { NoteBuilder } from "@/components/notes/NoteBuilder";
import { NotesShell } from "@/components/notes/NotesShell";
import type { NoteBuilderValues } from "@/lib/notes/types";
import {
  fromDbCues,
  fromDbMood,
  fromDbParticipation,
  fromDbResponse,
  fromDbType,
  mapTemplateForBuilder,
  parseProgressNoteContent
} from "@/lib/notes/serializers";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function toLocalInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function defaultValues(params: {
  type: "general" | "1on1";
  residentId: string;
}): NoteBuilderValues {
  return {
    noteType: params.type,
    title: "",
    occurredAt: toLocalInputValue(new Date()),
    residentId: params.residentId,
    linkedResidentIds: [],
    location: "",
    setting: "",
    activityLabel: "",
    narrative: "",
    participationLevel: "moderate",
    responseType: "positive",
    mood: "calm",
    cues: "verbal",
    interventions: [],
    followUpNeeded: false,
    followUpNotes: "",
    tags: [],
    communicationMethod: "",
    mobilityAccess: "",
    goalLink: "",
    staffPresent: ""
  };
}

export default async function NotesBuilderPage({
  searchParams
}: {
  searchParams?: {
    type?: string;
    residentId?: string;
    noteId?: string;
  };
}) {
  const context = await requireModulePage("notes");
  const requestedType = searchParams?.type === "1on1" ? "1on1" : "general";

  const [residents, templates] = await Promise.all([
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
        room: true,
        status: true,
        preferences: true,
        safetyNotes: true
      }
    }),
    prisma.progressNoteTemplate.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        quickPhrases: true,
        bodyTemplate: true
      }
    })
  ]);

  const defaultResidentId =
    (searchParams?.residentId && residents.some((resident) => resident.id === searchParams.residentId)
      ? searchParams.residentId
      : residents[0]?.id) ?? "";

  let initialValues = defaultValues({
    type: requestedType,
    residentId: defaultResidentId
  });

  let noteId: string | null = null;
  if (searchParams?.noteId) {
    const existing = await prisma.progressNote.findFirst({
      where: {
        id: searchParams.noteId,
        resident: {
          facilityId: context.facilityId
        }
      },
      select: {
        id: true,
        type: true,
        residentId: true,
        participationLevel: true,
        moodAffect: true,
        cuesRequired: true,
        response: true,
        followUp: true,
        narrative: true,
        createdAt: true
      }
    });

    if (existing) {
      const parsed = parseProgressNoteContent(existing.narrative, existing.followUp);
      const residentNameToId = new Map(
        residents.map((resident) => [`${resident.firstName} ${resident.lastName}`.toLowerCase(), resident.id])
      );

      const linkedResidentIds = parsed.linkedResidentNames
        .map((name) => residentNameToId.get(name.toLowerCase()))
        .filter((value): value is string => Boolean(value));

      initialValues = {
        noteType: fromDbType(existing.type),
        title: parsed.title,
        occurredAt: toLocalInputValue(existing.createdAt),
        residentId: existing.residentId,
        linkedResidentIds,
        location: parsed.location,
        setting: parsed.setting,
        activityLabel: parsed.activityLabel,
        narrative: parsed.narrativeBody,
        participationLevel: fromDbParticipation(existing.participationLevel),
        responseType: fromDbResponse(existing.response),
        mood: fromDbMood(existing.moodAffect),
        cues: fromDbCues(existing.cuesRequired),
        interventions: parsed.interventions,
        followUpNeeded: parsed.followUpNeeded,
        followUpNotes: parsed.followUpNotes,
        tags: parsed.tags,
        communicationMethod: parsed.communicationMethod,
        mobilityAccess: parsed.mobilityAccess,
        goalLink: parsed.goalLink,
        staffPresent: parsed.staffPresent
      };
      noteId = existing.id;
    }
  }

  return (
    <NotesShell
      title={noteId ? "Edit Note" : "New Note"}
      description="Single guided note builder for general and 1:1 documentation. Required fields first, optional detail sections collapsed."
    >
      <NoteBuilder
        canEdit={canWrite(context.role)}
        noteId={noteId}
        initialValues={initialValues}
        residents={residents.map((resident) => ({
          id: resident.id,
          firstName: resident.firstName,
          lastName: resident.lastName,
          room: resident.room,
          status: resident.status,
          preferences: resident.preferences,
          safetyNotes: resident.safetyNotes
        }))}
        templates={templates.map(mapTemplateForBuilder)}
      />
    </NotesShell>
  );
}
