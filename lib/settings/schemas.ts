import { DefaultLanding, FontScale, Role, RoomFormatRule } from "@prisma/client";
import { z } from "zod";

import { settingsPermissionKeys } from "@/lib/settings/defaults";

const daySchema = z.number().int().min(0).max(6);

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const nonEmptyString = z.string().trim().min(1);

const optionalText = z.string().trim().max(500).optional().default("");

export const facilityTabSchema = z.object({
  facility: z
    .object({
      name: z.string().trim().min(2).max(120),
      dba: z.string().trim().max(120).optional().default(""),
      address: z.object({
        line1: z.string().trim().max(160).optional().default(""),
        line2: z.string().trim().max(160).optional().default(""),
        city: z.string().trim().max(80).optional().default(""),
        state: z.string().trim().max(40).optional().default(""),
        zip: z.string().trim().max(20).optional().default("")
      }),
      timezone: z.string().min(2),
      type: z.enum(["SNF", "AssistedLiving", "MemoryCare", "Rehab"]).default("SNF"),
      units: z.array(z.string().trim().min(1).max(60)).max(80),
      roomNumberFormat: z.enum(["ALPHA_NUM", "NUMERIC", "CUSTOM"]).default("ALPHA_NUM"),
      roomFormatRule: z.nativeEnum(RoomFormatRule).default(RoomFormatRule.A_B),
      roomFormatHint: z.string().trim().max(120).optional().default(""),
      activitySpaces: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(80),
            notes: z.string().trim().max(240).optional().default("")
          })
        )
        .max(40),
      businessHours: z.object({
        start: timeSchema,
        end: timeSchema,
        days: z.array(daySchema).min(1)
      }),
      reportMonthMode: z.enum(["CALENDAR_MONTH", "ROLLING_30"]).default("CALENDAR_MONTH"),
      branding: z.object({
        logoUrl: z.string().trim().max(500).optional().default(""),
        accentColor: z.string().trim().max(32).optional().default("#2C67F2"),
        gradientPreset: z.string().trim().max(80).optional().default("actify-default")
      }),
      directoryContacts: z
        .array(
          z.object({
            role: z.string().trim().max(80).optional().default(""),
            name: z.string().trim().max(120).optional().default(""),
            phone: z.string().trim().max(40).optional().default(""),
            email: z.string().trim().max(120).optional().default("")
          })
        )
        .max(80),
      residentStatusLabels: z.array(z.string().trim().min(1).max(60)).max(30),
      smoking: z.object({
        enabled: z.boolean(),
        scheduledTimes: z.array(timeSchema).max(24),
        staffEscortRequired: z.boolean(),
        countsAsActivity: z.boolean(),
        activityLabel: z.string().trim().min(1).max(80).default("Smoke Break")
      })
    })
    .superRefine((value, ctx) => {
      if (value.roomNumberFormat === "CUSTOM" && value.roomFormatHint.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roomFormatHint"],
          message: "Room format hint must be at least 3 characters for custom format."
        });
      }
    }),
  policyFlags: z.object({
    hideTriggersInPrint: z.boolean(),
    maskSensitiveFieldsInPrint: z.boolean(),
    maskFamilyContactInPrint: z.boolean()
  })
});

export const permissionRowSchema = z.object(
  settingsPermissionKeys.reduce<Record<string, z.ZodBoolean>>((acc, key) => {
    acc[key] = z.boolean();
    return acc;
  }, {})
);

export const permissionsMatrixSchema = z
  .object({
    ADMIN: permissionRowSchema,
    AD: permissionRowSchema,
    ASSISTANT: permissionRowSchema,
    READ_ONLY: permissionRowSchema
  })
  .superRefine((value, ctx) => {
    const hasReadOnlyWritePermission = Object.values(value.READ_ONLY).some(Boolean);
    if (hasReadOnlyWritePermission) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["READ_ONLY"],
        message: "READ_ONLY permissions must remain disabled."
      });
    }
  });

export const roleDefinitionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(220).optional().default(""),
  scope: z.enum(["WHOLE_BUILDING", "ASSIGNED_UNITS"]).default("WHOLE_BUILDING"),
  assignedUnits: z.array(z.string().trim().min(1).max(60)).max(80),
  permissions: permissionRowSchema
});

