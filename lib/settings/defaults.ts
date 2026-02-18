import {
  DefaultLanding,
  FontScale,
  Role,
  RoomFormatRule,
  type FacilitySettings,
  type UserSettings
} from "@prisma/client";

import { asModuleFlags, defaultModuleFlags, type ModuleFlags } from "@/lib/module-flags";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UnknownRecord;
  }
  return {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  if (value === undefined) return fallback;
  return Boolean(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item)).map((item) => item.trim()).filter(Boolean);
}

function asObject<T extends UnknownRecord>(value: unknown, fallback: T): T {
  return { ...fallback, ...asRecord(value) };
}

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

export type FacilityType = "SNF" | "AssistedLiving" | "MemoryCare" | "Rehab";
export type ReportMonthMode = "CALENDAR_MONTH" | "ROLLING_30";
export type RoomNumberFormat = "ALPHA_NUM" | "NUMERIC" | "CUSTOM";

export type FacilityAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
};

export type ActivitySpace = {
  name: string;
  notes: string;
};

export type DirectoryContact = {
  role: string;
  name: string;
  phone: string;
  email: string;
};

export type SmokingPolicy = {
  enabled: boolean;
  scheduledTimes: string[];
  staffEscortRequired: boolean;
  countsAsActivity: boolean;
  activityLabel: string;
};

export type FacilityProfile = {
  dba: string;
  address: FacilityAddress;
  type: FacilityType;
  units: string[];
  roomNumberFormat: RoomNumberFormat;
  activitySpaces: ActivitySpace[];
  reportMonthMode: ReportMonthMode;
  branding: {
    logoUrl: string;
    accentColor: string;
    gradientPreset: string;
  };
  directoryContacts: DirectoryContact[];
  residentStatusLabels: string[];
  smoking: SmokingPolicy;
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
  calendarSettings: {
    defaultView: "DAY" | "WEEK" | "MONTH";
    colorMode: "BY_CATEGORY" | "BY_LOCATION" | "NONE";
    recurringDefaults: {
      enabled: boolean;
    };
    setupBufferMinutes: 0 | 5 | 10 | 15 | 30;
    staffAssignmentEnabled: boolean;
    attendanceMode: "QUICK_CHECK" | "DETAILED";
    reminders: {
      enabled: boolean;
      minutesBefore: number;
    };
    blackoutTimes: Array<{ label: string; start: string; end: string }>;
    holidayPacksEnabled: boolean;
    export: {
      icsEnabled: boolean;
      pdfEnabled: boolean;
    };
  };
};

export type DocumentationRules = {
  noteRequiredFields: Array<"participationLevel" | "moodAffect" | "cuesRequired" | "response" | "followUp">;
  minNarrativeLen: number;
  requireGoalLinkForOneToOne: boolean;
  onlyAllowTemplateNotes: boolean;
  lockNotesAfterDays: "OFF" | 3 | 7 | 14 | 30;
  signature: {
    required: boolean;
    supervisorCosign: boolean;
  };
  autoAddStandardLine: {
    enabled: boolean;
    text: string;
  };
  terminologyWarnings: {
    enabled: boolean;
  };
  attachments: {
    allowPhotos: boolean;
    allowPDFs: boolean;
    maxSizeMB: number;
  };
  lateEntryMode: {
    enabled: boolean;
    requireReason: boolean;
  };
  retentionYears: number;
};

