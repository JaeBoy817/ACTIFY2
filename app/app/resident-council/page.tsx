import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  History,
  ListTodo,
  Users
} from "lucide-react";
import { z } from "zod";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { LiveDateTimeBadge } from "@/components/app/live-date-time-badge";
import { CountUpValue } from "@/components/motion/CountUpValue";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(3000).optional());

const optionalCount = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return Number(trimmed);
}, z.number().int().nonnegative().optional());

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
  departmentSocialServices: optionalText,
  departmentMaintenance: optionalText
});

const itemSchema = z.object({
  meetingId: z.string().min(1),
  category: z.string().min(1),
  concern: z.string().min(3),
  followUp: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(["RESOLVED", "UNRESOLVED"]).default("UNRESOLVED")
});

const deleteMeetingSchema = z.object({
  meetingId: z.string().min(1)
});

const deleteItemSchema = z.object({
  itemId: z.string().min(1)
});

const departmentFields = [
  { key: "departmentActivities", label: "Activities" },
  { key: "departmentNursing", label: "Nursing" },
  { key: "departmentTherapy", label: "Therapy" },
  { key: "departmentDietary", label: "Dietary" },
  { key: "departmentHousekeeping", label: "Housekeeping" },
  { key: "departmentSocialServices", label: "Social Services" },
  { key: "departmentMaintenance", label: "Maintenance" }
] as const;

const tabValues = ["sheet", "current", "past", "open-items", "reports"] as const;
type ResidentCouncilTab = (typeof tabValues)[number];

type ParsedMeetingSheet = {
  summary: string | null;
  residentsInAttendance: string[];
  departmentUpdates: Array<{ label: string; notes: string }>;
  oldBusiness: string | null;
  newBusiness: string | null;
  additionalNotes: string | null;
};

function parseRoomForSort(room: string) {
  const value = room.trim().toUpperCase();
  const match = value.match(/^(\d+)([A-Z\-]*)$/);
  if (!match) {
    return {
      hasNumericPrefix: false,
      numberPart: Number.POSITIVE_INFINITY,
      suffix: value
    };
  }

  return {
    hasNumericPrefix: true,
    numberPart: Number.parseInt(match[1], 10),
    suffix: match[2] || ""
  };
}

function compareRoomOrder(aRoom: string, bRoom: string) {
  const a = parseRoomForSort(aRoom);
  const b = parseRoomForSort(bRoom);

  if (a.hasNumericPrefix && b.hasNumericPrefix) {
    if (a.numberPart !== b.numberPart) {
      return a.numberPart - b.numberPart;
    }
    const suffixCompare = a.suffix.localeCompare(b.suffix, undefined, { sensitivity: "base", numeric: true });
    if (suffixCompare !== 0) return suffixCompare;
    return aRoom.localeCompare(bRoom, undefined, { sensitivity: "base", numeric: true });
  }

  if (a.hasNumericPrefix) return -1;
  if (b.hasNumericPrefix) return 1;

  return aRoom.localeCompare(bRoom, undefined, { sensitivity: "base", numeric: true });
}

function collapseParsedSection(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.toLowerCase() === "not discussed.") return null;
  if (trimmed.toLowerCase() === "none.") return null;
  return trimmed;
}

