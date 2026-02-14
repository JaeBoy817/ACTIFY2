import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(max).optional());

const dateValue = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return new Date(trimmed);
}, z.date());

const optionalDateValue = z.preprocess((value) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return new Date(trimmed);
}, z.date().optional());

export const focusStatusEnum = z.enum(["ACTIVE", "RESOLVED", "CANCELLED"]);

export const activitiesFocusCategoryEnum = z.enum([
  "SOCIALIZATION",
  "COGNITION",
  "MOBILITY_ENGAGEMENT",
  "LEISURE_SKILLS",
  "ADAPTIVE_PROGRAMMING",
  "ADJUSTMENT"
]);

export const activitiesGoalTypeEnum = z.enum([
  "SOCIALIZATION",
  "COGNITION",
  "MOBILITY_ENGAGEMENT",
  "LEISURE_SKILLS"
]);

export const measurementMethodEnum = z.enum([
  "ATTENDANCE_COUNT",
  "MINUTES_ENGAGED",
  "ENGAGEMENT_SCORE_AVG",
  "RESIDENT_REPORTED_SATISFACTION",
  "REFUSAL_REDUCTION"
]);

export const targetUnitEnum = z.enum(["PER_WEEK", "PER_MONTH", "MINUTES", "SCORE", "POINTS", "COUNT"]);

export const frequencyTypeEnum = z.enum(["DAILY", "WEEKLY", "PRN"]);

export const responsibleRoleEnum = z.enum(["AD", "ASSISTANT", "VOLUNTEER", "NURSING_ASSIST", "OTHER"]);

export const notificationMethodEnum = z.enum(["POSTED", "VERBAL", "PRINT_INVITE", "FAMILY", "OTHER"]);

export const taskScheduleTypeEnum = z.enum(["ONE_TIME", "DAILY", "WEEKLY", "PER_ACTIVITY_INSTANCE"]);

export const reviewStatusEnum = z.enum(["OPEN", "COMPLETED"]);

export const focusDialogSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    category: activitiesFocusCategoryEnum,
    etiologyFactors: z.array(z.string().trim().min(1)).max(8).optional().default([]),
    baselineNarrative: z.string().trim().min(20).max(1200),
    strengths: optionalTrimmed(800),
    preferences: optionalTrimmed(800),
    barriersNotes: optionalTrimmed(800),
    initiatedAt: dateValue,
    nextReviewAt: optionalDateValue,
    status: focusStatusEnum,
    statusReason: optionalTrimmed(1200)
  })
  .superRefine((value, ctx) => {
    if (value.nextReviewAt && value.nextReviewAt < value.initiatedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextReviewAt"],
        message: "Next review must be on or after initiated date."
      });
    }

    if (value.status !== "ACTIVE" && (!value.statusReason || value.statusReason.trim().length < 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["statusReason"],
        message: "Status reason is required and must be at least 10 characters when focus is not active."
      });
    }
  });

export const goalDialogSchema = z
  .object({
    focusId: z.string().min(1),
    type: activitiesGoalTypeEnum,
    statement: z.string().trim().min(10).max(500),
    measurementMethod: measurementMethodEnum,
    targetValue: z.preprocess((value) => {
      if (value === null || value === undefined || value === "") return undefined;
      return Number(value);
    }, z.number().int().positive().optional()),
    targetUnit: targetUnitEnum.optional(),
    startAt: dateValue,
    targetAt: dateValue,
    reviewFrequencyDays: z.preprocess((value) => {
      if (value === null || value === undefined || value === "") return undefined;
      return Number(value);
    }, z.number().int().min(7).max(180).optional()),
    residentParticipated: z.boolean(),
    notes: optionalTrimmed(800),
    status: focusStatusEnum.default("ACTIVE"),
    statusReason: optionalTrimmed(1200)
  })
  .superRefine((value, ctx) => {
    if (value.measurementMethod !== "RESIDENT_REPORTED_SATISFACTION" && !value.targetValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetValue"],
        message: "Target value is required for this measurement method."
      });
    }

    if (value.targetValue && !value.targetUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetUnit"],
        message: "Target unit is required when target value is set."
      });
    }

    if (value.targetAt < value.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetAt"],
        message: "Target date must be on or after start date."
      });
    }

    if (value.status !== "ACTIVE" && (!value.statusReason || value.statusReason.trim().length < 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["statusReason"],
        message: "Status reason is required and must be at least 10 characters when goal is not active."
      });
    }
  });

