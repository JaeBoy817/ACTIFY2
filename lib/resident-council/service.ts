import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import type {
  ResidentCouncilActionItemDTO,
  ResidentCouncilParsedMeetingSheet,
  ResidentCouncilSection,
  ResidentCouncilSnapshot,
  ResidentCouncilTopicCategory,
  ResidentCouncilTopicEntry,
  ResidentCouncilTopicTemplate
} from "@/lib/resident-council/types";
import { compareResidentsByRoom } from "@/lib/resident-status";

export const residentCouncilCategoryOptions: ResidentCouncilTopicCategory[] = [
  "Activities",
  "Nursing",
  "Therapy",
  "Dietary",
  "Housekeeping",
  "Laundry",
  "Maintenance",
  "Social Services",
  "Administration",
  "Other"
];

export const residentCouncilTopicTemplates: ResidentCouncilTopicTemplate[] = [
  {
    id: "tmpl-activities-engagement",
    title: "Activity Engagement Barriers",
    section: "OLD",
    category: "Activities",
    prompt: "Residents requested more variety and clearer daily activity communication."
  },
  {
    id: "tmpl-nursing-care-followup",
    title: "Nursing Follow-up",
    section: "OLD",
    category: "Nursing",
    prompt: "Residents requested nursing follow-up on prior concerns and communication clarity."
  },
  {
    id: "tmpl-dietary-menu",
    title: "Dietary Menu Feedback",
    section: "NEW",
    category: "Dietary",
    prompt: "Residents discussed menu preferences and requested additional healthy snack options."
  },
  {
    id: "tmpl-housekeeping-rounds",
    title: "Housekeeping Requests",
    section: "NEW",
    category: "Housekeeping",
    prompt: "Residents requested more predictable cleaning rounds and restocking updates."
  },
  {
    id: "tmpl-maintenance-safety",
    title: "Maintenance & Safety",
    section: "NEW",
    category: "Maintenance",
    prompt: "Residents identified maintenance concerns impacting comfort and unit safety."
  },
  {
    id: "tmpl-social-services-support",
    title: "Social Services Support",
    section: "OLD",
    category: "Social Services",
    prompt: "Residents requested additional emotional support check-ins and discharge planning communication."
  },
  {
    id: "tmpl-admin-communication",
    title: "Administration Communication",
    section: "NEW",
    category: "Administration",
    prompt: "Residents requested clearer communication around policy updates and schedule changes."
  }
];

const DUE_DATE_PREFIX = "Due:";
const SECTION_PREFIX = "Section:";

function collapseParsedSection(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.toLowerCase() === "not discussed.") return null;
  if (trimmed.toLowerCase() === "none.") return null;
  return trimmed;
}

function normalizeTopicCategory(input?: string | null): ResidentCouncilTopicCategory {
  const normalized = (input ?? "").trim().toLowerCase();
  if (!normalized) return "Other";
  if (normalized.includes("activit")) return "Activities";
  if (normalized.includes("nurs")) return "Nursing";
  if (normalized.includes("therap")) return "Therapy";
  if (normalized.includes("diet")) return "Dietary";
  if (normalized.includes("house")) return "Housekeeping";
  if (normalized.includes("laundr")) return "Laundry";
  if (normalized.includes("maint")) return "Maintenance";
  if (normalized.includes("social")) return "Social Services";
  if (normalized.includes("admin")) return "Administration";
  return "Other";
}

function splitBusinessIntoTopics(input: {
  text: string | null;
  section: ResidentCouncilSection;
  fallbackCategory: ResidentCouncilTopicCategory;
  meetingId: string;
  meetingHeldAt: Date;
  createdAt: Date;
}): ResidentCouncilTopicEntry[] {
  const body = (input.text ?? "").trim();
  if (!body) return [];

  const tokens = body
    .split(/\n+/)
    .map((line) => line.replace(/^[\-\u2022]\s*/, "").trim())
    .filter(Boolean);

  return (tokens.length > 0 ? tokens : [body]).map((token, index) => ({
    id: `${input.meetingId}-${input.section.toLowerCase()}-${index}`,
    meetingId: input.meetingId,
    meetingHeldAt: input.meetingHeldAt.toISOString(),
    section: input.section,
    category: input.fallbackCategory,
    text: token,
    tags: [],
    createdAt: input.createdAt.toISOString()
  }));
}

