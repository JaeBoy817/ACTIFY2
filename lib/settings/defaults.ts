import { DefaultLanding, FontScale, RoomFormatRule, type FacilitySettings, type UserSettings } from "@prisma/client";

import { asModuleFlags, defaultModuleFlags, type ModuleFlags } from "@/lib/module-flags";

export type BusinessHours = {
  start: string;
  end: string;
  days: number[];
};

export type PolicyFlags = {
  allowSmokingTracking: boolean;
  hideTriggersInPrint: boolean;
  maskSensitiveFieldsInPrint: boolean;
  maskFamilyContactInPrint: boolean;
};

export type AttendanceRules = {
  engagementWeights: {
    present: number;
    active: number;
    leading: number;
  };
  requireBarrierNoteFor: string[];
  groupMinutes: number;
  oneToOneMinutes: number;
  locations: string[];
  warnTherapyOverlap: boolean;
  warnOutsideBusinessHours: boolean;
  useBusinessHoursDefaults: boolean;
};

export type DocumentationRules = {
  noteRequiredFields: Array<"participationLevel" | "moodAffect" | "cuesRequired" | "response" | "followUp">;
  minNarrativeLen: number;
  requireGoalLinkForOneToOne: boolean;
};

export type CarePlanRules = {
  reviewCadenceDays: number;
  requirePersonalization: boolean;
  blockReviewCompletionIfGeneric: boolean;
};

export type ReportSettings = {
  theme: "CLASSIC" | "CLEAN" | "LIQUID_GLASS";
  accent: "BLUE" | "MINT" | "CORAL";
  includeSections: {
    topPrograms: boolean;
    attendanceTrends: boolean;
    engagementAvg: boolean;
    barriersSummary: boolean;
    oneToOneTotals: boolean;
    notableOutcomes: boolean;
    unitHeatmap: boolean;
  };
};

export type PrintDefaults = {
  paperSize: "LETTER" | "A4";
  margins: "NORMAL" | "NARROW" | "WIDE";
  includeFooter: boolean;
  headerStyle: "GLASS" | "CLEAN" | "CLASSIC";
  includeFooterMeta: boolean;
};

export type InventoryDefaults = {
  reorderThresholdMultiplier: number;
  showLowStockBanner: boolean;
  vendorNotes: string;
};

export type PrizePreset = {
  category: string;
  defaultPriceCents: number;
  reorderAt: number;
};

export type PrizeCartDefaults = {
  presets: PrizePreset[];
  enableRestockSuggestions: boolean;
  restockAggressiveness: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
};

export type NotificationDefaults = {
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
  taskReminders: boolean;
  reminderLeadTimeMinutes: 15 | 30 | 60 | 120;
};

export type ComplianceDefaults = {
  auditRetentionDays: number;
  exportRetentionDays: number;
  hideTriggersInPrint: boolean;
  maskFamilyContactInPrint: boolean;
};

export type PersonalPrintPrefs = {
  paperSize: "LETTER" | "A4";
  includeFooterMeta: boolean;
};

export type SettingsPermissionKey =
  | "calendarEdit"
  | "attendanceEdit"
  | "notesCreateEdit"
  | "reportsExport"
  | "inventoryManage"
  | "prizeCartManage"
  | "residentCouncilAccess"
  | "auditLogView"
  | "settingsEdit";

export const settingsPermissionKeys: SettingsPermissionKey[] = [
  "calendarEdit",
  "attendanceEdit",
  "notesCreateEdit",
  "reportsExport",
  "inventoryManage",
  "prizeCartManage",
  "residentCouncilAccess",
  "auditLogView",
  "settingsEdit"
];

export type RolePermissionMatrix = Record<"ADMIN" | "AD" | "ASSISTANT" | "READ_ONLY", Record<SettingsPermissionKey, boolean>>;

export const defaultRolePermissionMatrix: RolePermissionMatrix = {
  ADMIN: {
    calendarEdit: true,
    attendanceEdit: true,
    notesCreateEdit: true,
    reportsExport: true,
    inventoryManage: true,
    prizeCartManage: true,
    residentCouncilAccess: true,
    auditLogView: true,
    settingsEdit: true
  },
  AD: {
    calendarEdit: true,
    attendanceEdit: true,
    notesCreateEdit: true,
    reportsExport: true,
    inventoryManage: true,
    prizeCartManage: true,
    residentCouncilAccess: true,
    auditLogView: false,
    settingsEdit: true
  },
  ASSISTANT: {
    calendarEdit: true,
    attendanceEdit: true,
    notesCreateEdit: true,
    reportsExport: false,
    inventoryManage: true,
    prizeCartManage: true,
    residentCouncilAccess: true,
    auditLogView: false,
    settingsEdit: false
  },
  READ_ONLY: {
    calendarEdit: false,
    attendanceEdit: false,
    notesCreateEdit: false,
    reportsExport: false,
    inventoryManage: false,
    prizeCartManage: false,
    residentCouncilAccess: false,
    auditLogView: false,
    settingsEdit: false
  }
};