export type CarePlanRules = {
  reviewCadenceDays: number;
  requirePersonalization: boolean;
  blockReviewCompletionIfGeneric: boolean;
  interventionsLibraryEnabled: boolean;
  defaultInterventions: string[];
  goalMappingEnabled: boolean;
  defaultFrequencies: {
    groupDefault: string;
    oneToOneDefault: string;
  };
  autoSuggestByTagsEnabled: boolean;
  reviewReminders: {
    enabled: boolean;
    days: 30 | 60 | 90;
  };
  export: {
    pdfEnabled: boolean;
    includeSignatureLine: boolean;
  };
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
  types: {
    monthlyCalendar: boolean;
    participationByResident: boolean;
    attendanceByActivity: boolean;
    oneToOneCompletionRate: boolean;
    carePlanComplianceSnapshot: boolean;
    residentCouncilMinutes: boolean;
  };
  defaultDateRange: "THIS_MONTH" | "LAST_MONTH" | "ROLLING_30";
  defaultUnitFilter: string[];
  scoring: {
    enabled: boolean;
    weights: {
      low: number;
      moderate: number;
      high: number;
    };
  };
  pdf: {
    includeLogo: boolean;
    headerStyle: "GLASS" | "CLEAN" | "CLASSIC";
    includeCharts: boolean;
  };
  autoGenerate: {
    enabled: boolean;
    dayOfMonth: number;
  };
  exportFormats: {
    pdf: boolean;
    csv: boolean;
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
  enabled: boolean;
  categories: string[];
  parLevels: {
    enabled: boolean;
  };
  lowStockAlerts: {
    enabled: boolean;
    thresholdMode: "BELOW_PAR" | "CUSTOM";
  };
  vendors: Array<{ name: string; link: string; notes: string }>;
  checkoutLog: {
    enabled: boolean;
  };
  budgetTracking: {
    enabled: boolean;
    monthlyBudget: number;
  };
  barcodeMode: {
    enabled: boolean;
  };
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
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  digest: {
    mode: "OFF" | "DAILY" | "WEEKLY";
    time: string;
  };
  triggers: {
    oneToOneDueToday: boolean;
    newAdmitAdded: boolean;
    dischargePendingDocs: boolean;
    lowInventory: boolean;
    carePlanReviewDue: boolean;
    noteNeedsCosign: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  escalation: {
    enabled: boolean;
    minutesAfterDue: number;
    notifyRole: Role;
  };
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
  hipaaMode: {
    enabled: boolean;
    autoLogoutMinutes: 5 | 10 | 15 | 30;
    maskPHIInExports: boolean;
  };
  accessLogs: {
    enabled: boolean;
  };
  exportRestrictions: {
    onlyAdminsCanExport: boolean;
  };
  security: {
    requireMFAForAdmins: boolean;
    deviceTrustEnabled: boolean;
  };
  dataRetention: {
    years: number;
  };
  incidentNotes: {
    enabled: boolean;
  };
};

export type PersonalPrintPrefs = {
  paperSize: "LETTER" | "A4";
  includeFooterMeta: boolean;
  personal?: PersonalSettings;
};

export type PersonalSettings = {
  profile: {
    displayName: string;
    title: string;
    initials: string;
  };
  defaults: {
    mood: string;
    cues: string;
    followUpText: string;
  };
  dashboard: {
    widgets: string[];
  };
  accessibility: {
    fontSize: "SM" | "MD" | "LG" | "XL";
    highContrast: boolean;
    reduceMotion: boolean;
  };
  shortcuts: Array<{ slashCommand: string; expansionText: string }>;
  notifications: {
    overrides: Record<string, boolean>;
  };
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

export type RolePermissionMatrix = Record<
  "ADMIN" | "AD" | "ASSISTANT" | "READ_ONLY",
  Record<SettingsPermissionKey, boolean>
>;

export type RoleSettingsRole = {
  name: string;
  description: string;
  scope: "WHOLE_BUILDING" | "ASSIGNED_UNITS";
  assignedUnits: string[];
  permissions: Record<SettingsPermissionKey, boolean>;
};

export type RoleSettingsConfig = {
  enabled: boolean;
  roleTemplatesSeeded: boolean;
  list: RoleSettingsRole[];
  notesRequireSupervisorApproval: boolean;
  autoRoleForNewUsers: Role;
  auditTrailEnabled: boolean;
};

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

export function defaultRoleSettingsConfig(): RoleSettingsConfig {
  return {
    enabled: true,
    roleTemplatesSeeded: true,
    list: [
      {
        name: "Admin",
        description: "Full access across settings and operations.",
        scope: "WHOLE_BUILDING",
        assignedUnits: [],
        permissions: { ...defaultRolePermissionMatrix.ADMIN }
      },
      {
        name: "Activities Director",
        description: "Leads programming, documentation, and reporting.",
        scope: "WHOLE_BUILDING",
        assignedUnits: [],
        permissions: { ...defaultRolePermissionMatrix.AD }
      },
      {
        name: "Staff",
        description: "Daily execution support with limited admin access.",
        scope: "WHOLE_BUILDING",
        assignedUnits: [],
        permissions: { ...defaultRolePermissionMatrix.ASSISTANT }
      },
      {
        name: "View Only",
        description: "Read-only access for oversight.",
        scope: "WHOLE_BUILDING",
        assignedUnits: [],
        permissions: { ...defaultRolePermissionMatrix.READ_ONLY }
      }
    ],
    notesRequireSupervisorApproval: false,
    autoRoleForNewUsers: Role.ASSISTANT,
    auditTrailEnabled: true
  };
}

export function defaultBusinessHours(): BusinessHours {
  return {
    start: "08:00",
    end: "17:00",
    days: [1, 2, 3, 4, 5]
  };
}

export function defaultFacilityProfile(): FacilityProfile {
  return {
    dba: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "TX",
      zip: ""
    },
    type: "SNF",
    units: [],
    roomNumberFormat: "ALPHA_NUM",
    activitySpaces: [],
    reportMonthMode: "CALENDAR_MONTH",
    branding: {
      logoUrl: "",
      accentColor: "#2C67F2",
      gradientPreset: "actify-default"
    },
    directoryContacts: [],
    residentStatusLabels: ["Active", "Bed Bound", "Discharged", "Hospital"],
    smoking: {
      enabled: true,
      scheduledTimes: [],
      staffEscortRequired: false,
      countsAsActivity: true,
      activityLabel: "Smoke Break"
    }
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
    useBusinessHoursDefaults: true,
    calendarSettings: {
      defaultView: "WEEK",
      colorMode: "BY_CATEGORY",
      recurringDefaults: { enabled: true },
      setupBufferMinutes: 5,
      staffAssignmentEnabled: false,
      attendanceMode: "DETAILED",
      reminders: {
        enabled: false,
        minutesBefore: 30
      },
      blackoutTimes: [],
      holidayPacksEnabled: true,
      export: {
        icsEnabled: true,
        pdfEnabled: true
      }
    }
  };
}

export function defaultDocumentationRules(): DocumentationRules {
  return {
    noteRequiredFields: ["participationLevel", "moodAffect", "cuesRequired", "response"],
    minNarrativeLen: 40,
    requireGoalLinkForOneToOne: false,
    onlyAllowTemplateNotes: false,
    lockNotesAfterDays: "OFF",
    signature: {
      required: false,
      supervisorCosign: false
    },
    autoAddStandardLine: {
      enabled: false,
      text: "Resident encouraged to participate in planned activity and offered adaptation as needed."
    },
    terminologyWarnings: {
      enabled: true
    },
    attachments: {
      allowPhotos: true,
      allowPDFs: true,
      maxSizeMB: 10
    },
    lateEntryMode: {
      enabled: true,
      requireReason: true
    },
    retentionYears: 7
  };
}

export function defaultCarePlanRules(): CarePlanRules {
  return {
    reviewCadenceDays: 30,
    requirePersonalization: true,
    blockReviewCompletionIfGeneric: false,
    interventionsLibraryEnabled: true,
    defaultInterventions: [],
    goalMappingEnabled: true,
    defaultFrequencies: {
      groupDefault: "Weekly",
      oneToOneDefault: "2x Weekly"
    },
    autoSuggestByTagsEnabled: true,
    reviewReminders: {
      enabled: true,
      days: 30
    },
    export: {
      pdfEnabled: true,
      includeSignatureLine: true
    }
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
    },
    types: {
      monthlyCalendar: true,
      participationByResident: true,
      attendanceByActivity: true,
      oneToOneCompletionRate: true,
      carePlanComplianceSnapshot: true,
      residentCouncilMinutes: true
    },
    defaultDateRange: "THIS_MONTH",
    defaultUnitFilter: [],
    scoring: {
      enabled: true,
      weights: {
        low: 1,
        moderate: 2,
        high: 3
      }
    },
    pdf: {
      includeLogo: true,
      headerStyle: "GLASS",
      includeCharts: true
    },
    autoGenerate: {
      enabled: false,
      dayOfMonth: 1
    },
    exportFormats: {
      pdf: true,
      csv: true
    }
  };
}

export function defaultInventoryDefaults(): InventoryDefaults {
  return {
    enabled: true,
    categories: ["Snacks", "Drinks", "Craft Supplies"],
    parLevels: {
      enabled: true
    },
    lowStockAlerts: {
      enabled: true,
      thresholdMode: "BELOW_PAR"
    },
    vendors: [],
    checkoutLog: {
      enabled: true
    },
    budgetTracking: {
      enabled: true,
      monthlyBudget: 500
    },
    barcodeMode: {
      enabled: false
    },
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
    channels: {
      inApp: true,
      email: false,
      push: false
    },
    digest: {
      mode: "WEEKLY",
      time: "09:00"
    },
    triggers: {
      oneToOneDueToday: true,
      newAdmitAdded: true,
      dischargePendingDocs: true,
      lowInventory: true,
      carePlanReviewDue: true,
      noteNeedsCosign: true
    },
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "06:00"
    },
    escalation: {
      enabled: false,
      minutesAfterDue: 60,
      notifyRole: Role.AD
    },
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
    maskFamilyContactInPrint: true,
    hipaaMode: {
      enabled: true,
      autoLogoutMinutes: 15,
      maskPHIInExports: true
    },
    accessLogs: {
      enabled: true
    },
    exportRestrictions: {
      onlyAdminsCanExport: false
    },
    security: {
      requireMFAForAdmins: false,
      deviceTrustEnabled: false
    },
    dataRetention: {
      years: 7
    },
    incidentNotes: {
      enabled: true
    }
  };
}

