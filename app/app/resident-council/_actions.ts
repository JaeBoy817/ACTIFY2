"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  buildMeetingSheetNotes,
  getResidentCouncilCacheTag,
  mergeDueDateIntoFollowUp,
  parseDueDate,
  parseMeetingSheetNotes,
  residentCouncilTopicTemplates,
  withoutDueDateLine
} from "@/lib/resident-council/service";
import {
  formatResidentCouncilMeetingMetadata,
  parseResidentCouncilMeetingMetadata,
  RESIDENT_COUNCIL_MEAL_DEFAULT
} from "@/lib/resident-council/meeting-metadata";
import type { ResidentCouncilSection } from "@/lib/resident-council/types";
import { compareResidentsByRoom } from "@/lib/resident-status";

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

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "on";
  }
  if (typeof value === "boolean") return value;
  return false;
}, z.boolean());

const optionalBooleanField = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") return false;
  return undefined;
}, z.boolean().optional());

const departmentFields = [
  { key: "departmentActivities", label: "Activities" },
  { key: "departmentNursing", label: "Nursing" },
  { key: "departmentTherapy", label: "Therapy" },
  { key: "departmentDietary", label: "Dietary" },
  { key: "departmentHousekeeping", label: "Housekeeping" },
  { key: "departmentLaundry", label: "Laundry" },
  { key: "departmentMaintenance", label: "Maintenance" },
  { key: "departmentSocialServices", label: "Social Services" },
  { key: "departmentAdministrator", label: "Administration" }
] as const;

