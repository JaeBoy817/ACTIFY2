import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { CalendarDays, Copy, Sparkles } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const templateSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2),
  supplies: z.string().min(1),
  setupSteps: z.string().min(1),
  difficulty: z.string().min(1),
  bedBound: z.string().optional(),
  dementiaFriendly: z.string().optional(),
  lowVisionHearing: z.string().optional(),
  oneToOneMini: z.string().optional(),
  checklist: z.string().optional()
});

const scheduleSchema = z.object({
  templateId: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  location: z.string().min(1)
});

export default async function TemplatesPage() {
  const context = await requireModulePage("templates");

  const templates = await prisma.activityTemplate.findMany({
    where: { facilityId: context.facilityId },
    orderBy: { createdAt: "desc" }
  });

  async function createTemplate(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("templates");
    assertWritable(scoped.role);

    const parsed = templateSchema.parse({
      title: formData.get("title"),
      category: formData.get("category"),
      supplies: formData.get("supplies"),
      setupSteps: formData.get("setupSteps"),
      difficulty: formData.get("difficulty"),
      bedBound: formData.get("bedBound") || "",
      dementiaFriendly: formData.get("dementiaFriendly") || "",
      lowVisionHearing: formData.get("lowVisionHearing") || "",
      oneToOneMini: formData.get("oneToOneMini") || "",
      checklist: formData.get("checklist") || ""
    });

    const template = await prisma.activityTemplate.create({
      data: {
        facilityId: scoped.facilityId,
        title: parsed.title,
        category: parsed.category,
        supplies: parsed.supplies,
        setupSteps: parsed.setupSteps,
        difficulty: parsed.difficulty,
        adaptations: {
          bedBound: parsed.bedBound,
          dementiaFriendly: parsed.dementiaFriendly,
          lowVisionHearing: parsed.lowVisionHearing,
          oneToOneMini: parsed.oneToOneMini
        },
        defaultChecklist: parsed.checklist
          ? parsed.checklist
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
      entityType: "ActivityTemplate",
      entityId: template.id,
      after: template
    });

    revalidatePath("/app/templates");
  }

  async function duplicateTemplate(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("templates");
    assertWritable(scoped.role);

    const templateId = String(formData.get("templateId") || "");
    const existing = await prisma.activityTemplate.findFirst({
      where: { id: templateId, facilityId: scoped.facilityId }
    });

    if (!existing) return;

    const copy = await prisma.activityTemplate.create({
      data: {
        facilityId: scoped.facilityId,
        title: `${existing.title} (Copy)`,
        category: existing.category,
        supplies: existing.supplies,
        setupSteps: existing.setupSteps,
        adaptations: existing.adaptations as Prisma.InputJsonValue,
        difficulty: existing.difficulty,
        defaultChecklist: existing.defaultChecklist as Prisma.InputJsonValue
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivityTemplate",
      entityId: copy.id,
      after: copy
    });

    revalidatePath("/app/templates");
  }

  async function useTemplate(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("templates");
    assertWritable(scoped.role);

    const parsed = scheduleSchema.parse({
      templateId: formData.get("templateId"),
      startAt: formData.get("startAt"),
      endAt: formData.get("endAt"),
      location: formData.get("location")
    });

    const template = await prisma.activityTemplate.findFirst({
      where: { id: parsed.templateId, facilityId: scoped.facilityId }
    });

    if (!template) return;

    const instance = await prisma.activityInstance.create({
      data: {
        facilityId: scoped.facilityId,
        templateId: template.id,
        title: template.title,
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
        checklist: (Array.isArray(template.defaultChecklist) ? template.defaultChecklist : []).map((item) => ({
          text: String(item),
          done: false
        }))
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivityInstance",
      entityId: instance.id,
      after: instance
    });

    revalidatePath("/app/templates");
    revalidatePath("/app/calendar");
  }

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-actifyBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 left-20 h-32 w-32 rounded-full bg-actifyMint/20 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Templates</h1>
              <Badge className="border-0 bg-actify-warm text-foreground">{templates.length} saved</Badge>
            </div>
            <p className="max-w-3xl text-sm text-foreground/75">
              Keep this compact: create reusable activities once, then schedule them in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton asChild size="sm" variant="dense">
              <Link href="/app/calendar">
                <CalendarDays className="mr-1 h-4 w-4" />
                Open calendar
              </Link>
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <GlassCard variant="dense">
          <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="font-[var(--font-display)] text-lg">Create Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-0 pb-0">
              <form action={createTemplate} className="space-y-3">
                <Input name="title" placeholder="Title (e.g. Music Social)" required className="bg-white/75" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input name="category" placeholder="Category" required className="bg-white/75" />
                  <Input name="difficulty" placeholder="Difficulty" required className="bg-white/75" />
                </div>
                <Textarea name="supplies" placeholder="Supplies" required rows={3} className="bg-white/75" />
                <Textarea name="setupSteps" placeholder="Setup steps" required rows={3} className="bg-white/75" />
                <Textarea name="checklist" placeholder="Checklist (one item per line)" rows={3} className="bg-white/75" />

                <details className="rounded-lg border border-white/70 bg-white/60 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">Adaptations (optional)</summary>
                  <div className="mt-3 grid gap-2">
                    <Textarea name="bedBound" placeholder="Bed-bound adaptation" rows={2} className="bg-white/75" />
                    <Textarea name="dementiaFriendly" placeholder="Dementia-friendly adaptation" rows={2} className="bg-white/75" />
                    <Textarea name="lowVisionHearing" placeholder="Low vision/hearing adaptation" rows={2} className="bg-white/75" />
                    <Textarea name="oneToOneMini" placeholder="1:1 mini adaptation" rows={2} className="bg-white/75" />
                  </div>
                </details>

                <Button type="submit" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save template
                </Button>
              </form>
            </CardContent>
          </Card>
        </GlassCard>

        <GlassCard variant="dense">
          <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-[var(--font-display)] text-lg">Saved Templates</CardTitle>
                <Badge variant="outline">Compact view</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-0 pb-0">
              {templates.length === 0 ? (
                <p className="rounded-lg border border-white/70 bg-white/65 px-3 py-3 text-sm text-foreground/70">
                  No templates yet. Create your first template on the left.
                </p>
              ) : null}

              {templates.map((template) => {
                const checklistCount = Array.isArray(template.defaultChecklist) ? template.defaultChecklist.length : 0;

                return (
                  <div key={template.id} className="rounded-lg border border-white/70 bg-white/65 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{template.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">{template.category}</Badge>
                          <Badge variant="outline">{template.difficulty}</Badge>
                          <Badge variant="outline">Checklist {checklistCount}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={duplicateTemplate}>
                          <input type="hidden" name="templateId" value={template.id} />
                          <Button type="submit" variant="outline" size="sm">
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Duplicate
                          </Button>
                        </form>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">Use template</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Schedule from template</DialogTitle>
                              <DialogDescription>{template.title}</DialogDescription>
                            </DialogHeader>
                            <form action={useTemplate} className="space-y-3">
                              <input type="hidden" name="templateId" value={template.id} />
                              <label className="text-sm">
                                Start
                                <Input type="datetime-local" name="startAt" required className="mt-1" />
                              </label>
                              <label className="text-sm">
                                End
                                <Input type="datetime-local" name="endAt" required className="mt-1" />
                              </label>
                              <label className="text-sm">
                                Location
                                <Input name="location" required className="mt-1" placeholder="Activity Room" defaultValue="Activity Room" />
                              </label>
                              <Button type="submit" className="w-full">Create activity</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-foreground/75">
                      Supplies: {template.supplies}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </GlassCard>
      </section>
    </div>
  );
}
