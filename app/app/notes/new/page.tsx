import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ClipboardPenLine } from "lucide-react";

import { ProgressNoteForm } from "@/components/app/progress-note-form";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { logAudit } from "@/lib/audit";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { asDocumentationRules } from "@/lib/settings/defaults";

const noteSchema = z.object({
  residentId: z.string().min(1),
  activityInstanceId: z.string().optional(),
  type: z.enum(["GROUP", "ONE_TO_ONE"]),
  participationLevel: z.enum(["MINIMAL", "MODERATE", "HIGH"]),
  moodAffect: z.enum(["BRIGHT", "CALM", "FLAT", "ANXIOUS", "AGITATED"]),
  cuesRequired: z.enum(["NONE", "VERBAL", "VISUAL", "HAND_OVER_HAND"]),
  response: z.enum(["POSITIVE", "NEUTRAL", "RESISTANT"]),
  followUp: z.string().optional(),
  narrative: z.string().min(10),
  quickPhrases: z.array(z.string()).optional()
});

function parseQuickPhrases(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default async function NewProgressNotePage() {
  const context = await requireModulePage("notes");

  const [residents, activities, templates, goals, documentationRulesRecord] = await Promise.all([
    prisma.resident.findMany({
      where: { facilityId: context.facilityId, isActive: true },
      include: { unit: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    prisma.activityInstance.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { startAt: "desc" },
      take: 50
    }),
    prisma.progressNoteTemplate.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.carePlanGoal.findMany({
      where: {
        resident: { facilityId: context.facilityId },
        isActive: true
      },
      include: { resident: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.facilitySettings.findUnique({
      where: { facilityId: context.facilityId },
      select: { documentationRulesJson: true }
    })
  ]);
  const documentationRules = asDocumentationRules(documentationRulesRecord?.documentationRulesJson);

  async function saveProgressNote(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("notes");
    assertWritable(scoped.role);

    const parsed = noteSchema.parse({
      residentId: formData.get("residentId"),
      activityInstanceId: formData.get("activityInstanceId") || undefined,
      type: formData.get("type"),
      participationLevel: formData.get("participationLevel"),
      moodAffect: formData.get("moodAffect"),
      cuesRequired: formData.get("cuesRequired"),
      response: formData.get("response"),
      followUp: formData.get("followUp") || undefined,
      narrative: formData.get("narrative"),
      quickPhrases: parseQuickPhrases(formData.get("quickPhrases") as string | null)
    });

    const goalIds = formData.getAll("goalIds").map(String).filter(Boolean);
    const facilitySettings = await prisma.facilitySettings.findUnique({
      where: { facilityId: scoped.facilityId },
      select: { documentationRulesJson: true }
    });
    const documentationRules = asDocumentationRules(facilitySettings?.documentationRulesJson);

    if (parsed.narrative.trim().length < documentationRules.minNarrativeLen) {
      throw new Error(`Narrative must be at least ${documentationRules.minNarrativeLen} characters.`);
    }

    if (documentationRules.noteRequiredFields.includes("followUp") && !parsed.followUp?.trim()) {
      throw new Error("Follow-up is required by documentation rules.");
    }

    if (parsed.type === "ONE_TO_ONE" && documentationRules.requireGoalLinkForOneToOne && goalIds.length === 0) {
      throw new Error("At least one goal link is required for 1:1 notes.");
    }

    const note = await prisma.progressNote.create({
      data: {
        residentId: parsed.residentId,
        activityInstanceId: parsed.activityInstanceId || null,
        type: parsed.type,
        participationLevel: parsed.participationLevel,
        moodAffect: parsed.moodAffect,
        cuesRequired: parsed.cuesRequired,
        response: parsed.response,
        followUp: parsed.followUp,
        narrative: parsed.quickPhrases?.length
          ? `${parsed.narrative}\n\nQuick phrases: ${parsed.quickPhrases.join(" | ")}`
          : parsed.narrative,
        createdByUserId: scoped.user.id
      }
    });

    if (goalIds.length) {
      await prisma.goalLink.createMany({
        data: goalIds.map((goalId) => ({
          goalId,
          noteId: note.id
        }))
      });
    }

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ProgressNote",
      entityId: note.id,
      after: note
    });

    revalidatePath("/app/notes/new");
    revalidatePath(`/app/residents/${parsed.residentId}`);
    redirect(`/app/residents/${parsed.residentId}`);
  }

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-actifyBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 left-24 h-32 w-32 rounded-full bg-actifyMint/20 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">New Note</h1>
              <Badge className="border-0 bg-actify-warm text-foreground">Progress Note Builder</Badge>
            </div>
            <p className="max-w-3xl text-sm text-foreground/75">
              Document group and 1:1 activity responses quickly with structured fields, quick phrases, and goal links.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton asChild size="sm" variant="dense">
              <Link href="/app/notes/one-to-one">
                <ClipboardPenLine className="mr-1 h-4 w-4" />
                1:1 Notes
              </Link>
            </GlassButton>
            <GlassButton asChild size="sm" variant="dense">
              <Link href="/app/residents">Residents</Link>
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      <ProgressNoteForm
        action={saveProgressNote}
        showIntro={false}
        minNarrativeLen={documentationRules.minNarrativeLen}
        followUpRequired={documentationRules.noteRequiredFields.includes("followUp")}
        residents={residents.map((resident) => ({
          id: resident.id,
          name: `${resident.firstName} ${resident.lastName}`,
          room: resident.room,
          unitName: resident.unit?.name
        }))}
        activities={activities.map((activity) => ({
          id: activity.id,
          label: `${new Date(activity.startAt).toLocaleDateString()} ${activity.title}`
        }))}
        templates={templates.map((template) => ({
          id: template.id,
          title: template.title,
          quickPhrases: Array.isArray(template.quickPhrases) ? template.quickPhrases.map(String) : [],
          bodyTemplate: template.bodyTemplate
        }))}
        goals={goals.map((goal) => ({
          id: goal.id,
          residentId: goal.residentId,
          label: `${goal.type}: ${goal.description}`
        }))}
      />
    </div>
  );
}