export function defaultPersonalSettings(): PersonalSettings {
  return {
    profile: {
      displayName: "",
      title: "",
      initials: ""
    },
    defaults: {
      mood: "Calm",
      cues: "Verbal",
      followUpText: ""
    },
    dashboard: {
      widgets: ["oneToOneDueList", "birthdays", "monthlyParticipationSnapshot"]
    },
    accessibility: {
      fontSize: "MD",
      highContrast: false,
      reduceMotion: false
    },
    shortcuts: [],
    notifications: {
      overrides: {}
    }
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
    policyFlagsJson: {
      ...defaultPolicyFlags(),
      facilityProfile: defaultFacilityProfile()
    },
    moduleFlagsJson: moduleFlags,
    attendanceRulesJson: defaultAttendanceRules(),
    documentationRulesJson: defaultDocumentationRules(),
    carePlanRulesJson: defaultCarePlanRules(),
    reportSettingsJson: defaultReportSettings(),
    inventoryDefaultsJson: defaultInventoryDefaults(),
    prizeCartDefaultsJson: defaultPrizeCartDefaults(),
    notificationDefaultsJson: defaultNotificationDefaults(),
    complianceJson: defaultComplianceDefaults(),
    permissionsJson: {
      matrix: defaultRolePermissionMatrix,
      roles: defaultRoleSettingsConfig()
    }
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
      includeFooterMeta: true,
      personal: defaultPersonalSettings()
    } satisfies PersonalPrintPrefs,
    shortcutsEnabled: true
  };
}

export function asBusinessHours(value: unknown): BusinessHours {
  const fallback = defaultBusinessHours();
  const parsed = asObject(value, fallback);
  return {
    start: asString(parsed.start, fallback.start),
    end: asString(parsed.end, fallback.end),
    days: Array.isArray(parsed.days)
      ? parsed.days
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : fallback.days
  };
}

export function asPolicyFlags(value: unknown): PolicyFlags {
  const fallback = defaultPolicyFlags();
  const parsed = asObject(value, fallback);
  return {
    allowSmokingTracking: asBoolean(parsed.allowSmokingTracking, fallback.allowSmokingTracking),
    hideTriggersInPrint: asBoolean(parsed.hideTriggersInPrint, fallback.hideTriggersInPrint),
    maskSensitiveFieldsInPrint: asBoolean(parsed.maskSensitiveFieldsInPrint, fallback.maskSensitiveFieldsInPrint),
    maskFamilyContactInPrint: asBoolean(parsed.maskFamilyContactInPrint, fallback.maskFamilyContactInPrint)
  };
}

export function asFacilityProfile(value: unknown): FacilityProfile {
  const fallback = defaultFacilityProfile();
  const parsed = asRecord(value);
  const fromNested = asRecord(parsed.facilityProfile);
  const source = Object.keys(fromNested).length > 0 ? fromNested : parsed;

  const smokingRaw = asObject(source.smoking, fallback.smoking);
  const addressRaw = asObject(source.address, fallback.address);
  const brandingRaw = asObject(source.branding, fallback.branding);

  const baseProfile: FacilityProfile = {
    dba: asString(source.dba, fallback.dba),
    address: {
      line1: asString(addressRaw.line1, fallback.address.line1),
      line2: asString(addressRaw.line2, fallback.address.line2),
      city: asString(addressRaw.city, fallback.address.city),
      state: asString(addressRaw.state, fallback.address.state),
      zip: asString(addressRaw.zip, fallback.address.zip)
    },
    type:
      source.type === "AssistedLiving" || source.type === "MemoryCare" || source.type === "Rehab"
        ? source.type
        : "SNF",
    units: asStringArray(source.units, fallback.units),
    roomNumberFormat:
      source.roomNumberFormat === "NUMERIC" || source.roomNumberFormat === "CUSTOM"
        ? source.roomNumberFormat
        : "ALPHA_NUM",
    activitySpaces: Array.isArray(source.activitySpaces)
      ? source.activitySpaces
          .map((item) => asObject(item, { name: "", notes: "" }))
          .map((item) => ({
            name: asString(item.name),
            notes: asString(item.notes)
          }))
          .filter((item) => item.name.length > 0)
      : fallback.activitySpaces,
    reportMonthMode: source.reportMonthMode === "ROLLING_30" ? "ROLLING_30" : "CALENDAR_MONTH",
    branding: {
      logoUrl: asString(brandingRaw.logoUrl, fallback.branding.logoUrl),
      accentColor: asString(brandingRaw.accentColor, fallback.branding.accentColor),
      gradientPreset: asString(brandingRaw.gradientPreset, fallback.branding.gradientPreset)
    },
    directoryContacts: Array.isArray(source.directoryContacts)
      ? source.directoryContacts
          .map((item) => asObject(item, { role: "", name: "", phone: "", email: "" }))
          .map((item) => ({
            role: asString(item.role),
            name: asString(item.name),
            phone: asString(item.phone),
            email: asString(item.email)
          }))
          .filter((item) => item.role.length > 0 || item.name.length > 0 || item.phone.length > 0 || item.email.length > 0)
      : fallback.directoryContacts,
    residentStatusLabels: asStringArray(source.residentStatusLabels, fallback.residentStatusLabels),
    smoking: {
      enabled: asBoolean(smokingRaw.enabled, fallback.smoking.enabled),
      scheduledTimes: asStringArray(smokingRaw.scheduledTimes, fallback.smoking.scheduledTimes),
      staffEscortRequired: asBoolean(smokingRaw.staffEscortRequired, fallback.smoking.staffEscortRequired),
      countsAsActivity: asBoolean(smokingRaw.countsAsActivity, fallback.smoking.countsAsActivity),
      activityLabel: asString(smokingRaw.activityLabel, fallback.smoking.activityLabel)
    }
  };

  if (parsed.allowSmokingTracking !== undefined) {
    baseProfile.smoking.enabled = Boolean(parsed.allowSmokingTracking);
  }

  return baseProfile;
}

