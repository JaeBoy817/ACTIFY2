import Link from "next/link";
import { addDays, format, isValid, parse, startOfDay } from "date-fns";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { z } from "zod";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const updateActivitySchema = z.object({
  activityId: z.string().min(1),
  title: z.string().min(2),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  location: z.string().min(1)
});

function fireAndForgetAudit(payload: Parameters<typeof logAudit>[0]) {
  void logAudit(payload).catch((error) => {
    console.error("Calendar day audit log failed:", error);
  });
}

function asChecklist(value: unknown): { text: string; done: boolean }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { text: item, done: false };
      if (item && typeof item === "object" && "text" in item) {
        return {
          text: String((item as { text: unknown }).text),
          done: Boolean((item as { done?: unknown }).done)
        };
      }
      return null;
    })
    .filter((item): item is { text: string; done: boolean } => Boolean(item));
}

function asAdaptations(value: unknown) {
  const safe = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    bedBound: Boolean(safe.bedBound),
    dementiaFriendly: Boolean(safe.dementiaFriendly),
    lowVisionHearing: Boolean(safe.lowVisionHearing),
    oneToOneMini: Boolean(safe.oneToOneMini),
    overrides: safe.overrides && typeof safe.overrides === "object" ? (safe.overrides as Record<string, string>) : {}
  };
}

interface CalendarDayPageProps {
  params: { date: string };
}

