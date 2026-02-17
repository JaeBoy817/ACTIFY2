import { revalidatePath } from "next/cache";
import { z } from "zod";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { Input } from "@/components/ui/input";
import { logAudit } from "@/lib/audit";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  compareResidentsByRoom,
  residentStatusOptions,
  statusIsActive,
  type ResidentStatusValue
} from "@/lib/resident-status";

import { ResidentsLiveTable } from "./residents-live-table";

const createResidentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  room: z.string().min(1),
  unitId: z.string().optional(),
  status: z.enum(residentStatusOptions).default("ACTIVE"),
  bestTimesOfDay: z.string().optional(),
  notes: z.string().optional()
});

const deleteResidentSchema = z.object({
  residentId: z.string().min(1)
});

const bulkUpdateResidentStatusesSchema = z.object({
  residentIds: z.array(z.string().min(1)).default([])
});

const residentStatusSchema = z.enum(residentStatusOptions);

export default async function ResidentsPage() {
  const { facilityId, role } = await getFacilityContextWithSubscription();

  const [units, residents] = await Promise.all([
    prisma.unit.findMany({ where: { facilityId }, orderBy: { name: "asc" } }),
    prisma.resident.findMany({
      where: { facilityId },
      include: {
        unit: true,
        _count: {
          select: {
            attendance: true
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    })
  ]);

  const allowCreate = canWrite(role);
  const roomSortedResidents = [...residents].sort(compareResidentsByRoom);

  async function createResident(formData: FormData) {
    "use server";

    const context = await getFacilityContextWithSubscription();
    if (!canWrite(context.role)) return;

    const parsed = createResidentSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      room: formData.get("room"),
      unitId: formData.get("unitId") || undefined,
      status: formData.get("status") || "ACTIVE",
      bestTimesOfDay: formData.get("bestTimesOfDay") || undefined,
      notes: formData.get("notes") || undefined
    });

    const resident = await prisma.resident.create({
      data: {
        facilityId: context.facilityId,
        unitId: parsed.unitId || null,
        status: parsed.status,
        isActive: statusIsActive(parsed.status),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        room: parsed.room,
        bestTimesOfDay: parsed.bestTimesOfDay,
        notes: parsed.notes
      }
    });

    await logAudit({
      facilityId: context.facilityId,
      actorUserId: context.user.id,
      action: "CREATE",
      entityType: "Resident",
      entityId: resident.id,
      after: resident
    });

    revalidatePath("/app/residents");
    revalidatePath("/app/attendance");
    revalidatePath("/app/analytics");
  }

  async function saveAllResidentStatuses(formData: FormData) {
    "use server";

    const context = await getFacilityContextWithSubscription();
    if (!canWrite(context.role)) return;

    const parsed = bulkUpdateResidentStatusesSchema.parse({
      residentIds: formData.getAll("residentIds").map((value) => String(value))
    });

    const residentIds = Array.from(new Set(parsed.residentIds));
    if (residentIds.length === 0) return;

    const existingResidents = await prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        id: { in: residentIds }
      }
    });
    const existingMap = new Map(existingResidents.map((resident) => [resident.id, resident]));

    for (const residentId of residentIds) {
      const existing = existingMap.get(residentId);
      if (!existing) continue;

      const parsedStatus = residentStatusSchema.safeParse(formData.get(`status_${residentId}`));
      if (!parsedStatus.success) continue;
      const nextStatus = parsedStatus.data;

      if (existing.status === nextStatus) continue;

      const updated = await prisma.resident.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          isActive: statusIsActive(nextStatus)
        }
      });

      await logAudit({
        facilityId: context.facilityId,
        actorUserId: context.user.id,
        action: "UPDATE",
        entityType: "Resident",
        entityId: updated.id,
        before: existing,
        after: updated
      });
    }

    revalidatePath("/app/residents");
    revalidatePath("/app/attendance");
    revalidatePath("/app/analytics");
  }

  async function deleteResident(formData: FormData) {
    "use server";

    const context = await getFacilityContextWithSubscription();
    if (!canWrite(context.role)) return;

    const parsed = deleteResidentSchema.parse({
      residentId: formData.get("residentId")
    });

    const existing = await prisma.resident.findFirst({
      where: {
        id: parsed.residentId,
        facilityId: context.facilityId
      }
    });
    if (!existing) return;

    await prisma.resident.delete({
      where: { id: existing.id }
    });

    await logAudit({
      facilityId: context.facilityId,
      actorUserId: context.user.id,
      action: "DELETE",
      entityType: "Resident",
      entityId: existing.id,
      before: existing
    });

    revalidatePath("/app/residents");
    revalidatePath("/app/attendance");
    revalidatePath("/app/analytics");
  }

  return (
    <div className="space-y-6">
      <ResidentsLiveTable
        residents={roomSortedResidents.map((resident) => ({
          id: resident.id,
          firstName: resident.firstName,
          lastName: resident.lastName,
          room: resident.room,
          unitName: resident.unit?.name ?? null,
          status: resident.status as ResidentStatusValue,
          attendanceCount: resident._count.attendance
        }))}
        allowCreate={allowCreate}
        saveAllResidentStatuses={saveAllResidentStatuses}
        deleteResident={deleteResident}
      />

      <GlassCard variant="dense" className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Add resident</h2>
          <p className="mt-1 text-sm text-foreground/70">Add new residents with room, unit, and status details.</p>
        </div>
        <form action={createResident} className="grid gap-3 md:grid-cols-2">
          <Input name="firstName" placeholder="First name" required disabled={!allowCreate} className="bg-white/90" />
          <Input name="lastName" placeholder="Last name" required disabled={!allowCreate} className="bg-white/90" />
          <Input name="room" placeholder="Room" required disabled={!allowCreate} className="bg-white/90" />
          <select name="unitId" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm" disabled={!allowCreate}>
            <option value="">No unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <select name="status" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm" defaultValue="ACTIVE" disabled={!allowCreate}>
            {residentStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}
              </option>
            ))}
          </select>
          <Input name="bestTimesOfDay" placeholder="Best times of day" disabled={!allowCreate} className="bg-white/90" />
          <Input name="notes" placeholder="Resident notes" disabled={!allowCreate} className="bg-white/90" />
          <GlassButton type="submit" className="md:col-span-2" disabled={!allowCreate}>
            Create resident
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