export function asAttendanceRules(value: unknown): AttendanceRules {
  const fallback = defaultAttendanceRules();
  const parsed = asObject(value, fallback);
  const weights = asObject(parsed.engagementWeights, fallback.engagementWeights);
  const calendarSettings = asObject(parsed.calendarSettings, fallback.calendarSettings);
  const reminders = asObject(calendarSettings.reminders, fallback.calendarSettings.reminders);
  const recurringDefaults = asObject(calendarSettings.recurringDefaults, fallback.calendarSettings.recurringDefaults);
  const exportSettings = asObject(calendarSettings.export, fallback.calendarSettings.export);

  const setupBuffer = asNumber(calendarSettings.setupBufferMinutes, fallback.calendarSettings.setupBufferMinutes);

  return {
    engagementWeights: {
      present: asNumber(weights.present, fallback.engagementWeights.present),
      active: asNumber(weights.active, fallback.engagementWeights.active),
      leading: asNumber(weights.leading, fallback.engagementWeights.leading)
    },
    requireBarrierNoteFor: asStringArray(parsed.requireBarrierNoteFor, fallback.requireBarrierNoteFor),
    groupMinutes: asNumber(parsed.groupMinutes, fallback.groupMinutes),
    oneToOneMinutes: asNumber(parsed.oneToOneMinutes, fallback.oneToOneMinutes),
    locations: asStringArray(parsed.locations, fallback.locations),
    warnTherapyOverlap: asBoolean(parsed.warnTherapyOverlap, fallback.warnTherapyOverlap),
    warnOutsideBusinessHours: asBoolean(parsed.warnOutsideBusinessHours, fallback.warnOutsideBusinessHours),
    useBusinessHoursDefaults: asBoolean(parsed.useBusinessHoursDefaults, fallback.useBusinessHoursDefaults),
    calendarSettings: {
      defaultView:
        calendarSettings.defaultView === "DAY" || calendarSettings.defaultView === "MONTH"
          ? calendarSettings.defaultView
          : "WEEK",
      colorMode:
        calendarSettings.colorMode === "BY_LOCATION" || calendarSettings.colorMode === "NONE"
          ? calendarSettings.colorMode
          : "BY_CATEGORY",
      recurringDefaults: {
        enabled: asBoolean(recurringDefaults.enabled, fallback.calendarSettings.recurringDefaults.enabled)
      },
      setupBufferMinutes: setupBuffer === 0 || setupBuffer === 5 || setupBuffer === 10 || setupBuffer === 15 ? setupBuffer : 30,
      staffAssignmentEnabled: asBoolean(calendarSettings.staffAssignmentEnabled, fallback.calendarSettings.staffAssignmentEnabled),
      attendanceMode: calendarSettings.attendanceMode === "QUICK_CHECK" ? "QUICK_CHECK" : "DETAILED",
      reminders: {
        enabled: asBoolean(reminders.enabled, fallback.calendarSettings.reminders.enabled),
        minutesBefore: asNumber(reminders.minutesBefore, fallback.calendarSettings.reminders.minutesBefore)
      },
      blackoutTimes: Array.isArray(calendarSettings.blackoutTimes)
        ? calendarSettings.blackoutTimes
            .map((item) => asObject(item, { label: "", start: "", end: "" }))
            .map((item) => ({
              label: asString(item.label),
              start: asString(item.start),
              end: asString(item.end)
            }))
            .filter((item) => item.label.length > 0 || item.start.length > 0 || item.end.length > 0)
        : fallback.calendarSettings.blackoutTimes,
      holidayPacksEnabled: asBoolean(calendarSettings.holidayPacksEnabled, fallback.calendarSettings.holidayPacksEnabled),
      export: {
        icsEnabled: asBoolean(exportSettings.icsEnabled, fallback.calendarSettings.export.icsEnabled),
        pdfEnabled: asBoolean(exportSettings.pdfEnabled, fallback.calendarSettings.export.pdfEnabled)
      }
    }
  };
}

export function asDocumentationRules(value: unknown): DocumentationRules {
  const fallback = defaultDocumentationRules();
  const parsed = asObject(value, fallback);
  const signature = asObject(parsed.signature, fallback.signature);
  const autoAddStandardLine = asObject(parsed.autoAddStandardLine, fallback.autoAddStandardLine);
  const terminologyWarnings = asObject(parsed.terminologyWarnings, fallback.terminologyWarnings);
  const attachments = asObject(parsed.attachments, fallback.attachments);
  const lateEntryMode = asObject(parsed.lateEntryMode, fallback.lateEntryMode);

  const lockDays = parsed.lockNotesAfterDays;
  const normalizedLock =
    lockDays === 3 || lockDays === 7 || lockDays === 14 || lockDays === 30 || lockDays === "OFF"
      ? lockDays
      : fallback.lockNotesAfterDays;

  return {
    noteRequiredFields: Array.isArray(parsed.noteRequiredFields)
      ? parsed.noteRequiredFields
          .map(String)
          .filter((field): field is DocumentationRules["noteRequiredFields"][number] =>
            ["participationLevel", "moodAffect", "cuesRequired", "response", "followUp"].includes(field)
          )
      : fallback.noteRequiredFields,
    minNarrativeLen: asNumber(parsed.minNarrativeLen, fallback.minNarrativeLen),
    requireGoalLinkForOneToOne: asBoolean(parsed.requireGoalLinkForOneToOne, fallback.requireGoalLinkForOneToOne),
    onlyAllowTemplateNotes: asBoolean(parsed.onlyAllowTemplateNotes, fallback.onlyAllowTemplateNotes),
    lockNotesAfterDays: normalizedLock,
    signature: {
      required: asBoolean(signature.required, fallback.signature.required),
      supervisorCosign: asBoolean(signature.supervisorCosign, fallback.signature.supervisorCosign)
    },
    autoAddStandardLine: {
      enabled: asBoolean(autoAddStandardLine.enabled, fallback.autoAddStandardLine.enabled),
      text: asString(autoAddStandardLine.text, fallback.autoAddStandardLine.text)
    },
    terminologyWarnings: {
      enabled: asBoolean(terminologyWarnings.enabled, fallback.terminologyWarnings.enabled)
    },
    attachments: {
      allowPhotos: asBoolean(attachments.allowPhotos, fallback.attachments.allowPhotos),
      allowPDFs: asBoolean(attachments.allowPDFs, fallback.attachments.allowPDFs),
      maxSizeMB: asNumber(attachments.maxSizeMB, fallback.attachments.maxSizeMB)
    },
    lateEntryMode: {
      enabled: asBoolean(lateEntryMode.enabled, fallback.lateEntryMode.enabled),
      requireReason: asBoolean(lateEntryMode.requireReason, fallback.lateEntryMode.requireReason)
    },
    retentionYears: asNumber(parsed.retentionYears, fallback.retentionYears)
  };
}

