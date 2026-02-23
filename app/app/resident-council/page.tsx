import { revalidatePath, revalidateTag } from "next/cache";
import dynamic from "next/dynamic";
import { z } from "zod";

import { MeetingDetail } from "@/components/resident-council/MeetingDetail";
import { ResidentCouncilShell } from "@/components/resident-council/ResidentCouncilShell";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  buildMeetingSheetNotes,
  getResidentCouncilCacheTag,
  getResidentCouncilSnapshot,
  mergeDueDateIntoFollowUp,
  parseDueDate,
  residentCouncilTopicTemplates,
  withoutDueDateLine
} from "@/lib/resident-council/service";
import type { ResidentCouncilSection, ResidentCouncilView } from "@/lib/resident-council/types";
import { compareResidentsByRoom } from "@/lib/resident-status";

const viewSchema = z.enum(["meetings", "actions", "topics", "reports"]);

const panelFallback = (
  <div className="glass-panel h-[520px] animate-pulse rounded-2xl border-white/20 bg-white/30" />
);

const MeetingListLazy = dynamic(
  () => import("@/components/resident-council/MeetingList").then((mod) => mod.MeetingList),
  {
    loading: () => (
      <div className="glass-panel h-[540px] animate-pulse rounded-2xl border-white/20 bg-white/30" />
    )
  }
);

const ActionItemsPanelLazy = dynamic(
  () => import("@/components/resident-council/ActionItemsPanel").then((mod) => mod.ActionItemsPanel),
  { loading: () => panelFallback }
);

const TopicTemplatesPanelLazy = dynamic(
  () => import("@/components/resident-council/TopicTemplatesPanel").then((mod) => mod.TopicTemplatesPanel),
  { loading: () => panelFallback }
);

const ReportsPanelLazy = dynamic(
  () => import("@/components/resident-council/ReportsPanel").then((mod) => mod.ReportsPanel),
  { loading: () => panelFallback }
);

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().max(3000).optional());

const nullableText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, z.string().max(3000).nullable().optional());

const optionalCount = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}, z.number().int().nonnegative().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

const nullableIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional());

const meetingSheetSchema = z.object({
  heldAt: z.string().min(1),
  attendanceCountOverride: optionalCount,
  residentsAttendedIds: z.array(z.string().min(1)).default([]),
  summary: optionalText,
  oldBusiness: optionalText,
  newBusiness: optionalText,
  additionalNotes: optionalText,
  departmentActivities: optionalText,
  departmentNursing: optionalText,
  departmentTherapy: optionalText,
  departmentDietary: optionalText,
  departmentHousekeeping: optionalText,
  departmentLaundry: optionalText,
  departmentMaintenance: optionalText,
  departmentSocialServices: optionalText,
  departmentAdministrator: optionalText
});

const actionItemSchema = z.object({
  meetingId: z.string().min(1),
  section: z.enum(["OLD", "NEW"]).default("NEW"),
  category: z.string().min(1),
  concern: z.string().min(3),
  owner: nullableText,
  followUp: nullableText,
  dueDate: nullableIsoDate,
  status: z.enum(["UNRESOLVED", "RESOLVED"]).default("UNRESOLVED")
});

const updateItemSchema = z.object({
  itemId: z.string().min(1),
  section: z.enum(["OLD", "NEW"]).optional(),
  status: z.enum(["UNRESOLVED", "RESOLVED"]).optional(),
  owner: nullableText,
  followUp: nullableText,
  dueDate: nullableIsoDate,
  category: optionalText,
  concern: optionalText
});

const bulkUpdateSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
  status: z.enum(["UNRESOLVED", "RESOLVED"]).optional(),
  owner: optionalText,
  dueDate: optionalIsoDate
});

const deleteMeetingSchema = z.object({
  meetingId: z.string().min(1)
});

const deleteItemSchema = z.object({
  itemId: z.string().min(1)
});

const applyTemplateSchema = z.object({
  meetingId: z.string().min(1),
  templateId: z.string().min(1)
});

const createTopicSchema = z.object({
  meetingId: z.string().min(1),
  category: z.string().min(1),
  section: z.enum(["OLD", "NEW"]),
  text: z.string().min(3)
});

function asString(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseSectionLine(value?: string | null): ResidentCouncilSection | null {
  if (!value) return null;
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.toLowerCase().startsWith("section:")) continue;
    const section = line.slice("section:".length).trim().toUpperCase();
    if (section === "OLD" || section === "NEW") return section;
  }
  return null;
}