export function defaultBusinessHours(): BusinessHours {
  return {
    start: "08:00",
    end: "17:00",
    days: [1, 2, 3, 4, 5]
  };
}

export function defaultPrintDefaults(): PrintDefaults {
  return {
    paperSize: "LETTER",
    margins: "NORMAL",
    includeFooter: true,
    headerStyle: "GLASS",
    includeFooterMeta: true
  };
}

export function defaultPolicyFlags(): PolicyFlags {
  return {
    allowSmokingTracking: true,
    hideTriggersInPrint: false,
    maskSensitiveFieldsInPrint: false,
    maskFamilyContactInPrint: true
  };
}

export function defaultAttendanceRules(): AttendanceRules {
  return {
    engagementWeights: {
      present: 1,
      active: 2,
      leading: 3
    },
    requireBarrierNoteFor: ["PAIN", "ISOLATION_PRECAUTIONS"],
    groupMinutes: 45,
    oneToOneMinutes: 20,
    locations: ["Main Lounge", "Activity Room", "Courtyard"],
    warnTherapyOverlap: true,
    warnOutsideBusinessHours: true,
    useBusinessHoursDefaults: true
  };
}

export function defaultDocumentationRules(): DocumentationRules {
  return {
    noteRequiredFields: ["participationLevel", "moodAffect", "cuesRequired", "response"],
    minNarrativeLen: 40,
    requireGoalLinkForOneToOne: false
  };
}

export function defaultCarePlanRules(): CarePlanRules {
  return {
    reviewCadenceDays: 30,
    requirePersonalization: true,
    blockReviewCompletionIfGeneric: false
  };
}

export function defaultReportSettings(): ReportSettings {
  return {
    theme: "LIQUID_GLASS",
    accent: "BLUE",
    includeSections: {
      topPrograms: true,
      attendanceTrends: true,
      engagementAvg: true,
      barriersSummary: true,
      oneToOneTotals: true,
      notableOutcomes: true,
      unitHeatmap: true
    }
  };
}

export function defaultInventoryDefaults(): InventoryDefaults {
  return {
    reorderThresholdMultiplier: 1,
    showLowStockBanner: true,
    vendorNotes: ""
  };
}

export function defaultPrizeCartDefaults(): PrizeCartDefaults {
  return {
    presets: [
      { category: "Snacks", defaultPriceCents: 100, reorderAt: 8 },
      { category: "Hygiene", defaultPriceCents: 250, reorderAt: 5 },
      { category: "Games", defaultPriceCents: 300, reorderAt: 3 }
    ],
    enableRestockSuggestions: true,
    restockAggressiveness: "BALANCED"
  };
}

export function defaultNotificationDefaults(): NotificationDefaults {
  return {
    dailyDigestEnabled: false,
    dailyDigestTime: "09:00",
    weeklyDigestEnabled: true,
    weeklyDigestDay: "MON",
    taskReminders: true,
    reminderLeadTimeMinutes: 30
  };
}

export function defaultComplianceDefaults(): ComplianceDefaults {
  return {
    auditRetentionDays: 365,
    exportRetentionDays: 30,
    hideTriggersInPrint: false,
    maskFamilyContactInPrint: true
  };
}

export function defaultFacilitySettingsInput(args: {
  timezone: string;
  moduleFlags?: unknown;
}) {
  const moduleFlags = asModuleFlags(args.moduleFlags);
  return {
    timezone: args.timezone,
    businessHoursJson: defaultBusinessHours(),
    roomFormatRule: RoomFormatRule.A_B,
    roomFormatHint: null,
    printDefaultsJson: defaultPrintDefaults(),
    policyFlagsJson: defaultPolicyFlags(),
    moduleFlagsJson: moduleFlags,
    attendanceRulesJson: defaultAttendanceRules(),
    documentationRulesJson: defaultDocumentationRules(),
    carePlanRulesJson: defaultCarePlanRules(),
    reportSettingsJson: defaultReportSettings(),
    inventoryDefaultsJson: defaultInventoryDefaults(),
    prizeCartDefaultsJson: defaultPrizeCartDefaults(),
    notificationDefaultsJson: defaultNotificationDefaults(),
    complianceJson: defaultComplianceDefaults(),
    permissionsJson: defaultRolePermissionMatrix
  };
}

