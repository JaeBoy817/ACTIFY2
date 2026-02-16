import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CalendarDays, Layers, Printer, Sparkles } from "lucide-react";

import { TemplateDragDropScheduler } from "@/components/app/template-drag-drop-scheduler";
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

const createActivitySchema = z.object({
  title: z.string().min(2),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  location: z.string().min(1),
  checklist: z.string().optional()
});

function fireAndForgetAudit(payload: Parameters<typeof logAudit>[0]) {
  void logAudit(payload).catch((error) => {
    console.error("Calendar audit log failed:", error);
  });
}

export default async function CalendarPage({ searchParams }: { searchParams?: { month?: string } }) {
  const context = await requireModulePage("calendar");
  const parsedMonth = searchParams?.month ? parseISO(searchParams.month) : new Date();
  const month = Number.isNaN(parsedMonth.getTime()) ? new Date() : parsedMonth;
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const [activities, templates] = await Promise.all([
    prisma.activityInstance.findMany({
      where: {
        facilityId: context.facilityId,
        startAt: {
          gte: calendarStart,
          lte: calendarEnd
        }
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true
      },
      orderBy: { startAt: "asc" }
    }),
    prisma.activityTemplate.findMany({
      where: { facilityId: context.facilityId },
      select: {
        id: true,
        title: true,
        category: true
      },
      orderBy: { title: "asc" }
    })
  ]);

  const byDay = new Map<string, typeof activities>();
  activities.forEach((activity) => {
    const key = format(activity.startAt, "yyyy-MM-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), activity]);
  });

  const days: Date[] = [];
  for (let day = calendarStart; day <= calendarEnd; day = addDays(day, 1)) {
    days.push(day);
  }
  const monthActivities = activities.filter((activity) => isSameMonth(activity.startAt, monthStart));
  const nextMonthHref = `/app/calendar?month=${format(addMonths(monthStart, 1), "yyyy-MM-dd")}`;
  const previousMonthHref = `/app/calendar?month=${format(addMonths(monthStart, -1), "yyyy-MM-dd")}`;
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const currentWeekStartKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const currentMonthKey = format(monthStart, "yyyy-MM-dd");
  const dailyPdfPreviewHref = `/app/calendar/pdf?view=daily&date=${todayKey}&preview=1`;
  const weeklyPdfPreviewHref = `/app/calendar/pdf?view=weekly&weekStart=${currentWeekStartKey}&preview=1`;
  const monthlyPdfPreviewHref = `/app/calendar/pdf?view=monthly&month=${currentMonthKey}&preview=1`;
  const dragDropDays = days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const dayActivities = byDay.get(key) ?? [];
    return {
      dateKey: key,
      dayName: format(day, "EEE"),
      dayNumber: format(day, "d"),
      detailHref: `/app/calendar/day/${key}`,
      outsideMonth: !isSameMonth(day, monthStart),
      today: isToday(day),
      activityCount: dayActivities.length,
      previewItems: dayActivities
        .slice(0, 2)
        .map((activity) => `${format(activity.startAt, "h:mm a")} ${activity.title}`)
    };
  });

  async function createActivity(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("calendar");
    assertWritable(scoped.role);

    const parsed = createActivitySchema.parse({
      title: formData.get("title"),
      startAt: formData.get("startAt"),
      endAt: formData.get("endAt"),
      location: formData.get("location"),
      checklist: formData.get("checklist") || undefined
    });

    const activity = await prisma.activityInstance.create({
      data: {
        facilityId: scoped.facilityId,
        title: parsed.title,
        startAt: new Date(parsed.startAt),
        endAt: new Date(parsed.endAt),
        location: parsed.location,
        adaptationsEnabled: {
          bedBound: false,
          dementiaFriendly: false,
          lowVisionHearing: false,
          oneToOneMini: false,
          overrides: {}
        },
        checklist: parsed.checklist
          ? parsed.checklist
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => ({ text: item, done: false }))
          : []
      }
    });

    fireAndForgetAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivityInstance",
      entityId: activity.id,
      after: activity
    });

    revalidatePath("/app/calendar");
  }

  async function createFromTemplate(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("calendar");
    assertWritable(scoped.role);

    const templateId = String(formData.get("templateId") || "");
    const startAt = String(formData.get("startAt") || "");
    const endAt = String(formData.get("endAt") || "");
    const location = String(formData.get("location") || "Activity Room");

    if (!templateId || !startAt || !endAt) return;

    const template = await prisma.activityTemplate.findFirst({
      where: { id: templateId, facilityId: scoped.facilityId },
      select: {
        id: true,
        title: true,
        defaultChecklist: true
      }
    });
    if (!template) return;

    const created = await prisma.activityInstance.create({
      data: {
        facilityId: scoped.facilityId,
        templateId: template.id,
        title: template.title,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        location,
        adaptationsEnabled: {
          bedBound: false,
          dementiaFriendly: false,
          lowVisionHearing: false,
          oneToOneMini: false,
          overrides: {}
        },
        checklist: (Array.isArray(template.defaultChecklist) ? template.defaultChecklist : []).map((item) => ({
          text: String(item),
          done: false
        }))
      }
    });

    fireAndForgetAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivityInstance",
      entityId: created.id,
      after: created
    });

    revalidatePath("/app/calendar");
  }

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-actifyBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 left-20 h-36 w-36 rounded-full bg-actifyMint/20 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Calendar Builder</h1>
              <Badge className="border-0 bg-actify-warm text-foreground">{format(monthStart, "MMMM yyyy")}</Badge>
              <Badge variant="outline">{monthActivities.length} scheduled activities</Badge>
            </div>
            <p className="max-w-3xl text-sm text-foreground/75">
              Plan your month, create from templates, and keep attendance + notes workflows connected in one place.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/70">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/60 px-3 py-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Month + list view
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/60 px-3 py-1">
                <Layers className="h-3.5 w-3.5" />
                {templates.length} templates available
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton asChild size="sm" variant="dense">
              <Link href={previousMonthHref}>Previous month</Link>
            </GlassButton>
            <GlassButton asChild size="sm" variant="dense">
              <Link href={nextMonthHref}>Next month</Link>
            </GlassButton>
            <GlassButton asChild size="sm" variant="dense">
              <Link href={dailyPdfPreviewHref} target="_blank" rel="noreferrer">
                <Printer className="mr-1 h-4 w-4" />
                Daily PDF
              </Link>
            </GlassButton>
            <GlassButton asChild size="sm" variant="dense">
              <Link href={weeklyPdfPreviewHref} target="_blank" rel="noreferrer">
                <Printer className="mr-1 h-4 w-4" />
                Weekly PDF
              </Link>
            </GlassButton>
            <GlassButton asChild size="sm" variant="dense">
              <Link href={monthlyPdfPreviewHref} target="_blank" rel="noreferrer">
                <Printer className="mr-1 h-4 w-4" />
                Monthly PDF
              </Link>
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      <section className="grid gap-4 lg:grid-cols-2">
        <GlassCard variant="dense" className="h-full">
          <div className="glass-content space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-actifyBlue/15 text-actifyBlue">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">Create activity instance</h2>
                <p className="text-xs text-foreground/70">Build a one-off event and checklist in seconds.</p>
              </div>
            </div>
            <form action={createActivity} className="space-y-3 rounded-xl border border-white/70 bg-white/65 p-4">
              <Input name="title" placeholder="Activity title" required className="bg-white/80" />
              <Input type="datetime-local" name="startAt" required className="bg-white/80" />
              <Input type="datetime-local" name="endAt" required className="bg-white/80" />
              <Input name="location" placeholder="Location" required className="bg-white/80" />
              <Textarea name="checklist" placeholder="Checklist (one item per line)" className="min-h-24 bg-white/80" />
              <GlassButton type="submit" className="w-full sm:w-auto">
                Create activity
              </GlassButton>
            </form>
          </div>
        </GlassCard>

        <GlassCard variant="dense" className="h-full">
          <div className="glass-content space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-actifyMint/20 text-foreground">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">Template quick-schedule</h2>
                <p className="text-xs text-foreground/70">Drag templates into dates below and open day details from month cells.</p>
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-white/70 bg-white/65 p-4">
              <p className="text-sm text-foreground/80">
                Keep templates organized in one place, then drag each widget directly onto a day in this month view.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/70 bg-white/75 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">{templates.length} saved templates</p>
                  <p className="text-xs text-foreground/65">Bingo, trivia, exercise, and custom programs.</p>
                </div>
                <div className="rounded-lg border border-white/70 bg-white/75 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">Drop to schedule</p>
                  <p className="text-xs text-foreground/65">Select time + location in a lightweight modal.</p>
                </div>
              </div>
              <GlassButton asChild variant="warm" className="w-full sm:w-auto">
                <Link href="/app/templates">Manage templates</Link>
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </section>

      <TemplateDragDropScheduler
        templates={templates.map((template) => ({
          id: template.id,
          title: template.title,
          category: template.category
        }))}
        days={dragDropDays}
        scheduleFromTemplateAction={createFromTemplate}
      />

      <GlassCard variant="dense">
        <div className="glass-content space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Day detail workflow</h2>
            <Badge variant="outline">Click any month cell</Badge>
          </div>
          <p className="rounded-lg border border-white/70 bg-white/65 px-4 py-3 text-sm text-foreground/75">
            To keep this month view clean, detailed editing now lives on the dedicated day page. Select any date in the
            month grid and choose <span className="font-medium">View day</span> to modify activities, update adaptations,
            manage checklists, and remove events.
          </p>
          <div className="flex flex-wrap gap-2">
            <GlassButton asChild variant="dense" size="sm">
              <Link href={`/app/calendar/day/${format(new Date(), "yyyy-MM-dd")}`}>Open today&apos;s details</Link>
            </GlassButton>
            <GlassButton asChild variant="dense" size="sm">
              <Link href="/app/templates">Open templates tab</Link>
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
