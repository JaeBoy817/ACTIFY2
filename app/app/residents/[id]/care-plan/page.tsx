import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { z } from "zod";

import { NextReviewPopover } from "@/components/care-plan/next-review-popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateGoalProgress,
  buildQuickEvidence,
  getRiskAlerts,
  summarizeBarriers,
  toTitleCase
} from "@/lib/activities-care-plan";
import {
  activitiesFocusCategoryEnum,
  activitiesGoalTypeEnum,
  evidenceLinkSchema,
  focusDialogSchema,
  goalDialogSchema,
  interventionDialogSchema,
  reviewDialogSchema,
  statusFromReview,
  taskCompleteSchema,
  taskDialogSchema
} from "@/lib/activities-care-plan-schemas";
import { logAudit } from "@/lib/audit";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const statusEnum = z.enum(["ACTIVE", "RESOLVED", "CANCELLED"]);
const oneToOneEntrySchema = z
  .object({
    participationLevel: z.enum(["MINIMAL", "MODERATE", "HIGH"]),
    moodAffect: z.enum(["BRIGHT", "CALM", "FLAT", "ANXIOUS", "AGITATED"]),
    cuesRequired: z.enum(["NONE", "VERBAL", "VISUAL", "HAND_OVER_HAND"]),
    response: z.enum(["POSITIVE", "NEUTRAL", "RESISTANT"]),
    narrative: z.string().trim().min(10).max(4000),
    followUp: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }, z.string().max(1200).optional()),
    occurredAt: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return new Date(trimmed);
    }, z.date().optional()),
    linkTarget: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }, z.string().optional()),
    linkNote: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }, z.string().max(300).optional())
  })
  .superRefine((value, ctx) => {
    if (value.linkTarget && !/^(FOCUS|GOAL):/.test(value.linkTarget)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkTarget"],
        message: "Invalid link target."
      });
    }
  });

function toBoolean(formData: FormData, key: string) {
  const raw = formData.get(key);
  return raw === "on" || raw === "true" || raw === "1";
}

function toStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);
}

