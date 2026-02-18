import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ResidentPlanSection } from "@/components/residents/ResidentPlanSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { logAudit } from "@/lib/audit";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { barriers as planBarriers, goalTemplates, interventions as planInterventions } from "@/lib/planLibrary";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const assessmentSchema = z.object({
  music: z.string().optional(),
  topics: z.string().optional(),
  faith: z.string().optional(),
  hobbies: z.string().optional(),
  dislikesTriggers: z.string().optional(),
  bestTimeOfDay: z.string().optional()
});

const familySchema = z.object({
  bestContactTimes: z.string().optional(),
  preferences: z.string().optional(),
  calmingThings: z.string().optional()
});

const residentPlanItemSchema = z
  .object({
    residentId: z.string().min(1),
    planItemId: z.string().optional(),
    planAreaKey: z.enum([
      "LEISURE_ENGAGEMENT",
      "SOCIALIZATION",
      "COGNITIVE_STIMULATION",
      "MOOD_WELLBEING",
      "PHYSICAL_ENGAGEMENT",
      "COMMUNICATION_SUPPORT",
      "SENSORY_STIMULATION",
      "BEHAVIORAL_SUPPORT",
      "SPIRITUAL_CULTURAL",
      "COMMUNITY_INTEGRATION"
    ]),
    goalTemplateId: z.string().optional(),
    customGoalText: z.string().optional(),
    targetFrequency: z.enum(["DAILY", "TWO_TO_THREE_WEEK", "WEEKLY", "MONTHLY", "PRN"]),
    cueingLevel: z.enum(["NONE", "VERBAL", "VISUAL", "TACTILE_HAND_OVER_HAND", "ENVIRONMENTAL"]),
    groupPreference: z.enum(["GROUP", "ONE_TO_ONE", "INDEPENDENT", "MIXED"]),
    interventions: z.array(z.string()).min(1),
    barriers: z.array(z.string()).optional().default([]),
    notes: z.string().optional(),
    active: z.boolean().default(true)
  })
  .refine(
    (value) => Boolean(value.goalTemplateId) || Boolean(value.customGoalText?.trim()),
    { message: "Select a goal template or add a custom goal.", path: ["goalTemplateId"] }
  );

const residentPlanArchiveSchema = z.object({
  residentId: z.string().min(1),
  planItemId: z.string().min(1)
});

function suggestProgramsFromAssessment(input: { music?: string; topics?: string; faith?: string; hobbies?: string }) {
  const text = [input.music, input.topics, input.faith, input.hobbies].join(" ").toLowerCase();
  const suggestions = new Set<string>();

  if (text.includes("country")) {
    suggestions.add("Music social hour");
    suggestions.add("Name that tune");
  }

  if (text.includes("faith") || text.includes("church") || text.includes("prayer")) {
    suggestions.add("Spiritual reflection circle");
  }

  if (text.includes("garden") || text.includes("flowers")) {
    suggestions.add("Gardening club");
  }

  if (text.includes("sports") || text.includes("baseball") || text.includes("football")) {
    suggestions.add("Sports recap social");
  }

  if (text.includes("craft") || text.includes("art")) {
    suggestions.add("Creative table crafts");
  }

  if (text.includes("history") || text.includes("news")) {
    suggestions.add("Current events and memories");
  }

  if (suggestions.size === 0) {
    suggestions.add("Coffee and conversation circle");
    suggestions.add("1:1 reminiscence visit");
  }

  return Array.from(suggestions);
}

function parseBoolean(raw: FormDataEntryValue | null) {
  return raw === "on" || raw === "true" || raw === "1";
}

