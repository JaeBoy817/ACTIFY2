import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const meetingSchema = z.object({
  heldAt: z.string().min(1),
  attendanceCount: z.coerce.number().int().nonnegative(),
  notes: z.string().optional()
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

export default async function ResidentCouncilPage() {
  const context = await requireModulePage("residentCouncil");

  const meetings = await prisma.residentCouncilMeeting.findMany({
    where: { facilityId: context.facilityId },
    include: {
      items: {
        orderBy: { updatedAt: "desc" }
      }
    },
    orderBy: { heldAt: "desc" }
  });

  const latestMeeting = meetings[0] ?? null;
  const pastMeetings = meetings.slice(1);
  const unresolvedOpenItems = meetings
    .flatMap((meeting) => meeting.items)
    .filter((item) => item.status === "UNRESOLVED");

  async function createMeeting(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("residentCouncil");
    assertWritable(scoped.role);

    const parsed = meetingSchema.parse({
      heldAt: formData.get("heldAt"),
      attendanceCount: formData.get("attendanceCount"),
      notes: formData.get("notes") || undefined
    });

    const meeting = await prisma.residentCouncilMeeting.create({
      data: {
        facilityId: scoped.facilityId,
        heldAt: new Date(parsed.heldAt),
        attendanceCount: parsed.attendanceCount,
        notes: parsed.notes
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ResidentCouncilMeeting",
      entityId: meeting.id,
      after: meeting
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
      <Card>
        <CardHeader>
          <CardTitle>Create meeting</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMeeting} className="grid gap-3 md:grid-cols-3">
            <Input type="datetime-local" name="heldAt" required />
            <Input type="number" name="attendanceCount" placeholder="Attendance count" required />
            <Input name="notes" placeholder="Meeting notes" className="md:col-span-3" />
            <Button type="submit" className="md:col-span-3">Add meeting</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add agenda concern item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createItem} className="grid gap-3 md:grid-cols-3">
            <select name="meetingId" className="h-10 rounded-md border px-3 text-sm" required disabled={meetings.length === 0}>
              <option value="">Select meeting</option>
              {meetings.map((meeting) => (
                <option key={meeting.id} value={meeting.id}>
                  {new Date(meeting.heldAt).toLocaleDateString()} ({meeting.attendanceCount} attendees)
                </option>
              ))}
            </select>
            <Input name="category" placeholder="Category" required />
            <Input name="owner" placeholder="Owner" />
            <Textarea name="concern" placeholder="Concern" required className="md:col-span-3" />
            <Textarea name="followUp" placeholder="Follow-up" className="md:col-span-3" />
            <select name="status" className="h-10 rounded-md border px-3 text-sm md:col-span-1">
              <option value="UNRESOLVED">Unresolved</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <Button type="submit" className="md:col-span-2" disabled={meetings.length === 0}>Add council item</Button>
          </form>
          {meetings.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Create a meeting first to add council items.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Council tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="past">Past Meetings</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              {!latestMeeting ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">No meetings yet.</p>
              ) : (
                <div className="rounded-md border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Latest meeting: {new Date(latestMeeting.heldAt).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Attendance: {latestMeeting.attendanceCount}</p>
                      {latestMeeting.notes ? <p className="mt-1 text-sm text-muted-foreground">{latestMeeting.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={unresolvedOpenItems.length > 0 ? "destructive" : "secondary"}>
                        Open items: {unresolvedOpenItems.length}
                      </Badge>
                      <form action={deleteMeeting}>
                        <input type="hidden" name="meetingId" value={latestMeeting.id} />
                        <Button type="submit" size="sm" variant="destructive">Delete meeting</Button>
                      </form>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {latestMeeting.items.length === 0 ? (
                      <p className="rounded-md border p-3 text-sm text-muted-foreground">No council items in this meeting.</p>
                    ) : (
                      latestMeeting.items.map((item) => (
                        <div key={item.id} className="rounded-md border p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{item.category}: {item.concern}</p>
                            <Badge variant={item.status === "RESOLVED" ? "secondary" : "destructive"}>{item.status}</Badge>
                          </div>
                          {item.followUp ? <p className="text-muted-foreground">Follow-up: {item.followUp}</p> : null}
                          {item.owner ? <p className="text-muted-foreground">Owner: {item.owner}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <form action={updateItemStatus}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <input type="hidden" name="status" value={item.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED"} />
                              <Button type="submit" size="sm" variant="outline">
                                Mark {item.status === "RESOLVED" ? "Unresolved" : "Resolved"}
                              </Button>
                            </form>
                            <form action={deleteItem}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <Button type="submit" size="sm" variant="destructive">Delete item</Button>
                            </form>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastMeetings.length === 0 ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">No past meetings yet.</p>
              ) : (
                pastMeetings.map((meeting) => (
                  <div key={meeting.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">Meeting {new Date(meeting.heldAt).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Attendance: {meeting.attendanceCount}</p>
                        {meeting.notes ? <p className="mt-1 text-sm text-muted-foreground">{meeting.notes}</p> : null}
                      </div>
                      <form action={deleteMeeting}>
                        <input type="hidden" name="meetingId" value={meeting.id} />
                        <Button type="submit" size="sm" variant="destructive">Delete meeting</Button>
                      </form>
                    </div>

                    <div className="mt-3 space-y-2">
                      {meeting.items.length === 0 ? (
                        <p className="rounded-md border p-3 text-sm text-muted-foreground">No council items in this meeting.</p>
                      ) : (
                        meeting.items.map((item) => (
                          <div key={item.id} className="rounded-md border p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">{item.category}: {item.concern}</p>
                              <Badge variant={item.status === "RESOLVED" ? "secondary" : "destructive"}>{item.status}</Badge>
                            </div>
                            {item.followUp ? <p className="text-muted-foreground">Follow-up: {item.followUp}</p> : null}
                            {item.owner ? <p className="text-muted-foreground">Owner: {item.owner}</p> : null}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <form action={updateItemStatus}>
                                <input type="hidden" name="itemId" value={item.id} />
                                <input type="hidden" name="status" value={item.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED"} />
                                <Button type="submit" size="sm" variant="outline">
                                  Mark {item.status === "RESOLVED" ? "Unresolved" : "Resolved"}
                                </Button>
                              </form>
                              <form action={deleteItem}>
                                <input type="hidden" name="itemId" value={item.id} />
                                <Button type="submit" size="sm" variant="destructive">Delete item</Button>
                              </form>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