export function asCarePlanRules(value: unknown): CarePlanRules {
  const fallback = defaultCarePlanRules();
  const parsed = asObject(value, fallback);
  const defaultFrequencies = asObject(parsed.defaultFrequencies, fallback.defaultFrequencies);
  const reviewReminders = asObject(parsed.reviewReminders, fallback.reviewReminders);
  const exportSettings = asObject(parsed.export, fallback.export);

  const reminderDays =
    reviewReminders.days === 30 || reviewReminders.days === 60 || reviewReminders.days === 90
      ? reviewReminders.days
      : fallback.reviewReminders.days;

  return {
    reviewCadenceDays: asNumber(parsed.reviewCadenceDays, fallback.reviewCadenceDays),
    requirePersonalization: asBoolean(parsed.requirePersonalization, fallback.requirePersonalization),
    blockReviewCompletionIfGeneric: asBoolean(
      parsed.blockReviewCompletionIfGeneric,
      fallback.blockReviewCompletionIfGeneric
    ),
    interventionsLibraryEnabled: asBoolean(parsed.interventionsLibraryEnabled, fallback.interventionsLibraryEnabled),
    defaultInterventions: asStringArray(parsed.defaultInterventions, fallback.defaultInterventions),
    goalMappingEnabled: asBoolean(parsed.goalMappingEnabled, fallback.goalMappingEnabled),
    defaultFrequencies: {
      groupDefault: asString(defaultFrequencies.groupDefault, fallback.defaultFrequencies.groupDefault),
      oneToOneDefault: asString(defaultFrequencies.oneToOneDefault, fallback.defaultFrequencies.oneToOneDefault)
    },
    autoSuggestByTagsEnabled: asBoolean(parsed.autoSuggestByTagsEnabled, fallback.autoSuggestByTagsEnabled),
    reviewReminders: {
      enabled: asBoolean(reviewReminders.enabled, fallback.reviewReminders.enabled),
      days: reminderDays
    },
    export: {
      pdfEnabled: asBoolean(exportSettings.pdfEnabled, fallback.export.pdfEnabled),
      includeSignatureLine: asBoolean(exportSettings.includeSignatureLine, fallback.export.includeSignatureLine)
    }
  };
}