export function defaultUserSettingsInput() {
  return {
    defaultLanding: DefaultLanding.DASHBOARD,
    reduceMotion: false,
    highContrast: false,
    fontScale: FontScale.MD,
    myQuickPhrasesJson: [],
    printPrefsJson: {
      paperSize: "LETTER",
      includeFooterMeta: true
    } satisfies PersonalPrintPrefs,
    shortcutsEnabled: true
  };
}

function asObject<T extends Record<string, unknown>>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  return { ...fallback, ...(value as T) };
}

export function asBusinessHours(value: unknown): BusinessHours {
  const fallback = defaultBusinessHours();
  const parsed = asObject(value, fallback);
  return {
    start: typeof parsed.start === "string" ? parsed.start : fallback.start,
    end: typeof parsed.end === "string" ? parsed.end : fallback.end,
    days: Array.isArray(parsed.days) ? parsed.days.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : fallback.days
  };
}

export function asPolicyFlags(value: unknown): PolicyFlags {
  const fallback = defaultPolicyFlags();
  const parsed = asObject(value, fallback);
  return {
    allowSmokingTracking: Boolean(parsed.allowSmokingTracking),
    hideTriggersInPrint: Boolean(parsed.hideTriggersInPrint),
    maskSensitiveFieldsInPrint: Boolean(parsed.maskSensitiveFieldsInPrint),
    maskFamilyContactInPrint: Boolean(parsed.maskFamilyContactInPrint)
  };
}

export function asAttendanceRules(value: unknown): AttendanceRules {
  const fallback = defaultAttendanceRules();
  const parsed = asObject(value, fallback);
  const weights = asObject(parsed.engagementWeights, fallback.engagementWeights);
  return {
    engagementWeights: {
      present: Number(weights.present) || fallback.engagementWeights.present,
      active: Number(weights.active) || fallback.engagementWeights.active,
      leading: Number(weights.leading) || fallback.engagementWeights.leading
    },
    requireBarrierNoteFor: Array.isArray(parsed.requireBarrierNoteFor)
      ? parsed.requireBarrierNoteFor.map(String)
      : fallback.requireBarrierNoteFor,
    groupMinutes: Number(parsed.groupMinutes) || fallback.groupMinutes,
    oneToOneMinutes: Number(parsed.oneToOneMinutes) || fallback.oneToOneMinutes,
    locations: Array.isArray(parsed.locations) ? parsed.locations.map(String).filter(Boolean) : fallback.locations,
    warnTherapyOverlap: Boolean(parsed.warnTherapyOverlap),
    warnOutsideBusinessHours: Boolean(parsed.warnOutsideBusinessHours),
    useBusinessHoursDefaults: parsed.useBusinessHoursDefaults === undefined ? fallback.useBusinessHoursDefaults : Boolean(parsed.useBusinessHoursDefaults)
  };
}

export function asDocumentationRules(value: unknown): DocumentationRules {
  const fallback = defaultDocumentationRules();
  const parsed = asObject(value, fallback);
  return {
    noteRequiredFields: Array.isArray(parsed.noteRequiredFields)
      ? parsed.noteRequiredFields
          .map(String)
          .filter((field): field is DocumentationRules["noteRequiredFields"][number] =>
            ["participationLevel", "moodAffect", "cuesRequired", "response", "followUp"].includes(field)
          )
      : fallback.noteRequiredFields,
    minNarrativeLen: Number(parsed.minNarrativeLen) || fallback.minNarrativeLen,
    requireGoalLinkForOneToOne: Boolean(parsed.requireGoalLinkForOneToOne)
  };
}

export function asCarePlanRules(value: unknown): CarePlanRules {
  const fallback = defaultCarePlanRules();
  const parsed = asObject(value, fallback);
  return {
    reviewCadenceDays: Number(parsed.reviewCadenceDays) || fallback.reviewCadenceDays,
    requirePersonalization: parsed.requirePersonalization === undefined ? fallback.requirePersonalization : Boolean(parsed.requirePersonalization),
    blockReviewCompletionIfGeneric: Boolean(parsed.blockReviewCompletionIfGeneric)
  };
}