export function parseMeetingSheetNotes(notes?: string | null): ResidentCouncilParsedMeetingSheet | null {
  if (!notes) return null;
  const normalized = notes.replace(/\r\n/g, "\n");

  if (
    !normalized.includes("Summary:") ||
    !normalized.includes("Residents in Attendance:") ||
    !normalized.includes("Department Updates:")
  ) {
    return null;
  }

  const summaryLines: string[] = [];
  const oldBusinessLines: string[] = [];
  const newBusinessLines: string[] = [];
  const additionalLines: string[] = [];
  const residentsInAttendance: string[] = [];
  const departmentUpdates: Array<{ label: string; notes: string }> = [];

  let section:
    | "summary"
    | "residents"
    | "departments"
    | "oldBusiness"
    | "newBusiness"
    | "additional"
    | null = null;

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "Summary:") {
      section = "summary";
      continue;
    }
    if (trimmed === "Residents in Attendance:") {
      section = "residents";
      continue;
    }
    if (trimmed === "Department Updates:") {
      section = "departments";
      continue;
    }
    if (trimmed === "Old Business:") {
      section = "oldBusiness";
      continue;
    }
    if (trimmed === "New Business:") {
      section = "newBusiness";
      continue;
    }
    if (trimmed === "Additional Notes:") {
      section = "additional";
      continue;
    }

    if (section === "residents") {
      if (trimmed.startsWith("- ")) {
        const value = trimmed.slice(2).trim();
        if (value && value.toLowerCase() !== "none listed") {
          residentsInAttendance.push(value);
        }
      }
      continue;
    }

    if (section === "departments") {
      if (trimmed.startsWith("- ")) {
        const value = trimmed.slice(2).trim();
        if (value.toLowerCase() !== "no department updates recorded.") {
          const separatorIndex = value.indexOf(":");
          if (separatorIndex > 0) {
            const label = value.slice(0, separatorIndex).trim();
            const notesValue = value.slice(separatorIndex + 1).trim();
            if (notesValue.length > 0) {
              departmentUpdates.push({ label, notes: notesValue });
            }
          }
        }
      }
      continue;
    }

    if (section === "summary") summaryLines.push(line);
    if (section === "oldBusiness") oldBusinessLines.push(line);
    if (section === "newBusiness") newBusinessLines.push(line);
    if (section === "additional") additionalLines.push(line);
  }

  return {
    summary: collapseParsedSection(summaryLines.join("\n")),
    residentsInAttendance,
    departmentUpdates,
    oldBusiness: collapseParsedSection(oldBusinessLines.join("\n")),
    newBusiness: collapseParsedSection(newBusinessLines.join("\n")),
    additionalNotes: collapseParsedSection(additionalLines.join("\n"))
  };
}

export function buildMeetingSheetNotes(payload: {
  summary?: string;
  residentsInAttendance: string[];
  departmentUpdates: Array<{ label: string; notes: string }>;
  oldBusiness?: string;
  newBusiness?: string;
  additionalNotes?: string;
}) {
  const lines: string[] = [];
  lines.push("Summary:");
  lines.push(payload.summary ?? "No summary provided.");
  lines.push("");
  lines.push("Residents in Attendance:");
  if (payload.residentsInAttendance.length === 0) {
    lines.push("- None listed");
  } else {
    for (const resident of payload.residentsInAttendance) {
      lines.push(`- ${resident}`);
    }
  }
  lines.push("");
  lines.push("Department Updates:");
  if (payload.departmentUpdates.length === 0) {
    lines.push("- No department updates recorded.");
  } else {
    for (const department of payload.departmentUpdates) {
      lines.push(`- ${department.label}: ${department.notes}`);
    }
  }
  lines.push("");
  lines.push("Old Business:");
  lines.push(payload.oldBusiness ?? "Not discussed.");
  lines.push("");
  lines.push("New Business:");
  lines.push(payload.newBusiness ?? "Not discussed.");
  lines.push("");
  lines.push("Additional Notes:");
  lines.push(payload.additionalNotes ?? "None.");
  return lines.join("\n");
}

export function parseDueDate(value?: string | null) {
  if (!value) return null;
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.toLowerCase().startsWith(DUE_DATE_PREFIX.toLowerCase())) continue;
    const candidate = line.slice(DUE_DATE_PREFIX.length).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

function parseSection(value?: string | null): ResidentCouncilSection | null {
  if (!value) return null;
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.toLowerCase().startsWith(SECTION_PREFIX.toLowerCase())) continue;
    const candidate = line.slice(SECTION_PREFIX.length).trim().toUpperCase();
    if (candidate === "OLD" || candidate === "NEW") return candidate;
  }
  return null;
}

export function withoutDueDateLine(value?: string | null) {
  if (!value) return null;
  const lines = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.toLowerCase().startsWith(DUE_DATE_PREFIX.toLowerCase()) &&
        !line.toLowerCase().startsWith(SECTION_PREFIX.toLowerCase())
    );
  return lines.length > 0 ? lines.join("\n") : null;
}