function formatBirthDate(value: Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

function getNextBirthdaySummary(value: Date | null) {
  if (!value) return "Add a birthday to track reminders.";

  const now = new Date();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();

  let next = new Date(Date.UTC(now.getUTCFullYear(), month, day, 12, 0, 0));
  if (next.getTime() < now.getTime()) {
    next = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day, 12, 0, 0));
  }

  const daysUntil = Math.ceil((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (daysUntil <= 0) return "Birthday is today.";
  if (daysUntil === 1) return "Birthday is tomorrow.";
  return `${daysUntil} days until next birthday.`;
}

export default async function ResidentProfilePage({ params }: { params: { id: string } }) {
  const context = await getFacilityContextWithSubscription();

  const resident = await prisma.resident.findFirst({
    where: {
      id: params.id,
      facilityId: context.facilityId
    },
    include: {
      unit: true,
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      familyEngagementNotes: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      progressNotes: {
        include: { activityInstance: true, createdByUser: true },
        orderBy: { createdAt: "desc" },
        take: 25
      },
      attendance: {
        include: { activityInstance: true },
        orderBy: { createdAt: "desc" },
        take: 30
      },
      planItems: {
        orderBy: [{ active: "desc" }, { updatedAt: "desc" }]
      }
    }
  });

  if (!resident) notFound();

  const canEditPlanAreas = context.role !== "READ_ONLY";
  const activePlanAreasCount = resident.planItems.filter((item) => item.active).length;

  async function createAssessment(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = assessmentSchema.parse({
      music: formData.get("music") || undefined,
      topics: formData.get("topics") || undefined,
      faith: formData.get("faith") || undefined,
      hobbies: formData.get("hobbies") || undefined,
      dislikesTriggers: formData.get("dislikesTriggers") || undefined,
      bestTimeOfDay: formData.get("bestTimeOfDay") || undefined
    });

    const suggestedPrograms = suggestProgramsFromAssessment(parsed);

    await prisma.interestAssessment.create({
      data: {
        residentId: params.id,
        answers: {
          music: parsed.music,
          topics: parsed.topics,
          faith: parsed.faith,
          hobbies: parsed.hobbies,
          bestTimeOfDay: parsed.bestTimeOfDay
        },
        dislikesTriggers: parsed.dislikesTriggers,
        suggestedPrograms
      }
    });

    revalidatePath(`/app/residents/${params.id}`);
  }

  async function createFamilyNote(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = familySchema.parse({
      bestContactTimes: formData.get("bestContactTimes") || undefined,
      preferences: formData.get("preferences") || undefined,
      calmingThings: formData.get("calmingThings") || undefined
    });

    await prisma.familyEngagementNote.create({
      data: {
        residentId: params.id,
        bestContactTimes: parsed.bestContactTimes,
        preferences: parsed.preferences,
        calmingThings: parsed.calmingThings
      }
    });

    revalidatePath(`/app/residents/${params.id}`);
  }

  async function saveResidentPlanItem(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = residentPlanItemSchema.parse({
      residentId: String(formData.get("residentId") || ""),
      planItemId: String(formData.get("planItemId") || "") || undefined,
      planAreaKey: String(formData.get("planAreaKey") || ""),
      goalTemplateId: String(formData.get("goalTemplateId") || "") || undefined,
      customGoalText: String(formData.get("customGoalText") || "") || undefined,
      targetFrequency: String(formData.get("targetFrequency") || ""),
      cueingLevel: String(formData.get("cueingLevel") || ""),
      groupPreference: String(formData.get("groupPreference") || ""),
      interventions: formData.getAll("interventions").map(String).filter(Boolean),
      barriers: formData.getAll("barriers").map(String).filter(Boolean),
      notes: String(formData.get("notes") || "") || undefined,
      active: parseBoolean(formData.get("active"))
    });

    if (parsed.residentId !== params.id) {
      throw new Error("Resident mismatch for plan item save.");
    }

    const residentScoped = await prisma.resident.findFirst({
      where: {
        id: parsed.residentId,
        facilityId: scoped.facilityId
      },
      select: { id: true }
    });
    if (!residentScoped) {
      throw new Error("Resident not found in your facility.");
    }

    const validTemplateIds = new Set(goalTemplates[parsed.planAreaKey].map((template) => template.id));
    if (parsed.goalTemplateId && !validTemplateIds.has(parsed.goalTemplateId)) {
      throw new Error("Selected goal template is not valid for this plan area.");
    }

    const validInterventionKeys = new Set(planInterventions[parsed.planAreaKey].map((item) => item.key));
    const sanitizedInterventions = Array.from(new Set(parsed.interventions)).filter((value) => validInterventionKeys.has(value));
    if (sanitizedInterventions.length === 0) {
      throw new Error("Select at least one valid intervention.");
    }

    const validBarrierKeys = new Set(planBarriers.map((barrier) => barrier.key));
    const sanitizedBarriers = Array.from(new Set(parsed.barriers)).filter((value) => validBarrierKeys.has(value));

    const payload = {
      residentId: parsed.residentId,
      planAreaKey: parsed.planAreaKey,
      goalTemplateId: parsed.customGoalText?.trim() ? null : parsed.goalTemplateId ?? null,
      customGoalText: parsed.customGoalText?.trim() ? parsed.customGoalText.trim() : null,
      targetFrequency: parsed.targetFrequency,
      interventions: sanitizedInterventions,
      cueingLevel: parsed.cueingLevel,
      groupPreference: parsed.groupPreference,
      barriers: sanitizedBarriers,
      notes: parsed.notes?.trim() ? parsed.notes.trim() : null,
      active: parsed.active
    };

    if (parsed.planItemId) {
      const existing = await prisma.residentPlanItem.findFirst({
        where: {
          id: parsed.planItemId,
          residentId: parsed.residentId,
          resident: {
            facilityId: scoped.facilityId
          }
        }
      });
      if (!existing) {
        throw new Error("Plan item not found.");
      }

      const updated = await prisma.residentPlanItem.update({
        where: { id: parsed.planItemId },
        data: payload
      });

      await logAudit({
        facilityId: scoped.facilityId,
        actorUserId: scoped.user.id,
        action: "UPDATE",
        entityType: "ResidentPlanItem",
        entityId: updated.id,
        before: existing,
        after: updated
      });
    } else {
      const created = await prisma.residentPlanItem.create({
        data: payload
      });

      await logAudit({
        facilityId: scoped.facilityId,
        actorUserId: scoped.user.id,
        action: "CREATE",
        entityType: "ResidentPlanItem",
        entityId: created.id,
        after: created
      });
    }

    revalidatePath(`/app/residents/${parsed.residentId}`);
  }

  async function archiveResidentPlanItem(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription();
    assertWritable(scoped.role);

    const parsed = residentPlanArchiveSchema.parse({
      residentId: String(formData.get("residentId") || ""),
      planItemId: String(formData.get("planItemId") || "")
    });

    if (parsed.residentId !== params.id) {
      throw new Error("Resident mismatch for archive action.");
    }

    const existing = await prisma.residentPlanItem.findFirst({
      where: {
        id: parsed.planItemId,
        residentId: parsed.residentId,
        resident: {
          facilityId: scoped.facilityId
        }
      }
    });

    if (!existing) {
      throw new Error("Plan item not found.");
    }

    const updated = await prisma.residentPlanItem.update({
      where: { id: parsed.planItemId },
      data: { active: false }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ResidentPlanItem",
      entityId: updated.id,
      before: existing,
      after: updated
    });

    revalidatePath(`/app/residents/${parsed.residentId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{resident.firstName} {resident.lastName}</h1>
          <p className="text-sm text-muted-foreground">
            Room {resident.room} · {resident.unit?.name ?? "No unit"}
          </p>
          <p className="text-sm text-muted-foreground">Birthday: {formatBirthDate(resident.birthDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={`/app/residents/${resident.id}/care-plan`}>Care Plan</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/app/notes/one-to-one?residentId=${resident.id}`}>1:1 Notes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/residents">Back to residents</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Plan Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activePlanAreasCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Plan Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{resident.planItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes (recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{resident.progressNotes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Birthday</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{formatBirthDate(resident.birthDate)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{getNextBirthdaySummary(resident.birthDate)}</p>
          </CardContent>
        </Card>
      </section>

      <ResidentPlanSection
        residentId={resident.id}
        residentName={`${resident.firstName} ${resident.lastName}`}
        canEdit={canEditPlanAreas}
        items={resident.planItems.map((item) => ({
          id: item.id,
          planAreaKey: item.planAreaKey,
          goalTemplateId: item.goalTemplateId,
          customGoalText: item.customGoalText,
          targetFrequency: item.targetFrequency,
          interventions: item.interventions,
          cueingLevel: item.cueingLevel,
          groupPreference: item.groupPreference,
          barriers: item.barriers,
          notes: item.notes,
          active: item.active,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString()
        }))}
        savePlanItemAction={saveResidentPlanItem}
        archivePlanItemAction={archiveResidentPlanItem}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Interest & leisure assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAssessment} className="space-y-3">
              <Input name="music" placeholder="Music preferences" />
              <Input name="topics" placeholder="Topics of interest" />
              <Input name="faith" placeholder="Faith/spiritual preferences" />
              <Input name="hobbies" placeholder="Hobbies" />
              <Input name="bestTimeOfDay" placeholder="Best time of day" />
              <Textarea name="dislikesTriggers" placeholder="Dislikes / trigger notes" />
              <Button type="submit">Save assessment</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Family engagement notes</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFamilyNote} className="space-y-3">
              <Input name="bestContactTimes" placeholder="Best contact times" />
              <Input name="preferences" placeholder="Family contact preferences" />
              <Textarea name="calmingThings" placeholder="Calming things / successful techniques" />
              <Button type="submit" variant="outline">Add family note</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Assessment suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resident.assessments.length === 0 && <p className="text-sm text-muted-foreground">No assessments yet.</p>}
          {resident.assessments.map((assessment) => {
            const suggestedPrograms = Array.isArray(assessment.suggestedPrograms) ? assessment.suggestedPrograms : [];
            return (
              <div key={assessment.id} className="rounded-md border p-3">
                <p className="mb-2 text-xs text-muted-foreground">{new Date(assessment.createdAt).toLocaleString()}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrograms.map((program) => (
                    <Badge key={String(program)} variant="secondary">
                      {String(program)}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress note timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {resident.progressNotes.map((note) => (
                <li key={note.id} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()} · {note.type} · by {note.createdByUser.name}
                  </p>
                  <p className="mt-2">{note.narrative}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Barrier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resident.attendance.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{item.activityInstance.title}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.barrierReason ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