export default async function CalendarDayPage({ params }: CalendarDayPageProps) {
  const context = await requireModulePage("calendar");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    notFound();
  }

  const parsedDay = parse(params.date, "yyyy-MM-dd", new Date());
  if (!isValid(parsedDay)) {
    notFound();
  }

  const dayStart = startOfDay(parsedDay);
  const nextDay = addDays(dayStart, 1);
  const previousDayHref = `/app/calendar/day/${format(addDays(dayStart, -1), "yyyy-MM-dd")}`;
  const nextDayHref = `/app/calendar/day/${format(nextDay, "yyyy-MM-dd")}`;
  const monthHref = `/app/calendar?month=${format(dayStart, "yyyy-MM-dd")}`;
  const printHref = `/app/calendar/pdf?view=daily&date=${format(dayStart, "yyyy-MM-dd")}&preview=1`;

  const activities = await prisma.activityInstance.findMany({
    where: {
      facilityId: context.facilityId,
      startAt: {
        gte: dayStart,
        lt: nextDay
      }
    },
    include: { template: true },
    orderBy: { startAt: "asc" }
  });

  async function updateActivityDetails(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("calendar");
    assertWritable(scoped.role);

    const parsed = updateActivitySchema.parse({
      activityId: formData.get("activityId"),
      title: formData.get("title"),
      startAt: formData.get("startAt"),
      endAt: formData.get("endAt"),
      location: formData.get("location")
    });

    const startAt = new Date(parsed.startAt);
    const endAt = new Date(parsed.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return;
    }

    const existing = await prisma.activityInstance.findFirst({
      where: { id: parsed.activityId, facilityId: scoped.facilityId }
    });
    if (!existing) return;

    const updated = await prisma.activityInstance.update({
      where: { id: existing.id },
      data: {
        title: parsed.title,
        startAt,
        endAt,
        location: parsed.location
      }
    });

    fireAndForgetAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivityInstance",
      entityId: updated.id,
      before: existing,
      after: updated
    });

    revalidatePath("/app/calendar");
    revalidatePath(`/app/calendar/day/${params.date}`);
  }

  async function deleteActivity(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("calendar");
    assertWritable(scoped.role);

    const activityId = String(formData.get("activityId") || "");
    if (!activityId) return;

    const existing = await prisma.activityInstance.findFirst({
      where: { id: activityId, facilityId: scoped.facilityId }
    });
    if (!existing) return;

    await prisma.activityInstance.delete({
      where: { id: existing.id }
    });

    fireAndForgetAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ActivityInstance",
      entityId: existing.id,
      before: existing
    });

    revalidatePath("/app/calendar");
    revalidatePath(`/app/calendar/day/${params.date}`);
  }

  async function updateAdaptations(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("calendar");
    assertWritable(scoped.role);

    const activityId = String(formData.get("activityId") || "");
    const overrideBedBound = String(formData.get("overrideBedBound") || "");
    const overrideDementia = String(formData.get("overrideDementia") || "");
    const overrideLowVision = String(formData.get("overrideLowVision") || "");
    const overrideOneToOne = String(formData.get("overrideOneToOne") || "");

    const existing = await prisma.activityInstance.findFirst({ where: { id: activityId, facilityId: scoped.facilityId } });
    if (!existing) return;

    const current = asAdaptations(existing.adaptationsEnabled);
    const nextAdaptations = {
      bedBound: formData.get("bedBound") === "on",
      dementiaFriendly: formData.get("dementiaFriendly") === "on",
      lowVisionHearing: formData.get("lowVisionHearing") === "on",
      oneToOneMini: formData.get("oneToOneMini") === "on",
      overrides: {
        ...current.overrides,
        ...(overrideBedBound ? { bedBound: overrideBedBound } : {}),
        ...(overrideDementia ? { dementiaFriendly: overrideDementia } : {}),
        ...(overrideLowVision ? { lowVisionHearing: overrideLowVision } : {}),
        ...(overrideOneToOne ? { oneToOneMini: overrideOneToOne } : {})
      }
    };

    await prisma.activityInstance.update({
      where: { id: activityId },
      data: {
        adaptationsEnabled: nextAdaptations
      }
    });

    fireAndForgetAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivityInstance",
      entityId: existing.id,
      before: { adaptationsEnabled: existing.adaptationsEnabled },
      after: { adaptationsEnabled: nextAdaptations }
    });

    revalidatePath("/app/calendar");
    revalidatePath(`/app/calendar/day/${params.date}`);
  }

  async function toggleChecklistItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("calendar");
    assertWritable(scoped.role);

    const activityId = String(formData.get("activityId") || "");
    const index = Number(formData.get("index"));
    const existing = await prisma.activityInstance.findFirst({ where: { id: activityId, facilityId: scoped.facilityId } });
    if (!existing || Number.isNaN(index)) return;

    const checklist = asChecklist(existing.checklist).map((item, idx) => (idx === index ? { ...item, done: !item.done } : item));

    await prisma.activityInstance.update({
      where: { id: activityId },
      data: {
        checklist
      }
    });

    revalidatePath("/app/calendar");
    revalidatePath(`/app/calendar/day/${params.date}`);
  }

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-foreground/60">Day Details</p>
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">{format(dayStart, "EEEE, MMMM d")}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{activities.length} scheduled</Badge>
            <GlassButton asChild variant="dense" size="sm">
              <Link href={printHref} target="_blank" rel="noreferrer">
                <Printer className="mr-1 h-4 w-4" />
                Daily PDF
              </Link>
            </GlassButton>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <GlassButton asChild variant="dense" size="sm">
            <Link href={previousDayHref}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous day
            </Link>
          </GlassButton>
          <GlassButton asChild variant="dense" size="sm">
            <Link href={nextDayHref}>
              Next day
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </GlassButton>
          <GlassButton asChild variant="dense" size="sm">
            <Link href={monthHref}>Back to month view</Link>
          </GlassButton>
        </div>
        <p className="text-xs text-foreground/60">
          Quick flow: adjust details here, then track attendance per activity. Week grid supports keyboard move and inline edits.
        </p>
      </GlassPanel>

      {activities.length === 0 ? (
        <GlassCard variant="dense">
          <div className="space-y-3">
            <p className="text-sm text-foreground/75">
              No activities scheduled for this day yet. Use the calendar month view and drag a template onto this date.
            </p>
            <GlassButton asChild variant="warm" size="sm">
              <Link href={monthHref}>Open month calendar</Link>
            </GlassButton>
          </div>
        </GlassCard>
      ) : null}

      {activities.map((activity) => {
        const checklist = asChecklist(activity.checklist);
        const adaptations = asAdaptations(activity.adaptationsEnabled);
        const templateAdaptations = activity.template?.adaptations && typeof activity.template.adaptations === "object"
          ? (activity.template.adaptations as Record<string, unknown>)
          : {};

        return (
          <GlassCard key={activity.id} variant="dense" className="space-y-4 transition hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">{activity.title}</p>
                <p className="text-xs text-foreground/65">
                  {format(activity.startAt, "h:mm a")} - {format(activity.endAt, "h:mm a")} · {activity.location}
                </p>
              </div>
              <GlassButton asChild size="sm" variant="dense">
                <Link href={`/app/calendar/${activity.id}/attendance`}>Track attendance</Link>
              </GlassButton>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-3">
              <p className="mb-2 text-sm font-medium text-foreground">Modify scheduled activity</p>
              <form action={updateActivityDetails} className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <input type="hidden" name="activityId" value={activity.id} />
                <Input
                  name="title"
                  defaultValue={activity.title}
                  required
                  className="bg-white/85"
                />
                <Input
                  type="datetime-local"
                  name="startAt"
                  defaultValue={format(activity.startAt, "yyyy-MM-dd'T'HH:mm")}
                  required
                  className="bg-white/85"
                />
                <Input
                  type="datetime-local"
                  name="endAt"
                  defaultValue={format(activity.endAt, "yyyy-MM-dd'T'HH:mm")}
                  required
                  className="bg-white/85"
                />
                <Input
                  name="location"
                  defaultValue={activity.location}
                  required
                  className="bg-white/85"
                />
                <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
                  <GlassButton type="submit" size="sm" variant="warm">
                    Save changes
                  </GlassButton>
                </div>
              </form>
              <form action={deleteActivity} className="mt-2">
                <input type="hidden" name="activityId" value={activity.id} />
                <GlassButton
                  type="submit"
                  size="sm"
                  variant="dense"
                  className="border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100/90"
                >
                  Delete activity
                </GlassButton>
              </form>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form action={updateAdaptations} className="space-y-2 rounded-xl border border-white/70 bg-white/70 p-3">
                <input type="hidden" name="activityId" value={activity.id} />
                <p className="text-sm font-medium text-foreground">Adaptation toggle</p>
                <label className="flex items-center gap-2 text-sm text-foreground/80"><input type="checkbox" name="bedBound" defaultChecked={adaptations.bedBound} /> bed-bound version</label>
                <label className="flex items-center gap-2 text-sm text-foreground/80"><input type="checkbox" name="dementiaFriendly" defaultChecked={adaptations.dementiaFriendly} /> dementia-friendly version</label>
                <label className="flex items-center gap-2 text-sm text-foreground/80"><input type="checkbox" name="lowVisionHearing" defaultChecked={adaptations.lowVisionHearing} /> low-vision/hearing-friendly version</label>
                <label className="flex items-center gap-2 text-sm text-foreground/80"><input type="checkbox" name="oneToOneMini" defaultChecked={adaptations.oneToOneMini} /> 1:1 mini version</label>
                <Textarea
                  name="overrideBedBound"
                  placeholder="Optional bed-bound override"
                  defaultValue={adaptations.overrides.bedBound ?? String(templateAdaptations.bedBound ?? "")}
                  className="min-h-20 bg-white/80"
                />
                <Textarea
                  name="overrideDementia"
                  placeholder="Optional dementia-friendly override"
                  defaultValue={adaptations.overrides.dementiaFriendly ?? String(templateAdaptations.dementiaFriendly ?? "")}
                  className="min-h-20 bg-white/80"
                />
                <Textarea
                  name="overrideLowVision"
                  placeholder="Optional low vision/hearing override"
                  defaultValue={adaptations.overrides.lowVisionHearing ?? String(templateAdaptations.lowVisionHearing ?? "")}
                  className="min-h-20 bg-white/80"
                />
                <Textarea
                  name="overrideOneToOne"
                  placeholder="Optional 1:1 mini override"
                  defaultValue={adaptations.overrides.oneToOneMini ?? String(templateAdaptations.oneToOneMini ?? "")}
                  className="min-h-20 bg-white/80"
                />
                <GlassButton type="submit" size="sm">Save adaptations</GlassButton>
              </form>

              <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                <p className="mb-2 text-sm font-medium text-foreground">Checklist</p>
                <ul className="space-y-2">
                  {checklist.length === 0 ? <li className="text-sm text-foreground/70">No checklist items.</li> : null}
                  {checklist.map((item, index) => (
                    <li key={`${activity.id}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-white/70 bg-white/70 p-2">
                      <span className={item.done ? "line-through text-foreground/60" : "text-foreground/85"}>{item.text}</span>
                      <form action={toggleChecklistItem}>
                        <input type="hidden" name="activityId" value={activity.id} />
                        <input type="hidden" name="index" value={index} />
                        <GlassButton type="submit" size="sm" variant="dense">
                          {item.done ? "Done" : "Mark done"}
                        </GlassButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