export const rolesTabSchema = z.object({
  roles: z.object({
    enabled: z.boolean(),
    roleTemplatesSeeded: z.boolean(),
    list: z.array(roleDefinitionSchema).max(20),
    notesRequireSupervisorApproval: z.boolean(),
    autoRoleForNewUsers: z.nativeEnum(Role),
    auditTrailEnabled: z.boolean()
  }),
  permissionsJson: permissionsMatrixSchema
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
    attendanceTracking: z.boolean(),
    oneToOneNotes: z.boolean(),
    groupNotes: z.boolean(),
    carePlanBuilder: z.boolean(),
    activityTemplatesLibrary: z.boolean(),
    residentCouncil: z.boolean(),
    outingsTransportation: z.boolean(),
    prizeCartIncentives: z.boolean(),
    inventorySupplyTracking: z.boolean(),
    therapyCollaboration: z.boolean(),
    photoAttachments: z.boolean(),
    documentESignature: z.boolean(),

    templates: z.boolean(),
    calendar: z.boolean(),
    notes: z.boolean(),
    reports: z.boolean(),
    goals: z.boolean(),
    analytics: z.boolean(),
    assessments: z.boolean(),
    inventory: z.boolean(),
    prizeCart: z.boolean(),
    volunteers: z.boolean(),
    carePlan: z.boolean(),
    analyticsHeatmaps: z.boolean(),
    familyEngagementNotes: z.boolean()
  }),
  widgets: z.object({
    oneToOneDueList: z.boolean(),
    birthdays: z.boolean(),
    newAdmitsDischarges: z.boolean(),
    monthlyParticipationSnapshot: z.boolean()
  })
});

export const calendarTabSchema = z.object({
  calendar: z.object({
    defaultView: z.enum(["DAY", "WEEK", "MONTH"]),
    colorMode: z.enum(["BY_CATEGORY", "BY_LOCATION", "NONE"]),
    recurringDefaults: z.object({
      enabled: z.boolean()
    }),
    setupBufferMinutes: z.enum(["0", "5", "10", "15", "30"]),
    staffAssignmentEnabled: z.boolean(),
    attendanceMode: z.enum(["QUICK_CHECK", "DETAILED"]),
    reminders: z.object({
      enabled: z.boolean(),
      minutesBefore: z.number().int().min(0).max(360)
    }),
    blackoutTimes: z.array(
      z.object({
        label: z.string().trim().max(80).optional().default(""),
        start: timeSchema.optional().default(""),
        end: timeSchema.optional().default("")
      })
    ),
    holidayPacksEnabled: z.boolean(),
    export: z.object({
      icsEnabled: z.boolean(),
      pdfEnabled: z.boolean()
    })
  }),
  defaults: z.object({
    groupMinutes: z.number().int().min(15).max(240),
    oneToOneMinutes: z.number().int().min(5).max(120),
    locations: z.array(z.string().trim().min(1).max(80)).min(1).max(40),
    warnTherapyOverlap: z.boolean(),
    warnOutsideBusinessHours: z.boolean(),
    useBusinessHoursDefaults: z.boolean()
  })
});

export const docsTabSchema = z
  .object({
    scoring: z.object({
      presentWeight: z.number().int().min(1).max(5),
      activeWeight: z.number().int().min(1).max(5),
      leadingWeight: z.number().int().min(1).max(5),
      requireNoteForBarriers: z.array(z.string()).max(20),
      minNarrativeLen: z.number().int().min(0).max(400),
      requireGoalLinkForOneToOne: z.boolean()
    }),
    docs: z.object({
      requiredFields: z.object({
        mood: z.boolean(),
        participationLevel: z.boolean(),
        cues: z.boolean(),
        responseType: z.boolean(),
        followUp: z.boolean()
      }),
      onlyAllowTemplateNotes: z.boolean(),
      lockNotesAfterDays: z.enum(["OFF", "3", "7", "14", "30"]),
      signature: z.object({
        required: z.boolean(),
        supervisorCosign: z.boolean()
      }),
      autoAddStandardLine: z.object({
        enabled: z.boolean(),
        text: z.string().trim().max(500).default("Resident encouraged to participate …")
      }),
      terminologyWarnings: z.object({
        enabled: z.boolean()
      }),
      attachments: z.object({
        allowPhotos: z.boolean(),
        allowPDFs: z.boolean(),
        maxSizeMB: z.number().int().min(1).max(100)
      }),
      lateEntryMode: z.object({
        enabled: z.boolean(),
        requireReason: z.boolean()
      }),
      retentionYears: z.number().int().min(1).max(30)
    })
  })
  .superRefine((value, ctx) => {
    if (value.scoring.presentWeight > value.scoring.activeWeight || value.scoring.activeWeight > value.scoring.leadingWeight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scoring", "leadingWeight"],
        message: "Weights must be ascending: present <= active <= leading."
      });
    }
  });