export function asReportSettings(value: unknown): ReportSettings {
  const fallback = defaultReportSettings();
  const parsed = asObject(value, fallback);
  const includeSections = asObject(parsed.includeSections, fallback.includeSections);
  return {
    theme: parsed.theme === "CLASSIC" || parsed.theme === "CLEAN" || parsed.theme === "LIQUID_GLASS" ? parsed.theme : fallback.theme,
    accent: parsed.accent === "BLUE" || parsed.accent === "MINT" || parsed.accent === "CORAL" ? parsed.accent : fallback.accent,
    includeSections: {
      topPrograms: Boolean(includeSections.topPrograms),
      attendanceTrends: Boolean(includeSections.attendanceTrends),
      engagementAvg: Boolean(includeSections.engagementAvg),
      barriersSummary: Boolean(includeSections.barriersSummary),
      oneToOneTotals: Boolean(includeSections.oneToOneTotals),
      notableOutcomes: Boolean(includeSections.notableOutcomes),
      unitHeatmap: Boolean(includeSections.unitHeatmap)
    }
  };
}

export function asPrintDefaults(value: unknown): PrintDefaults {
  const fallback = defaultPrintDefaults();
  const parsed = asObject(value, fallback);
  return {
    paperSize: parsed.paperSize === "A4" ? "A4" : "LETTER",
    margins: parsed.margins === "NARROW" || parsed.margins === "WIDE" ? parsed.margins : "NORMAL",
    includeFooter: parsed.includeFooter === undefined ? fallback.includeFooter : Boolean(parsed.includeFooter),
    headerStyle: parsed.headerStyle === "CLEAN" || parsed.headerStyle === "CLASSIC" ? parsed.headerStyle : "GLASS",
    includeFooterMeta: parsed.includeFooterMeta === undefined ? fallback.includeFooterMeta : Boolean(parsed.includeFooterMeta)
  };
}

export function asInventoryDefaults(value: unknown): InventoryDefaults {
  const fallback = defaultInventoryDefaults();
  const parsed = asObject(value, fallback);
  return {
    reorderThresholdMultiplier: Number(parsed.reorderThresholdMultiplier) || fallback.reorderThresholdMultiplier,
    showLowStockBanner: parsed.showLowStockBanner === undefined ? fallback.showLowStockBanner : Boolean(parsed.showLowStockBanner),
    vendorNotes: typeof parsed.vendorNotes === "string" ? parsed.vendorNotes : fallback.vendorNotes
  };
}

export function asPrizeCartDefaults(value: unknown): PrizeCartDefaults {
  const fallback = defaultPrizeCartDefaults();
  const parsed = asObject(value, fallback);
  const presets = Array.isArray(parsed.presets)
    ? parsed.presets
        .map((item) => asObject(item, { category: "", defaultPriceCents: 0, reorderAt: 0 }))
        .filter((item) => item.category)
        .map((item) => ({
          category: String(item.category),
          defaultPriceCents: Number(item.defaultPriceCents) || 0,
          reorderAt: Number(item.reorderAt) || 0
        }))
    : fallback.presets;

  return {
    presets: presets.length ? presets : fallback.presets,
    enableRestockSuggestions:
      parsed.enableRestockSuggestions === undefined ? fallback.enableRestockSuggestions : Boolean(parsed.enableRestockSuggestions),
    restockAggressiveness:
      parsed.restockAggressiveness === "CONSERVATIVE" || parsed.restockAggressiveness === "AGGRESSIVE"
        ? parsed.restockAggressiveness
        : "BALANCED"
  };
}

export function asNotificationDefaults(value: unknown): NotificationDefaults {
  const fallback = defaultNotificationDefaults();
  const parsed = asObject(value, fallback);
  const lead = Number(parsed.reminderLeadTimeMinutes);
  return {
    dailyDigestEnabled: parsed.dailyDigestEnabled === undefined ? fallback.dailyDigestEnabled : Boolean(parsed.dailyDigestEnabled),
    dailyDigestTime: typeof parsed.dailyDigestTime === "string" ? parsed.dailyDigestTime : fallback.dailyDigestTime,
    weeklyDigestEnabled: parsed.weeklyDigestEnabled === undefined ? fallback.weeklyDigestEnabled : Boolean(parsed.weeklyDigestEnabled),
    weeklyDigestDay:
      parsed.weeklyDigestDay === "SUN" ||
      parsed.weeklyDigestDay === "MON" ||
      parsed.weeklyDigestDay === "TUE" ||
      parsed.weeklyDigestDay === "WED" ||
      parsed.weeklyDigestDay === "THU" ||
      parsed.weeklyDigestDay === "FRI" ||
      parsed.weeklyDigestDay === "SAT"
        ? parsed.weeklyDigestDay
        : fallback.weeklyDigestDay,
    taskReminders: parsed.taskReminders === undefined ? fallback.taskReminders : Boolean(parsed.taskReminders),
    reminderLeadTimeMinutes: lead === 15 || lead === 30 || lead === 60 || lead === 120 ? lead : fallback.reminderLeadTimeMinutes
  };
}