function parseEtiologyFactors(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseDaysOfWeek(values: string[]) {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

function roleCanEdit(role: string) {
  return role === "ADMIN" || role === "AD" || role === "ASSISTANT";
}

async function getWritableCarePlanContext(residentId: string) {
  const scoped = await getFacilityContextWithSubscription("carePlan");
  assertWritable(scoped.role);

  const residentScoped = await prisma.resident.findFirst({
    where: {
      id: residentId,
      facilityId: scoped.facilityId
    },
    select: { id: true }
  });

  if (!residentScoped) {
    throw new Error("Resident not found for this facility.");
  }

  const cp = await prisma.activitiesCarePlan.upsert({
    where: { residentId },
    create: { residentId, initiatedAt: new Date(), status: "ACTIVE" },
    update: {}
  });

  return { scoped, carePlanId: cp.id };
}

export default async function ResidentActivitiesCarePlanPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { tab?: string; focus?: string; focusSearch?: string; focusStatus?: string };
}) {
  const context = await getFacilityContextWithSubscription("carePlan");
  const residentId = params.id;
  const canEdit = roleCanEdit(context.role);

  const resident = await prisma.resident.findFirst({
    where: {
      id: residentId,
      facilityId: context.facilityId
    },
    include: {
      unit: true,
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!resident) {
    notFound();
  }

  const now = new Date();
  const fourteenDaysAgo = subDays(now, 14);
  const thirtyDaysAgo = subDays(now, 30);
  const sevenDaysAgo = subDays(now, 7);

  const carePlan = await prisma.activitiesCarePlan.upsert({
    where: { residentId },
    create: {
      residentId,
      initiatedAt: now,
      status: "ACTIVE"
    },
    update: {}
  });

  const [
    focuses,
    reviews,
    recentAttendance,
    recentNotes,
    auditRows,
    allAttendanceForResident,
    allProgressNotesForResident,
    oneToOneNotes,
    progressNoteEvidenceLinks
  ] = await Promise.all([
    prisma.activitiesCarePlanFocus.findMany({
      where: { carePlanId: carePlan.id },
      include: {
        goals: {
          include: {
            evidenceLinks: true,
            interventions: {
              include: {
                tasks: {
                  include: {
                    completions: {
                      orderBy: { completedAt: "desc" },
                      take: 1
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        interventions: {
          include: {
            tasks: {
              include: {
                completions: {
                  orderBy: { completedAt: "desc" },
                  take: 1
                }
              },
              orderBy: { createdAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        evidenceLinks: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.activitiesCarePlanReview.findMany({
      where: { carePlanId: carePlan.id },
      orderBy: { startedAt: "desc" }
    }),
    prisma.attendance.findMany({
      where: {
        residentId,
        createdAt: { gte: fourteenDaysAgo }
      },
      include: { activityInstance: { select: { title: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.progressNote.findMany({
      where: {
        residentId,
        createdAt: { gte: fourteenDaysAgo }
      },
      include: { activityInstance: { select: { title: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.auditLog.findMany({
      where: {
        facilityId: context.facilityId,
        OR: [
          { entityType: { startsWith: "ActivitiesCarePlan" } },
          { entityType: "ActivitiesCarePlanFocus" },
          { entityType: "ActivitiesCarePlanGoal" },
          { entityType: "ActivitiesCarePlanIntervention" },
          { entityType: "ActivitiesCarePlanTask" },
          { entityType: "ActivitiesCarePlanEvidenceLink" },
          { entityType: "ActivitiesCarePlanReview" }
        ]
      },
      include: {
        actorUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    prisma.attendance.findMany({
      where: { residentId },
      include: { activityInstance: { select: { title: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.progressNote.findMany({
      where: { residentId },
      include: { activityInstance: { select: { title: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.progressNote.findMany({
      where: { residentId, type: "ONE_TO_ONE" },
      include: {
        createdByUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.activitiesCarePlanEvidenceLink.findMany({
      where: {
        residentId,
        evidenceType: "PROGRESS_NOTE",
        progressNoteId: {
          not: null
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const attendanceById = new Map(allAttendanceForResident.map((row) => [row.id, row]));
  const progressNoteById = new Map(allProgressNotesForResident.map((row) => [row.id, row]));
  const focusById = new Map(focuses.map((focus) => [focus.id, focus]));
  const goalById = new Map(focuses.flatMap((focus) => focus.goals.map((goal) => [goal.id, goal] as const)));

  const noteEvidenceByProgressNoteId = new Map<string, (typeof progressNoteEvidenceLinks)[number]>();
  for (const link of progressNoteEvidenceLinks) {
    if (!link.progressNoteId) continue;
    if (!noteEvidenceByProgressNoteId.has(link.progressNoteId)) {
      noteEvidenceByProgressNoteId.set(link.progressNoteId, link);
    }
  }

  const selectedTab = searchParams?.tab ?? "overview";
  const focusSearch = (searchParams?.focusSearch ?? "").toLowerCase().trim();
  const focusStatus = (searchParams?.focusStatus ?? "ALL").toUpperCase();

  const filteredFocuses = focuses.filter((focus) => {
    const matchesSearch =
      !focusSearch ||
      focus.title.toLowerCase().includes(focusSearch) ||
      toTitleCase(focus.category).toLowerCase().includes(focusSearch);
    const matchesStatus = focusStatus === "ALL" || focus.status === focusStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedFocus =
    filteredFocuses.find((item) => item.id === searchParams?.focus) ?? filteredFocuses[0] ?? null;

  const allGoals = focuses.flatMap((focus) => focus.goals);
  const goalProgress = allGoals.map((goal) => {
    const progress = calculateGoalProgress(goal, goal.evidenceLinks, attendanceById);
    return {
      goal,
      ...progress,
      atRisk: progress.percent < 45
    };
  });

  const goalsOnTrackCount = goalProgress.filter((item) => !item.atRisk).length;
  const goalsAtRiskCount = goalProgress.filter((item) => item.atRisk).length;

  const linkedAttendanceIds = focuses.flatMap((focus) => [
    ...focus.evidenceLinks.map((link) => link.attendanceId).filter(Boolean),
    ...focus.goals.flatMap((goal) => goal.evidenceLinks.map((link) => link.attendanceId).filter(Boolean))
  ]) as string[];

  const barrierRowsSource = linkedAttendanceIds.length
    ? linkedAttendanceIds
        .map((id) => attendanceById.get(id))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
    : allAttendanceForResident.filter((row) => row.createdAt >= thirtyDaysAgo);

  const barrierSummary = Object.entries(summarizeBarriers(barrierRowsSource)).sort((a, b) => b[1] - a[1]);

  const quickEvidenceRows = buildQuickEvidence(recentAttendance, recentNotes).slice(0, 20);

  const recentForAlerts = allAttendanceForResident.filter((row) => row.createdAt >= sevenDaysAgo);
  const alerts = getRiskAlerts({
    recentAttendance: recentForAlerts,
    activeResidentCount: resident.isActive ? 1 : 0
  });

  const latestAssessment = resident.assessments[0];
  const assessmentAnswers =
    latestAssessment && latestAssessment.answers && typeof latestAssessment.answers === "object"
      ? (latestAssessment.answers as Record<string, string | undefined>)
      : {};

  const topPreferences = {
    bestTimesOfDay: resident.bestTimesOfDay || assessmentAnswers.bestTimeOfDay || "Not set",
    likes: [assessmentAnswers.music, assessmentAnswers.topics, assessmentAnswers.hobbies, assessmentAnswers.faith]
      .filter(Boolean)
      .join(" • ") || "Not set",
    dislikes: latestAssessment?.dislikesTriggers || resident.notes || "Not set"
  };

  const flattenTasks = selectedFocus
    ? selectedFocus.interventions.flatMap((intervention) =>
        intervention.tasks.map((task) => ({
          ...task,
          interventionTitle: intervention.title
        }))
      )
    : [];

  const lastUpdatedSource = [carePlan.updatedAt, ...focuses.map((focus) => focus.updatedAt), ...reviews.map((review) => review.updatedAt)]
    .sort((a, b) => b.getTime() - a.getTime())[0];

  async function setNextReviewDateAction(formData: FormData) {
    "use server";

    const scoped = await getFacilityContextWithSubscription("carePlan");
    assertWritable(scoped.role);

    const residentScoped = await prisma.resident.findFirst({
      where: {
        id: residentId,
        facilityId: scoped.facilityId
      },
      select: { id: true }
    });

    if (!residentScoped) {
      throw new Error("Resident not found for this facility.");
    }

    const nextReviewAtRaw = String(formData.get("nextReviewAt") || "").trim();

    const before = await prisma.activitiesCarePlan.findUnique({ where: { residentId } });

    const updated = await prisma.activitiesCarePlan.upsert({
      where: { residentId },
      create: {
        residentId,
        initiatedAt: new Date(),
        status: "ACTIVE",
        nextReviewAt: nextReviewAtRaw ? new Date(nextReviewAtRaw) : null
      },
      update: {
        nextReviewAt: nextReviewAtRaw ? new Date(nextReviewAtRaw) : null
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivitiesCarePlan",
      entityId: updated.id,
      before,
      after: updated
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function updateResidentPreferences(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);

    const bestTimesOfDay = String(formData.get("bestTimesOfDay") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    const before = await prisma.resident.findUnique({ where: { id: residentId } });

    const updated = await prisma.resident.update({
      where: { id: residentId },
      data: {
        bestTimesOfDay: bestTimesOfDay || null,
        notes: notes || null
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "Resident",
      entityId: residentId,
      before,
      after: updated
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function createFocus(formData: FormData) {
    "use server";

    const { scoped, carePlanId } = await getWritableCarePlanContext(residentId);

    const parsed = focusDialogSchema.parse({
      title: formData.get("title"),
      category: formData.get("category"),
      etiologyFactors: parseEtiologyFactors(String(formData.get("etiologyFactors") || "")),
      baselineNarrative: formData.get("baselineNarrative"),
      strengths: formData.get("strengths"),
      preferences: formData.get("preferences"),
      barriersNotes: formData.get("barriersNotes"),
      initiatedAt: formData.get("initiatedAt"),
      nextReviewAt: formData.get("nextReviewAt"),
      status: formData.get("status"),
      statusReason: formData.get("statusReason")
    });

    const focus = await prisma.activitiesCarePlanFocus.create({
      data: {
        carePlanId,
        residentId,
        title: parsed.title,
        category: parsed.category,
        etiologyFactors: parsed.etiologyFactors,
        baselineNarrative: parsed.baselineNarrative,
        strengths: parsed.strengths,
        preferences: parsed.preferences,
        barriersNotes: parsed.barriersNotes,
        initiatedAt: parsed.initiatedAt,
        nextReviewAt: parsed.nextReviewAt,
        status: parsed.status,
        statusReason: parsed.statusReason,
        createdByUserId: scoped.user.id,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivitiesCarePlanFocus",
      entityId: focus.id,
      after: focus
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function updateFocus(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const focusId = String(formData.get("focusId") || "");

    const existing = await prisma.activitiesCarePlanFocus.findFirst({
      where: { id: focusId, residentId }
    });
    if (!existing) return;

    const parsed = focusDialogSchema.parse({
      title: formData.get("title"),
      category: formData.get("category"),
      etiologyFactors: parseEtiologyFactors(String(formData.get("etiologyFactors") || "")),
      baselineNarrative: formData.get("baselineNarrative"),
      strengths: formData.get("strengths"),
      preferences: formData.get("preferences"),
      barriersNotes: formData.get("barriersNotes"),
      initiatedAt: formData.get("initiatedAt"),
      nextReviewAt: formData.get("nextReviewAt"),
      status: formData.get("status"),
      statusReason: formData.get("statusReason")
    });

    const updated = await prisma.activitiesCarePlanFocus.update({
      where: { id: focusId },
      data: {
        title: parsed.title,
        category: parsed.category,
        etiologyFactors: parsed.etiologyFactors,
        baselineNarrative: parsed.baselineNarrative,
        strengths: parsed.strengths,
        preferences: parsed.preferences,
        barriersNotes: parsed.barriersNotes,
        initiatedAt: parsed.initiatedAt,
        nextReviewAt: parsed.nextReviewAt,
        status: parsed.status,
        statusReason: parsed.statusReason,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivitiesCarePlanFocus",
      entityId: focusId,
      before: existing,
      after: updated
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function deleteFocus(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const focusId = String(formData.get("focusId") || "");

    const existing = await prisma.activitiesCarePlanFocus.findFirst({
      where: { id: focusId, residentId }
    });
    if (!existing) return;

    await prisma.activitiesCarePlanFocus.delete({ where: { id: focusId } });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ActivitiesCarePlanFocus",
      entityId: focusId,
      before: existing
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function createGoal(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);

    const parsed = goalDialogSchema.parse({
      focusId: formData.get("focusId"),
      type: formData.get("type"),
      statement: formData.get("statement"),
      measurementMethod: formData.get("measurementMethod"),
      targetValue: formData.get("targetValue"),
      targetUnit: formData.get("targetUnit") || undefined,
      startAt: formData.get("startAt"),
      targetAt: formData.get("targetAt"),
      reviewFrequencyDays: formData.get("reviewFrequencyDays"),
      residentParticipated: toBoolean(formData, "residentParticipated"),
      notes: formData.get("notes"),
      status: formData.get("status") || "ACTIVE",
      statusReason: formData.get("statusReason")
    });

    const focus = await prisma.activitiesCarePlanFocus.findFirst({
      where: { id: parsed.focusId, residentId },
      select: { id: true }
    });
    if (!focus) return;

    const goal = await prisma.activitiesCarePlanGoal.create({
      data: {
        focusId: focus.id,
        residentId,
        type: parsed.type,
        statement: parsed.statement,
        measurementMethod: parsed.measurementMethod,
        targetValue: parsed.targetValue,
        targetUnit: parsed.targetUnit,
        startAt: parsed.startAt,
        targetAt: parsed.targetAt,
        reviewFrequencyDays: parsed.reviewFrequencyDays,
        residentParticipated: parsed.residentParticipated,
        notes: parsed.notes,
        status: parsed.status,
        statusReason: parsed.statusReason,
        createdByUserId: scoped.user.id,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivitiesCarePlanGoal",
      entityId: goal.id,
      after: goal
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function updateGoal(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const goalId = String(formData.get("goalId") || "");

    const existing = await prisma.activitiesCarePlanGoal.findFirst({
      where: { id: goalId, residentId }
    });
    if (!existing) return;

    const parsed = goalDialogSchema.parse({
      focusId: formData.get("focusId"),
      type: formData.get("type"),
      statement: formData.get("statement"),
      measurementMethod: formData.get("measurementMethod"),
      targetValue: formData.get("targetValue"),
      targetUnit: formData.get("targetUnit") || undefined,
      startAt: formData.get("startAt"),
      targetAt: formData.get("targetAt"),
      reviewFrequencyDays: formData.get("reviewFrequencyDays"),
      residentParticipated: toBoolean(formData, "residentParticipated"),
      notes: formData.get("notes"),
      status: formData.get("status") || "ACTIVE",
      statusReason: formData.get("statusReason")
    });

    const updated = await prisma.activitiesCarePlanGoal.update({
      where: { id: goalId },
      data: {
        focusId: parsed.focusId,
        type: parsed.type,
        statement: parsed.statement,
        measurementMethod: parsed.measurementMethod,
        targetValue: parsed.targetValue,
        targetUnit: parsed.targetUnit,
        startAt: parsed.startAt,
        targetAt: parsed.targetAt,
        reviewFrequencyDays: parsed.reviewFrequencyDays,
        residentParticipated: parsed.residentParticipated,
        notes: parsed.notes,
        status: parsed.status,
        statusReason: parsed.statusReason,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivitiesCarePlanGoal",
      entityId: goalId,
      before: existing,
      after: updated
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function deleteGoal(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const goalId = String(formData.get("goalId") || "");

    const existing = await prisma.activitiesCarePlanGoal.findFirst({
      where: { id: goalId, residentId }
    });
    if (!existing) return;

    await prisma.activitiesCarePlanGoal.delete({ where: { id: goalId } });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ActivitiesCarePlanGoal",
      entityId: goalId,
      before: existing
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function createIntervention(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);

    const parsed = interventionDialogSchema.parse({
      focusId: formData.get("focusId"),
      goalId: formData.get("goalId"),
      title: formData.get("title"),
      personalizedApproach: formData.get("personalizedApproach"),
      frequencyType: formData.get("frequencyType"),
      frequencyValue: formData.get("frequencyValue"),
      responsibleRole: formData.get("responsibleRole"),
      notificationMethod: formData.get("notificationMethod"),
      transportRequired: toBoolean(formData, "transportRequired"),
      transportDetails: formData.get("transportDetails"),
      bedBoundEnabled: toBoolean(formData, "bedBoundEnabled"),
      bedBoundText: formData.get("bedBoundText"),
      dementiaFriendlyEnabled: toBoolean(formData, "dementiaFriendlyEnabled"),
      dementiaFriendlyText: formData.get("dementiaFriendlyText"),
      lowVisionHearingEnabled: toBoolean(formData, "lowVisionHearingEnabled"),
      lowVisionHearingText: formData.get("lowVisionHearingText"),
      oneToOneMiniEnabled: toBoolean(formData, "oneToOneMiniEnabled"),
      oneToOneMiniText: formData.get("oneToOneMiniText"),
      suppliesNeeded: formData.get("suppliesNeeded"),
      isActive: toBoolean(formData, "isActive"),
      status: formData.get("status") || "ACTIVE",
      statusReason: formData.get("statusReason")
    });

    const focus = await prisma.activitiesCarePlanFocus.findFirst({
      where: { id: parsed.focusId, residentId },
      select: { id: true }
    });
    if (!focus) return;

    const intervention = await prisma.activitiesCarePlanIntervention.create({
      data: {
        focusId: focus.id,
        residentId,
        goalId: parsed.goalId || null,
        title: parsed.title,
        personalizedApproach: parsed.personalizedApproach,
        frequencyType: parsed.frequencyType,
        frequencyValue: parsed.frequencyValue,
        responsibleRole: parsed.responsibleRole,
        notificationMethod: parsed.notificationMethod,
        transportRequired: parsed.transportRequired,
        transportDetails: parsed.transportDetails,
        bedBoundEnabled: parsed.bedBoundEnabled,
        bedBoundText: parsed.bedBoundText,
        dementiaFriendlyEnabled: parsed.dementiaFriendlyEnabled,
        dementiaFriendlyText: parsed.dementiaFriendlyText,
        lowVisionHearingEnabled: parsed.lowVisionHearingEnabled,
        lowVisionHearingText: parsed.lowVisionHearingText,
        oneToOneMiniEnabled: parsed.oneToOneMiniEnabled,
        oneToOneMiniText: parsed.oneToOneMiniText,
        suppliesNeeded: parsed.suppliesNeeded,
        isActive: parsed.isActive,
        status: parsed.status,
        statusReason: parsed.statusReason,
        createdByUserId: scoped.user.id,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivitiesCarePlanIntervention",
      entityId: intervention.id,
      after: intervention
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function updateIntervention(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const interventionId = String(formData.get("interventionId") || "");

    const existing = await prisma.activitiesCarePlanIntervention.findFirst({
      where: { id: interventionId, residentId }
    });
    if (!existing) return;

    const parsed = interventionDialogSchema.parse({
      focusId: formData.get("focusId"),
      goalId: formData.get("goalId"),
      title: formData.get("title"),
      personalizedApproach: formData.get("personalizedApproach"),
      frequencyType: formData.get("frequencyType"),
      frequencyValue: formData.get("frequencyValue"),
      responsibleRole: formData.get("responsibleRole"),
      notificationMethod: formData.get("notificationMethod"),
      transportRequired: toBoolean(formData, "transportRequired"),
      transportDetails: formData.get("transportDetails"),
      bedBoundEnabled: toBoolean(formData, "bedBoundEnabled"),
      bedBoundText: formData.get("bedBoundText"),
      dementiaFriendlyEnabled: toBoolean(formData, "dementiaFriendlyEnabled"),
      dementiaFriendlyText: formData.get("dementiaFriendlyText"),
      lowVisionHearingEnabled: toBoolean(formData, "lowVisionHearingEnabled"),
      lowVisionHearingText: formData.get("lowVisionHearingText"),
      oneToOneMiniEnabled: toBoolean(formData, "oneToOneMiniEnabled"),
      oneToOneMiniText: formData.get("oneToOneMiniText"),
      suppliesNeeded: formData.get("suppliesNeeded"),
      isActive: toBoolean(formData, "isActive"),
      status: formData.get("status") || "ACTIVE",
      statusReason: formData.get("statusReason")
    });

    const updated = await prisma.activitiesCarePlanIntervention.update({
      where: { id: interventionId },
      data: {
        focusId: parsed.focusId,
        goalId: parsed.goalId || null,
        title: parsed.title,
        personalizedApproach: parsed.personalizedApproach,
        frequencyType: parsed.frequencyType,
        frequencyValue: parsed.frequencyValue,
        responsibleRole: parsed.responsibleRole,
        notificationMethod: parsed.notificationMethod,
        transportRequired: parsed.transportRequired,
        transportDetails: parsed.transportDetails,
        bedBoundEnabled: parsed.bedBoundEnabled,
        bedBoundText: parsed.bedBoundText,
        dementiaFriendlyEnabled: parsed.dementiaFriendlyEnabled,
        dementiaFriendlyText: parsed.dementiaFriendlyText,
        lowVisionHearingEnabled: parsed.lowVisionHearingEnabled,
        lowVisionHearingText: parsed.lowVisionHearingText,
        oneToOneMiniEnabled: parsed.oneToOneMiniEnabled,
        oneToOneMiniText: parsed.oneToOneMiniText,
        suppliesNeeded: parsed.suppliesNeeded,
        isActive: parsed.isActive,
        status: parsed.status,
        statusReason: parsed.statusReason,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivitiesCarePlanIntervention",
      entityId: interventionId,
      before: existing,
      after: updated
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function deleteIntervention(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const interventionId = String(formData.get("interventionId") || "");

    const existing = await prisma.activitiesCarePlanIntervention.findFirst({
      where: { id: interventionId, residentId }
    });
    if (!existing) return;

    await prisma.activitiesCarePlanIntervention.delete({ where: { id: interventionId } });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ActivitiesCarePlanIntervention",
      entityId: interventionId,
      before: existing
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function createTask(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);

    const parsed = taskDialogSchema.parse({
      interventionId: formData.get("interventionId"),
      name: formData.get("name"),
      assignedRole: formData.get("assignedRole"),
      scheduleType: formData.get("scheduleType"),
      dueDate: formData.get("dueDate"),
      dueTime: formData.get("dueTime"),
      daysOfWeek: parseDaysOfWeek(toStringArray(formData, "daysOfWeek")),
      active: toBoolean(formData, "active"),
      completionRequiresNote: toBoolean(formData, "completionRequiresNote")
    });

    const intervention = await prisma.activitiesCarePlanIntervention.findFirst({
      where: {
        id: parsed.interventionId,
        residentId
      },
      select: { id: true }
    });
    if (!intervention) return;

    const task = await prisma.activitiesCarePlanTask.create({
      data: {
        interventionId: intervention.id,
        name: parsed.name,
        assignedRole: parsed.assignedRole,
        scheduleType: parsed.scheduleType,
        dueDate: parsed.dueDate,
        dueTime: parsed.dueTime,
        daysOfWeek: parsed.daysOfWeek,
        active: parsed.active,
        completionRequiresNote: parsed.completionRequiresNote,
        createdByUserId: scoped.user.id,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivitiesCarePlanTask",
      entityId: task.id,
      after: task
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function updateTask(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const taskId = String(formData.get("taskId") || "");

    const existing = await prisma.activitiesCarePlanTask.findFirst({
      where: {
        id: taskId,
        intervention: {
          residentId
        }
      }
    });
    if (!existing) return;

    const parsed = taskDialogSchema.parse({
      interventionId: formData.get("interventionId"),
      name: formData.get("name"),
      assignedRole: formData.get("assignedRole"),
      scheduleType: formData.get("scheduleType"),
      dueDate: formData.get("dueDate"),
      dueTime: formData.get("dueTime"),
      daysOfWeek: parseDaysOfWeek(toStringArray(formData, "daysOfWeek")),
      active: toBoolean(formData, "active"),
      completionRequiresNote: toBoolean(formData, "completionRequiresNote")
    });

    const updated = await prisma.activitiesCarePlanTask.update({
      where: { id: taskId },
      data: {
        interventionId: parsed.interventionId,
        name: parsed.name,
        assignedRole: parsed.assignedRole,
        scheduleType: parsed.scheduleType,
        dueDate: parsed.dueDate,
        dueTime: parsed.dueTime,
        daysOfWeek: parsed.daysOfWeek,
        active: parsed.active,
        completionRequiresNote: parsed.completionRequiresNote,
        updatedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivitiesCarePlanTask",
      entityId: taskId,
      before: existing,
      after: updated
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function deleteTask(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const taskId = String(formData.get("taskId") || "");

    const existing = await prisma.activitiesCarePlanTask.findFirst({
      where: {
        id: taskId,
        intervention: {
          residentId
        }
      }
    });
    if (!existing) return;

    await prisma.activitiesCarePlanTask.delete({ where: { id: taskId } });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ActivitiesCarePlanTask",
      entityId: taskId,
      before: existing
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function completeTask(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);

    const parsed = taskCompleteSchema.parse({
      taskId: formData.get("taskId"),
      completedAt: formData.get("completedAt"),
      note: formData.get("note"),
      requiresNote: toBoolean(formData, "requiresNote")
    });

    const task = await prisma.activitiesCarePlanTask.findFirst({
      where: {
        id: parsed.taskId,
        intervention: {
          residentId
        }
      }
    });
    if (!task) return;

    const completion = await prisma.activitiesCarePlanTaskCompletion.create({
      data: {
        taskId: parsed.taskId,
        completedAt: parsed.completedAt ?? new Date(),
        note: parsed.note,
        completedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivitiesCarePlanTaskCompletion",
      entityId: completion.id,
      after: completion
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function linkEvidence(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);

    const parsed = evidenceLinkSchema.parse({
      targetType: formData.get("targetType"),
      targetId: formData.get("targetId"),
      attendanceIds: toStringArray(formData, "attendanceIds"),
      progressNoteIds: toStringArray(formData, "progressNoteIds"),
      linkNote: formData.get("linkNote")
    });

    if (parsed.targetType === "FOCUS") {
      const focus = await prisma.activitiesCarePlanFocus.findFirst({ where: { id: parsed.targetId, residentId } });
      if (!focus) return;
    } else {
      const goal = await prisma.activitiesCarePlanGoal.findFirst({ where: { id: parsed.targetId, residentId } });
      if (!goal) return;
    }

    for (const attendanceId of parsed.attendanceIds) {
      const attendance = await prisma.attendance.findFirst({ where: { id: attendanceId, residentId } });
      if (!attendance) continue;
      await prisma.activitiesCarePlanEvidenceLink.create({
        data: {
          residentId,
          evidenceType: "ATTENDANCE",
          attendanceId,
          progressNoteId: null,
          focusId: parsed.targetType === "FOCUS" ? parsed.targetId : null,
          goalId: parsed.targetType === "GOAL" ? parsed.targetId : null,
          linkNote: parsed.linkNote,
          linkedByUserId: scoped.user.id
        }
      });
    }

    for (const progressNoteId of parsed.progressNoteIds) {
      const note = await prisma.progressNote.findFirst({ where: { id: progressNoteId, residentId } });
      if (!note) continue;
      await prisma.activitiesCarePlanEvidenceLink.create({
        data: {
          residentId,
          evidenceType: "PROGRESS_NOTE",
          attendanceId: null,
          progressNoteId,
          focusId: parsed.targetType === "FOCUS" ? parsed.targetId : null,
          goalId: parsed.targetType === "GOAL" ? parsed.targetId : null,
          linkNote: parsed.linkNote,
          linkedByUserId: scoped.user.id
        }
      });
    }

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivitiesCarePlanEvidenceLink",
      entityId: parsed.targetId,
      after: {
        targetType: parsed.targetType,
        targetId: parsed.targetId,
        attendanceLinked: parsed.attendanceIds.length,
        notesLinked: parsed.progressNoteIds.length
      }
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function createOneToOneEntry(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);

    const parsed = oneToOneEntrySchema.parse({
      participationLevel: formData.get("participationLevel"),
      moodAffect: formData.get("moodAffect"),
      cuesRequired: formData.get("cuesRequired"),
      response: formData.get("response"),
      narrative: formData.get("narrative"),
      followUp: formData.get("followUp"),
      occurredAt: formData.get("occurredAt"),
      linkTarget: formData.get("linkTarget"),
      linkNote: formData.get("linkNote")
    });

    const note = await prisma.progressNote.create({
      data: {
        residentId,
        activityInstanceId: null,
        type: "ONE_TO_ONE",
        participationLevel: parsed.participationLevel,
        moodAffect: parsed.moodAffect,
        cuesRequired: parsed.cuesRequired,
        response: parsed.response,
        followUp: parsed.followUp,
        narrative: parsed.narrative,
        createdAt: parsed.occurredAt,
        createdByUserId: scoped.user.id
      }
    });

    if (parsed.linkTarget) {
      const [targetType, targetId] = parsed.linkTarget.split(":");

      if (targetType === "FOCUS") {
        const focus = await prisma.activitiesCarePlanFocus.findFirst({
          where: { id: targetId, residentId },
          select: { id: true }
        });
        if (focus) {
          await prisma.activitiesCarePlanEvidenceLink.create({
            data: {
              residentId,
              evidenceType: "PROGRESS_NOTE",
              attendanceId: null,
              progressNoteId: note.id,
              focusId: focus.id,
              goalId: null,
              linkNote: parsed.linkNote,
              linkedByUserId: scoped.user.id
            }
          });
        }
      }

      if (targetType === "GOAL") {
        const goal = await prisma.activitiesCarePlanGoal.findFirst({
          where: { id: targetId, residentId },
          select: { id: true }
        });
        if (goal) {
          await prisma.activitiesCarePlanEvidenceLink.create({
            data: {
              residentId,
              evidenceType: "PROGRESS_NOTE",
              attendanceId: null,
              progressNoteId: note.id,
              focusId: null,
              goalId: goal.id,
              linkNote: parsed.linkNote,
              linkedByUserId: scoped.user.id
            }
          });
        }
      }
    }

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ProgressNote",
      entityId: note.id,
      after: {
        type: note.type,
        participationLevel: note.participationLevel,
        moodAffect: note.moodAffect,
        cuesRequired: note.cuesRequired,
        response: note.response,
        linkedTo: parsed.linkTarget ?? null
      }
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function deleteOneToOneEntry(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const noteId = String(formData.get("noteId") || "");
    if (!noteId) return;

    const existing = await prisma.progressNote.findFirst({
      where: {
        id: noteId,
        residentId,
        type: "ONE_TO_ONE"
      }
    });

    if (!existing) return;

    await prisma.activitiesCarePlanEvidenceLink.deleteMany({
      where: {
        residentId,
        progressNoteId: noteId
      }
    });

    await prisma.progressNote.delete({
      where: { id: noteId }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "ProgressNote",
      entityId: noteId,
      before: existing
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function createReview(formData: FormData) {
    "use server";

    const { scoped, carePlanId } = await getWritableCarePlanContext(residentId);

    const parsed = reviewDialogSchema.parse({
      startedAt: formData.get("startedAt"),
      targetCompletionAt: formData.get("targetCompletionAt"),
      completionAt: formData.get("completionAt"),
      summary: formData.get("summary")
    });

    const review = await prisma.activitiesCarePlanReview.create({
      data: {
        carePlanId,
        residentId,
        startedAt: parsed.startedAt,
        targetCompletionAt: parsed.targetCompletionAt,
        completionAt: parsed.completionAt,
        status: statusFromReview(parsed.completionAt),
        summary: parsed.summary,
        createdByUserId: scoped.user.id,
        completedByUserId: parsed.completionAt ? scoped.user.id : null
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "ActivitiesCarePlanReview",
      entityId: review.id,
      after: review
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  async function markReviewComplete(formData: FormData) {
    "use server";

    const { scoped } = await getWritableCarePlanContext(residentId);
    const reviewId = String(formData.get("reviewId") || "");
    const completionAtRaw = String(formData.get("completionAt") || "");
    if (!reviewId || !completionAtRaw) return;

    const existing = await prisma.activitiesCarePlanReview.findFirst({
      where: { id: reviewId, residentId }
    });
    if (!existing) return;

    const completionAt = new Date(completionAtRaw);
    if (completionAt < existing.startedAt) {
      throw new Error("Completion date must be on or after review start date.");
    }

    const updated = await prisma.activitiesCarePlanReview.update({
      where: { id: reviewId },
      data: {
        completionAt,
        status: "COMPLETED",
        completedByUserId: scoped.user.id
      }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "ActivitiesCarePlanReview",
      entityId: reviewId,
      before: existing,
      after: updated
    });

    revalidatePath(`/app/residents/${residentId}/care-plan`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {resident.firstName} {resident.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                Room {resident.room} · {resident.unit?.name ?? "No unit"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={resident.isActive ? "secondary" : "destructive"}>{resident.isActive ? "Active" : "Inactive"}</Badge>
                <Badge variant="outline">Activity Plan</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/app/residents/${residentId}/care-plan/print`}>Print Plan</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button disabled={!canEdit}>Add Plan Area</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Add Plan Area</DialogTitle>
                    <DialogDescription>Plan Area -&gt; Goals -&gt; Support Steps -&gt; To-Dos.</DialogDescription>
                  </DialogHeader>
                  <form action={createFocus} className="space-y-3">
                    <Input name="title" placeholder="Plan area title" required minLength={3} maxLength={80} />
                    <select name="category" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="SOCIALIZATION">
                      {activitiesFocusCategoryEnum.options.map((option) => (
                        <option key={option} value={option}>{toTitleCase(option)}</option>
                      ))}
                    </select>
                    <Input name="etiologyFactors" placeholder="Contributing factors (comma separated, optional)" />
                    <Textarea name="baselineNarrative" placeholder="Current situation summary" minLength={20} maxLength={1200} required />
                    <Textarea name="strengths" placeholder="Resident strengths" maxLength={800} />
                    <Textarea name="preferences" placeholder="Likes and preferences" maxLength={800} />
                    <Textarea name="barriersNotes" placeholder="Challenge notes" maxLength={800} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input type="date" name="initiatedAt" required />
                      <Input type="date" name="nextReviewAt" />
                    </div>
                    <select name="status" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="ACTIVE">
                      {statusEnum.options.map((option) => (
                        <option key={option} value={option}>{toTitleCase(option)}</option>
                      ))}
                    </select>
                    <Textarea name="statusReason" placeholder="Reason (required if not active)" />
                    <DialogFooter>
                      <Button type="submit" disabled={!canEdit}>Save Plan Area</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!canEdit}>Add Check-In</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Check-In</DialogTitle>
                  </DialogHeader>
                  <form action={createReview} className="space-y-3">
                    <Input type="date" name="startedAt" required />
                    <Input type="date" name="targetCompletionAt" />
                    <Input type="date" name="completionAt" />
                    <Textarea name="summary" placeholder="Check-in summary" minLength={10} maxLength={800} required />
                    <DialogFooter>
                      <Button type="submit" disabled={!canEdit}>Save Check-In</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={selectedTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Summary</TabsTrigger>
          <TabsTrigger value="focuses">Plan Areas</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="oneToOne">1:1 Notes</TabsTrigger>
          <TabsTrigger value="barriers">Challenges</TabsTrigger>
          <TabsTrigger value="reviews">Check-Ins &amp; History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Plan Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Plan started: {carePlan.initiatedAt.toLocaleDateString()}</p>
                <p>Next check-in: {carePlan.nextReviewAt ? carePlan.nextReviewAt.toLocaleDateString() : "Not set"}</p>
                <p>Last updated: {lastUpdatedSource?.toLocaleString() ?? "-"}</p>
                <p>Active plan areas: {focuses.filter((focus) => focus.status === "ACTIVE").length}</p>
                <p>Goals on track: {goalsOnTrackCount}</p>
                <p>Goals need attention: {goalsAtRiskCount}</p>
                <div className="pt-2">
                  <NextReviewPopover currentDate={carePlan.nextReviewAt} setNextReviewDateAction={setNextReviewDateAction} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resident Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-medium">Best times:</span> {topPreferences.bestTimesOfDay}</p>
                <p><span className="font-medium">Likes:</span> {topPreferences.likes}</p>
                <p><span className="font-medium">Dislikes/Triggers:</span> {topPreferences.dislikes}</p>
                <details>
                  <summary className="cursor-pointer text-primary">Edit preferences</summary>
                  <form action={updateResidentPreferences} className="mt-3 space-y-2">
                    <Input name="bestTimesOfDay" placeholder="Best times of day" defaultValue={resident.bestTimesOfDay ?? ""} />
                    <Textarea name="notes" placeholder="Preferences / dislikes / trigger notes" defaultValue={resident.notes ?? ""} />
                    <Button type="submit" size="sm" disabled={!canEdit}>Save Preferences</Button>
                  </form>
                </details>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity (Last 14 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Activity or Note</TableHead>
                      <TableHead>Entry Type</TableHead>
                      <TableHead>Participation</TableHead>
                      <TableHead>Challenge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quickEvidenceRows.map((row) => (
                      <Dialog key={row.id}>
                        <DialogTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/40">
                            <TableCell>{row.date.toLocaleDateString()}</TableCell>
                            <TableCell>{row.label}</TableCell>
                            <TableCell>{row.source === "ATTENDANCE" ? "Attendance" : "Note"}</TableCell>
                            <TableCell>{String(row.engagement)}</TableCell>
                            <TableCell>{row.barrier ? toTitleCase(row.barrier) : "-"}</TableCell>
                          </TableRow>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                          <DialogHeader>
                            <DialogTitle>Entry Details</DialogTitle>
                            <DialogDescription>{row.date.toLocaleString()}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Source type:</span> {row.source}</p>
                            <p><span className="font-medium">Activity/Note:</span> {row.label}</p>
                            <p><span className="font-medium">Type:</span> {String(row.type)}</p>
                            <p><span className="font-medium">Challenge:</span> {row.barrier ? toTitleCase(row.barrier) : "None"}</p>
                            <p><span className="font-medium">Notes:</span> {row.note || "-"}</p>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attention Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.title} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                    <div className="mt-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`#${alert.action === "ADD_INTERVENTION" ? "add-intervention" : "adjust-schedule"}`}>
                          {alert.action === "ADD_INTERVENTION" ? "Add Support Step" : "Adjust Time"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="focuses" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Plan Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form className="space-y-2" method="GET">
                  <input type="hidden" name="tab" value="focuses" />
                  <Input name="focusSearch" placeholder="Search plan area" defaultValue={searchParams?.focusSearch ?? ""} />
                  <select name="focusStatus" defaultValue={focusStatus} className="h-10 w-full rounded-md border px-3 text-sm">
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <Button type="submit" size="sm" variant="outline">Apply filters</Button>
                </form>

                <div className="space-y-2">
                  {filteredFocuses.map((focus) => {
                    const isSelected = selectedFocus?.id === focus.id;
                    const lastEvidenceDate = [
                      ...focus.evidenceLinks.map((row) => row.createdAt),
                      ...focus.goals.flatMap((goal) => goal.evidenceLinks.map((row) => row.createdAt))
                    ]
                      .sort((a, b) => b.getTime() - a.getTime())[0];

                    return (
                      <Link
                        key={focus.id}
                        href={`/app/residents/${residentId}/care-plan?tab=focuses&focus=${focus.id}&focusSearch=${encodeURIComponent(searchParams?.focusSearch ?? "")}&focusStatus=${focusStatus}`}
                        className={`block rounded-md border p-3 ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{focus.title}</p>
                          <Badge variant={focus.status === "ACTIVE" ? "secondary" : "outline"}>{toTitleCase(focus.status)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{toTitleCase(focus.category)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Goals: {focus.goals.length} · Last activity: {lastEvidenceDate ? lastEvidenceDate.toLocaleDateString() : "none yet"}
                        </p>
                      </Link>
                    );
                  })}
                  {filteredFocuses.length === 0 ? <p className="text-sm text-muted-foreground">No plan areas match current filters.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Area Details</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedFocus ? (
                  <p className="text-sm text-muted-foreground">Select a plan area to view details.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{selectedFocus.title}</p>
                        <p className="text-xs text-muted-foreground">{toTitleCase(selectedFocus.category)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateFocus} className="flex items-center gap-2">
                          <input type="hidden" name="focusId" value={selectedFocus.id} />
                          <input type="hidden" name="title" value={selectedFocus.title} />
                          <input type="hidden" name="category" value={selectedFocus.category} />
                          <input type="hidden" name="etiologyFactors" value={Array.isArray(selectedFocus.etiologyFactors) ? selectedFocus.etiologyFactors.join(",") : ""} />
                          <input type="hidden" name="baselineNarrative" value={selectedFocus.baselineNarrative} />
                          <input type="hidden" name="strengths" value={selectedFocus.strengths ?? ""} />
                          <input type="hidden" name="preferences" value={selectedFocus.preferences ?? ""} />
                          <input type="hidden" name="barriersNotes" value={selectedFocus.barriersNotes ?? ""} />
                          <input type="hidden" name="initiatedAt" value={selectedFocus.initiatedAt.toISOString()} />
                          <input type="hidden" name="nextReviewAt" value={selectedFocus.nextReviewAt?.toISOString() ?? ""} />
                          <select name="status" defaultValue={selectedFocus.status} className="h-9 rounded-md border px-2 text-xs">
                            {statusEnum.options.map((option) => (
                              <option key={option} value={option}>{toTitleCase(option)}</option>
                            ))}
                          </select>
                          <Input name="statusReason" defaultValue={selectedFocus.statusReason ?? ""} placeholder="Reason if closed" className="h-9 w-44" />
                          <Button size="sm" variant="outline" type="submit" disabled={!canEdit}>Update</Button>
                        </form>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" disabled={!canEdit}>Add Goal</Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Add Goal</DialogTitle>
                            </DialogHeader>
                            <form action={createGoal} className="space-y-3">
                              <input type="hidden" name="focusId" value={selectedFocus.id} />
                              <select name="type" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="SOCIALIZATION">
                                {activitiesGoalTypeEnum.options.map((option) => (
                                  <option key={option} value={option}>{toTitleCase(option)}</option>
                                ))}
                              </select>
                              <Textarea name="statement" placeholder="Goal statement" minLength={10} maxLength={500} required />
                              <select name="measurementMethod" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="ATTENDANCE_COUNT">
                                <option value="ATTENDANCE_COUNT">Attendance Count</option>
                                <option value="MINUTES_ENGAGED">Minutes Engaged</option>
                                <option value="ENGAGEMENT_SCORE_AVG">Engagement Score Avg</option>
                                <option value="RESIDENT_REPORTED_SATISFACTION">Resident Reported Satisfaction</option>
                                <option value="REFUSAL_REDUCTION">Refusal Reduction</option>
                              </select>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Input type="number" name="targetValue" placeholder="Target value" min={1} />
                                <select name="targetUnit" className="h-10 w-full rounded-md border px-3 text-sm">
                                  <option value="">Target unit</option>
                                  <option value="PER_WEEK">Per Week</option>
                                  <option value="PER_MONTH">Per Month</option>
                                  <option value="MINUTES">Minutes</option>
                                  <option value="SCORE">Score</option>
                                  <option value="POINTS">Points</option>
                                  <option value="COUNT">Count</option>
                                </select>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Input type="date" name="startAt" required />
                                <Input type="date" name="targetAt" required />
                              </div>
                              <Input type="number" name="reviewFrequencyDays" min={7} max={180} placeholder="Check in every X days" />
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={false} disabled />
                                <input type="checkbox" name="residentParticipated" defaultChecked className="h-4 w-4" /> Resident helped choose this goal
                              </label>
                              <Textarea name="notes" placeholder="Notes" maxLength={800} />
                              <select name="status" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="ACTIVE">
                                {statusEnum.options.map((option) => (
                                  <option key={option} value={option}>{toTitleCase(option)}</option>
                                ))}
                              </select>
                              <Textarea name="statusReason" placeholder="Reason (required when not active)" />
                              <DialogFooter>
                                <Button type="submit" disabled={!canEdit}>Save Goal</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" id="add-intervention" disabled={!canEdit}>Add Support Step</Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Add Support Step</DialogTitle>
                            </DialogHeader>
                            <form action={createIntervention} className="space-y-3">
                              <input type="hidden" name="focusId" value={selectedFocus.id} />
                              <select name="goalId" className="h-10 w-full rounded-md border px-3 text-sm">
                                <option value="">No specific goal</option>
                                {selectedFocus.goals.map((goal) => (
                                  <option key={goal.id} value={goal.id}>{goal.statement.slice(0, 80)}</option>
                                ))}
                              </select>
                              <Input name="title" placeholder="Support step title" minLength={3} maxLength={80} required />
                              <Textarea name="personalizedApproach" placeholder="What staff should do" minLength={20} maxLength={2000} required />
                              <div className="grid gap-3 sm:grid-cols-2">
                                <select name="frequencyType" className="h-10 rounded-md border px-3 text-sm" defaultValue="DAILY">
                                  <option value="DAILY">Daily</option>
                                  <option value="WEEKLY">Weekly</option>
                                  <option value="PRN">PRN</option>
                                </select>
                                <Input type="number" name="frequencyValue" placeholder="Times per week (1-7)" min={1} max={7} />
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <select name="responsibleRole" className="h-10 rounded-md border px-3 text-sm" defaultValue="AD">
                                  <option value="AD">AD</option>
                                  <option value="ASSISTANT">Assistant</option>
                                  <option value="VOLUNTEER">Volunteer</option>
                                  <option value="NURSING_ASSIST">Nursing Assist</option>
                                  <option value="OTHER">Other</option>
                                </select>
                                <select name="notificationMethod" className="h-10 rounded-md border px-3 text-sm" defaultValue="VERBAL">
                                  <option value="POSTED">Posted</option>
                                  <option value="VERBAL">Verbal</option>
                                  <option value="PRINT_INVITE">Print Invite</option>
                                  <option value="FAMILY">Family</option>
                                  <option value="OTHER">Other</option>
                                </select>
                              </div>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="transportRequired" className="h-4 w-4" />
                                Needs transport
                              </label>
                              <Textarea name="transportDetails" placeholder="Transport details (required if checked)" />

                              <div className="rounded-md border p-3">
                                <p className="mb-2 text-sm font-medium">Optional adjustments</p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <label className="text-sm"><input type="checkbox" name="bedBoundEnabled" className="mr-2 h-4 w-4" />Bed-bound option</label>
                                  <label className="text-sm"><input type="checkbox" name="dementiaFriendlyEnabled" className="mr-2 h-4 w-4" />Dementia-friendly option</label>
                                  <label className="text-sm"><input type="checkbox" name="lowVisionHearingEnabled" className="mr-2 h-4 w-4" />Low vision/hearing option</label>
                                  <label className="text-sm"><input type="checkbox" name="oneToOneMiniEnabled" className="mr-2 h-4 w-4" />1:1 mini option</label>
                                </div>
                                <Textarea name="bedBoundText" placeholder="Bed-bound instructions" className="mt-2" />
                                <Textarea name="dementiaFriendlyText" placeholder="Dementia-friendly instructions" className="mt-2" />
                                <Textarea name="lowVisionHearingText" placeholder="Low vision/hearing instructions" className="mt-2" />
                                <Textarea name="oneToOneMiniText" placeholder="1:1 mini instructions" className="mt-2" />
                              </div>

                              <Textarea name="suppliesNeeded" placeholder="Supplies needed (optional)" />
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" /> Support step active
                              </label>
                              <select name="status" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="ACTIVE">
                                {statusEnum.options.map((option) => (
                                  <option key={option} value={option}>{toTitleCase(option)}</option>
                                ))}
                              </select>
                              <Textarea name="statusReason" placeholder="Reason (required when not active)" />
                              <DialogFooter>
                                <Button type="submit" disabled={!canEdit}>Save Support Step</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <Accordion type="multiple" defaultValue={["summary", "goals", "interventions", "tasks", "evidence"]}>
                      <AccordionItem value="summary">
                        <AccordionTrigger>Plan Area Summary</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Contributing factors:</span> {Array.isArray(selectedFocus.etiologyFactors) && selectedFocus.etiologyFactors.length > 0 ? selectedFocus.etiologyFactors.join(", ") : "None"}</p>
                            <p><span className="font-medium">Current situation:</span> {selectedFocus.baselineNarrative}</p>
                            <p><span className="font-medium">Strengths:</span> {selectedFocus.strengths || "-"}</p>
                            <p><span className="font-medium">Preferences:</span> {selectedFocus.preferences || "-"}</p>
                            <p><span className="font-medium">Best times:</span> {resident.bestTimesOfDay || "-"}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="goals">
                        <AccordionTrigger>Goals</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {selectedFocus.goals.length === 0 ? <p className="text-sm text-muted-foreground">No goals yet.</p> : null}
                            {selectedFocus.goals.map((goal) => {
                              const progress = calculateGoalProgress(goal, goal.evidenceLinks, attendanceById);

                              return (
                                <Card key={goal.id}>
                                  <CardContent className="pt-4">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="flex flex-wrap gap-2">
                                          <Badge variant="outline">{toTitleCase(goal.type)}</Badge>
                                          <Badge variant={goal.status === "ACTIVE" ? "secondary" : "outline"}>{toTitleCase(goal.status)}</Badge>
                                        </div>
                                        <p className="mt-2 text-sm font-medium">{goal.statement}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {toTitleCase(goal.measurementMethod)} · Target {goal.targetValue ?? "-"} {goal.targetUnit ? toTitleCase(goal.targetUnit) : ""}
                                        </p>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button size="sm" variant="outline">Actions</Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Goal Actions</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Edit Goal</DropdownMenuItem>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                                              <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
                                              <form action={updateGoal} className="space-y-3">
                                                <input type="hidden" name="goalId" value={goal.id} />
                                                <input type="hidden" name="focusId" value={selectedFocus.id} />
                                                <select name="type" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={goal.type}>
                                                  {activitiesGoalTypeEnum.options.map((option) => (
                                                    <option key={option} value={option}>{toTitleCase(option)}</option>
                                                  ))}
                                                </select>
                                                <Textarea name="statement" defaultValue={goal.statement} required minLength={10} maxLength={500} />
                                                <select name="measurementMethod" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={goal.measurementMethod}>
                                                  <option value="ATTENDANCE_COUNT">Attendance Count</option>
                                                  <option value="MINUTES_ENGAGED">Minutes Engaged</option>
                                                  <option value="ENGAGEMENT_SCORE_AVG">Engagement Score Avg</option>
                                                  <option value="RESIDENT_REPORTED_SATISFACTION">Resident Reported Satisfaction</option>
                                                  <option value="REFUSAL_REDUCTION">Refusal Reduction</option>
                                                </select>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                  <Input type="number" name="targetValue" defaultValue={goal.targetValue ?? ""} min={1} />
                                                  <select name="targetUnit" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={goal.targetUnit ?? ""}>
                                                    <option value="">Target unit</option>
                                                    <option value="PER_WEEK">Per Week</option>
                                                    <option value="PER_MONTH">Per Month</option>
                                                    <option value="MINUTES">Minutes</option>
                                                    <option value="SCORE">Score</option>
                                                    <option value="POINTS">Points</option>
                                                    <option value="COUNT">Count</option>
                                                  </select>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                  <Input type="date" name="startAt" defaultValue={goal.startAt.toISOString().slice(0, 10)} required />
                                                  <Input type="date" name="targetAt" defaultValue={goal.targetAt.toISOString().slice(0, 10)} required />
                                                </div>
                                                <Input type="number" name="reviewFrequencyDays" defaultValue={goal.reviewFrequencyDays ?? ""} min={7} max={180} />
                                                <label className="flex items-center gap-2 text-sm">
                                                  <input type="checkbox" name="residentParticipated" defaultChecked={goal.residentParticipated} className="h-4 w-4" />
                                                  Resident participated
                                                </label>
                                                <Textarea name="notes" defaultValue={goal.notes ?? ""} maxLength={800} />
                                                <select name="status" defaultValue={goal.status} className="h-10 w-full rounded-md border px-3 text-sm">
                                                  {statusEnum.options.map((option) => (
                                                    <option key={option} value={option}>{toTitleCase(option)}</option>
                                                  ))}
                                                </select>
                                                <Textarea name="statusReason" defaultValue={goal.statusReason ?? ""} />
                                                <DialogFooter>
                                                  <Button type="submit" disabled={!canEdit}>Save</Button>
                                                </DialogFooter>
                                              </form>
                                            </DialogContent>
                                          </Dialog>

                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Link Activity/Notes</DropdownMenuItem>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
                                              <DialogHeader><DialogTitle>Link Activity/Notes to Goal</DialogTitle></DialogHeader>
                                              <form action={linkEvidence} className="space-y-4">
                                                <input type="hidden" name="targetType" value="GOAL" />
                                                <input type="hidden" name="targetId" value={goal.id} />

                                                <div>
                                                  <p className="mb-2 text-sm font-medium">Attendance</p>
                                                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                                                    {allAttendanceForResident.slice(0, 60).map((attendance) => (
                                                      <label key={attendance.id} className="flex items-center gap-2 text-xs">
                                                        <input type="checkbox" name="attendanceIds" value={attendance.id} className="h-3.5 w-3.5" />
                                                        {attendance.createdAt.toLocaleDateString()} · {attendance.activityInstance.title} · {attendance.status}
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>

                                                <div>
                                                  <p className="mb-2 text-sm font-medium">Progress Notes</p>
                                                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                                                    {allProgressNotesForResident.slice(0, 60).map((note) => (
                                                      <label key={note.id} className="flex items-center gap-2 text-xs">
                                                        <input type="checkbox" name="progressNoteIds" value={note.id} className="h-3.5 w-3.5" />
                                                        {note.createdAt.toLocaleDateString()} · {note.type} · {note.activityInstance?.title ?? "No activity"}
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>

                                                <Textarea name="linkNote" placeholder="Why this link? (optional)" maxLength={300} />
                                                <DialogFooter>
                                                  <Button type="submit" disabled={!canEdit}>Link Selected</Button>
                                                </DialogFooter>
                                              </form>
                                            </DialogContent>
                                          </Dialog>

                                          <form action={deleteGoal}>
                                            <input type="hidden" name="goalId" value={goal.id} />
                                            <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
                                              <button type="submit" disabled={!canEdit}>Delete Goal</button>
                                            </DropdownMenuItem>
                                          </form>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    <div className="mt-3">
                                      <div className="h-2 rounded-full bg-muted">
                                        <div className={`h-2 rounded-full ${progress.percent < 45 ? "bg-rose-500" : "bg-actifyMint"}`} style={{ width: `${Math.max(progress.percent, 4)}%` }} />
                                      </div>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        Progress {progress.percent}% · current {String(progress.current)}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="interventions">
                        <AccordionTrigger>Support Steps</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {selectedFocus.interventions.length === 0 ? <p className="text-sm text-muted-foreground">No support steps yet.</p> : null}
                            {selectedFocus.interventions.map((intervention) => (
                              <Card key={intervention.id}>
                                <CardContent className="pt-4">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-medium">{intervention.title}</p>
                                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                        <Badge variant="outline">{toTitleCase(intervention.frequencyType)}</Badge>
                                        <Badge variant="outline">{toTitleCase(intervention.responsibleRole)}</Badge>
                                        <Badge variant={intervention.isActive ? "secondary" : "outline"}>{intervention.isActive ? "Active" : "Inactive"}</Badge>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline" disabled={!canEdit}>Edit</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                                          <DialogHeader><DialogTitle>Edit Support Step</DialogTitle></DialogHeader>
                                          <form action={updateIntervention} className="space-y-3">
                                            <input type="hidden" name="interventionId" value={intervention.id} />
                                            <input type="hidden" name="focusId" value={selectedFocus.id} />
                                            <select name="goalId" defaultValue={intervention.goalId ?? ""} className="h-10 w-full rounded-md border px-3 text-sm">
                                              <option value="">No specific goal</option>
                                              {selectedFocus.goals.map((goal) => (
                                                <option key={goal.id} value={goal.id}>{goal.statement.slice(0, 80)}</option>
                                              ))}
                                            </select>
                                            <Input name="title" defaultValue={intervention.title} required />
                                            <Textarea name="personalizedApproach" defaultValue={intervention.personalizedApproach} minLength={20} maxLength={2000} required />
                                            <div className="grid gap-3 sm:grid-cols-2">
                                              <select name="frequencyType" defaultValue={intervention.frequencyType} className="h-10 rounded-md border px-3 text-sm">
                                                <option value="DAILY">Daily</option>
                                                <option value="WEEKLY">Weekly</option>
                                                <option value="PRN">PRN</option>
                                              </select>
                                              <Input type="number" name="frequencyValue" defaultValue={intervention.frequencyValue ?? ""} min={1} max={7} />
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                              <select name="responsibleRole" defaultValue={intervention.responsibleRole} className="h-10 rounded-md border px-3 text-sm">
                                                <option value="AD">AD</option>
                                                <option value="ASSISTANT">Assistant</option>
                                                <option value="VOLUNTEER">Volunteer</option>
                                                <option value="NURSING_ASSIST">Nursing Assist</option>
                                                <option value="OTHER">Other</option>
                                              </select>
                                              <select name="notificationMethod" defaultValue={intervention.notificationMethod} className="h-10 rounded-md border px-3 text-sm">
                                                <option value="POSTED">Posted</option>
                                                <option value="VERBAL">Verbal</option>
                                                <option value="PRINT_INVITE">Print Invite</option>
                                                <option value="FAMILY">Family</option>
                                                <option value="OTHER">Other</option>
                                              </select>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="transportRequired" defaultChecked={intervention.transportRequired} className="h-4 w-4" />Needs transport</label>
                                            <Textarea name="transportDetails" defaultValue={intervention.transportDetails ?? ""} />
                                            <div className="rounded-md border p-3">
                                              <p className="text-sm font-medium">Optional adjustments</p>
                                              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="bedBoundEnabled" defaultChecked={intervention.bedBoundEnabled} className="h-4 w-4" />Bed-bound option</label>
                                              <Textarea name="bedBoundText" defaultValue={intervention.bedBoundText ?? ""} className="mt-2" />
                                              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="dementiaFriendlyEnabled" defaultChecked={intervention.dementiaFriendlyEnabled} className="h-4 w-4" />Dementia-friendly option</label>
                                              <Textarea name="dementiaFriendlyText" defaultValue={intervention.dementiaFriendlyText ?? ""} className="mt-2" />
                                              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="lowVisionHearingEnabled" defaultChecked={intervention.lowVisionHearingEnabled} className="h-4 w-4" />Low vision/hearing option</label>
                                              <Textarea name="lowVisionHearingText" defaultValue={intervention.lowVisionHearingText ?? ""} className="mt-2" />
                                              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="oneToOneMiniEnabled" defaultChecked={intervention.oneToOneMiniEnabled} className="h-4 w-4" />1:1 mini option</label>
                                              <Textarea name="oneToOneMiniText" defaultValue={intervention.oneToOneMiniText ?? ""} className="mt-2" />
                                            </div>
                                            <Textarea name="suppliesNeeded" defaultValue={intervention.suppliesNeeded ?? ""} />
                                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={intervention.isActive} className="h-4 w-4" />Support step active</label>
                                            <select name="status" defaultValue={intervention.status} className="h-10 w-full rounded-md border px-3 text-sm">
                                              {statusEnum.options.map((option) => (
                                                <option key={option} value={option}>{toTitleCase(option)}</option>
                                              ))}
                                            </select>
                                            <Textarea name="statusReason" defaultValue={intervention.statusReason ?? ""} />
                                            <DialogFooter>
                                              <Button type="submit" disabled={!canEdit}>Save</Button>
                                            </DialogFooter>
                                          </form>
                                        </DialogContent>
                                      </Dialog>

                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" disabled={!canEdit}>Add To-Do</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader><DialogTitle>Add To-Do</DialogTitle></DialogHeader>
                                          <form action={createTask} className="space-y-3">
                                            <input type="hidden" name="interventionId" value={intervention.id} />
                                            <Input name="name" placeholder="To-do item" minLength={3} maxLength={120} required />
                                            <select name="assignedRole" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="AD">
                                              <option value="AD">AD</option>
                                              <option value="ASSISTANT">Assistant</option>
                                              <option value="VOLUNTEER">Volunteer</option>
                                              <option value="NURSING_ASSIST">Nursing Assist</option>
                                              <option value="OTHER">Other</option>
                                            </select>
                                            <select name="scheduleType" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="PER_ACTIVITY_INSTANCE">
                                              <option value="ONE_TIME">One-time</option>
                                              <option value="DAILY">Daily</option>
                                              <option value="WEEKLY">Weekly</option>
                                              <option value="PER_ACTIVITY_INSTANCE">Each activity</option>
                                            </select>
                                            <Input type="date" name="dueDate" />
                                            <Input name="dueTime" placeholder="HH:MM" />
                                            <div className="space-y-1 rounded-md border p-2 text-sm">
                                              <p className="text-xs text-muted-foreground">Days of week (for weekly tasks)</p>
                                              <label className="mr-3 inline-flex items-center gap-2"><input type="checkbox" name="daysOfWeek" value="1" className="h-4 w-4" />Mon</label>
                                              <label className="mr-3 inline-flex items-center gap-2"><input type="checkbox" name="daysOfWeek" value="2" className="h-4 w-4" />Tue</label>
                                              <label className="mr-3 inline-flex items-center gap-2"><input type="checkbox" name="daysOfWeek" value="3" className="h-4 w-4" />Wed</label>
                                              <label className="mr-3 inline-flex items-center gap-2"><input type="checkbox" name="daysOfWeek" value="4" className="h-4 w-4" />Thu</label>
                                              <label className="mr-3 inline-flex items-center gap-2"><input type="checkbox" name="daysOfWeek" value="5" className="h-4 w-4" />Fri</label>
                                              <label className="mr-3 inline-flex items-center gap-2"><input type="checkbox" name="daysOfWeek" value="6" className="h-4 w-4" />Sat</label>
                                              <label className="mr-3 inline-flex items-center gap-2"><input type="checkbox" name="daysOfWeek" value="0" className="h-4 w-4" />Sun</label>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked className="h-4 w-4" />To-do active</label>
                                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="completionRequiresNote" className="h-4 w-4" />Completion requires note</label>
                                            <DialogFooter>
                                              <Button type="submit" disabled={!canEdit}>Save To-Do</Button>
                                            </DialogFooter>
                                          </form>
                                        </DialogContent>
                                      </Dialog>

                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline" disabled={!canEdit}>Note Change</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader><DialogTitle>Note Change</DialogTitle></DialogHeader>
                                          <form action={createReview} className="space-y-3">
                                            <Input type="date" name="startedAt" required defaultValue={new Date().toISOString().slice(0, 10)} />
                                            <Input type="date" name="targetCompletionAt" />
                                            <Textarea name="summary" defaultValue={`Support step updated: ${intervention.title}`} minLength={10} maxLength={800} required />
                                            <DialogFooter>
                                              <Button type="submit" disabled={!canEdit}>Save Adjustment</Button>
                                            </DialogFooter>
                                          </form>
                                        </DialogContent>
                                      </Dialog>

                                      <form action={deleteIntervention}>
                                        <input type="hidden" name="interventionId" value={intervention.id} />
                                        <Button type="submit" size="sm" variant="destructive" disabled={!canEdit}>Delete</Button>
                                      </form>
                                    </div>
                                  </div>

                                  <p className="mt-2 text-xs text-muted-foreground">{intervention.personalizedApproach}</p>
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                                      <span>Bed-bound</span>
                                      <Switch checked={intervention.bedBoundEnabled} disabled />
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                                      <span>Dementia-friendly</span>
                                      <Switch checked={intervention.dementiaFriendlyEnabled} disabled />
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                                      <span>Low vision/hearing</span>
                                      <Switch checked={intervention.lowVisionHearingEnabled} disabled />
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                                      <span>1:1 mini</span>
                                      <Switch checked={intervention.oneToOneMiniEnabled} disabled />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="tasks">
                        <AccordionTrigger>To-Dos</AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Task</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead>Schedule</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead>Last done</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {flattenTasks.map((task) => (
                                <TableRow key={task.id}>
                                  <TableCell>
                                    <p className="font-medium">{task.name}</p>
                                    <p className="text-xs text-muted-foreground">{task.interventionTitle}</p>
                                  </TableCell>
                                  <TableCell>{toTitleCase(task.assignedRole)}</TableCell>
                                  <TableCell>
                                    {toTitleCase(task.scheduleType)}
                                    {task.dueDate ? ` · ${task.dueDate.toLocaleDateString()}` : ""}
                                  </TableCell>
                                  <TableCell>{task.active ? "Yes" : "No"}</TableCell>
                                  <TableCell>{task.completions[0] ? task.completions[0].completedAt.toLocaleString() : "-"}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline" disabled={!canEdit}>Mark done</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader><DialogTitle>Mark To-Do Done</DialogTitle></DialogHeader>
                                          <form action={completeTask} className="space-y-3">
                                            <input type="hidden" name="taskId" value={task.id} />
                                            <input type="hidden" name="requiresNote" value={task.completionRequiresNote ? "true" : "false"} />
                                            <Input type="datetime-local" name="completedAt" defaultValue={new Date().toISOString().slice(0, 16)} />
                                            <Textarea name="note" placeholder={task.completionRequiresNote ? "Add completion note (required)" : "Optional note"} />
                                            <DialogFooter>
                                              <Button type="submit" disabled={!canEdit}>Save</Button>
                                            </DialogFooter>
                                          </form>
                                        </DialogContent>
                                      </Dialog>

                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="ghost" disabled={!canEdit}>Edit</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader><DialogTitle>Edit To-Do</DialogTitle></DialogHeader>
                                          <form action={updateTask} className="space-y-3">
                                            <input type="hidden" name="taskId" value={task.id} />
                                            <input type="hidden" name="interventionId" value={task.interventionId} />
                                            <Input name="name" defaultValue={task.name} required minLength={3} maxLength={120} />
                                            <select name="assignedRole" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={task.assignedRole}>
                                              <option value="AD">AD</option>
                                              <option value="ASSISTANT">Assistant</option>
                                              <option value="VOLUNTEER">Volunteer</option>
                                              <option value="NURSING_ASSIST">Nursing Assist</option>
                                              <option value="OTHER">Other</option>
                                            </select>
                                            <select name="scheduleType" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={task.scheduleType}>
                                              <option value="ONE_TIME">One-time</option>
                                              <option value="DAILY">Daily</option>
                                              <option value="WEEKLY">Weekly</option>
                                              <option value="PER_ACTIVITY_INSTANCE">Each activity</option>
                                            </select>
                                            <Input type="date" name="dueDate" defaultValue={task.dueDate?.toISOString().slice(0, 10) ?? ""} />
                                            <Input name="dueTime" defaultValue={task.dueTime ?? ""} />
                                            <div className="space-y-1 rounded-md border p-2 text-sm">
                                              <p className="text-xs text-muted-foreground">Days of week (weekly)</p>
                                              {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                                                <label key={dow} className="mr-3 inline-flex items-center gap-2">
                                                  <input type="checkbox" name="daysOfWeek" value={String(dow)} defaultChecked={Array.isArray(task.daysOfWeek) && task.daysOfWeek.includes(dow)} className="h-4 w-4" />
                                                  {dow === 0 ? "Sun" : ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow]}
                                                </label>
                                              ))}
                                            </div>
                                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={task.active} className="h-4 w-4" />Active</label>
                                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="completionRequiresNote" defaultChecked={task.completionRequiresNote} className="h-4 w-4" />Add completion note (required)</label>
                                            <DialogFooter>
                                              <Button type="submit" disabled={!canEdit}>Save</Button>
                                            </DialogFooter>
                                          </form>
                                        </DialogContent>
                                      </Dialog>

                                      <form action={deleteTask}>
                                        <input type="hidden" name="taskId" value={task.id} />
                                        <Button type="submit" size="sm" variant="destructive" disabled={!canEdit}>Delete</Button>
                                      </form>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="evidence">
                        <AccordionTrigger>Linked Activity/Notes</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" disabled={!canEdit}>Link more activity/notes</Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
                                <DialogHeader><DialogTitle>Link Activity/Notes to Plan Area</DialogTitle></DialogHeader>
                                <form action={linkEvidence} className="space-y-4">
                                  <input type="hidden" name="targetType" value="FOCUS" />
                                  <input type="hidden" name="targetId" value={selectedFocus.id} />

                                  <div>
                                    <p className="mb-2 text-sm font-medium">Attendance</p>
                                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                                      {allAttendanceForResident.slice(0, 60).map((attendance) => (
                                        <label key={attendance.id} className="flex items-center gap-2 text-xs">
                                          <input type="checkbox" name="attendanceIds" value={attendance.id} className="h-3.5 w-3.5" />
                                          {attendance.createdAt.toLocaleDateString()} · {attendance.activityInstance.title} · {attendance.status}
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="mb-2 text-sm font-medium">Progress Notes</p>
                                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                                      {allProgressNotesForResident.slice(0, 60).map((note) => (
                                        <label key={note.id} className="flex items-center gap-2 text-xs">
                                          <input type="checkbox" name="progressNoteIds" value={note.id} className="h-3.5 w-3.5" />
                                          {note.createdAt.toLocaleDateString()} · {note.type} · {note.activityInstance?.title ?? "No activity"}
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  <Textarea name="linkNote" placeholder="Why this link? (optional)" maxLength={300} />
                                  <DialogFooter>
                                    <Button type="submit" disabled={!canEdit}>Link Selected</Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>

                            {[...selectedFocus.evidenceLinks, ...selectedFocus.goals.flatMap((goal) => goal.evidenceLinks)]
                              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                              .slice(0, 20)
                              .map((evidence) => {
                                const attendance = evidence.attendanceId ? attendanceById.get(evidence.attendanceId) : null;
                                const note = evidence.progressNoteId ? progressNoteById.get(evidence.progressNoteId) : null;
                                return (
                                  <div key={evidence.id} className="rounded-md border p-2 text-xs">
                                    <p className="font-medium">{evidence.evidenceType === "ATTENDANCE" ? "Attendance" : "Progress Note"}</p>
                                    <p className="text-muted-foreground">
                                      {attendance ? `${attendance.createdAt.toLocaleDateString()} · ${attendance.activityInstance.title} · ${attendance.status}` : ""}
                                      {note ? `${note.createdAt.toLocaleDateString()} · ${note.type} · ${note.activityInstance?.title ?? "No activity"}` : ""}
                                    </p>
                                    {evidence.linkNote ? <p className="text-muted-foreground">Note: {evidence.linkNote}</p> : null}
                                  </div>
                                );
                              })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="pt-2">
                      <form action={deleteFocus}>
                        <input type="hidden" name="focusId" value={selectedFocus.id} />
                        <Button type="submit" variant="destructive" disabled={!canEdit}>Delete Plan Area</Button>
                      </form>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goal progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {goalProgress.length === 0 ? <p className="text-sm text-muted-foreground">No goals yet.</p> : null}
              {goalProgress.map((row) => (
                <div key={row.goal.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{row.goal.statement}</p>
                      <p className="text-xs text-muted-foreground">{toTitleCase(row.goal.measurementMethod)} · Start {row.goal.startAt.toLocaleDateString()} · Target {row.goal.targetAt.toLocaleDateString()}</p>
                    </div>
                    <Badge variant={row.atRisk ? "destructive" : "secondary"}>{row.atRisk ? "Needs Attention" : "On Track"}</Badge>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className={`h-2 rounded-full ${row.atRisk ? "bg-rose-500" : "bg-actifyMint"}`} style={{ width: `${Math.max(row.percent, 4)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{row.percent}% · Current {String(row.current)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oneToOne" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Add 1:1 Activity Note</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createOneToOneEntry} className="space-y-3">
                  <Input type="datetime-local" name="occurredAt" />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select name="participationLevel" className="h-10 rounded-md border px-3 text-sm" defaultValue="MODERATE">
                      <option value="MINIMAL">Participation: Minimal</option>
                      <option value="MODERATE">Participation: Moderate</option>
                      <option value="HIGH">Participation: High</option>
                    </select>
                    <select name="moodAffect" className="h-10 rounded-md border px-3 text-sm" defaultValue="CALM">
                      <option value="BRIGHT">Mood: Bright</option>
                      <option value="CALM">Mood: Calm</option>
                      <option value="FLAT">Mood: Flat</option>
                      <option value="ANXIOUS">Mood: Anxious</option>
                      <option value="AGITATED">Mood: Agitated</option>
                    </select>
                    <select name="cuesRequired" className="h-10 rounded-md border px-3 text-sm" defaultValue="VERBAL">
                      <option value="NONE">Cues: None</option>
                      <option value="VERBAL">Cues: Verbal</option>
                      <option value="VISUAL">Cues: Visual</option>
                      <option value="HAND_OVER_HAND">Cues: Hand over hand</option>
                    </select>
                    <select name="response" className="h-10 rounded-md border px-3 text-sm" defaultValue="POSITIVE">
                      <option value="POSITIVE">Response: Positive</option>
                      <option value="NEUTRAL">Response: Neutral</option>
                      <option value="RESISTANT">Response: Resistant</option>
                    </select>
                  </div>

                  <select name="linkTarget" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue="">
                    <option value="">Optional: Link to a plan area or goal</option>
                    {focuses.length > 0 ? <option value="" disabled>Plan Areas</option> : null}
                    {focuses.map((focus) => (
                      <option key={`focus-${focus.id}`} value={`FOCUS:${focus.id}`}>
                        {focus.title}
                      </option>
                    ))}
                    {allGoals.length > 0 ? <option value="" disabled>Goals</option> : null}
                    {allGoals.map((goal) => (
                      <option key={`goal-${goal.id}`} value={`GOAL:${goal.id}`}>
                        {goal.statement.slice(0, 90)}
                      </option>
                    ))}
                  </select>

                  <Textarea name="narrative" placeholder="What happened in this 1:1 activity?" minLength={10} maxLength={4000} required />
                  <Textarea name="followUp" placeholder="Optional follow-up" maxLength={1200} />
                  <Textarea name="linkNote" placeholder="Optional note for why this supports the plan" maxLength={300} />

                  <DialogFooter className="pt-1">
                    <Button type="submit" disabled={!canEdit}>Save 1:1 Note</Button>
                  </DialogFooter>
                  {!canEdit ? <p className="text-xs text-muted-foreground">Read-only role: you can view notes but not add new ones.</p> : null}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent 1:1 Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {oneToOneNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No 1:1 notes yet for this resident.</p>
                ) : null}
                {oneToOneNotes.map((note) => {
                  const linked = noteEvidenceByProgressNoteId.get(note.id);
                  const linkedLabel = linked?.focusId
                    ? focusById.get(linked.focusId)?.title
                    : linked?.goalId
                    ? goalById.get(linked.goalId)?.statement
                    : null;

                  return (
                    <div key={note.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{toTitleCase(note.participationLevel)}</Badge>
                          <Badge variant="outline">{toTitleCase(note.moodAffect)}</Badge>
                          <Badge variant="outline">{toTitleCase(note.cuesRequired)}</Badge>
                          <Badge variant="secondary">{toTitleCase(note.response)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{note.createdAt.toLocaleString()}</p>
                      </div>

                      <p className="mt-2 text-sm">{note.narrative}</p>
                      {note.followUp ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Follow-up: {note.followUp}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Linked to: {linkedLabel ?? "Not linked"}
                      </p>
                      {linked?.linkNote ? (
                        <p className="text-xs text-muted-foreground">Link note: {linked.linkNote}</p>
                      ) : null}

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          By {note.createdByUser?.name ?? "Staff"}
                        </p>
                        {canEdit ? (
                          <form action={deleteOneToOneEntry}>
                            <input type="hidden" name="noteId" value={note.id} />
                            <Button type="submit" size="sm" variant="destructive">Delete</Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="barriers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Challenges (Last 30/90 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challenge</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Suggested fix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barrierSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-sm text-muted-foreground">No challenge data yet.</TableCell>
                    </TableRow>
                  ) : (
                    barrierSummary.map(([barrier, count]) => (
                      <TableRow key={barrier}>
                        <TableCell>{toTitleCase(barrier)}</TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>
                          <Input placeholder="Suggested fix" className="h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Declined Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allAttendanceForResident.filter((row) => row.status === "REFUSED").slice(0, 20).map((row) => (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{row.createdAt.toLocaleDateString()} · {row.activityInstance.title}</p>
                  <p className="text-xs text-muted-foreground">Reason: {row.barrierReason ? toTitleCase(row.barrierReason) : "Not documented"}</p>
                  <Input className="mt-2" placeholder="Alternative offered / retry plan" defaultValue={row.notes ?? ""} />
                </div>
              ))}
              {allAttendanceForResident.filter((row) => row.status === "REFUSED").length === 0 ? <p className="text-sm text-muted-foreground">No refusals in recent entries.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timing Conflicts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allAttendanceForResident
                .filter((row) => row.barrierReason === "THERAPY" || row.barrierReason === "NOT_INFORMED")
                .slice(0, 20)
                .map((row) => (
                  <div key={row.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{row.activityInstance.title}</p>
                    <p className="text-xs text-muted-foreground">{row.createdAt.toLocaleDateString()} · {row.barrierReason ? toTitleCase(row.barrierReason) : "-"}</p>
                  </div>
                ))}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" id="adjust-schedule" disabled={!canEdit}>Move support step to morning</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Timing Change Note</DialogTitle></DialogHeader>
                  <form action={createReview} className="space-y-3">
                    <Input type="date" name="startedAt" defaultValue={new Date().toISOString().slice(0, 10)} required />
                    <Textarea name="summary" defaultValue="Moved support step to morning because therapy/communication conflicts kept happening." minLength={10} maxLength={800} required />
                    <DialogFooter>
                      <Button type="submit" disabled={!canEdit}>Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Check-Ins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No check-ins yet.</p> : null}
              {reviews.map((review) => (
                <div key={review.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Started {review.startedAt.toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Target date: {review.targetCompletionAt ? review.targetCompletionAt.toLocaleDateString() : "-"} · Done: {review.completionAt ? review.completionAt.toLocaleDateString() : "-"}</p>
                    </div>
                    <Badge variant={review.status === "COMPLETED" ? "secondary" : "outline"}>{toTitleCase(review.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm">{review.summary}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">Open</Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Check-In Details</DialogTitle>
                          <DialogDescription>{review.startedAt.toLocaleString()}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">What changed during this period:</span> Plan areas, goals, or support steps were updated. See history below.</p>
                          <p><span className="font-medium">Summary:</span> {review.summary}</p>
                        </div>
                        {review.status !== "COMPLETED" ? (
                          <form action={markReviewComplete} className="space-y-3">
                            <input type="hidden" name="reviewId" value={review.id} />
                            <Input type="date" name="completionAt" required />
                            <Button type="submit" disabled={!canEdit}>Mark Done</Button>
                          </form>
                        ) : null}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Changed fields</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditRows.map((row) => {
                    const beforeKeys = row.before && typeof row.before === "object" ? Object.keys(row.before as Record<string, unknown>) : [];
                    const afterKeys = row.after && typeof row.after === "object" ? Object.keys(row.after as Record<string, unknown>) : [];
                    const fields = Array.from(new Set([...beforeKeys, ...afterKeys])).slice(0, 4);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.createdAt.toLocaleString()}</TableCell>
                        <TableCell>{row.actorUser?.name ?? "Auto"}</TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell>{row.entityType}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fields.join(", ") || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