export function mergeDueDateIntoFollowUp(dueDate: string | null, followUp: string | null) {
  const body = withoutDueDateLine(followUp);
  if (!dueDate) return body;
  return body ? `${DUE_DATE_PREFIX} ${dueDate}\n${body}` : `${DUE_DATE_PREFIX} ${dueDate}`;
}

export function getResidentCouncilCacheTag(facilityId: string) {
  return `resident-council:${facilityId}`;
}

function getCachedResidentCouncilSnapshot(facilityId: string) {
  return unstable_cache(
    async (): Promise<ResidentCouncilSnapshot> => {
      const [meetingRows, residentRows] = await Promise.all([
        prisma.residentCouncilMeeting.findMany({
          where: { facilityId },
          include: {
            items: {
              orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
            }
          },
          orderBy: { heldAt: "desc" }
        }),
        prisma.resident.findMany({
          where: {
            facilityId,
            isActive: true
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        })
      ]);

      residentRows.sort(compareResidentsByRoom);

      const meetings = meetingRows.map((meeting) => {
        const parsed = parseMeetingSheetNotes(meeting.notes);
        const actionItems: ResidentCouncilActionItemDTO[] = meeting.items.map((item) => ({
          id: item.id,
          meetingId: meeting.id,
          meetingHeldAt: meeting.heldAt.toISOString(),
          section: parseSection(item.followUp) ?? "NEW",
          category: item.category,
          concern: item.concern,
          followUp: withoutDueDateLine(item.followUp),
          owner: item.owner,
          dueDate: parseDueDate(item.followUp),
          status: item.status,
          updatedAt: item.updatedAt.toISOString()
        }));

        const unresolvedCount = actionItems.filter((item) => item.status === "UNRESOLVED").length;
        const actionItemTopics: ResidentCouncilTopicEntry[] = actionItems.map((item) => ({
          id: `${meeting.id}-item-${item.id}`,
          meetingId: meeting.id,
          meetingHeldAt: meeting.heldAt.toISOString(),
          section: parseSection(item.followUp) ?? "NEW",
          category: normalizeTopicCategory(item.category),
          text: item.concern,
          tags: ["action-item", item.status === "RESOLVED" ? "resolved" : "open"],
          createdAt: item.updatedAt
        }));

        const topics = [
          ...(parsed?.departmentUpdates ?? []).map((department, index) => ({
            id: `${meeting.id}-dept-${index}`,
            meetingId: meeting.id,
            meetingHeldAt: meeting.heldAt.toISOString(),
            section: "NEW" as const,
            category: normalizeTopicCategory(department.label),
            text: `${department.label}: ${department.notes}`,
            tags: ["department-update"],
            createdAt: meeting.heldAt.toISOString()
          })),
          ...splitBusinessIntoTopics({
            text: parsed?.oldBusiness ?? null,
            section: "OLD",
            fallbackCategory: "Other",
            meetingId: meeting.id,
            meetingHeldAt: meeting.heldAt,
            createdAt: meeting.heldAt
          }),
          ...splitBusinessIntoTopics({
            text: parsed?.newBusiness ?? null,
            section: "NEW",
            fallbackCategory: "Other",
            meetingId: meeting.id,
            meetingHeldAt: meeting.heldAt,
            createdAt: meeting.heldAt
          }),
          ...actionItemTopics
        ];

        return {
          id: meeting.id,
          heldAt: meeting.heldAt.toISOString(),
          attendanceCount: meeting.attendanceCount,
          notes: meeting.notes,
          parsed,
          status: unresolvedCount > 0 ? ("OPEN" as const) : ("CLOSED" as const),
          unresolvedCount,
          actionItems,
          topics
        };
      });

      const actionItems = meetings.flatMap((meeting) => meeting.actionItems);
      const topicEntries = meetings.flatMap((meeting) => meeting.topics);
      const resolvedItemsCount = actionItems.filter((item) => item.status === "RESOLVED").length;
      const averageAttendance = meetings.length
        ? Number(
          (meetings.reduce((sum, meeting) => sum + meeting.attendanceCount, 0) / meetings.length).toFixed(1)
        )
        : 0;

      return {
        generatedAt: new Date().toISOString(),
        meetings,
        topicEntries,
        actionItems,
        templates: residentCouncilTopicTemplates,
        activeResidents: residentRows,
        stats: {
          meetingsCount: meetings.length,
          openItemsCount: actionItems.filter((item) => item.status === "UNRESOLVED").length,
          resolvedItemsCount,
          averageAttendance,
          topicsCount: topicEntries.length
        }
      };
    },
    ["resident-council-snapshot-v1", facilityId],
    {
      revalidate: 45,
      tags: [getResidentCouncilCacheTag(facilityId)]
    }
  );
}

export async function getResidentCouncilSnapshot(facilityId: string) {
  return getCachedResidentCouncilSnapshot(facilityId)();
}
