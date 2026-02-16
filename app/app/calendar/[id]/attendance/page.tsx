import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const uiStatusValues = ["PRESENT_ACTIVE", "LEADING", "REFUSED", "NO_SHOW"] as const;
const barrierReasonValues = [
  "ASLEEP",
  "BED_BOUND",
  "THERAPY",
  "AT_APPOINTMENT",
  "REFUSED",
  "NOT_INFORMED",
  "PAIN",
  "ISOLATION_PRECAUTIONS",
  "OTHER"
] as const;

const barrierReasonSchema = z.enum(barrierReasonValues);
type AttendanceStatus = "PRESENT" | "ACTIVE" | "LEADING" | "REFUSED" | "NO_SHOW";
type UiAttendanceStatus = (typeof uiStatusValues)[number];
const uiStatusSet = new Set<UiAttendanceStatus>(uiStatusValues);

const statusOptions: Array<{
  value: UiAttendanceStatus;
  label: string;
}> = [
  { value: "PRESENT_ACTIVE", label: "Present/Active" },
  { value: "LEADING", label: "Leading" },
  { value: "REFUSED", label: "Refused" },
  { value: "NO_SHOW", label: "No show" }
];

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

function getDefaultStatusSelections(status?: AttendanceStatus): UiAttendanceStatus[] {
  if (!status) return [];
  if (status === "LEADING") return ["PRESENT_ACTIVE", "LEADING"];
  if (status === "PRESENT" || status === "ACTIVE") return ["PRESENT_ACTIVE"];
  if (status === "REFUSED") return ["REFUSED"];
  return ["NO_SHOW"];
}

const checklistSchema = z.object({
  residentIds: z.array(z.string().min(1)).default([])
});

const ATTENDANCE_WRITE_BATCH_SIZE = 20;

function fireAndForgetAudit(payload: Parameters<typeof logAudit>[0]) {
  void logAudit(payload).catch((error) => {
    console.error("Attendance audit log failed:", error);
  });
}

async function runInBatches(tasks: Array<() => Promise<void>>, batchSize = ATTENDANCE_WRITE_BATCH_SIZE) {
  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = tasks.slice(index, index + batchSize);
    await Promise.all(batch.map((task) => task()));
  }
}