function buildMeetingSheetNotes(payload: {
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

function parseMeetingSheetNotes(notes?: string | null): ParsedMeetingSheet | null {
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
            const deptNotes = value.slice(separatorIndex + 1).trim();
            if (deptNotes.length > 0) {
              departmentUpdates.push({ label, notes: deptNotes });
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

export default async function ResidentCouncilPage({
  searchParams
}: {
  searchParams?: { tab?: string; meetingId?: string };
}) {
  const context = await requireModulePage("residentCouncil");
  const writable = context.role !== "READ_ONLY";

  const [meetings, residents] = await Promise.all([
    prisma.residentCouncilMeeting.findMany({
      where: { facilityId: context.facilityId },
      include: {
        items: {
          orderBy: { updatedAt: "desc" }
        }
      },
      orderBy: { heldAt: "desc" }
    }),
    prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true
      },
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    })
  ]);

  const latestMeeting = meetings[0] ?? null;
  const pastMeetings = meetings.slice(1);
  const allItemsCount = meetings.reduce((sum, meeting) => sum + meeting.items.length, 0);
  const resolvedItemsCount = meetings.reduce(
    (sum, meeting) => sum + meeting.items.filter((item) => item.status === "RESOLVED").length,
    0
  );
  const averageAttendance = meetings.length > 0
    ? Number(
        (
          meetings.reduce((sum, meeting) => sum + meeting.attendanceCount, 0) /
          Math.max(meetings.length, 1)
        ).toFixed(1)
      )
    : 0;

  const parsedTab = (searchParams?.tab ?? "").trim();
  const initialTab: ResidentCouncilTab = tabValues.includes(parsedTab as ResidentCouncilTab)
    ? (parsedTab as ResidentCouncilTab)
    : "sheet";
  const parsedMeetingId = (searchParams?.meetingId ?? "").trim();
  const selectedReportMeeting =
    meetings.find((meeting) => meeting.id === parsedMeetingId) ??
    latestMeeting ??
    pastMeetings[0] ??
    null;
  const selectedMeetingId = selectedReportMeeting?.id ?? "";
  const reportPdfDownloadHref = selectedMeetingId
    ? `/app/resident-council/pdf?meetingId=${encodeURIComponent(selectedMeetingId)}`
    : "";
  const reportPdfPreviewHref = selectedMeetingId
    ? `/app/resident-council/pdf?meetingId=${encodeURIComponent(selectedMeetingId)}&preview=1&t=${Date.now()}`
    : "";
  const roomSortedResidents = [...residents].sort((a, b) => {
    const roomCompare = compareRoomOrder(a.room, b.room);
    if (roomCompare !== 0) return roomCompare;
    const lastCompare = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
    if (lastCompare !== 0) return lastCompare;
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
  });

  const unresolvedOpenItems = meetings.flatMap((meeting) =>
    meeting.items
      .filter((item) => item.status === "UNRESOLVED")
      .map((item) => ({
        ...item,
        meetingId: meeting.id,
        heldAt: meeting.heldAt
      }))
  );

  const latestSheet = parseMeetingSheetNotes(latestMeeting?.notes);

  async function createMeetingSheet(formData: FormData) {
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
      departmentSocialServices: formData.get("departmentSocialServices"),
      departmentMaintenance: formData.get("departmentMaintenance")
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

    const residentsInAttendance = [...residentRows]
      .sort((a, b) => {
        const roomCompare = compareRoomOrder(a.room, b.room);
        if (roomCompare !== 0) return roomCompare;
        const lastCompare = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
        if (lastCompare !== 0) return lastCompare;
        return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
      })
      .map((resident) => `${resident.lastName}, ${resident.firstName} (Room ${resident.room})`);

    const departmentUpdates = [
      { label: "Activities", notes: parsed.departmentActivities },
      { label: "Nursing", notes: parsed.departmentNursing },
      { label: "Therapy", notes: parsed.departmentTherapy },
      { label: "Dietary", notes: parsed.departmentDietary },
      { label: "Housekeeping", notes: parsed.departmentHousekeeping },
      { label: "Social Services", notes: parsed.departmentSocialServices },
      { label: "Maintenance", notes: parsed.departmentMaintenance }
    ]
      .filter((department): department is { label: string; notes: string } => Boolean(department.notes))
      .map((department) => ({
        label: department.label,
        notes: department.notes.trim()
      }));

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

    revalidatePath("/app/resident-council");
  }

  async function createItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = itemSchema.parse({
      meetingId: formData.get("meetingId"),
      category: formData.get("category"),
      concern: formData.get("concern"),
      followUp: formData.get("followUp") || undefined,
      owner: formData.get("owner") || undefined,
      status: formData.get("status") || "UNRESOLVED"
    });

    const meeting = await prisma.residentCouncilMeeting.findFirst({
      where: { id: parsed.meetingId, facilityId: scoped.facilityId },
      select: { id: true }
    });
    if (!meeting) return;

    const item = await prisma.residentCouncilItem.create({
      data: {
        meetingId: meeting.id,
        category: parsed.category,
        concern: parsed.concern,
        followUp: parsed.followUp,
        owner: parsed.owner,
        status: parsed.status
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

    revalidatePath("/app/resident-council");
  }

  async function updateItemStatus(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const itemId = String(formData.get("itemId") || "");
    const nextStatus = String(formData.get("status") || "UNRESOLVED");
    if (!itemId) return;

    const existing = await prisma.residentCouncilItem.findFirst({
      where: {
        id: itemId,
        meeting: { facilityId: scoped.facilityId }
      }
    });
    if (!existing) return;

    const updated = await prisma.residentCouncilItem.update({
      where: { id: itemId },
      data: { status: nextStatus === "RESOLVED" ? "RESOLVED" : "UNRESOLVED" }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ResidentCouncilItem",
      entityId: itemId,
      before: existing,
      after: updated
    });

    revalidatePath("/app/resident-council");
  }

  async function deleteItem(formData: FormData) {
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

    revalidatePath("/app/resident-council");
  }

  async function deleteMeeting(formData: FormData) {
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
        id: existing.id,
        heldAt: existing.heldAt,
        attendanceCount: existing.attendanceCount,
        notes: existing.notes,
        itemsDeleted: existing.items.length
      }
    });

    revalidatePath("/app/resident-council");
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <GlassPanel variant="warm" className="relative overflow-hidden px-5 py-5">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-actifyBlue/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-10 left-20 h-40 w-40 rounded-full bg-actifyMint/20 blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-[var(--font-display)] text-3xl text-foreground">Resident Council</h1>
                <Badge className="border-0 bg-actify-warm text-foreground">Meeting workflow</Badge>
                {!writable ? <Badge variant="outline">Read-only</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LiveDateTimeBadge timeZone={context.facility.timezone} mode="date-time" />
                <Badge variant="outline">Meetings: {meetings.length}</Badge>
                <Badge variant="secondary">Open items: {unresolvedOpenItems.length}</Badge>
              </div>
              <p className="max-w-3xl text-sm text-foreground/75">
                Dashboard-style view for meeting prep, live documentation, and follow-up tracking.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <GlassButton asChild size="sm" variant={initialTab === "sheet" ? "default" : "dense"}>
                <Link href="/app/resident-council?tab=sheet">Meeting Sheet</Link>
              </GlassButton>
              <GlassButton asChild size="sm" variant={initialTab === "current" ? "default" : "dense"}>
                <Link href="/app/resident-council?tab=current">Current Meeting</Link>
              </GlassButton>
              <GlassButton asChild size="sm" variant={initialTab === "past" ? "default" : "dense"}>
                <Link href="/app/resident-council?tab=past">Past Meetings</Link>
              </GlassButton>
              <GlassButton asChild size="sm" variant={initialTab === "reports" ? "default" : "dense"}>
                <Link href="/app/resident-council?tab=reports">Reports</Link>
              </GlassButton>
            </div>
          </div>
        </GlassPanel>
      </Reveal>

      <section className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard variant="dense" hover className="h-full min-h-[146px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyBlue/15 text-actifyBlue">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Meetings Logged</p>
              <p className="text-2xl font-semibold text-foreground"><CountUpValue value={meetings.length} /></p>
              <p className="text-xs text-foreground/70">Current + past</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="dense" hover className="h-full min-h-[146px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <ListTodo className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Open Action Items</p>
              <p className="text-2xl font-semibold text-foreground"><CountUpValue value={unresolvedOpenItems.length} /></p>
              <p className="text-xs text-foreground/70">Needs follow-up</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="dense" hover className="h-full min-h-[146px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CircleCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Resolved Items</p>
              <p className="text-2xl font-semibold text-foreground"><CountUpValue value={resolvedItemsCount} /></p>
              <p className="text-xs text-foreground/70">{allItemsCount} total tracked</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="dense" hover className="h-full min-h-[146px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyMint/25 text-foreground">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Avg Resident Attendance</p>
              <p className="text-2xl font-semibold text-foreground"><CountUpValue value={averageAttendance} decimals={1} /></p>
              <p className="text-xs text-foreground/70">Per meeting</p>
            </div>
          </div>
        </GlassCard>
      </section>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-white/80 p-1">
          <TabsTrigger value="sheet">Meeting Sheet</TabsTrigger>
          <TabsTrigger value="current">Current Meeting</TabsTrigger>
          <TabsTrigger value="past">Past Meetings</TabsTrigger>
          <TabsTrigger value="open-items">Open Items</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="sheet" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <GlassCard variant="dense">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-foreground/70" />
                  <h2 className="text-lg font-semibold text-foreground">Step-by-Step Meeting Sheet</h2>
                </div>
                <p className="text-sm text-foreground/75">
                  Complete each section in order. This format mirrors your dashboard flow so meetings are easier to run and review.
                </p>

                <form action={createMeetingSheet} className="space-y-4">
                  <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Step 1: Meeting Basics</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <Input type="datetime-local" name="heldAt" required disabled={!writable} />
                      <Input
                        type="number"
                        min="0"
                        name="attendanceCountOverride"
                        placeholder="Attendance count (optional)"
                        disabled={!writable}
                      />
                      <Input name="summary" placeholder="Quick summary of this meeting" disabled={!writable} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Step 2: Residents in Attendance</p>
                    <p className="mt-1 text-xs text-foreground/65">
                      Check all residents who attended this meeting. If blank, attendance uses the number entered above.
                    </p>
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-white/70 bg-white/80 p-3">
                      {roomSortedResidents.length === 0 ? (
                        <p className="text-sm text-foreground/65">No active residents found.</p>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          {roomSortedResidents.map((resident) => (
                            <label key={resident.id} className="inline-flex items-center gap-2 rounded-md border border-white/70 bg-white/70 px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                name="residentsAttendedIds"
                                value={resident.id}
                                className="h-4 w-4"
                                disabled={!writable}
                              />
                              <span>
                                {resident.lastName}, {resident.firstName} <span className="text-foreground/60">(Room {resident.room})</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Step 3: Department Updates</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {departmentFields.map((department) => (
                        <Textarea
                          key={department.key}
                          name={department.key}
                          placeholder={`${department.label} updates`}
                          className="min-h-[96px]"
                          disabled={!writable}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Step 4: Old Business + New Business</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Textarea name="oldBusiness" placeholder="Old business discussed" className="min-h-[110px]" disabled={!writable} />
                      <Textarea name="newBusiness" placeholder="New business discussed" className="min-h-[110px]" disabled={!writable} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Step 5: Additional Notes</p>
                    <Textarea name="additionalNotes" placeholder="Other notes to keep with this meeting sheet" className="mt-3 min-h-[100px]" disabled={!writable} />
                  </section>

                  <GlassButton type="submit" disabled={!writable}>
                    Save Meeting Sheet
                  </GlassButton>
                </form>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard variant="dense">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Meeting Flow</h3>
                  <div className="space-y-2">
                    {[
                      "1. Set meeting date and summary",
                      "2. Mark residents in attendance",
                      "3. Capture department updates",
                      "4. Document old + new business",
                      "5. Save and assign action items"
                    ].map((step) => (
                      <div key={step} className="flex items-start gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-foreground/80">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-actifyBlue" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard variant="dense">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Quick Navigation</h3>
                  <div className="space-y-2">
                    <GlassButton asChild size="sm" variant="dense" className="w-full justify-between">
                      <Link href="/app/resident-council?tab=current">Open Current Meeting <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </GlassButton>
                    <GlassButton asChild size="sm" variant="dense" className="w-full justify-between">
                      <Link href="/app/resident-council?tab=past">Browse Past Meetings <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </GlassButton>
                    <GlassButton asChild size="sm" variant="dense" className="w-full justify-between">
                      <Link href="/app/resident-council?tab=open-items">Review Open Items <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </GlassButton>
                  </div>
                  {latestMeeting ? (
                    <p className="text-xs text-foreground/65">
                      Last meeting: {new Date(latestMeeting.heldAt).toLocaleDateString()} ({latestMeeting.attendanceCount} attendees)
                    </p>
                  ) : (
                    <p className="text-xs text-foreground/65">No meetings logged yet.</p>
                  )}
                </div>
              </GlassCard>
            </div>
          </section>

          <GlassCard variant="dense">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-foreground/70" />
                <h2 className="text-lg font-semibold text-foreground">Action Item Tracker</h2>
              </div>
              <p className="text-sm text-foreground/75">
                Track follow-up tasks from any meeting. Keep unresolved items visible until done.
              </p>
              <form action={createItem} className="grid gap-3 md:grid-cols-3">
                <select name="meetingId" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm" required disabled={!writable || meetings.length === 0}>
                  <option value="">Select meeting</option>
                  {meetings.map((meeting) => (
                    <option key={meeting.id} value={meeting.id}>
                      {new Date(meeting.heldAt).toLocaleDateString()} ({meeting.attendanceCount} attendees)
                    </option>
                  ))}
                </select>
                <select name="category" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm" defaultValue="General" disabled={!writable}>
                  <option value="General">General</option>
                  <option value="Old Business">Old Business</option>
                  <option value="New Business">New Business</option>
                  <option value="Department">Department</option>
                  <option value="Resident Concern">Resident Concern</option>
                </select>
                <Input name="owner" placeholder="Owner (optional)" disabled={!writable} />
                <Textarea name="concern" placeholder="Action item / concern" required className="md:col-span-3" disabled={!writable} />
                <Textarea name="followUp" placeholder="Follow-up details" className="md:col-span-3" disabled={!writable} />
                <select name="status" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm md:col-span-1" defaultValue="UNRESOLVED" disabled={!writable}>
                  <option value="UNRESOLVED">Unresolved</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <div className="md:col-span-2">
                  <GlassButton type="submit" disabled={!writable || meetings.length === 0}>Add Action Item</GlassButton>
                </div>
              </form>
              {meetings.length === 0 ? (
                <p className="text-sm text-foreground/65">Create a meeting sheet first to attach action items.</p>
              ) : null}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          {!latestMeeting ? (
            <GlassCard variant="dense">
              <p className="text-sm text-foreground/70">No meetings logged yet.</p>
            </GlassCard>
          ) : (
            <GlassCard variant="dense">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {new Date(latestMeeting.heldAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
                      <Badge variant="outline">{latestMeeting.attendanceCount} attendees</Badge>
                      <Badge variant={latestMeeting.items.some((item) => item.status === "UNRESOLVED") ? "destructive" : "secondary"}>
                        Open items: {latestMeeting.items.filter((item) => item.status === "UNRESOLVED").length}
                      </Badge>
                    </div>
                  </div>
                  {writable ? (
                    <form action={deleteMeeting}>
                      <input type="hidden" name="meetingId" value={latestMeeting.id} />
                      <GlassButton type="submit" size="sm" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                        Delete meeting
                      </GlassButton>
                    </form>
                  ) : null}
                </div>

                {latestSheet ? (
                  <div className="space-y-3">
                    <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-foreground">Summary</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                        {latestSheet.summary ?? "No summary provided."}
                      </p>
                    </section>

                    <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-foreground">Residents in Attendance</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {latestSheet.residentsInAttendance.length === 0 ? (
                          <p className="text-sm text-foreground/65">No residents listed.</p>
                        ) : (
                          latestSheet.residentsInAttendance.map((resident) => (
                            <Badge key={resident} variant="outline">{resident}</Badge>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-foreground">Department Updates</p>
                      <div className="mt-2 space-y-2">
                        {latestSheet.departmentUpdates.length === 0 ? (
                          <p className="text-sm text-foreground/65">No department updates recorded.</p>
                        ) : (
                          latestSheet.departmentUpdates.map((department) => (
                            <div key={department.label} className="rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-sm">
                              <p className="font-medium text-foreground">{department.label}</p>
                              <p className="text-foreground/75">{department.notes}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                        <p className="text-sm font-semibold text-foreground">Old Business</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                          {latestSheet.oldBusiness ?? "Not discussed."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                        <p className="text-sm font-semibold text-foreground">New Business</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                          {latestSheet.newBusiness ?? "Not discussed."}
                        </p>
                      </div>
                    </section>

                    {latestSheet.additionalNotes ? (
                      <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                        <p className="text-sm font-semibold text-foreground">Additional Notes</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{latestSheet.additionalNotes}</p>
                      </section>
                    ) : null}
                  </div>
                ) : latestMeeting.notes ? (
                  <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Meeting Notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{latestMeeting.notes}</p>
                  </section>
                ) : null}

                <section className="rounded-xl border border-white/70 bg-white/70 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-foreground/70" />
                    <p className="text-sm font-semibold text-foreground">Action Items</p>
                  </div>
                  <div className="space-y-2">
                    {latestMeeting.items.length === 0 ? (
                      <p className="text-sm text-foreground/65">No action items in this meeting.</p>
                    ) : (
                      latestMeeting.items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-white/70 bg-white/80 p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">{item.category}: {item.concern}</p>
                            <Badge variant={item.status === "RESOLVED" ? "secondary" : "destructive"}>{item.status}</Badge>
                          </div>
                          {item.followUp ? <p className="mt-1 text-foreground/75">Follow-up: {item.followUp}</p> : null}
                          {item.owner ? <p className="mt-1 text-foreground/75">Owner: {item.owner}</p> : null}
                          {writable ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <form action={updateItemStatus}>
                                <input type="hidden" name="itemId" value={item.id} />
                                <input type="hidden" name="status" value={item.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED"} />
                                <GlassButton type="submit" size="sm" variant="dense">
                                  Mark {item.status === "RESOLVED" ? "Unresolved" : "Resolved"}
                                </GlassButton>
                              </form>
                              <form action={deleteItem}>
                                <input type="hidden" name="itemId" value={item.id} />
                                <GlassButton type="submit" size="sm" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                                  Delete item
                                </GlassButton>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </GlassCard>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastMeetings.length === 0 ? (
            <GlassCard variant="dense">
              <p className="text-sm text-foreground/70">No past meetings yet.</p>
            </GlassCard>
          ) : (
            pastMeetings.map((meeting) => {
              const parsedSheet = parseMeetingSheetNotes(meeting.notes);
              const unresolvedCount = meeting.items.filter((item) => item.status === "UNRESOLVED").length;
              return (
                <GlassCard key={meeting.id} variant="dense">
                  <details>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{new Date(meeting.heldAt).toLocaleString()}</p>
                          <p className="text-sm text-foreground/70">
                            {meeting.attendanceCount} attendees · {meeting.items.length} action items
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={unresolvedCount > 0 ? "destructive" : "secondary"}>
                            Open: {unresolvedCount}
                          </Badge>
                          <Badge variant="outline">
                            <History className="mr-1 h-3 w-3" />
                            Past meeting
                          </Badge>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 space-y-3 border-t border-white/60 pt-4">
                      {parsedSheet ? (
                        <>
                          <div className="rounded-lg border border-white/70 bg-white/70 p-3 text-sm">
                            <p className="font-medium text-foreground">Summary</p>
                            <p className="mt-1 whitespace-pre-wrap text-foreground/80">{parsedSheet.summary ?? "No summary provided."}</p>
                          </div>
                          <div className="rounded-lg border border-white/70 bg-white/70 p-3 text-sm">
                            <p className="font-medium text-foreground">Old Business</p>
                            <p className="mt-1 whitespace-pre-wrap text-foreground/80">{parsedSheet.oldBusiness ?? "Not discussed."}</p>
                          </div>
                          <div className="rounded-lg border border-white/70 bg-white/70 p-3 text-sm">
                            <p className="font-medium text-foreground">New Business</p>
                            <p className="mt-1 whitespace-pre-wrap text-foreground/80">{parsedSheet.newBusiness ?? "Not discussed."}</p>
                          </div>
                        </>
                      ) : meeting.notes ? (
                        <div className="rounded-lg border border-white/70 bg-white/70 p-3 text-sm">
                          <p className="font-medium text-foreground">Meeting Notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-foreground/80">{meeting.notes}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground/65">No meeting notes were recorded.</p>
                      )}

                      {meeting.items.length > 0 ? (
                        <div className="space-y-2">
                          {meeting.items.map((item) => (
                            <div key={item.id} className="rounded-lg border border-white/70 bg-white/80 p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-foreground">{item.category}: {item.concern}</p>
                                <Badge variant={item.status === "RESOLVED" ? "secondary" : "destructive"}>{item.status}</Badge>
                              </div>
                              {item.followUp ? <p className="mt-1 text-foreground/75">Follow-up: {item.followUp}</p> : null}
                              {item.owner ? <p className="mt-1 text-foreground/75">Owner: {item.owner}</p> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {writable ? (
                        <form action={deleteMeeting}>
                          <input type="hidden" name="meetingId" value={meeting.id} />
                          <GlassButton type="submit" size="sm" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                            Delete meeting
                          </GlassButton>
                        </form>
                      ) : null}
                    </div>
                  </details>
                </GlassCard>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="open-items" className="space-y-4">
          <GlassCard variant="dense">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-foreground/70" />
                <h2 className="text-lg font-semibold text-foreground">Open Action Items</h2>
              </div>
              {unresolvedOpenItems.length === 0 ? (
                <p className="text-sm text-foreground/65">All council action items are resolved.</p>
              ) : (
                <div className="space-y-2">
                  {unresolvedOpenItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/70 bg-white/70 p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{item.category}: {item.concern}</p>
                          <p className="text-foreground/70">
                            Meeting date: {new Date(item.heldAt).toLocaleDateString()}
                          </p>
                          {item.owner ? <p className="text-foreground/70">Owner: {item.owner}</p> : null}
                          {item.followUp ? <p className="text-foreground/70">Follow-up: {item.followUp}</p> : null}
                        </div>
                        {writable ? (
                          <div className="flex flex-wrap gap-2">
                            <form action={updateItemStatus}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <input type="hidden" name="status" value="RESOLVED" />
                              <GlassButton type="submit" size="sm" variant="dense">
                                Mark Resolved
                              </GlassButton>
                            </form>
                            <form action={deleteItem}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <GlassButton type="submit" size="sm" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                                Delete
                              </GlassButton>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {meetings.length === 0 ? (
            <GlassCard variant="dense">
              <p className="text-sm text-foreground/70">Add a meeting sheet first to generate a Resident Council PDF report.</p>
            </GlassCard>
          ) : (
            <>
              <GlassPanel variant="dense" className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Resident Council PDF Report</h2>
                    <p className="text-sm text-foreground/70">
                      Select a meeting, preview it in a separate tab, and download a clean printable PDF.
                    </p>
                  </div>
                <div className="flex flex-wrap gap-2">
                  {selectedMeetingId ? (
                    <GlassButton asChild size="sm" variant="dense">
                      <Link href={reportPdfDownloadHref}>
                        <FileText className="mr-1 h-4 w-4" />
                        Download PDF
                      </Link>
                    </GlassButton>
                  ) : (
                    <GlassButton size="sm" variant="dense" disabled>
                      <FileText className="mr-1 h-4 w-4" />
                      Download PDF
                    </GlassButton>
                  )}

                  {selectedMeetingId ? (
                    <GlassButton asChild size="sm" variant="dense">
                      <Link href={reportPdfPreviewHref} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Open Preview Tab
                      </Link>
                    </GlassButton>
                  ) : (
                    <GlassButton size="sm" variant="dense" disabled>
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Open Preview Tab
                    </GlassButton>
                  )}
                </div>
              </div>

                <form method="GET" className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="tab" value="reports" />
                  <label className="min-w-[260px] flex-1 text-sm">
                    Meeting
                    <select
                      name="meetingId"
                      defaultValue={selectedMeetingId}
                      className="mt-1 h-10 w-full rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                    >
                      {meetings.map((meeting) => (
                        <option key={meeting.id} value={meeting.id}>
                          {new Date(meeting.heldAt).toLocaleString()} ({meeting.attendanceCount} attendees)
                        </option>
                      ))}
                    </select>
                  </label>
                  <GlassButton type="submit" size="sm">Load meeting</GlassButton>
                </form>

                {selectedReportMeeting ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <GlassCard variant="dense" className="h-full">
                      <p className="text-xs uppercase tracking-wide text-foreground/65">Meeting Date</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {new Date(selectedReportMeeting.heldAt).toLocaleString()}
                      </p>
                    </GlassCard>
                    <GlassCard variant="dense" className="h-full">
                      <p className="text-xs uppercase tracking-wide text-foreground/65">Attendance</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{selectedReportMeeting.attendanceCount}</p>
                    </GlassCard>
                    <GlassCard variant="dense" className="h-full">
                      <p className="text-xs uppercase tracking-wide text-foreground/65">Action Items</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{selectedReportMeeting.items.length}</p>
                    </GlassCard>
                  </div>
                ) : null}
              </GlassPanel>

              <GlassPanel variant="dense" className="space-y-3 overflow-hidden">
                <div className="space-y-2">
                  <div className="h-1 rounded-full bg-actify-brand" />
                  <h3 className="text-lg font-semibold text-foreground">Preview</h3>
                  <p className="text-sm text-foreground/70">
                    Compact dashboard-style PDF preview. Download uses the exact same file.
                  </p>
                </div>
                {selectedMeetingId ? (
                  <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm">
                    <iframe
                      key={reportPdfPreviewHref}
                      title="Resident council PDF preview"
                      src={reportPdfPreviewHref}
                      className="h-[700px] w-full"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-white/80 px-4 py-5 text-sm text-muted-foreground">
                    Select a meeting to preview the report.
                  </div>
                )}
              </GlassPanel>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
