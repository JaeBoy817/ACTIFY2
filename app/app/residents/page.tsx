import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  ArrowRightLeft,
  BedDouble,
  CircleCheck,
  CircleHelp,
  DoorOpen,
  Hospital,
  PlaneTakeoff,
  Skull,
  type LucideIcon
} from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logAudit } from "@/lib/audit";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const residentStatusOptions = [
  "ACTIVE",
  "BED_BOUND",
  "DISCHARGED",
  "HOSPITALIZED",
  "ON_LEAVE",
  "TRANSFERRED",
  "DECEASED",
  "OTHER"
] as const;

type ResidentStatusValue = (typeof residentStatusOptions)[number];
const residentStatusSchema = z.enum(residentStatusOptions);
const bulkStatusFormId = "resident-status-bulk-form";

const residentStatusMeta: Record<
  ResidentStatusValue,
  { icon: LucideIcon; badgeClass: string }
> = {
  ACTIVE: {
    icon: CircleCheck,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  BED_BOUND: {
    icon: BedDouble,
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700"
  },
  DISCHARGED: {
    icon: DoorOpen,
    badgeClass: "border-zinc-300 bg-zinc-100 text-zinc-700"
  },
  HOSPITALIZED: {
    icon: Hospital,
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700"
  },
  ON_LEAVE: {
    icon: PlaneTakeoff,
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700"
  },
  TRANSFERRED: {
    icon: ArrowRightLeft,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700"
  },
  DECEASED: {
    icon: Skull,
    badgeClass: "border-slate-300 bg-slate-200 text-slate-700"
  },
  OTHER: {
    icon: CircleHelp,
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700"
  }
};

function formatResidentStatusLabel(status: ResidentStatusValue) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusIsActive(status: ResidentStatusValue) {
  return status === "ACTIVE" || status === "BED_BOUND";
}

function getRoomSortParts(room: string) {
  const normalized = room.trim().toUpperCase();
  const match = normalized.match(/^(\d+)\s*([A-Z]*)/);
  return {
    numeric: match ? Number(match[1]) : Number.POSITIVE_INFINITY,
    suffix: match ? match[2] : normalized,
    normalized
  };
}

function compareResidentsByRoom(
  a: { room: string; lastName: string; firstName: string },
  b: { room: string; lastName: string; firstName: string }
) {
  const aRoom = getRoomSortParts(a.room);
  const bRoom = getRoomSortParts(b.room);

  if (aRoom.numeric !== bRoom.numeric) return aRoom.numeric - bRoom.numeric;
  const suffixCompare = aRoom.suffix.localeCompare(bRoom.suffix, undefined, { numeric: true, sensitivity: "base" });
  if (suffixCompare !== 0) return suffixCompare;
  const roomCompare = aRoom.normalized.localeCompare(bRoom.normalized, undefined, { numeric: true, sensitivity: "base" });
  if (roomCompare !== 0) return roomCompare;
  const lastCompare = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
  if (lastCompare !== 0) return lastCompare;
  return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
}

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

export default async function ResidentsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const { facilityId, role } = await getFacilityContextWithSubscription();
  const search = searchParams?.q?.trim() ?? "";

  const [units, residents] = await Promise.all([
    prisma.unit.findMany({ where: { facilityId }, orderBy: { name: "asc" } }),
    prisma.resident.findMany({
      where: {
        facilityId,
        OR: search
          ? [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { room: { contains: search } }
            ]
          : undefined
      },
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
  const currentResidents = roomSortedResidents.filter((resident) => resident.status !== "DISCHARGED");
  const dischargedResidents = roomSortedResidents.filter((resident) => resident.status === "DISCHARGED");

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
      <Card>
        <CardHeader>
          <CardTitle>Residents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="flex gap-2">
            <Input name="q" placeholder="Search by name or room" defaultValue={search} />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          {allowCreate && (
            <form id={bulkStatusFormId} action={saveAllResidentStatuses} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Residents are sorted by room number. Update status dropdowns, then save once.
              </p>
              <Button type="submit" size="sm">Save all status changes</Button>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Attendance history</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentResidents.map((resident) => (
                <TableRow key={resident.id}>
                  <TableCell>{resident.firstName} {resident.lastName}</TableCell>
                  <TableCell>{resident.room}</TableCell>
                  <TableCell>{resident.unit?.name ?? "-"}</TableCell>
                  <TableCell>{resident._count.attendance}</TableCell>
                  <TableCell>
                    {(() => {
                      const status = resident.status as ResidentStatusValue;
                      const meta = residentStatusMeta[status];
                      const StatusIcon = meta.icon;
                      return (
                        <Badge className={`w-fit gap-1 border ${meta.badgeClass}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {formatResidentStatusLabel(status)}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {allowCreate ? (
                      <div className="flex items-center gap-2">
                        <input type="hidden" name="residentIds" value={resident.id} form={bulkStatusFormId} />
                        <select
                          name={`status_${resident.id}`}
                          defaultValue={resident.status}
                          className="h-9 rounded-md border px-2 text-xs"
                          form={bulkStatusFormId}
                        >
                          {residentStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {formatResidentStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Read-only</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/app/residents/${resident.id}`}>Open</Link>
                      </Button>
                      {allowCreate && (
                        <form action={deleteResident}>
                          <input type="hidden" name="residentId" value={resident.id} />
                          <Button type="submit" size="sm" variant="destructive">Delete</Button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {currentResidents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    No current residents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <details className="rounded-md border bg-muted/20">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
              Discharged residents ({dischargedResidents.length})
            </summary>
            <div className="border-t px-4 py-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Attendance history</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Update status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dischargedResidents.map((resident) => (
                    <TableRow key={`discharged-${resident.id}`}>
                      <TableCell>{resident.firstName} {resident.lastName}</TableCell>
                      <TableCell>{resident.room}</TableCell>
                      <TableCell>{resident.unit?.name ?? "-"}</TableCell>
                      <TableCell>{resident._count.attendance}</TableCell>
                      <TableCell>
                        {(() => {
                          const status = resident.status as ResidentStatusValue;
                          const meta = residentStatusMeta[status];
                          const StatusIcon = meta.icon;
                          return (
                            <Badge className={`w-fit gap-1 border ${meta.badgeClass}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {formatResidentStatusLabel(status)}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {allowCreate ? (
                          <div className="flex items-center gap-2">
                            <input type="hidden" name="residentIds" value={resident.id} form={bulkStatusFormId} />
                            <select
                              name={`status_${resident.id}`}
                              defaultValue={resident.status}
                              className="h-9 rounded-md border px-2 text-xs"
                              form={bulkStatusFormId}
                            >
                              {residentStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {formatResidentStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Read-only</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/app/residents/${resident.id}`}>Open</Link>
                          </Button>
                          {allowCreate && (
                            <form action={deleteResident}>
                              <input type="hidden" name="residentId" value={resident.id} />
                              <Button type="submit" size="sm" variant="destructive">Delete</Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {dischargedResidents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-muted-foreground">
                        No discharged residents found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </details>

          {allowCreate && (
            <div className="flex justify-end">
              <Button type="submit" form={bulkStatusFormId}>
                Save all status changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add resident</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createResident} className="grid gap-3 md:grid-cols-2">
            <Input name="firstName" placeholder="First name" required disabled={!allowCreate} />
            <Input name="lastName" placeholder="Last name" required disabled={!allowCreate} />
            <Input name="room" placeholder="Room" required disabled={!allowCreate} />
            <select name="unitId" className="h-10 rounded-md border px-3 text-sm" disabled={!allowCreate}>
              <option value="">No unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            <select name="status" className="h-10 rounded-md border px-3 text-sm" defaultValue="ACTIVE" disabled={!allowCreate}>
              {residentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatResidentStatusLabel(status)}
                </option>
              ))}
            </select>
            <Input name="bestTimesOfDay" placeholder="Best times of day" disabled={!allowCreate} />
            <Input name="notes" placeholder="Resident notes" disabled={!allowCreate} />
            <Button type="submit" className="md:col-span-2" disabled={!allowCreate}>
              Create resident
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