export const carePlanTabSchema = z
  .object({
    carePlan: z.object({
      reviewCadence: z.object({
        preset: z.enum(["30", "60", "90", "CUSTOM"]),
        customDays: z.number().int().min(7).max(180).optional()
      }),
      requirePersonalization: z.boolean(),
      blockReviewCompletionIfGeneric: z.boolean(),
      interventionsLibraryEnabled: z.boolean(),
      defaultInterventions: z.array(z.string().trim().min(1).max(120)).max(80),
      goalMappingEnabled: z.boolean(),
      defaultFrequencies: z.object({
        groupDefault: z.string().trim().min(1).max(60),
        oneToOneDefault: z.string().trim().min(1).max(60)
      }),
      autoSuggestByTagsEnabled: z.boolean(),
      reviewReminders: z.object({
        enabled: z.boolean(),
        days: z.enum(["30", "60", "90"])
      }),
      export: z.object({
        pdfEnabled: z.boolean(),
        includeSignatureLine: z.boolean()
      })
    })
  })
  .superRefine((value, ctx) => {
    if (value.carePlan.reviewCadence.preset === "CUSTOM" && !value.carePlan.reviewCadence.customDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["carePlan", "reviewCadence", "customDays"],
        message: "Custom cadence must be between 7 and 180 days."
      });
    }
  });

export const reportsTabSchema = z
  .object({
    reports: z.object({
      types: z.object({
        monthlyCalendar: z.boolean(),
        participationByResident: z.boolean(),
        attendanceByActivity: z.boolean(),
        oneToOneCompletionRate: z.boolean(),
        carePlanComplianceSnapshot: z.boolean(),
        residentCouncilMinutes: z.boolean()
      }),
      defaultDateRange: z.enum(["THIS_MONTH", "LAST_MONTH", "ROLLING_30"]),
      defaultUnitFilter: z.array(z.string().trim().min(1).max(60)).max(80),
      scoring: z.object({
        enabled: z.boolean(),
        weights: z.object({
          low: z.number().min(0).max(10),
          moderate: z.number().min(0).max(10),
          high: z.number().min(0).max(10)
        })
      }),
      pdf: z.object({
        includeLogo: z.boolean(),
        headerStyle: z.enum(["CLASSIC", "CLEAN", "LIQUID_GLASS", "GLASS"]),
        includeCharts: z.boolean()
      }),
      autoGenerate: z.object({
        enabled: z.boolean(),
        dayOfMonth: z.number().int().min(1).max(28)
      }),
      exportFormats: z.object({
        pdf: z.boolean(),
        csv: z.boolean()
      }),
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
      })
    }),
    printDefaults: z.object({
      paperSize: z.enum(["LETTER", "A4"]),
      margins: z.enum(["NORMAL", "NARROW", "WIDE"]),
      includeFooterMeta: z.boolean()
    })
  })
  .superRefine((value, ctx) => {
    const sectionCount = Object.values(value.reports.includeSections).filter(Boolean).length;
    const typeCount = Object.values(value.reports.types).filter(Boolean).length;
    if (sectionCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reports", "includeSections"],
        message: "Enable at least one report section."
      });
    }
    if (typeCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reports", "types"],
        message: "Enable at least one report type."
      });
    }
  });

export const prizePresetSchema = z.object({
  category: z.string().trim().min(1).max(60),
  defaultPriceCents: z.number().int().min(0),
  reorderAt: z.number().int().min(0)
});