export function asComplianceDefaults(value: unknown): ComplianceDefaults {
  const fallback = defaultComplianceDefaults();
  const parsed = asObject(value, fallback);
  return {
    auditRetentionDays: Number(parsed.auditRetentionDays) || fallback.auditRetentionDays,
    exportRetentionDays: Number(parsed.exportRetentionDays) || fallback.exportRetentionDays,
    hideTriggersInPrint: parsed.hideTriggersInPrint === undefined ? fallback.hideTriggersInPrint : Boolean(parsed.hideTriggersInPrint),
    maskFamilyContactInPrint:
      parsed.maskFamilyContactInPrint === undefined ? fallback.maskFamilyContactInPrint : Boolean(parsed.maskFamilyContactInPrint)
  };
}

export function asRolePermissionMatrix(value: unknown): RolePermissionMatrix {
  const fallback = defaultRolePermissionMatrix;
  const parsed = asObject(value, fallback);

  const normalizeRole = (role: keyof RolePermissionMatrix) => {
    const roleMatrix = asObject(parsed[role], fallback[role]);
    return settingsPermissionKeys.reduce<Record<SettingsPermissionKey, boolean>>((acc, key) => {
      acc[key] = roleMatrix[key] === undefined ? fallback[role][key] : Boolean(roleMatrix[key]);
      return acc;
    }, {} as Record<SettingsPermissionKey, boolean>);
  };

  const normalized: RolePermissionMatrix = {
    ADMIN: normalizeRole("ADMIN"),
    AD: normalizeRole("AD"),
    ASSISTANT: normalizeRole("ASSISTANT"),
    READ_ONLY: normalizeRole("READ_ONLY")
  };

  normalized.READ_ONLY = settingsPermissionKeys.reduce<Record<SettingsPermissionKey, boolean>>((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Record<SettingsPermissionKey, boolean>);

  return normalized;
}

export function parseQuickPhrasesList(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 100);
}

export function joinQuickPhrasesList(items: unknown) {
  if (!Array.isArray(items)) return "";
  return items.map(String).filter(Boolean).join("\n");
}

export function asModuleFlagsFromSettings(value: unknown): ModuleFlags {
  return asModuleFlags(value ?? defaultModuleFlags);
}

export function parseFacilitySettingsRow(row: FacilitySettings) {
  return {
    timezone: row.timezone,
    businessHours: asBusinessHours(row.businessHoursJson),
    roomFormatRule: row.roomFormatRule,
    roomFormatHint: row.roomFormatHint ?? "",
    printDefaults: asPrintDefaults(row.printDefaultsJson),
    policyFlags: asPolicyFlags(row.policyFlagsJson),
    moduleFlags: asModuleFlagsFromSettings(row.moduleFlagsJson),
    attendanceRules: asAttendanceRules(row.attendanceRulesJson),
    documentationRules: asDocumentationRules(row.documentationRulesJson),
    carePlanRules: asCarePlanRules(row.carePlanRulesJson),
    reportSettings: asReportSettings(row.reportSettingsJson),
    inventoryDefaults: asInventoryDefaults(row.inventoryDefaultsJson),
    prizeCartDefaults: asPrizeCartDefaults(row.prizeCartDefaultsJson),
    notificationDefaults: asNotificationDefaults(row.notificationDefaultsJson),
    compliance: asComplianceDefaults(row.complianceJson),
    permissions: asRolePermissionMatrix(row.permissionsJson)
  };
}

export function parseUserSettingsRow(row: UserSettings) {
  return {
    defaultLanding: row.defaultLanding,
    reduceMotion: row.reduceMotion,
    highContrast: row.highContrast,
    fontScale: row.fontScale,
    myQuickPhrases: Array.isArray(row.myQuickPhrasesJson) ? row.myQuickPhrasesJson.map(String) : [],
    printPrefs: asObject(row.printPrefsJson, {
      paperSize: "LETTER",
      includeFooterMeta: true
    }),
    shortcutsEnabled: row.shortcutsEnabled
  };
}