export function asReportSettings(value: unknown): ReportSettings {
  const fallback = defaultReportSettings();
  const parsed = asObject(value, fallback);
  const includeSections = asObject(parsed.includeSections, fallback.includeSections);
  const types = asObject(parsed.types, fallback.types);
  const scoring = asObject(parsed.scoring, fallback.scoring);
  const scoringWeights = asObject(scoring.weights, fallback.scoring.weights);
  const pdfSettings = asObject(parsed.pdf, fallback.pdf);
  const autoGenerate = asObject(parsed.autoGenerate, fallback.autoGenerate);
  const exportFormats = asObject(parsed.exportFormats, fallback.exportFormats);

  return {
    theme:
      parsed.theme === "CLASSIC" || parsed.theme === "CLEAN" || parsed.theme === "LIQUID_GLASS"
        ? parsed.theme
        : fallback.theme,
    accent: parsed.accent === "BLUE" || parsed.accent === "MINT" || parsed.accent === "CORAL" ? parsed.accent : fallback.accent,
    includeSections: {
      topPrograms: asBoolean(includeSections.topPrograms, fallback.includeSections.topPrograms),
      attendanceTrends: asBoolean(includeSections.attendanceTrends, fallback.includeSections.attendanceTrends),
      engagementAvg: asBoolean(includeSections.engagementAvg, fallback.includeSections.engagementAvg),
      barriersSummary: asBoolean(includeSections.barriersSummary, fallback.includeSections.barriersSummary),
      oneToOneTotals: asBoolean(includeSections.oneToOneTotals, fallback.includeSections.oneToOneTotals),
      notableOutcomes: asBoolean(includeSections.notableOutcomes, fallback.includeSections.notableOutcomes),
      unitHeatmap: asBoolean(includeSections.unitHeatmap, fallback.includeSections.unitHeatmap)
    },
    types: {
      monthlyCalendar: asBoolean(types.monthlyCalendar, fallback.types.monthlyCalendar),
      participationByResident: asBoolean(types.participationByResident, fallback.types.participationByResident),
      attendanceByActivity: asBoolean(types.attendanceByActivity, fallback.types.attendanceByActivity),
      oneToOneCompletionRate: asBoolean(types.oneToOneCompletionRate, fallback.types.oneToOneCompletionRate),
      carePlanComplianceSnapshot: asBoolean(
        types.carePlanComplianceSnapshot,
        fallback.types.carePlanComplianceSnapshot
      ),
      residentCouncilMinutes: asBoolean(types.residentCouncilMinutes, fallback.types.residentCouncilMinutes)
    },
    defaultDateRange:
      parsed.defaultDateRange === "LAST_MONTH" || parsed.defaultDateRange === "ROLLING_30"
        ? parsed.defaultDateRange
        : "THIS_MONTH",
    defaultUnitFilter: asStringArray(parsed.defaultUnitFilter, fallback.defaultUnitFilter),
    scoring: {
      enabled: asBoolean(scoring.enabled, fallback.scoring.enabled),
      weights: {
        low: asNumber(scoringWeights.low, fallback.scoring.weights.low),
        moderate: asNumber(scoringWeights.moderate, fallback.scoring.weights.moderate),
        high: asNumber(scoringWeights.high, fallback.scoring.weights.high)
      }
    },
    pdf: {
      includeLogo: asBoolean(pdfSettings.includeLogo, fallback.pdf.includeLogo),
      headerStyle:
        pdfSettings.headerStyle === "CLEAN" || pdfSettings.headerStyle === "CLASSIC"
          ? pdfSettings.headerStyle
          : "GLASS",
      includeCharts: asBoolean(pdfSettings.includeCharts, fallback.pdf.includeCharts)
    },
    autoGenerate: {
      enabled: asBoolean(autoGenerate.enabled, fallback.autoGenerate.enabled),
      dayOfMonth: asNumber(autoGenerate.dayOfMonth, fallback.autoGenerate.dayOfMonth)
    },
    exportFormats: {
      pdf: asBoolean(exportFormats.pdf, fallback.exportFormats.pdf),
      csv: asBoolean(exportFormats.csv, fallback.exportFormats.csv)
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
    includeFooterMeta:
      parsed.includeFooterMeta === undefined ? fallback.includeFooterMeta : Boolean(parsed.includeFooterMeta)
  };
}

export function asInventoryDefaults(value: unknown): InventoryDefaults {
  const fallback = defaultInventoryDefaults();
  const parsed = asObject(value, fallback);
  const parLevels = asObject(parsed.parLevels, fallback.parLevels);
  const lowStockAlerts = asObject(parsed.lowStockAlerts, fallback.lowStockAlerts);
  const checkoutLog = asObject(parsed.checkoutLog, fallback.checkoutLog);
  const budgetTracking = asObject(parsed.budgetTracking, fallback.budgetTracking);
  const barcodeMode = asObject(parsed.barcodeMode, fallback.barcodeMode);

  return {
    enabled: asBoolean(parsed.enabled, fallback.enabled),
    categories: asStringArray(parsed.categories, fallback.categories),
    parLevels: {
      enabled: asBoolean(parLevels.enabled, fallback.parLevels.enabled)
    },
    lowStockAlerts: {
      enabled: asBoolean(lowStockAlerts.enabled, fallback.lowStockAlerts.enabled),
      thresholdMode: lowStockAlerts.thresholdMode === "CUSTOM" ? "CUSTOM" : "BELOW_PAR"
    },
    vendors: Array.isArray(parsed.vendors)
      ? parsed.vendors
          .map((item) => asObject(item, { name: "", link: "", notes: "" }))
          .map((item) => ({
            name: asString(item.name),
            link: asString(item.link),
            notes: asString(item.notes)
          }))
          .filter((item) => item.name.length > 0 || item.link.length > 0 || item.notes.length > 0)
      : fallback.vendors,
    checkoutLog: {
      enabled: asBoolean(checkoutLog.enabled, fallback.checkoutLog.enabled)
    },
    budgetTracking: {
      enabled: asBoolean(budgetTracking.enabled, fallback.budgetTracking.enabled),
      monthlyBudget: asNumber(budgetTracking.monthlyBudget, fallback.budgetTracking.monthlyBudget)
    },
    barcodeMode: {
      enabled: asBoolean(barcodeMode.enabled, fallback.barcodeMode.enabled)
    },
    reorderThresholdMultiplier: asNumber(parsed.reorderThresholdMultiplier, fallback.reorderThresholdMultiplier),
    showLowStockBanner: asBoolean(parsed.showLowStockBanner, fallback.showLowStockBanner),
    vendorNotes: asString(parsed.vendorNotes, fallback.vendorNotes)
  };
}

export function asPrizeCartDefaults(value: unknown): PrizeCartDefaults {
  const fallback = defaultPrizeCartDefaults();
  const parsed = asObject(value, fallback);
  const presets = Array.isArray(parsed.presets)
    ? parsed.presets
        .map((item) => asObject(item, { category: "", defaultPriceCents: 0, reorderAt: 0 }))
        .filter((item) => asString(item.category).length > 0)
        .map((item) => ({
          category: asString(item.category),
          defaultPriceCents: asNumber(item.defaultPriceCents, 0),
          reorderAt: asNumber(item.reorderAt, 0)
        }))
    : fallback.presets;

  return {
    presets: presets.length > 0 ? presets : fallback.presets,
    enableRestockSuggestions: asBoolean(parsed.enableRestockSuggestions, fallback.enableRestockSuggestions),
    restockAggressiveness:
      parsed.restockAggressiveness === "CONSERVATIVE" || parsed.restockAggressiveness === "AGGRESSIVE"
        ? parsed.restockAggressiveness
        : "BALANCED"
  };
}

export function asNotificationDefaults(value: unknown): NotificationDefaults {
  const fallback = defaultNotificationDefaults();
  const parsed = asObject(value, fallback);
  const channels = asObject(parsed.channels, fallback.channels);
  const digest = asObject(parsed.digest, fallback.digest);
  const triggers = asObject(parsed.triggers, fallback.triggers);
  const quietHours = asObject(parsed.quietHours, fallback.quietHours);
  const escalation = asObject(parsed.escalation, fallback.escalation);
  const lead = asNumber(parsed.reminderLeadTimeMinutes, fallback.reminderLeadTimeMinutes);
  const weeklyDay = asString(parsed.weeklyDigestDay, fallback.weeklyDigestDay);
  const notifyRole = asString(escalation.notifyRole, fallback.escalation.notifyRole);

  return {
    channels: {
      inApp: asBoolean(channels.inApp, fallback.channels.inApp),
      email: asBoolean(channels.email, fallback.channels.email),
      push: asBoolean(channels.push, fallback.channels.push)
    },
    digest: {
      mode: digest.mode === "DAILY" || digest.mode === "WEEKLY" ? digest.mode : "OFF",
      time: asString(digest.time, fallback.digest.time)
    },
    triggers: {
      oneToOneDueToday: asBoolean(triggers.oneToOneDueToday, fallback.triggers.oneToOneDueToday),
      newAdmitAdded: asBoolean(triggers.newAdmitAdded, fallback.triggers.newAdmitAdded),
      dischargePendingDocs: asBoolean(triggers.dischargePendingDocs, fallback.triggers.dischargePendingDocs),
      lowInventory: asBoolean(triggers.lowInventory, fallback.triggers.lowInventory),
      carePlanReviewDue: asBoolean(triggers.carePlanReviewDue, fallback.triggers.carePlanReviewDue),
      noteNeedsCosign: asBoolean(triggers.noteNeedsCosign, fallback.triggers.noteNeedsCosign)
    },
    quietHours: {
      enabled: asBoolean(quietHours.enabled, fallback.quietHours.enabled),
      start: asString(quietHours.start, fallback.quietHours.start),
      end: asString(quietHours.end, fallback.quietHours.end)
    },
    escalation: {
      enabled: asBoolean(escalation.enabled, fallback.escalation.enabled),
      minutesAfterDue: asNumber(escalation.minutesAfterDue, fallback.escalation.minutesAfterDue),
      notifyRole:
        notifyRole === Role.ADMIN || notifyRole === Role.ASSISTANT || notifyRole === Role.READ_ONLY ? notifyRole : Role.AD
    },
    dailyDigestEnabled: asBoolean(parsed.dailyDigestEnabled, fallback.dailyDigestEnabled),
    dailyDigestTime: asString(parsed.dailyDigestTime, fallback.dailyDigestTime),
    weeklyDigestEnabled: asBoolean(parsed.weeklyDigestEnabled, fallback.weeklyDigestEnabled),
    weeklyDigestDay:
      weeklyDay === "SUN" ||
      weeklyDay === "MON" ||
      weeklyDay === "TUE" ||
      weeklyDay === "WED" ||
      weeklyDay === "THU" ||
      weeklyDay === "FRI" ||
      weeklyDay === "SAT"
        ? weeklyDay
        : fallback.weeklyDigestDay,
    taskReminders: asBoolean(parsed.taskReminders, fallback.taskReminders),
    reminderLeadTimeMinutes: lead === 15 || lead === 30 || lead === 60 || lead === 120 ? lead : fallback.reminderLeadTimeMinutes
  };
}

export function asComplianceDefaults(value: unknown): ComplianceDefaults {
  const fallback = defaultComplianceDefaults();
  const parsed = asObject(value, fallback);
  const hipaaMode = asObject(parsed.hipaaMode, fallback.hipaaMode);
  const accessLogs = asObject(parsed.accessLogs, fallback.accessLogs);
  const exportRestrictions = asObject(parsed.exportRestrictions, fallback.exportRestrictions);
  const security = asObject(parsed.security, fallback.security);
  const dataRetention = asObject(parsed.dataRetention, fallback.dataRetention);
  const incidentNotes = asObject(parsed.incidentNotes, fallback.incidentNotes);

  const autoLogout = asNumber(hipaaMode.autoLogoutMinutes, fallback.hipaaMode.autoLogoutMinutes);

  return {
    auditRetentionDays: asNumber(parsed.auditRetentionDays, fallback.auditRetentionDays),
    exportRetentionDays: asNumber(parsed.exportRetentionDays, fallback.exportRetentionDays),
    hideTriggersInPrint: asBoolean(parsed.hideTriggersInPrint, fallback.hideTriggersInPrint),
    maskFamilyContactInPrint: asBoolean(parsed.maskFamilyContactInPrint, fallback.maskFamilyContactInPrint),
    hipaaMode: {
      enabled: asBoolean(hipaaMode.enabled, fallback.hipaaMode.enabled),
      autoLogoutMinutes: autoLogout === 5 || autoLogout === 10 || autoLogout === 30 ? autoLogout : 15,
      maskPHIInExports: asBoolean(hipaaMode.maskPHIInExports, fallback.hipaaMode.maskPHIInExports)
    },
    accessLogs: {
      enabled: asBoolean(accessLogs.enabled, fallback.accessLogs.enabled)
    },
    exportRestrictions: {
      onlyAdminsCanExport: asBoolean(
        exportRestrictions.onlyAdminsCanExport,
        fallback.exportRestrictions.onlyAdminsCanExport
      )
    },
    security: {
      requireMFAForAdmins: asBoolean(security.requireMFAForAdmins, fallback.security.requireMFAForAdmins),
      deviceTrustEnabled: asBoolean(security.deviceTrustEnabled, fallback.security.deviceTrustEnabled)
    },
    dataRetention: {
      years: asNumber(dataRetention.years, fallback.dataRetention.years)
    },
    incidentNotes: {
      enabled: asBoolean(incidentNotes.enabled, fallback.incidentNotes.enabled)
    }
  };
}

export function asRolePermissionMatrix(value: unknown): RolePermissionMatrix {
  const envelope = asRecord(value);
  const candidate = envelope.matrix ? envelope.matrix : envelope;
  const parsed = asObject(candidate, defaultRolePermissionMatrix);

  const normalizeRole = (role: keyof RolePermissionMatrix) => {
    const roleMatrix = asObject(parsed[role], defaultRolePermissionMatrix[role]);
    return settingsPermissionKeys.reduce<Record<SettingsPermissionKey, boolean>>((acc, key) => {
      acc[key] = roleMatrix[key] === undefined ? defaultRolePermissionMatrix[role][key] : Boolean(roleMatrix[key]);
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

export function asRoleSettingsConfig(value: unknown): RoleSettingsConfig {
  const fallback = defaultRoleSettingsConfig();
  const envelope = asRecord(value);
  const source = envelope.roles ? envelope.roles : envelope;
  const parsed = asObject(source, fallback);

  const list = Array.isArray(parsed.list)
    ? parsed.list
        .map((item) =>
          asObject(item, {
            name: "",
            description: "",
            scope: "WHOLE_BUILDING" as RoleSettingsRole["scope"],
            assignedUnits: [],
            permissions: defaultRolePermissionMatrix.ASSISTANT
          })
        )
        .map((item): RoleSettingsRole => ({
          name: asString(item.name),
          description: asString(item.description),
          scope: item.scope === "ASSIGNED_UNITS" ? "ASSIGNED_UNITS" : "WHOLE_BUILDING",
          assignedUnits: asStringArray(item.assignedUnits),
          permissions: settingsPermissionKeys.reduce<Record<SettingsPermissionKey, boolean>>((acc, key) => {
            const permissionObject = asObject(item.permissions, defaultRolePermissionMatrix.ASSISTANT);
            acc[key] = Boolean(permissionObject[key]);
            return acc;
          }, {} as Record<SettingsPermissionKey, boolean>)
        }))
        .filter((item) => item.name.length > 0)
    : fallback.list;

  const autoRole = asString(parsed.autoRoleForNewUsers, fallback.autoRoleForNewUsers);

  return {
    enabled: asBoolean(parsed.enabled, fallback.enabled),
    roleTemplatesSeeded: asBoolean(parsed.roleTemplatesSeeded, fallback.roleTemplatesSeeded),
    list: list.length > 0 ? list : fallback.list,
    notesRequireSupervisorApproval: asBoolean(
      parsed.notesRequireSupervisorApproval,
      fallback.notesRequireSupervisorApproval
    ),
    autoRoleForNewUsers:
      autoRole === Role.ADMIN || autoRole === Role.ASSISTANT || autoRole === Role.READ_ONLY ? autoRole : Role.AD,
    auditTrailEnabled: asBoolean(parsed.auditTrailEnabled, fallback.auditTrailEnabled)
  };
}

export function buildPermissionsJsonEnvelope(
  matrix: RolePermissionMatrix,
  roles: RoleSettingsConfig
): { matrix: RolePermissionMatrix; roles: RoleSettingsConfig } {
  return {
    matrix: asRolePermissionMatrix(matrix),
    roles: asRoleSettingsConfig(roles)
  };
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

export function asPersonalSettings(value: unknown): PersonalSettings {
  const fallback = defaultPersonalSettings();
  const parsed = asObject(value, fallback);
  const profile = asObject(parsed.profile, fallback.profile);
  const defaults = asObject(parsed.defaults, fallback.defaults);
  const dashboard = asObject(parsed.dashboard, fallback.dashboard);
  const accessibility = asObject(parsed.accessibility, fallback.accessibility);
  const notifications = asObject(parsed.notifications, fallback.notifications);
  const overrides = asRecord(notifications.overrides);

  return {
    profile: {
      displayName: asString(profile.displayName, fallback.profile.displayName),
      title: asString(profile.title, fallback.profile.title),
      initials: asString(profile.initials, fallback.profile.initials)
    },
    defaults: {
      mood: asString(defaults.mood, fallback.defaults.mood),
      cues: asString(defaults.cues, fallback.defaults.cues),
      followUpText: asString(defaults.followUpText, fallback.defaults.followUpText)
    },
    dashboard: {
      widgets: asStringArray(dashboard.widgets, fallback.dashboard.widgets)
    },
    accessibility: {
      fontSize: accessibility.fontSize === "SM" || accessibility.fontSize === "LG" || accessibility.fontSize === "XL" ? accessibility.fontSize : "MD",
      highContrast: asBoolean(accessibility.highContrast, fallback.accessibility.highContrast),
      reduceMotion: asBoolean(accessibility.reduceMotion, fallback.accessibility.reduceMotion)
    },
    shortcuts: Array.isArray(parsed.shortcuts)
      ? parsed.shortcuts
          .map((item) => asObject(item, { slashCommand: "", expansionText: "" }))
          .map((item) => ({
            slashCommand: asString(item.slashCommand),
            expansionText: asString(item.expansionText)
          }))
          .filter((item) => item.slashCommand.length > 0 || item.expansionText.length > 0)
      : fallback.shortcuts,
    notifications: {
      overrides: Object.fromEntries(
        Object.entries(overrides).map(([key, entry]) => [key, Boolean(entry)])
      )
    }
  };
}

export function parseFacilitySettingsRow(row: FacilitySettings) {
  const permissions = asRolePermissionMatrix(row.permissionsJson);
  const roleSettings = asRoleSettingsConfig(row.permissionsJson);

  return {
    timezone: row.timezone,
    businessHours: asBusinessHours(row.businessHoursJson),
    roomFormatRule: row.roomFormatRule,
    roomFormatHint: row.roomFormatHint ?? "",
    printDefaults: asPrintDefaults(row.printDefaultsJson),
    policyFlags: asPolicyFlags(row.policyFlagsJson),
    facilityProfile: asFacilityProfile(row.policyFlagsJson),
    moduleFlags: asModuleFlagsFromSettings(row.moduleFlagsJson),
    attendanceRules: asAttendanceRules(row.attendanceRulesJson),
    documentationRules: asDocumentationRules(row.documentationRulesJson),
    carePlanRules: asCarePlanRules(row.carePlanRulesJson),
    reportSettings: asReportSettings(row.reportSettingsJson),
    inventoryDefaults: asInventoryDefaults(row.inventoryDefaultsJson),
    prizeCartDefaults: asPrizeCartDefaults(row.prizeCartDefaultsJson),
    notificationDefaults: asNotificationDefaults(row.notificationDefaultsJson),
    compliance: asComplianceDefaults(row.complianceJson),
    permissions,
    roleSettings
  };
}

export function parseUserSettingsRow(row: UserSettings) {
  const printPrefsRecord = asObject(row.printPrefsJson, {
    paperSize: "LETTER",
    includeFooterMeta: true,
    personal: defaultPersonalSettings()
  } satisfies PersonalPrintPrefs);

  const personal = asPersonalSettings(printPrefsRecord.personal);
  const effectiveFontSize = personal.accessibility.fontSize ?? row.fontScale;

  return {
    defaultLanding: row.defaultLanding,
    reduceMotion: row.reduceMotion,
    highContrast: row.highContrast,
    fontScale: row.fontScale,
    myQuickPhrases: Array.isArray(row.myQuickPhrasesJson) ? row.myQuickPhrasesJson.map(String) : [],
    printPrefs: printPrefsRecord,
    shortcutsEnabled: row.shortcutsEnabled,
    personal: {
      ...personal,
      accessibility: {
        ...personal.accessibility,
        fontSize:
          effectiveFontSize === "SM" || effectiveFontSize === "MD" || effectiveFontSize === "LG" || effectiveFontSize === "XL"
            ? effectiveFontSize
            : "MD",
        highContrast: row.highContrast || personal.accessibility.highContrast,
        reduceMotion: row.reduceMotion || personal.accessibility.reduceMotion
      }
    }
  };
}
