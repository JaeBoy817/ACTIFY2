import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const volunteerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  requirements: z.string().optional()
});

const visitSchema = z.object({
  volunteerId: z.string().min(1),
  startAt: z.string().min(1),
  assignedLocation: z.string().min(1),
  notes: z.string().optional()
});

export default async function VolunteersPage() {
  const context = await requireModulePage("volunteers");

  const [volunteers, visits] = await Promise.all([
    prisma.volunteer.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { name: "asc" }
    }),
    prisma.volunteerVisit.findMany({
      where: { volunteer: { facilityId: context.facilityId } },
      include: { volunteer: true, signedInByUser: true, signedOutByUser: true },
      orderBy: { startAt: "desc" },
      take: 50
    })
  ]);

  async function createVolunteer(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("volunteers");
    assertWritable(scoped.role);

    const parsed = volunteerSchema.parse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      requirements: formData.get("requirements") || undefined
    });

    const volunteer = await prisma.volunteer.create({
      data: {
        facilityId: scoped.facilityId,
        name: parsed.name,
        phone: parsed.phone,
        requirements: parsed.requirements
          ? parsed.requirements
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
          : []
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "Volunteer",
      entityId: volunteer.id,
      after: volunteer
    });

    revalidatePath("/app/volunteers");
  }

  async function signInVisit(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("volunteers");
    assertWritable(scoped.role);

    const parsed = visitSchema.parse({
      volunteerId: formData.get("volunteerId"),
      startAt: formData.get("startAt"),
      assignedLocation: formData.get("assignedLocation"),
      notes: formData.get("notes") || undefined
    });

    const visit = await prisma.volunteerVisit.create({
      data: {
        volunteerId: parsed.volunteerId,
        startAt: new Date(parsed.startAt),
        assignedLocation: parsed.assignedLocation,
        notes: parsed.notes,
        signedInByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "VolunteerVisit",
      entityId: visit.id,
      after: visit
    });

    revalidatePath("/app/volunteers");
  }

  async function signOutVisit(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("volunteers");
    assertWritable(scoped.role);

    const visitId = String(formData.get("visitId") || "");
    if (!visitId) return;

    const existing = await prisma.volunteerVisit.findUnique({ where: { id: visitId } });
    if (!existing) return;

    const visit = await prisma.volunteerVisit.update({
      where: { id: visitId },
      data: {
        endAt: new Date(),
        signedOutByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "VolunteerVisit",
      entityId: visit.id,
      before: existing,
      after: visit
    });

    revalidatePath("/app/volunteers");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Volunteer directory</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createVolunteer} className="grid gap-3 md:grid-cols-3">
            <Input name="name" placeholder="Volunteer name" required />
            <Input name="phone" placeholder="Phone" />
            <Textarea name="requirements" placeholder="Requirements (one per line)" className="md:col-span-3" />
            <Button type="submit" className="md:col-span-3">Add volunteer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule and sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signInVisit} className="grid gap-3 md:grid-cols-4">
            <select name="volunteerId" className="h-10 rounded-md border px-3 text-sm" required>
              <option value="">Select volunteer</option>
              {volunteers.map((volunteer) => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.name}
                </option>
              ))}
            </select>
            <Input type="datetime-local" name="startAt" required />
            <Input name="assignedLocation" placeholder="Assigned location" required />
            <Input name="notes" placeholder="Visit notes" />
            <Button type="submit" className="md:col-span-4">Sign in / schedule visit</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign-in/out log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visits.map((visit) => (
            <div key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{visit.volunteer.name} · {visit.assignedLocation}</p>
                <p className="text-xs text-muted-foreground">
                  In: {new Date(visit.startAt).toLocaleString()} by {visit.signedInByUser.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Out: {visit.endAt ? `${new Date(visit.endAt).toLocaleString()} by ${visit.signedOutByUser?.name ?? "Unknown"}` : "Not signed out"}
                </p>
                {visit.notes && <p className="text-xs text-muted-foreground">{visit.notes}</p>}
              </div>

              {visit.endAt ? (
                <Badge variant="secondary">Closed</Badge>
              ) : (
                <form action={signOutVisit}>
                  <input type="hidden" name="visitId" value={visit.id} />
                  <Button type="submit" size="sm" variant="outline">Sign out</Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
