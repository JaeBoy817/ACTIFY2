import { z } from "zod";

import { CARE_PLAN_FOCUS_AREAS } from "@/lib/care-plans/enums";

const focusAreaValues = CARE_PLAN_FOCUS_AREAS.map((item) => item.key) as [string, ...string[]];

export const carePlanGoalPayloadSchema = z
  .object({
    templateKey: z.string().trim().min(1).optional().nullable(),
    customText: z.string().trim().min(8).max(500).optional().nullable(),
    baseline: z.enum(["RARE", "SOMETIMES", "OFTEN"]),
    target: z.enum(["RARE", "SOMETIMES", "OFTEN"]),
    timeframeDays: z.number().int().min(7).max(365)
  })
  .refine((value) => Boolean(value.templateKey) || Boolean(value.customText), {
    message: "Each goal needs a template or custom text.",
    path: ["templateKey"]
  });

export const carePlanInterventionPayloadSchema = z.object({
  title: z.string().trim().min(3).max(140),
  type: z.enum(["GROUP", "ONE_TO_ONE", "INDEPENDENT"]),
  bedBoundFriendly: z.boolean().optional().default(false),
  dementiaFriendly: z.boolean().optional().default(false),
  lowVisionFriendly: z.boolean().optional().default(false),
  hardOfHearingFriendly: z.boolean().optional().default(false)
});

export const carePlanWizardPayloadSchema = z
  .object({
    focusAreas: z.array(z.enum(focusAreaValues)).min(1).max(3),
    goals: z.array(carePlanGoalPayloadSchema).min(1).max(3),
    interventions: z.array(carePlanInterventionPayloadSchema).min(2).max(12),
    frequency: z.enum(["DAILY", "THREE_PER_WEEK", "WEEKLY", "PRN", "CUSTOM"]),
    frequencyCustom: z.string().trim().max(60).optional().nullable(),
    nextReviewDate: z.coerce.date(),
    barriers: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
    supports: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
    preferencesText: z.string().trim().max(500).optional().nullable(),
    safetyNotes: z.string().trim().max(500).optional().nullable(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional().default("ACTIVE")
  })
  .refine(
    (value) => value.frequency !== "CUSTOM" || Boolean(value.frequencyCustom?.trim()),
    {
      message: "Custom frequency is required when frequency is set to Custom.",
      path: ["frequencyCustom"]
    }
  );

export const carePlanReviewPayloadSchema = z.object({
  reviewDate: z.coerce.date(),
  result: z.enum(["IMPROVED", "NO_CHANGE", "DECLINED"]),
  participation: z.enum(["LOW", "MODERATE", "HIGH"]),
  response: z.enum(["POSITIVE", "NEUTRAL", "RESISTANT"]),
  workedChips: z.array(z.string().trim().min(1).max(80)).max(12).optional().default([]),
  adjustChips: z.array(z.string().trim().min(1).max(80)).max(12).optional().default([]),
  note: z.string().trim().max(500).optional().nullable(),
  nextReviewDateAfter: z.coerce.date()
});

export type CarePlanWizardPayload = z.infer<typeof carePlanWizardPayloadSchema>;
export type CarePlanGoalPayload = z.infer<typeof carePlanGoalPayloadSchema>;
export type CarePlanInterventionPayload = z.infer<typeof carePlanInterventionPayloadSchema>;
export type CarePlanReviewPayload = z.infer<typeof carePlanReviewPayloadSchema>;