export const inventoryTabSchema = z.object({
  inventory: z.object({
    enabled: z.boolean(),
    categories: z.array(nonEmptyString.max(80)).max(80),
    parLevels: z.object({
      enabled: z.boolean()
    }),
    lowStockAlerts: z.object({
      enabled: z.boolean(),
      thresholdMode: z.enum(["BELOW_PAR", "CUSTOM"])
    }),
    vendors: z
      .array(
        z.object({
          name: z.string().trim().max(120).optional().default(""),
          link: z.string().trim().max(500).optional().default(""),
          notes: z.string().trim().max(300).optional().default("")
        })
      )
      .max(120),
    checkoutLog: z.object({
      enabled: z.boolean()
    }),
    budgetTracking: z.object({
      enabled: z.boolean(),
      monthlyBudget: z.number().min(0).max(1_000_000)
    }),
    barcodeMode: z.object({
      enabled: z.boolean()
    }),
    reorderThresholdMultiplier: z.number().min(0.5).max(3),
    showLowStockBanner: z.boolean()
  }),
  prizeCart: z.object({
    presets: z.array(prizePresetSchema).max(40),
    enableRestockSuggestions: z.boolean(),
    restockAggressiveness: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"])
  })
});

export const notificationsTabSchema = z
  .object({
    notifications: z.object({
      channels: z.object({
        inApp: z.boolean(),
        email: z.boolean(),
        push: z.boolean()
      }),
      digest: z.object({
        mode: z.enum(["OFF", "DAILY", "WEEKLY"]),
        time: z.string().optional().default("")
      }),
      triggers: z.object({
        oneToOneDueToday: z.boolean(),
        newAdmitAdded: z.boolean(),
        dischargePendingDocs: z.boolean(),
        lowInventory: z.boolean(),
        carePlanReviewDue: z.boolean(),
        noteNeedsCosign: z.boolean()
      }),
      quietHours: z.object({
        enabled: z.boolean(),
        start: z.string().optional().default(""),
        end: z.string().optional().default("")
      }),
      escalation: z.object({
        enabled: z.boolean(),
        minutesAfterDue: z.number().int().min(0).max(1440),
        notifyRole: z.nativeEnum(Role)
      })
    })
  })
  .superRefine((value, ctx) => {
    if (value.notifications.digest.mode !== "OFF" && value.notifications.digest.time.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notifications", "digest", "time"],
        message: "Digest time is required when digest mode is enabled."
      });
    }
  });

export const complianceTabSchema = z.object({
  compliance: z.object({
    hipaaMode: z.object({
      enabled: z.boolean(),
      autoLogoutMinutes: z.enum(["5", "10", "15", "30"]),
      maskPHIInExports: z.boolean()
    }),
    accessLogs: z.object({
      enabled: z.boolean()
    }),
    exportRestrictions: z.object({
      onlyAdminsCanExport: z.boolean()
    }),
    security: z.object({
      requireMFAForAdmins: z.boolean(),
      deviceTrustEnabled: z.boolean()
    }),
    dataRetention: z.object({
      years: z.number().int().min(1).max(30)
    }),
    incidentNotes: z.object({
      enabled: z.boolean()
    }),
    auditRetentionDays: z.number().int().min(30).max(3650),
    exportRetentionDays: z.number().int().min(1).max(365),
    hideTriggersInPrint: z.boolean(),
    maskFamilyContactInPrint: z.boolean()
  })
});

export const personalShortcutSchema = z.object({
  slashCommand: z.string().trim().max(80).optional().default(""),
  expansionText: z.string().trim().max(300).optional().default("")
});

export const personalTabSchema = z.object({
  personal: z.object({
    profile: z.object({
      displayName: optionalText,
      title: optionalText,
      initials: z.string().trim().max(10).optional().default("")
    }),
    defaults: z.object({
      mood: optionalText,
      cues: optionalText,
      followUpText: z.string().trim().max(500).optional().default("")
    }),
    dashboard: z.object({
      widgets: z.array(nonEmptyString.max(80)).max(20)
    }),
    accessibility: z.object({
      fontSize: z.enum(["SM", "MD", "LG", "XL"]),
      highContrast: z.boolean(),
      reduceMotion: z.boolean()
    }),
    shortcuts: z.array(personalShortcutSchema).max(100),
    notifications: z.object({
      overrides: z.record(z.boolean())
    })
  }),
  account: z.object({
    defaultLanding: z.nativeEnum(DefaultLanding),
    reduceMotion: z.boolean(),
    highContrast: z.boolean(),
    fontScale: z.nativeEnum(FontScale),
    quickPhrases: z.array(z.string().trim().min(1).max(80)).max(100),
    shortcutsEnabled: z.boolean()
  })
});

export const facilitySettingsPayloadSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("facility"), values: facilityTabSchema }),
  z.object({ section: z.literal("roles"), values: rolesTabSchema }),
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