function mergeFollowUpWithSection(section: ResidentCouncilSection, dueDate: string | null, followUp: string | null) {
  const merged = mergeDueDateIntoFollowUp(dueDate, followUp);
  return merged ? `Section: ${section}\n${merged}` : `Section: ${section}`;
}

function invalidateResidentCouncil(facilityId: string) {
  revalidateTag(getResidentCouncilCacheTag(facilityId));
  revalidatePath("/app/resident-council");
}

export default async function ResidentCouncilPage({
  searchParams
}: {
  searchParams?: {
    view?: string | string[];
    meetingId?: string | string[];
  };
}) {
  const context = await requireModulePage("residentCouncil");
  const writable = context.role !== "READ_ONLY";
  const snapshot = await getResidentCouncilSnapshot(context.facilityId);

  const requestedView = asString(searchParams?.view);
  const currentView: ResidentCouncilView = viewSchema.safeParse(requestedView).success
    ? (requestedView as ResidentCouncilView)
    : "meetings";

  const requestedMeetingId = asString(searchParams?.meetingId);
  const selectedMeeting =
    snapshot.meetings.find((meeting) => meeting.id === requestedMeetingId) ?? snapshot.meetings[0] ?? null;
  const selectedMeetingId = selectedMeeting?.id ?? null;

  async function createMeetingAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = meetingSheetSchema.parse({
      heldAt: formData.get("heldAt"),
      attendanceCountOverride: formData.get("attendanceCountOverride"),
      residentsAttendedIds: formData.getAll("residentsAttendedIds").map((value) => String(value)),
      summary: formData.get("summary"),
      oldBusiness: formData.get("oldBusiness"),
      newBusiness: formData.get("newBusiness"),
      additionalNotes: formData.get("additionalNotes"),
      departmentActivities: formData.get("departmentActivities"),
      departmentNursing: formData.get("departmentNursing"),
      departmentTherapy: formData.get("departmentTherapy"),
      departmentDietary: formData.get("departmentDietary"),
      departmentHousekeeping: formData.get("departmentHousekeeping"),
      departmentLaundry: formData.get("departmentLaundry"),
      departmentMaintenance: formData.get("departmentMaintenance"),
      departmentSocialServices: formData.get("departmentSocialServices"),
      departmentAdministrator: formData.get("departmentAdministrator")
    });

    const residentIds = Array.from(new Set(parsed.residentsAttendedIds));
    const residentRows = residentIds.length
      ? await prisma.resident.findMany({
          where: {
            facilityId: scoped.facilityId,
            id: { in: residentIds }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true
          }
        })
      : [];

    residentRows.sort(compareResidentsByRoom);

    const residentsInAttendance = residentRows.map(
      (resident) => `${resident.lastName}, ${resident.firstName} (Room ${resident.room})`
    );

    const departmentUpdates = [
      { label: "Activities", notes: parsed.departmentActivities },
      { label: "Nursing", notes: parsed.departmentNursing },
      { label: "Therapy", notes: parsed.departmentTherapy },
      { label: "Dietary", notes: parsed.departmentDietary },
      { label: "Housekeeping", notes: parsed.departmentHousekeeping },
      { label: "Laundry", notes: parsed.departmentLaundry },
      { label: "Maintenance", notes: parsed.departmentMaintenance },
      { label: "Social Services", notes: parsed.departmentSocialServices },
      { label: "Administrator", notes: parsed.departmentAdministrator }
    ]
      .filter((item): item is { label: string; notes: string } => Boolean(item.notes))
      .map((item) => ({ label: item.label, notes: item.notes.trim() }));

    const attendanceCount = parsed.attendanceCountOverride ?? residentsInAttendance.length;
    const notes = buildMeetingSheetNotes({
      summary: parsed.summary,
      residentsInAttendance,
      departmentUpdates,
      oldBusiness: parsed.oldBusiness,
      newBusiness: parsed.newBusiness,
      additionalNotes: parsed.additionalNotes
    });

    const meeting = await prisma.residentCouncilMeeting.create({
      data: {
        facilityId: scoped.facilityId,
        heldAt: new Date(parsed.heldAt),
        attendanceCount,
        notes
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ResidentCouncilMeeting",
      entityId: meeting.id,
      after: {
        ...meeting,
        residentsCaptured: residentsInAttendance.length,
        departmentUpdatesCaptured: departmentUpdates.length
      }
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  async function createActionItemAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = actionItemSchema.parse({
      meetingId: formData.get("meetingId"),
      section: formData.get("section") || "NEW",
      category: formData.get("category"),
      concern: formData.get("concern"),
      owner: formData.get("owner"),
      followUp: formData.get("followUp"),
      dueDate: formData.get("dueDate"),
      status: formData.get("status") || "UNRESOLVED"
    });

    const meeting = await prisma.residentCouncilMeeting.findFirst({
      where: {
        id: parsed.meetingId,
        facilityId: scoped.facilityId
      },
      select: { id: true }
    });
    if (!meeting) return;

    const item = await prisma.residentCouncilItem.create({
      data: {
        meetingId: meeting.id,
        category: parsed.category,
        concern: parsed.concern,
        owner: parsed.owner ?? null,
        status: parsed.status,
        followUp: mergeFollowUpWithSection(parsed.section, parsed.dueDate ?? null, parsed.followUp ?? null)
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ResidentCouncilItem",
      entityId: item.id,
      after: item
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  async function updateActionItemAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = updateItemSchema.parse({
      itemId: formData.get("itemId"),
      section: formData.get("section"),
      status: formData.get("status"),
      owner: formData.get("owner"),
      followUp: formData.get("followUp"),
      dueDate: formData.get("dueDate"),
      category: formData.get("category"),
      concern: formData.get("concern")
    });

    const existing = await prisma.residentCouncilItem.findFirst({
      where: {
        id: parsed.itemId,
        meeting: { facilityId: scoped.facilityId }
      }
    });
    if (!existing) return;

    const section = parsed.section ?? parseSectionLine(existing.followUp) ?? "NEW";
    const dueDate = parsed.dueDate === undefined ? parseDueDate(existing.followUp) : parsed.dueDate;
    const followUp = parsed.followUp === undefined ? withoutDueDateLine(existing.followUp) : parsed.followUp;

    const updated = await prisma.residentCouncilItem.update({
      where: { id: existing.id },
      data: {
        status: parsed.status ?? existing.status,
        owner: parsed.owner === undefined ? existing.owner : parsed.owner,
        category: parsed.category ?? existing.category,
        concern: parsed.concern ?? existing.concern,
        followUp: mergeFollowUpWithSection(section, dueDate ?? null, followUp ?? null)
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ResidentCouncilItem",
      entityId: updated.id,
      before: existing,
      after: updated
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  async function bulkUpdateActionItemsAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = bulkUpdateSchema.parse({
      itemIds: formData.getAll("itemIds").map((value) => String(value)),
      status: formData.get("status") || undefined,
      owner: formData.get("owner") || undefined,
      dueDate: formData.get("dueDate") || undefined
    });

    const existingItems = await prisma.residentCouncilItem.findMany({
      where: {
        id: { in: parsed.itemIds },
        meeting: { facilityId: scoped.facilityId }
      }
    });

    if (existingItems.length === 0) return;

    await prisma.$transaction(
      existingItems.map((item) => {
        const section = parseSectionLine(item.followUp) ?? "NEW";
        const dueDate = parsed.dueDate ?? parseDueDate(item.followUp);
        const followUp = withoutDueDateLine(item.followUp);

        return prisma.residentCouncilItem.update({
          where: { id: item.id },
          data: {
            status: parsed.status ?? item.status,
            owner: parsed.owner ?? item.owner,
            followUp: mergeFollowUpWithSection(section, dueDate ?? null, followUp ?? null)
          }
        });
      })
    );

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "BULK_UPDATE",
      entityType: "ResidentCouncilItem",
      entityId: `bulk:${existingItems.length}`,
      before: {
        itemIds: existingItems.map((item) => item.id)
      },
      after: {
        status: parsed.status,
        owner: parsed.owner,
        dueDate: parsed.dueDate
      }
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  async function deleteActionItemAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = deleteItemSchema.parse({
      itemId: formData.get("itemId")
    });

    const existing = await prisma.residentCouncilItem.findFirst({
      where: {
        id: parsed.itemId,
        meeting: { facilityId: scoped.facilityId }
      }
    });
    if (!existing) return;

    await prisma.residentCouncilItem.delete({
      where: { id: existing.id }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ResidentCouncilItem",
      entityId: existing.id,
      before: existing
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  async function deleteMeetingAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = deleteMeetingSchema.parse({
      meetingId: formData.get("meetingId")
    });

    const existing = await prisma.residentCouncilMeeting.findFirst({
      where: {
        id: parsed.meetingId,
        facilityId: scoped.facilityId
      },
      include: {
        items: true
      }
    });
    if (!existing) return;

    await prisma.residentCouncilMeeting.delete({
      where: { id: existing.id }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ResidentCouncilMeeting",
      entityId: existing.id,
      before: {
        ...existing,
        itemsDeleted: existing.items.length
      }
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  async function applyTopicTemplateAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = applyTemplateSchema.parse({
      meetingId: formData.get("meetingId"),
      templateId: formData.get("templateId")
    });

    const template = residentCouncilTopicTemplates.find((candidate) => candidate.id === parsed.templateId);
    if (!template) return;

    const meeting = await prisma.residentCouncilMeeting.findFirst({
      where: {
        id: parsed.meetingId,
        facilityId: scoped.facilityId
      },
      select: { id: true }
    });
    if (!meeting) return;

    const created = await prisma.residentCouncilItem.create({
      data: {
        meetingId: meeting.id,
        category: template.category,
        concern: template.prompt,
        status: "UNRESOLVED",
        followUp: mergeFollowUpWithSection(template.section, null, `Template: ${template.title}`)
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ResidentCouncilItem",
      entityId: created.id,
      after: {
        source: "template",
        templateId: template.id,
        item: created
      }
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  async function createTopicFromLibraryAction(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = createTopicSchema.parse({
      meetingId: formData.get("meetingId"),
      category: formData.get("category"),
      section: formData.get("section"),
      text: formData.get("text")
    });

    const meeting = await prisma.residentCouncilMeeting.findFirst({
      where: {
        id: parsed.meetingId,
        facilityId: scoped.facilityId
      },
      select: { id: true }
    });
    if (!meeting) return;

    const created = await prisma.residentCouncilItem.create({
      data: {
        meetingId: meeting.id,
        category: parsed.category,
        concern: parsed.text,
        status: "UNRESOLVED",
        followUp: mergeFollowUpWithSection(parsed.section, null, null)
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ResidentCouncilItem",
      entityId: created.id,
      after: {
        source: "topics-library",
        section: parsed.section,
        item: created
      }
    });

    invalidateResidentCouncil(scoped.facilityId);
  }

  return (
    <div className="min-h-screen space-y-4 bg-gradient-to-br from-[#FFF4E6]/70 via-[#FFF0F0]/60 to-[#FFF0F6]/70">
      <ResidentCouncilShell
        writable={writable}
        timeZone={context.facility.timezone}
        currentView={currentView}
        snapshot={snapshot}
      >
        {currentView === "meetings" ? (
          <section className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
            <MeetingListLazy meetings={snapshot.meetings} selectedMeetingId={selectedMeetingId} />
            <MeetingDetail
              meeting={selectedMeeting}
              meetings={snapshot.meetings}
              residents={snapshot.activeResidents}
              canEdit={writable}
              onCreateMeeting={createMeetingAction}
              onCreateActionItem={createActionItemAction}
              onUpdateActionItem={updateActionItemAction}
              onDeleteActionItem={deleteActionItemAction}
              onDeleteMeeting={deleteMeetingAction}
            />
          </section>
        ) : null}

        {currentView === "actions" ? (
          <ActionItemsPanelLazy
            items={snapshot.actionItems}
            meetings={snapshot.meetings.map((meeting) => ({ id: meeting.id, heldAt: meeting.heldAt }))}
            canEdit={writable}
            onUpdateActionItem={updateActionItemAction}
            onDeleteActionItem={deleteActionItemAction}
            onBulkUpdateActionItems={bulkUpdateActionItemsAction}
          />
        ) : null}

        {currentView === "topics" ? (
          <TopicTemplatesPanelLazy
            templates={snapshot.templates}
            topicEntries={snapshot.topicEntries}
            meetings={snapshot.meetings}
            selectedMeetingId={selectedMeetingId}
            canEdit={writable}
            onApplyTemplate={applyTopicTemplateAction}
            onCreateTopicFromLibrary={createTopicFromLibraryAction}
          />
        ) : null}

        {currentView === "reports" ? (
          <ReportsPanelLazy meetings={snapshot.meetings} selectedMeetingId={selectedMeetingId} />
        ) : null}
      </ResidentCouncilShell>
    </div>
  );
}