const meetingSheetSchema = z.object({
  heldAt: z.string().min(1),
  attendanceCountOverride: optionalCount,
  residentsAttendedIds: z.array(z.string().min(1)).default([]),
  residentsInAttendanceManual: nullableText,
  staffInAttendance: nullableText,
  timeIn: nullableText,
  timeOut: nullableText,
  residentRightsReviewed: optionalBooleanField,
  policyUpdates: nullableText,
  mealOfMonth: nullableText,
  meetingStatus: z.enum(["DRAFT", "FINALIZED"]).optional(),
  summary: optionalText,
  oldBusiness: optionalText,
  newBusiness: optionalText,
  additionalNotes: optionalText,
  location: optionalText,
  facilitator: optionalText,
  templateId: optionalText,
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

const minutesSheetSchema = z.object({
  meetingId: z.string().min(1),
  attendanceCountOverride: optionalCount,
  residentsAttendedIds: z.array(z.string().min(1)).default([]),
  residentsInAttendanceManual: nullableText,
  staffInAttendance: nullableText,
  timeIn: nullableText,
  timeOut: nullableText,
  residentRightsReviewed: optionalBooleanField,
  policyUpdates: nullableText,
  mealOfMonth: nullableText,
  meetingStatus: z.enum(["DRAFT", "FINALIZED"]).optional(),
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
  status: z.enum(["UNRESOLVED", "RESOLVED"]).default("UNRESOLVED"),
  carryForward: optionalBoolean.optional().default(false)
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

const duplicateMeetingSchema = z.object({
  sourceMeetingId: z.string().min(1),
  heldAt: z.string().optional()
});

function parseEntries(value?: string | null) {
  if (!value) return [];
  return value
    .split(/\n|,/)
    .map((entry) => entry.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
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

function mergeFollowUpWithSection(
  section: ResidentCouncilSection,
  dueDate: string | null,
  followUp: string | null
) {
  const merged = mergeDueDateIntoFollowUp(dueDate, followUp);
  return merged ? `Section: ${section}\n${merged}` : `Section: ${section}`;
}

function invalidateResidentCouncil(facilityId: string, meetingId?: string) {
  revalidateTag(getResidentCouncilCacheTag(facilityId));
  revalidatePath("/app/resident-council");
  revalidatePath("/app/resident-council/templates");
  if (meetingId) {
    revalidatePath(`/app/resident-council/meetings/${meetingId}`);
  }
}

export async function createResidentCouncilMeetingAction(formData: FormData) {
  const scoped = await requireModulePage("residentCouncil");
  assertWritable(scoped.role);

  const parsed = meetingSheetSchema.parse({
    heldAt: formData.get("heldAt"),
    attendanceCountOverride: formData.get("attendanceCountOverride"),
    residentsAttendedIds: formData.getAll("residentsAttendedIds").map((value) => String(value)),
    residentsInAttendanceManual: formData.get("residentsInAttendanceManual"),
    staffInAttendance: formData.get("staffInAttendance"),
    timeIn: formData.get("timeIn"),
    timeOut: formData.get("timeOut"),
    residentRightsReviewed: formData.get("residentRightsReviewed"),
    policyUpdates: formData.get("policyUpdates"),
    mealOfMonth: formData.get("mealOfMonth"),
    meetingStatus: formData.get("meetingStatus") || undefined,
    summary: formData.get("summary"),
    oldBusiness: formData.get("oldBusiness"),
    newBusiness: formData.get("newBusiness"),
    additionalNotes: formData.get("additionalNotes"),
    location: formData.get("location"),
    facilitator: formData.get("facilitator"),
    templateId: formData.get("templateId"),
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

  const residentRosterEntries = residentRows.map(
    (resident) => `${resident.lastName}, ${resident.firstName} (Room ${resident.room})`
  );
  const manualResidentEntries = parseEntries(parsed.residentsInAttendanceManual);
  const residentsInAttendance = Array.from(new Set([...residentRosterEntries, ...manualResidentEntries]));
  const staffInAttendance = parseEntries(parsed.staffInAttendance);

  const departmentUpdates = departmentFields.flatMap((item) => {
    const notes = parsed[item.key];
    if (!notes) return [];
    return [{ label: item.label, notes: notes.trim() }];
  });

  const template = parsed.templateId
    ? residentCouncilTopicTemplates.find((candidate) => candidate.id === parsed.templateId)
    : null;

  const locationLine = parsed.location ? `Location: ${parsed.location}` : null;
  const facilitatorLine = parsed.facilitator ? `Facilitator: ${parsed.facilitator}` : null;
  const templateLine = template ? `Template Applied: ${template.title}` : null;
  const freeformContext = [parsed.additionalNotes, locationLine, facilitatorLine, templateLine]
    .filter(Boolean)
    .join("\n");
  const additionalNotes = formatResidentCouncilMeetingMetadata({
    timeIn: parsed.timeIn,
    timeOut: parsed.timeOut,
    staffInAttendance,
    residentRightsReviewed: parsed.residentRightsReviewed ?? true,
    policyUpdates: parsed.policyUpdates,
    mealOfTheMonth: parsed.mealOfMonth ?? RESIDENT_COUNCIL_MEAL_DEFAULT,
    meetingStatus: parsed.meetingStatus === "FINALIZED" ? "Finalized" : "Draft",
    additionalContext: freeformContext
  });

  const oldBusiness = parsed.oldBusiness ?? (template?.section === "OLD" ? template.prompt : undefined);
  const newBusiness = parsed.newBusiness ?? (template?.section === "NEW" ? template.prompt : undefined);

  const attendanceCount = parsed.attendanceCountOverride ?? residentsInAttendance.length;
  const notes = buildMeetingSheetNotes({
    summary: parsed.summary,
    residentsInAttendance,
    departmentUpdates,
    oldBusiness,
    newBusiness,
    additionalNotes
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

  invalidateResidentCouncil(scoped.facilityId, meeting.id);
}

export async function updateResidentCouncilMeetingMinutesAction(formData: FormData) {
  const scoped = await requireModulePage("residentCouncil");
  assertWritable(scoped.role);

  const parsed = minutesSheetSchema.parse({
    meetingId: formData.get("meetingId"),
    attendanceCountOverride: formData.get("attendanceCountOverride"),
    residentsAttendedIds: formData.getAll("residentsAttendedIds").map((value) => String(value)),
    residentsInAttendanceManual: formData.get("residentsInAttendanceManual"),
    staffInAttendance: formData.get("staffInAttendance"),
    timeIn: formData.get("timeIn"),
    timeOut: formData.get("timeOut"),
    residentRightsReviewed: formData.get("residentRightsReviewed"),
    policyUpdates: formData.get("policyUpdates"),
    mealOfMonth: formData.get("mealOfMonth"),
    meetingStatus: formData.get("meetingStatus") || undefined,
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

  const existing = await prisma.residentCouncilMeeting.findFirst({
    where: {
      id: parsed.meetingId,
      facilityId: scoped.facilityId
    },
    select: {
      id: true,
      attendanceCount: true,
      notes: true
    }
  });

  if (!existing) return;

  const existingParsed = parseMeetingSheetNotes(existing.notes) ?? {
    summary: null,
    residentsInAttendance: [] as string[],
    departmentUpdates: [] as Array<{ label: string; notes: string }>,
    oldBusiness: null,
    newBusiness: null,
    additionalNotes: null
  };
  const existingMetadata = parseResidentCouncilMeetingMetadata(existingParsed.additionalNotes);

  const existingDeptMap = new Map(
    existingParsed.departmentUpdates.map((department) => [department.label.toLowerCase(), department.notes])
  );

  const departmentUpdates = departmentFields.flatMap((item) => {
    const notes = parsed[item.key] ?? existingDeptMap.get(item.label.toLowerCase());
    if (!notes) return [];
    return [{ label: item.label, notes: notes.trim() }];
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

  const rosterEntries = residentRows.map(
    (resident) => `${resident.lastName}, ${resident.firstName} (Room ${resident.room})`
  );
  const manualEntries = parseEntries(parsed.residentsInAttendanceManual);
  const hasAttendanceInput = rosterEntries.length > 0 || manualEntries.length > 0 || parsed.residentsInAttendanceManual === null;
  const residentsInAttendance = hasAttendanceInput
    ? Array.from(new Set([...rosterEntries, ...manualEntries]))
    : existingParsed.residentsInAttendance ?? [];

  const providedStaffAttendance = parseEntries(parsed.staffInAttendance);
  const staffInAttendance =
    parsed.staffInAttendance !== undefined
      ? providedStaffAttendance
      : existingMetadata.staffInAttendance;
  const freeformAdditionalContext =
    parsed.additionalNotes === undefined ? existingMetadata.additionalContext : parsed.additionalNotes;

  const nextNotes = buildMeetingSheetNotes({
    summary: parsed.summary ?? existingParsed.summary ?? undefined,
    residentsInAttendance,
    departmentUpdates,
    oldBusiness: parsed.oldBusiness ?? existingParsed.oldBusiness ?? undefined,
    newBusiness: parsed.newBusiness ?? existingParsed.newBusiness ?? undefined,
    additionalNotes: formatResidentCouncilMeetingMetadata({
      timeIn: parsed.timeIn === undefined ? existingMetadata.timeIn : parsed.timeIn,
      timeOut: parsed.timeOut === undefined ? existingMetadata.timeOut : parsed.timeOut,
      staffInAttendance,
      residentRightsReviewed:
        parsed.residentRightsReviewed === undefined
          ? existingMetadata.residentRightsReviewed
          : parsed.residentRightsReviewed,
      policyUpdates: parsed.policyUpdates === undefined ? existingMetadata.policyUpdates : parsed.policyUpdates,
      mealOfTheMonth: parsed.mealOfMonth === undefined ? existingMetadata.mealOfTheMonth : parsed.mealOfMonth,
      meetingStatus:
        parsed.meetingStatus === undefined
          ? existingMetadata.meetingStatus
          : parsed.meetingStatus === "FINALIZED"
            ? "Finalized"
            : "Draft",
      additionalContext: freeformAdditionalContext
    })
  });

  const updated = await prisma.residentCouncilMeeting.update({
    where: { id: existing.id },
    data: {
      attendanceCount: parsed.attendanceCountOverride ?? existing.attendanceCount,
      notes: nextNotes
    }
  });

  await logAudit({
    facilityId: scoped.facilityId,
    actorUserId: scoped.user.id,
    action: "UPDATE",
    entityType: "ResidentCouncilMeeting",
    entityId: existing.id,
    before: existing,
    after: updated
  });

  invalidateResidentCouncil(scoped.facilityId, existing.id);
}

export async function createResidentCouncilActionItemAction(formData: FormData) {
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
    status: formData.get("status") || "UNRESOLVED",
    carryForward: formData.get("carryForward")
  });

  const meeting = await prisma.residentCouncilMeeting.findFirst({
    where: {
      id: parsed.meetingId,
      facilityId: scoped.facilityId
    },
    select: { id: true }
  });
  if (!meeting) return;

  const followUpNotes = [parsed.followUp, parsed.carryForward ? "Carry Forward: Yes" : null]
    .filter(Boolean)
    .join("\n");

  const item = await prisma.residentCouncilItem.create({
    data: {
      meetingId: meeting.id,
      category: parsed.category,
      concern: parsed.concern,
      owner: parsed.owner ?? null,
      status: parsed.status,
      followUp: mergeFollowUpWithSection(parsed.section, parsed.dueDate ?? null, followUpNotes || null)
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

  invalidateResidentCouncil(scoped.facilityId, parsed.meetingId);
}

export async function updateResidentCouncilActionItemAction(formData: FormData) {
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

  invalidateResidentCouncil(scoped.facilityId, existing.meetingId);
}

export async function bulkUpdateResidentCouncilActionItemsAction(formData: FormData) {
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

  const firstMeetingId = existingItems[0]?.meetingId;
  invalidateResidentCouncil(scoped.facilityId, firstMeetingId);
}

export async function deleteResidentCouncilActionItemAction(formData: FormData) {
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

  invalidateResidentCouncil(scoped.facilityId, existing.meetingId);
}

export async function deleteResidentCouncilMeetingAction(formData: FormData) {
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

export async function duplicateResidentCouncilMeetingAction(formData: FormData) {
  const scoped = await requireModulePage("residentCouncil");
  assertWritable(scoped.role);

  const parsed = duplicateMeetingSchema.parse({
    sourceMeetingId: formData.get("sourceMeetingId"),
    heldAt: typeof formData.get("heldAt") === "string" ? String(formData.get("heldAt")) : undefined
  });

  const sourceMeeting = await prisma.residentCouncilMeeting.findFirst({
    where: {
      id: parsed.sourceMeetingId,
      facilityId: scoped.facilityId
    },
    include: {
      items: {
        where: {
          status: "UNRESOLVED"
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!sourceMeeting) {
    throw new Error("Source meeting not found.");
  }

  const parsedSheet = parseMeetingSheetNotes(sourceMeeting.notes);
  const parsedMetadata = parseResidentCouncilMeetingMetadata(parsedSheet?.additionalNotes);
  const unresolvedCarryForward = sourceMeeting.items.map((item) => `- ${item.category}: ${item.concern}`);

  const oldBusiness = [
    parsedSheet?.oldBusiness?.trim(),
    unresolvedCarryForward.length > 0 ? "Carry Forward from prior meeting:\n" + unresolvedCarryForward.join("\n") : null
  ]
    .filter(Boolean)
    .join("\n\n");

  const notes = buildMeetingSheetNotes({
    summary: parsedSheet?.summary ?? "Resident council meeting carried forward from previous template.",
    residentsInAttendance: parsedSheet?.residentsInAttendance ?? [],
    departmentUpdates: parsedSheet?.departmentUpdates ?? [],
    oldBusiness: oldBusiness || undefined,
    newBusiness: parsedSheet?.newBusiness ?? undefined,
    additionalNotes: formatResidentCouncilMeetingMetadata({
      timeIn: null,
      timeOut: null,
      staffInAttendance: parsedMetadata.staffInAttendance,
      residentRightsReviewed: parsedMetadata.residentRightsReviewed,
      policyUpdates: parsedMetadata.policyUpdates,
      mealOfTheMonth: parsedMetadata.mealOfTheMonth ?? RESIDENT_COUNCIL_MEAL_DEFAULT,
      meetingStatus: "Draft",
      additionalContext: parsedMetadata.additionalContext
    })
  });

  const duplicateHeldAt =
    typeof parsed.heldAt === "string" && parsed.heldAt.trim().length > 0
      ? new Date(parsed.heldAt)
      : new Date();
  const heldAt = Number.isNaN(duplicateHeldAt.getTime()) ? new Date() : duplicateHeldAt;

  const meeting = await prisma.residentCouncilMeeting.create({
    data: {
      facilityId: scoped.facilityId,
      heldAt,
      attendanceCount: parsedSheet?.residentsInAttendance?.length ?? sourceMeeting.attendanceCount,
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
      sourceMeetingId: sourceMeeting.id,
      copiedUnresolvedItems: unresolvedCarryForward.length
    }
  });

  invalidateResidentCouncil(scoped.facilityId, meeting.id);
  return { meetingId: meeting.id };
}

export async function applyResidentCouncilTemplateAction(formData: FormData) {
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

  invalidateResidentCouncil(scoped.facilityId, parsed.meetingId);
}

export async function createResidentCouncilTopicFromLibraryAction(formData: FormData) {
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

  invalidateResidentCouncil(scoped.facilityId, parsed.meetingId);
}