export default async function AttendancePage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { q?: string };
}) {
  const context = await requireModulePage("calendar");
  const search = searchParams?.q?.trim() ?? "";

  const activity = await prisma.activityInstance.findFirst({
    where: { id: params.id, facilityId: context.facilityId },
    include: {
      attendance: true
    }
  });

  if (!activity) notFound();

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      isActive: true,
      OR: search
        ? [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { room: { contains: search } },
            { notes: { contains: search } }
          ]
        : undefined
    },
    include: { unit: true },
    orderBy: [{ unit: { name: "asc" } }, { room: "asc" }, { lastName: "asc" }]
  });

  const attendanceMap = new Map(activity.attendance.map((row) => [row.residentId, row]));
  const orderedResidents = [...residents].sort((a, b) => {
    const roomCompare = compareRoomOrder(a.room, b.room);
    if (roomCompare !== 0) return roomCompare;

    const lastNameCompare = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
    if (lastNameCompare !== 0) return lastNameCompare;

    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
  });

  async function saveChecklistAttendance(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("calendar");
    assertWritable(scoped.role);

    const parsed = checklistSchema.parse({
      residentIds: formData.getAll("residentIds").map((value) => String(value))
    });

    const residentIds = Array.from(new Set(parsed.residentIds));
    if (residentIds.length > 0) {
      const validResidents = await prisma.resident.findMany({
        where: {
          facilityId: scoped.facilityId,
          isActive: true,
          id: { in: residentIds }
        },
        select: { id: true }
      });
      const validSet = new Set(validResidents.map((resident) => resident.id));

      const existingRows = await prisma.attendance.findMany({
        where: {
          activityInstanceId: params.id,
          residentId: { in: Array.from(validSet) }
        }
      });
      const existingMap = new Map(existingRows.map((row) => [row.residentId, row]));
      const writeTasks: Array<() => Promise<void>> = [];
      let createdCount = 0;
      let updatedCount = 0;
      let unchangedCount = 0;

      for (const residentId of residentIds) {
        if (!validSet.has(residentId)) continue;

        const selectedStatusValues = formData
          .getAll(`status_${residentId}`)
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0 && uiStatusSet.has(value as UiAttendanceStatus));
        const uniqueStatuses = Array.from(new Set(selectedStatusValues)) as UiAttendanceStatus[];

        const status: AttendanceStatus =
          uniqueStatuses.length === 0
            ? "NO_SHOW"
            : uniqueStatuses.includes("NO_SHOW")
            ? "NO_SHOW"
            : uniqueStatuses.includes("REFUSED")
              ? "REFUSED"
              : uniqueStatuses.includes("LEADING")
                ? "LEADING"
                : "PRESENT";

        const rawBarrier = String(formData.get(`barrier_${residentId}`) || "").trim();
        const barrierParsed = rawBarrier ? barrierReasonSchema.safeParse(rawBarrier) : null;
        const barrier = ["PRESENT", "ACTIVE", "LEADING"].includes(status)
          ? null
          : barrierParsed?.success
            ? barrierParsed.data
            : null;

        const rawNotes = String(formData.get(`notes_${residentId}`) || "").trim();
        const notes = rawNotes.length > 0 ? rawNotes : null;

        const existing = existingMap.get(residentId);

        if (!existing) {
          createdCount += 1;
          writeTasks.push(async () => {
            const created = await prisma.attendance.create({
              data: {
                activityInstanceId: params.id,
                residentId,
                status,
                barrierReason: barrier,
                notes
              }
            });

            fireAndForgetAudit({
              facilityId: scoped.facilityId,
              actorUserId: scoped.user.id,
              action: "CREATE",
              entityType: "Attendance",
              entityId: created.id,
              after: created
            });
          });
          continue;
        }

        if (
          existing.status === status &&
          existing.barrierReason === barrier &&
          (existing.notes ?? null) === notes
        ) {
          unchangedCount += 1;
          continue;
        }

        updatedCount += 1;
        writeTasks.push(async () => {
          const updated = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              barrierReason: barrier,
              notes
            }
          });

          fireAndForgetAudit({
            facilityId: scoped.facilityId,
            actorUserId: scoped.user.id,
            action: "UPDATE",
            entityType: "Attendance",
            entityId: updated.id,
            before: existing,
            after: updated
          });
        });
      }

      await runInBatches(writeTasks);
      console.info("Attendance checklist saved", {
        activityId: params.id,
        createdCount,
        updatedCount,
        unchangedCount
      });
    }

    revalidatePath(`/app/calendar/${params.id}/attendance`);
    revalidatePath("/app/calendar");
    revalidatePath(`/app/residents`);
    revalidatePath(`/app/attendance`);
    revalidatePath(`/app/analytics`);
    revalidatePath("/app");
    revalidatePath("/app/reports");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Attendance entry</h1>
          <p className="text-sm text-muted-foreground">{activity.title} · {new Date(activity.startAt).toLocaleString()}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/calendar">Back to calendar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mark each resident with a status. Use barriers for refused/no show cases. Everything saves in one submit.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex flex-wrap items-center gap-2">
              <Input
                name="q"
                placeholder="Search resident by name, room, or notes"
                defaultValue={search}
                className="max-w-md bg-white/85"
              />
              <Button type="submit" variant="outline">Search</Button>
              {search ? (
                <Button asChild type="button" variant="ghost">
                  <Link href={`/app/calendar/${params.id}/attendance`}>Clear</Link>
                </Button>
              ) : null}
            </form>
            <Button type="submit" form="attendance-checklist-form">
              Save checklist attendance
            </Button>
            <span className="text-xs text-muted-foreground">{orderedResidents.length} residents shown</span>
          </div>
          <form id="attendance-checklist-form" action={saveChecklistAttendance} className="space-y-4">
            <div className="space-y-2">
              {orderedResidents.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No residents matched your search.
                </p>
              ) : null}
              {orderedResidents.map((resident) => {
                const existing = attendanceMap.get(resident.id);
                const defaultStatusSelections = new Set(getDefaultStatusSelections(existing?.status));
                return (
                  <div key={`check-${resident.id}`} className="rounded-md border p-3">
                    <input type="hidden" name="residentIds" value={resident.id} />
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {resident.lastName}, {resident.firstName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        Room {resident.room} · {resident.unit?.name ?? "No unit"}
                      </span>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-3">
                      <fieldset className="flex flex-wrap gap-3 rounded-md border bg-muted/20 px-3 py-2">
                        <legend className="px-1 text-[11px] font-medium text-muted-foreground">Status</legend>
                        {statusOptions.map((option) => (
                          <label key={`${resident.id}-${option.value}`} className="inline-flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              name={`status_${resident.id}`}
                              value={option.value}
                              defaultChecked={defaultStatusSelections.has(option.value)}
                              className="h-3.5 w-3.5"
                            />
                            {option.label}
                          </label>
                        ))}
                        <p className="w-full text-[11px] text-muted-foreground">
                          You can check multiple. Save uses highest selected: No show &gt; Refused &gt; Leading &gt; Present/Active. If left unchecked, it saves as No show.
                        </p>
                      </fieldset>
                      <select
                        name={`barrier_${resident.id}`}
                        defaultValue={existing?.barrierReason ?? ""}
                        className="h-10 rounded-md border px-3 text-sm"
                      >
                        <option value="">No barrier</option>
                        <option value="ASLEEP">Asleep</option>
                        <option value="BED_BOUND">Bed bound</option>
                        <option value="THERAPY">Therapy</option>
                        <option value="AT_APPOINTMENT">At appointment</option>
                        <option value="REFUSED">Refused</option>
                        <option value="NOT_INFORMED">Not informed</option>
                        <option value="PAIN">Pain</option>
                        <option value="ISOLATION_PRECAUTIONS">Isolation precautions</option>
                        <option value="OTHER">Other</option>
                      </select>

                      <Input
                        name={`notes_${resident.id}`}
                        defaultValue={existing?.notes ?? ""}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <Button type="submit">Save checklist attendance</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