export const interventionDialogSchema = z
  .object({
    focusId: z.string().min(1),
    goalId: optionalTrimmed(100),
    title: z.string().trim().min(3).max(80),
    personalizedApproach: z.string().trim().min(20).max(2000),
    frequencyType: frequencyTypeEnum,
    frequencyValue: z.preprocess((value) => {
      if (value === null || value === undefined || value === "") return undefined;
      return Number(value);
    }, z.number().int().optional()),
    responsibleRole: responsibleRoleEnum,
    notificationMethod: notificationMethodEnum,
    transportRequired: z.boolean(),
    transportDetails: optionalTrimmed(1200),
    bedBoundEnabled: z.boolean(),
    bedBoundText: optionalTrimmed(800),
    dementiaFriendlyEnabled: z.boolean(),
    dementiaFriendlyText: optionalTrimmed(800),
    lowVisionHearingEnabled: z.boolean(),
    lowVisionHearingText: optionalTrimmed(800),
    oneToOneMiniEnabled: z.boolean(),
    oneToOneMiniText: optionalTrimmed(800),
    suppliesNeeded: optionalTrimmed(800),
    isActive: z.boolean(),
    status: focusStatusEnum.default("ACTIVE"),
    statusReason: optionalTrimmed(1200)
  })
  .superRefine((value, ctx) => {
    if (value.frequencyType === "WEEKLY" && (!value.frequencyValue || value.frequencyValue < 1 || value.frequencyValue > 7)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["frequencyValue"],
        message: "Weekly frequency must be between 1 and 7."
      });
    }

    if (value.transportRequired && (!value.transportDetails || value.transportDetails.trim().length < 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transportDetails"],
        message: "Transport details are required when transport is required."
      });
    }

    if (value.bedBoundEnabled && (!value.bedBoundText || value.bedBoundText.trim().length < 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bedBoundText"], message: "Bed-bound adaptation text is required." });
    }

    if (value.dementiaFriendlyEnabled && (!value.dementiaFriendlyText || value.dementiaFriendlyText.trim().length < 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dementiaFriendlyText"], message: "Dementia-friendly adaptation text is required." });
    }

    if (value.lowVisionHearingEnabled && (!value.lowVisionHearingText || value.lowVisionHearingText.trim().length < 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lowVisionHearingText"], message: "Low vision/hearing adaptation text is required." });
    }

    if (value.oneToOneMiniEnabled && (!value.oneToOneMiniText || value.oneToOneMiniText.trim().length < 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["oneToOneMiniText"], message: "1:1 mini adaptation text is required." });
    }

    if (value.status !== "ACTIVE" && (!value.statusReason || value.statusReason.trim().length < 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["statusReason"],
        message: "Status reason is required and must be at least 10 characters when intervention is not active."
      });
    }
  });

export const taskDialogSchema = z
  .object({
    interventionId: z.string().min(1),
    name: z.string().trim().min(3).max(120),
    assignedRole: responsibleRoleEnum,
    scheduleType: taskScheduleTypeEnum,
    dueDate: optionalDateValue,
    dueTime: optionalTrimmed(5),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([]),
    active: z.boolean(),
    completionRequiresNote: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.scheduleType === "ONE_TIME" && !value.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "Due date is required for one-time tasks."
      });
    }

    if (value.dueTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value.dueTime)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dueTime"], message: "Time must be in HH:MM format." });
    }

    if (value.scheduleType === "WEEKLY" && value.daysOfWeek.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["daysOfWeek"], message: "Select at least one day for weekly tasks." });
    }
  });

export const taskCompleteSchema = z
  .object({
    taskId: z.string().min(1),
    completedAt: optionalDateValue,
    note: optionalTrimmed(300),
    requiresNote: z.boolean().default(false)
  })
  .superRefine((value, ctx) => {
    if (value.requiresNote && (!value.note || value.note.trim().length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Completion note is required and must be at least 5 characters."
      });
    }
  });

export const evidenceLinkSchema = z
  .object({
    targetType: z.enum(["FOCUS", "GOAL"]),
    targetId: z.string().min(1),
    attendanceIds: z.array(z.string().min(1)).optional().default([]),
    progressNoteIds: z.array(z.string().min(1)).optional().default([]),
    linkNote: optionalTrimmed(300)
  })
  .superRefine((value, ctx) => {
    if (value.attendanceIds.length === 0 && value.progressNoteIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attendanceIds"],
        message: "Select at least one attendance record or progress note."
      });
    }
  });

export const reviewDialogSchema = z
  .object({
    startedAt: dateValue,
    targetCompletionAt: optionalDateValue,
    completionAt: optionalDateValue,
    summary: z.string().trim().min(10).max(800)
  })
  .superRefine((value, ctx) => {
    if (value.targetCompletionAt && value.targetCompletionAt < value.startedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetCompletionAt"],
        message: "Target completion date must be on or after start date."
      });
    }

    if (value.completionAt && value.completionAt < value.startedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completionAt"],
        message: "Completion date must be on or after start date."
      });
    }
  });

export function statusFromReview(completionAt?: Date) {
  return completionAt ? "COMPLETED" : "OPEN";
}

export type FocusDialogInput = z.infer<typeof focusDialogSchema>;
export type GoalDialogInput = z.infer<typeof goalDialogSchema>;
export type InterventionDialogInput = z.infer<typeof interventionDialogSchema>;
export type TaskDialogInput = z.infer<typeof taskDialogSchema>;
export type TaskCompleteInput = z.infer<typeof taskCompleteSchema>;
export type EvidenceLinkInput = z.infer<typeof evidenceLinkSchema>;
export type ReviewDialogInput = z.infer<typeof reviewDialogSchema>;
