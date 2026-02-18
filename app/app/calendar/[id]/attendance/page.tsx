import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AttendanceChecklistClient } from "@/app/app/calendar/[id]/attendance/attendance-checklist-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  params
}: {
  params: { id: string };
}) {
  const context = await requireModulePage("calendar");

  const activity = await prisma.activityInstance.findFirst({
    where: { id: params.id, facilityId: context.facilityId },
    select: {
      id: true,
      title: true,
      startAt: true,
      attendance: {
        select: {
          id: true,
          residentId: true,
          status: true,
          barrierReason: true,
          notes: true
        }
      }
    }
  });

  if (!activity) notFound();

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      isActive: true
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true,
      notes: true,
      unit: {
        select: {
          name: true
        }
      }
    },
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
        select: { id: true, status: true }
      });
      const validSet = new Set(validResidents.map((resident) => resident.id));
      const residentStatusById = new Map(validResidents.map((resident) => [resident.id, resident.status]));

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
        const isBedBoundResident = residentStatusById.get(residentId) === "BED_BOUND";

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
              : isBedBoundResident
                ? "BED_BOUND"
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
            Mark each resident with a status. Search updates in real time. Use barriers for refused/no show cases. Everything saves in one submit.
          </p>
          <AttendanceChecklistClient
            activityId={params.id}
            residents={orderedResidents.map((resident) => ({
              id: resident.id,
              firstName: resident.firstName,
              lastName: resident.lastName,
              room: resident.room,
              unitName: resident.unit?.name ?? null,
              status: resident.status,
              notes: resident.notes ?? null
            }))}
            existingByResidentId={Object.fromEntries(
              Array.from(attendanceMap.entries()).map(([residentId, row]) => [
                residentId,
                {
                  status: row.status,
                  barrierReason: row.barrierReason,
                  notes: row.notes
                }
              ])
            )}
            saveAction={saveChecklistAttendance}
          />
        </CardContent>
      </Card>
    </div>
  );
}
