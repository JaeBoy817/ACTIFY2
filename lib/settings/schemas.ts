import { DefaultLanding, FontScale, Role, RoomFormatRule } from "@prisma/client";
import { z } from "zod";

import { settingsPermissionKeys } from "@/lib/settings/defaults";

const daySchema = z.number().int().min(0).max(6);

export const facilityTabSchema = z
  .object({
    timezone: z.string().min(2),
    useBusinessHoursDefaults: z.boolean(),
    roomFormatRule: z.nativeEnum(RoomFormatRule),
    roomFormatHint: z.string().max(120).optional().default(""),
    allowSmokingTracking: z.boolean(),
    hideTriggersInPrint: z.boolean(),
    maskSensitiveFieldsInPrint: z.boolean(),
    maskFamilyContactInPrint: z.boolean(),
    businessHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
    businessHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
    businessDays: z.array(daySchema).min(1)
  })
  .superRefine((value, ctx) => {
    if (value.roomFormatRule === RoomFormatRule.CUSTOM && value.roomFormatHint.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roomFormatHint"],
        message: "Room format hint must be at least 3 characters for custom format."
      });
    }
  });

export const permissionRowSchema = z.object(
  settingsPermissionKeys.reduce<Record<string, z.ZodBoolean>>((acc, key) => {
    acc[key] = z.boolean();
    return acc;
  }, {})
);

export const permissionsMatrixSchema = z.object({
  ADMIN: permissionRowSchema,
  AD: permissionRowSchema,
  ASSISTANT: permissionRowSchema,
  READ_ONLY: permissionRowSchema
}).superRefine((value, ctx) => {
  const hasReadOnlyWritePermission = Object.values(value.READ_ONLY).some(Boolean);
  if (hasReadOnlyWritePermission) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["READ_ONLY"],
      message: "READ_ONLY permissions must remain disabled."
    });
  }
});

export const updatePermissionsMatrixSchema = z.object({
  permissionsJson: permissionsMatrixSchema
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role)
});

export const modulesTabSchema = z.object({
  mode: z.enum(["CORE_WORKFLOW", "FULL_TOOLKIT"]),
  modules: z.object({
    templates: z.boolean(),
    calendar: z.boolean(),
    notes: z.boolean(),
    reports: z.boolean(),
    goals: z.boolean(),
    analytics: z.boolean(),
    assessments: z.boolean(),
    inventory: z.boolean(),
    prizeCart: z.boolean(),
    residentCouncil: z.boolean(),
    volunteers: z.boolean(),
    carePlan: z.boolean(),
    analyticsHeatmaps: z.boolean(),
    familyEngagementNotes: z.boolean()
  })
});

export const calendarTabSchema = z.object({
  groupMinutes: z.number().int().min(15).max(240),
  oneToOneMinutes: z.number().int().min(5).max(120),
  locations: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  warnTherapyOverlap: z.boolean(),
  warnOutsideBusinessHours: z.boolean()
});

export const docsTabSchema = z
  .object({
    presentWeight: z.number().int().min(1).max(5),
    activeWeight: z.number().int().min(1).max(5),
    leadingWeight: z.number().int().min(1).max(5),
    requireNoteForBarriers: z.array(z.string()).max(12),
    noteRequiredFields: z.array(z.enum(["participationLevel", "moodAffect", "cuesRequired", "response", "followUp"])),
    minNarrativeLen: z.number().int().min(0).max(400),
    requireGoalLinkForOneToOne: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.presentWeight > value.activeWeight || value.activeWeight > value.leadingWeight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leadingWeight"],
        message: "Weights must be ascending: present <= active <= leading."
      });
    }
  });

export const carePlanTabSchema = z
  .object({
    cadencePreset: z.enum(["30", "60", "90", "CUSTOM"]),
    customCadenceDays: z.number().int().min(7).max(180).optional(),
    requirePersonalization: z.boolean(),
    blockReviewCompletionIfGeneric: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.cadencePreset === "CUSTOM") {
      if (!value.customCadenceDays || value.customCadenceDays < 7 || value.customCadenceDays > 180) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customCadenceDays"],
          message: "Custom cadence must be between 7 and 180 days."
        });
      }
    }
  });

export const reportsTabSchema = z
  .object({
    theme: z.enum(["CLASSIC", "CLEAN", "LIQUID_GLASS"]),
    accent: z.enum(["BLUE", "MINT", "CORAL"]),
    includeSections: z.object({
      topPrograms: z.boolean(),
      attendanceTrends: z.boolean(),
      engagementAvg: z.boolean(),
      barriersSummary: z.boolean(),
      oneToOneTotals: z.boolean(),
      notableOutcomes: z.boolean(),
      unitHeatmap: z.boolean()
    }),
    paperSize: z.enum(["LETTER", "A4"]),
    margins: z.enum(["NORMAL", "NARROW", "WIDE"]),
    includeFooterMeta: z.boolean()
  })
  .superRefine((value, ctx) => {
    const sectionCount = Object.values(value.includeSections).filter(Boolean).length;
    if (sectionCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["includeSections"],
        message: "Enable at least one report section."
      });
    }
  });

export const prizePresetSchema = z.object({
  category: z.string().trim().min(1).max(60),
  defaultPriceCents: z.number().int().min(0),
  reorderAt: z.number().int().min(0)
});

export const inventoryTabSchema = z.object({
  reorderThresholdMultiplier: z.number().min(0.5).max(3),
  showLowStockBanner: z.boolean(),
  presets: z.array(prizePresetSchema).max(24),
  enableRestockSuggestions: z.boolean(),
  restockAggressiveness: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"])
});

export const notificationsTabSchema = z
  .object({
    dailyDigestEnabled: z.boolean(),
    dailyDigestTime: z.string().optional(),
    weeklyDigestEnabled: z.boolean(),
    weeklyDigestDay: z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]),
    taskReminders: z.boolean(),
    reminderLeadTimeMinutes: z.enum(["15", "30", "60", "120"])
  })
  .superRefine((value, ctx) => {
    if (value.dailyDigestEnabled && !value.dailyDigestTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dailyDigestTime"],
        message: "Daily digest time is required when daily digest is enabled."
      });
    }
  });

export const complianceTabSchema = z.object({
  auditRetentionDays: z.number().int().min(30).max(3650),
  exportRetentionDays: z.number().int().min(1).max(365),
  hideTriggersInPrint: z.boolean(),
  maskFamilyContactInPrint: z.boolean()
});

export const personalTabSchema = z.object({
  defaultLanding: z.nativeEnum(DefaultLanding),
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  fontScale: z.nativeEnum(FontScale),
  quickPhrases: z.array(z.string().trim().min(1).max(80)).max(100),
  shortcutsEnabled: z.boolean()
});

export const facilitySettingsPayloadSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("facility"), values: facilityTabSchema }),
  z.object({ section: z.literal("modules"), values: modulesTabSchema }),
  z.object({ section: z.literal("calendar"), values: calendarTabSchema }),
  z.object({ section: z.literal("docs"), values: docsTabSchema }),
  z.object({ section: z.literal("careplan"), values: carePlanTabSchema }),
  z.object({ section: z.literal("reports"), values: reportsTabSchema }),
  z.object({ section: z.literal("inventory"), values: inventoryTabSchema }),
  z.object({ section: z.literal("notifications"), values: notificationsTabSchema }),
  z.object({ section: z.literal("compliance"), values: complianceTabSchema })
]);

export const userSettingsPayloadSchema = z.object({
  values: personalTabSchema
});

export type FacilitySettingsPayload = z.infer<typeof facilitySettingsPayloadSchema>;
export type UserSettingsPayload = z.infer<typeof userSettingsPayloadSchema>;
