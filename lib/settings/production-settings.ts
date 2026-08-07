import { DefaultLanding, FontScale, Role, SubscriptionStatus, type FacilitySettings, type UserSettings } from "@prisma/client";
import { z } from "zod";

import {
  asBusinessHours,
  asComplianceDefaults,
  asDocumentationRules,
  asFacilityProfile,
  asNotificationDefaults,
  asPrintDefaults,
  asReportSettings,
  asRolePermissionMatrix,
  asRoleSettingsConfig
} from "@/lib/settings/defaults";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return value === undefined ? fallback : Boolean(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : fallback;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format.");
const optionalText = z.string().trim().max(3000).optional().default("");

export const SETTINGS_SECTIONS = [
  "profile",
  "facility",
  "calendar",
  "documentation",
  "assistant",
  "chronicle",
  "reports",
  "notifications",
  "team",
  "subscription",
  "security"
] as const;

export type SettingsSectionKey = (typeof SETTINGS_SECTIONS)[number];

export const legacySettingsSectionMap: Record<string, SettingsSectionKey> = {
  personal: "profile",
  facility: "facility",
  calendar: "calendar",
  docs: "documentation",
  careplan: "documentation",
  reports: "reports",
  notifications: "notifications",
  roles: "team",
  modules: "team",
  compliance: "security",
  inventory: "notifications"
};

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(120),
  preferredName: z.string().trim().max(80).optional().default(""),
  jobTitle: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email("Use a valid email address."),
  phone: z.string().trim().max(40).optional().default(""),
  profilePhotoUrl: z.string().trim().max(500).optional().default(""),
  initials: z.string().trim().max(10).optional().default(""),
  preferredTimeFormat: z.enum(["12H", "24H"]),
  personalTimezone: z.string().trim().min(2, "Timezone is required."),
  defaultLandingPage: z.nativeEnum(DefaultLanding),
  fontScale: z.nativeEnum(FontScale),
  highContrast: z.boolean(),
  reduceMotion: z.boolean()
});

export const facilitySettingsSchema = z.object({
  facilityName: z.string().trim().min(2, "Facility name is required.").max(120),
  facilityLogoUrl: z.string().trim().max(500).optional().default(""),
  facilityType: z.enum(["SNF", "AssistedLiving", "MemoryCare", "Rehab"]),
  streetAddress: z.string().trim().max(160).optional().default(""),
  addressLine2: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  state: z.string().trim().max(40).optional().default(""),
  zipCode: z.string().trim().max(20).optional().default(""),
  mainPhone: z.string().trim().max(40).optional().default(""),
  facilityTimezone: z.string().trim().min(2, "Facility timezone is required."),
  operatingHours: z.object({ start: timeSchema, end: timeSchema, days: z.array(z.number().int().min(0).max(6)).min(1) }),
  administratorName: z.string().trim().max(120).optional().default(""),
  activitiesDirectorName: z.string().trim().max(120).optional().default(""),
  censusCapacity: z.number().int().min(0).max(10000),
  defaultPopulation: z.string().trim().max(120).optional().default(""),
  memoryCareActivityOptionsEnabled: z.boolean()
});

export const calendarSettingsSchema = z.object({
  defaultCalendarView: z.enum(["MONTH", "WEEK", "DAY"]),
  firstDayOfWeek: z.enum(["SUNDAY", "MONDAY"]),
  timeFormat: z.enum(["12H", "24H"]),
  defaultActivityDurationMinutes: z.number().int().min(5).max(480),
  defaultOneToOneDurationMinutes: z.number().int().min(5).max(240),
  defaultActivityLocation: z.string().trim().max(120).optional().default(""),
  defaultStaffMember: z.string().trim().max(120).optional().default(""),
  showWeekends: z.boolean(),
  showResidentBirthdays: z.boolean(),
  showHolidays: z.boolean(),
  showSpecialEvents: z.boolean(),
  categoryColors: z.record(z.string().trim().max(40)),
  defaultAttendanceStatus: z.enum(["Attended", "Declined", "Unavailable", "Not Recorded"]),
  allowOverlappingActivities: z.boolean(),
  includeSetupCleanupTime: z.boolean(),
  setupBufferMinutes: z.enum(["0", "5", "10", "15", "30"]),
  printableCalendarOrientation: z.enum(["PORTRAIT", "LANDSCAPE"]),
  printableCalendarFontSize: z.enum(["SMALL", "STANDARD", "LARGE"]),
  printableCalendarFooterText: z.string().trim().max(240).optional().default(""),
  showFacilityLogoOnPrintedCalendars: z.boolean()
});

export const documentationSettingsSchema = z.object({
  defaultNoteType: z.enum(["Progress Note", "1:1 Note", "Group Activity Note", "Refusal Note", "Care Plan Note"]),
  groupNoteTemplate: optionalText,
  oneToOneNoteTemplate: optionalText,
  carePlanNoteTemplate: optionalText,
  admissionUdaTemplate: optionalText,
  quarterlyUdaTemplate: optionalText,
  annualUdaTemplate: optionalText,
  defaultDocumentationTone: z.enum(["Professional", "Concise", "Detailed", "Warm"]),
  noteLength: z.enum(["Concise", "Balanced", "Detailed"]),
  requiredFields: z.array(z.string().trim().min(1).max(80)).max(30),
  autoSaveIntervalSeconds: z.number().int().min(15).max(600),
  defaultFollowUpStatus: z.enum(["No follow-up", "Follow up this week", "Add to 1:1 list", "Review care plan"]),
  weeklyNotSeenThresholdDays: z.number().int().min(1).max(14),
  monthlyNotSeenThresholdDays: z.number().int().min(1).max(45),
  participationRule: z.enum(["GROUP_AND_COMPLETED_1TO1", "GROUP_ONLY", "COMPLETED_1TO1_ONLY"]),
  refusalsCountAsDocumentedContacts: z.boolean(),
  passiveAttendanceCountsAsParticipation: z.boolean(),
  requireStaffInitialsOrSignature: z.boolean(),
  requireCompletionDateTime: z.boolean()
});

export const assistantSettingsSchema = z.object({
  defaultResponseLength: z.enum(["Short", "Balanced", "Detailed"]),
  preferredDocumentationStyle: z.enum(["PCC-ready", "State-ready", "Plain language", "Care-plan focused"]),
  tone: z.enum(["Professional", "Warm", "Formal", "Conversational"]),
  readingLevel: z.enum(["Simple", "Standard", "Detailed"]),
  allowResidentFacingLanguage: z.boolean(),
  defaultBibleTranslation: z.enum(["ERV", "KJV", "NIV", "NLT", "None"]),
  preferredActivityDifficulty: z.enum(["Low", "Moderate", "High", "Mixed"]),
  preferredGroupSize: z.enum(["1:1", "Small group", "Large group", "Mixed"]),
  defaultActivityDurationMinutes: z.number().int().min(5).max(240),
  customFacilityInstructions: optionalText,
  approvedTerminology: z.array(z.string().trim().min(1).max(120)).max(80),
  termsToAvoid: z.array(z.string().trim().min(1).max(120)).max(80),
  enableAiSuggestions: z.boolean(),
  enableActivityAdaptations: z.boolean(),
  enableSupplyLists: z.boolean(),
  enableCarePlanSuggestions: z.boolean(),
  requireConfirmationBeforeResidentInfo: z.boolean()
});

export const dailyChronicleSettingsSchema = z.object({
  enabled: z.boolean(),
  defaultPublicationTime: timeSchema,
  sections: z.object({
    nationalNews: z.boolean(),
    localNews: z.boolean(),
    facilityNews: z.boolean(),
    weather: z.boolean(),
    residentBirthdays: z.boolean(),
    activitySchedule: z.boolean(),
    bibleDevotional: z.boolean(),
    triviaHistory: z.boolean(),
    positiveClosing: z.boolean()
  }),
  readingLevel: z.enum(["Simple", "Standard", "Large-print friendly"]),
  largePrintMode: z.boolean(),
  maximumArticleLength: z.enum(["Brief", "Standard", "Expanded"]),
  defaultBibleTranslation: z.enum(["ERV", "KJV", "NIV", "NLT"]),
  useFacilityAddressForLocalInfo: z.boolean(),
  displaySourceNames: z.boolean(),
  displayClickableSourceLinks: z.boolean(),
  displayRetrievedDateTime: z.boolean(),
  requiredNewsPublishedWithinDays: z.number().int().min(1).max(30),
  approvedNewsDomains: z.array(z.string().trim().min(1).max(120)).max(80),
  blockedNewsDomains: z.array(z.string().trim().min(1).max(120)).max(80)
});

export const reportsPrintingSettingsSchema = z.object({
  defaultReportPeriod: z.enum(["Today", "This week", "This month", "Last month", "Rolling 30"]),
  defaultParticipationCalculation: z.enum(["Group and completed 1:1", "Group only", "Completed 1:1 only"]),
  includeGroupAttendance: z.boolean(),
  includeOneToOneVisits: z.boolean(),
  includeRefusals: z.boolean(),
  includePassiveParticipation: z.boolean(),
  displayMode: z.enum(["Percentages and totals", "Percentages only", "Totals only"]),
  paperSize: z.enum(["LETTER", "A4"]),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]),
  printColorMode: z.enum(["Color", "Ink-friendly"]),
  largePrintMode: z.boolean(),
  includeFacilityLogo: z.boolean(),
  includeFacilityAddress: z.boolean(),
  includeStaffSignatureLine: z.boolean(),
  includeGeneratedDateTime: z.boolean(),
  defaultFooter: z.string().trim().max(240).optional().default(""),
  exportFormats: z.object({ pdf: z.boolean(), csv: z.boolean() }),
  csvDateFormat: z.enum(["MM/DD/YYYY", "YYYY-MM-DD"]),
  pdfNamingConvention: z.string().trim().min(2).max(120)
});

export const notificationsSettingsSchema = z.object({
  method: z.enum(["In-app only"]),
  frequency: z.enum(["Immediate", "Daily digest", "Weekly digest", "Off"]),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeSchema,
  quietHoursEnd: timeSchema,
  triggers: z.object({
    upcomingActivityReminders: z.boolean(),
    overdueDocumentation: z.boolean(),
    missingAttendance: z.boolean(),
    residentsNotSeenThisWeek: z.boolean(),
    residentsNotSeenThisMonth: z.boolean(),
    upcomingBirthdays: z.boolean(),
    upcomingUdaDueDates: z.boolean(),
    calendarConflicts: z.boolean(),
    lowInventory: z.boolean(),
    volunteerReminders: z.boolean(),
    residentCouncilFollowUps: z.boolean(),
    dailyChronicleReady: z.boolean(),
    weeklyParticipationSummary: z.boolean(),
    monthlyParticipationSummary: z.boolean()
  })
});

export const securityDataSettingsSchema = z.object({
  hipaaModeEnabled: z.boolean(),
  autoLogoutMinutes: z.enum(["5", "10", "15", "30"]),
  maskPhiInExports: z.boolean(),
  auditLogAccessEnabled: z.boolean(),
  onlyAdminsCanExport: z.boolean(),
  requireMfaForAdmins: z.boolean(),
  deviceTrustEnabled: z.boolean(),
  dataRetentionYears: z.number().int().min(1).max(30),
  auditRetentionDays: z.number().int().min(30).max(3650),
  exportRetentionDays: z.number().int().min(1).max(365),
  allowFacilityDataExport: z.boolean(),
  allowPersonalDataDownload: z.boolean(),
  dangerZoneConfirmationPhrase: z.string().trim().max(80).optional().default("DELETE MY ACCOUNT")
});

export const productionSettingsPayloadSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("profile"), values: profileSettingsSchema }),
  z.object({ section: z.literal("facility"), values: facilitySettingsSchema }),
  z.object({ section: z.literal("calendar"), values: calendarSettingsSchema }),
  z.object({ section: z.literal("documentation"), values: documentationSettingsSchema }),
  z.object({ section: z.literal("assistant"), values: assistantSettingsSchema }),
  z.object({ section: z.literal("chronicle"), values: dailyChronicleSettingsSchema }),
  z.object({ section: z.literal("reports"), values: reportsPrintingSettingsSchema }),
  z.object({ section: z.literal("notifications"), values: notificationsSettingsSchema }),
  z.object({ section: z.literal("security"), values: securityDataSettingsSchema })
]);

export type ProductionProfileSettings = z.infer<typeof profileSettingsSchema>;
export type ProductionFacilitySettings = z.infer<typeof facilitySettingsSchema>;
export type ProductionCalendarSettings = z.infer<typeof calendarSettingsSchema>;
export type ProductionDocumentationSettings = z.infer<typeof documentationSettingsSchema>;
export type ProductionAssistantSettings = z.infer<typeof assistantSettingsSchema>;
export type ProductionDailyChronicleSettings = z.infer<typeof dailyChronicleSettingsSchema>;
export type ProductionReportsPrintingSettings = z.infer<typeof reportsPrintingSettingsSchema>;
export type ProductionNotificationsSettings = z.infer<typeof notificationsSettingsSchema>;
export type ProductionSecurityDataSettings = z.infer<typeof securityDataSettingsSchema>;
export type ProductionSettingsPayload = z.infer<typeof productionSettingsPayloadSchema>;

export type ProductionSettingsValues = {
  profile: ProductionProfileSettings;
  facility: ProductionFacilitySettings;
  calendar: ProductionCalendarSettings;
  documentation: ProductionDocumentationSettings;
  assistant: ProductionAssistantSettings;
  chronicle: ProductionDailyChronicleSettings;
  reports: ProductionReportsPrintingSettings;
  notifications: ProductionNotificationsSettings;
  security: ProductionSecurityDataSettings;
};

export type SettingsUserSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type SettingsAuditSummary = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actorName: string | null;
};

export type SettingsBillingSummary = {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  hasActiveSubscription: boolean;
  planName: string;
  planPriceLabel: string;
};

export type ProductionSettingsSnapshot = {
  values: ProductionSettingsValues;
  permissions: ReturnType<typeof asRolePermissionMatrix>;
  roles: ReturnType<typeof asRoleSettingsConfig>;
};

export const defaultAssistantSettings: ProductionAssistantSettings = {
  defaultResponseLength: "Balanced",
  preferredDocumentationStyle: "PCC-ready",
  tone: "Professional",
  readingLevel: "Standard",
  allowResidentFacingLanguage: false,
  defaultBibleTranslation: "ERV",
  preferredActivityDifficulty: "Mixed",
  preferredGroupSize: "Mixed",
  defaultActivityDurationMinutes: 30,
  customFacilityInstructions: "",
  approvedTerminology: ["declined", "participated", "engaged", "tolerated"],
  termsToAvoid: ["noncompliant", "lazy", "bad attitude"],
  enableAiSuggestions: true,
  enableActivityAdaptations: true,
  enableSupplyLists: true,
  enableCarePlanSuggestions: true,
  requireConfirmationBeforeResidentInfo: true
};

export const defaultDailyChronicleSettings: ProductionDailyChronicleSettings = {
  enabled: true,
  defaultPublicationTime: "08:00",
  sections: {
    nationalNews: true,
    localNews: true,
    facilityNews: true,
    weather: true,
    residentBirthdays: true,
    activitySchedule: true,
    bibleDevotional: true,
    triviaHistory: true,
    positiveClosing: true
  },
  readingLevel: "Simple",
  largePrintMode: true,
  maximumArticleLength: "Brief",
  defaultBibleTranslation: "ERV",
  useFacilityAddressForLocalInfo: true,
  displaySourceNames: true,
  displayClickableSourceLinks: true,
  displayRetrievedDateTime: true,
  requiredNewsPublishedWithinDays: 3,
  approvedNewsDomains: [],
  blockedNewsDomains: []
};

function parseProfileSettings(input: {
  user: { name: string; email: string };
  userSettings: UserSettings;
  facilityTimezone: string;
}): ProductionProfileSettings {
  const printPrefs = asRecord(input.userSettings.printPrefsJson);
  const personal = asRecord(printPrefs.personal);
  const profile = asRecord(personal.profile);
  const accessibility = asRecord(personal.accessibility);

  return {
    fullName: asString(profile.displayName, input.user.name) || input.user.name,
    preferredName: asString(profile.preferredName),
    jobTitle: asString(profile.title),
    email: input.user.email,
    phone: asString(profile.phone),
    profilePhotoUrl: asString(profile.profilePhotoUrl),
    initials: asString(profile.initials),
    preferredTimeFormat: asEnum(profile.preferredTimeFormat, ["12H", "24H"] as const, "12H"),
    personalTimezone: asString(profile.personalTimezone, input.facilityTimezone),
    defaultLandingPage: input.userSettings.defaultLanding,
    fontScale: input.userSettings.fontScale,
    highContrast: asBoolean(accessibility.highContrast, input.userSettings.highContrast),
    reduceMotion: asBoolean(accessibility.reduceMotion, input.userSettings.reduceMotion)
  };
}

function parseFacilitySettings(input: {
  facilityName: string;
  facilityTimezone: string;
  facilitySettings: FacilitySettings;
}): ProductionFacilitySettings {
  const profile = asFacilityProfile(input.facilitySettings.policyFlagsJson);
  const businessHours = asBusinessHours(input.facilitySettings.businessHoursJson);
  const rawPolicy = asRecord(input.facilitySettings.policyFlagsJson);
  const rawFacilityProfile = asRecord(rawPolicy.facilityProfile);

  return {
    facilityName: input.facilityName,
    facilityLogoUrl: profile.branding.logoUrl,
    facilityType: profile.type,
    streetAddress: profile.address.line1,
    addressLine2: profile.address.line2,
    city: profile.address.city,
    state: profile.address.state,
    zipCode: profile.address.zip,
    mainPhone: asString(rawFacilityProfile.mainPhone),
    facilityTimezone: input.facilitySettings.timezone || input.facilityTimezone,
    operatingHours: businessHours,
    administratorName: asString(rawFacilityProfile.administratorName),
    activitiesDirectorName: asString(rawFacilityProfile.activitiesDirectorName),
    censusCapacity: asNumber(rawFacilityProfile.censusCapacity, 0),
    defaultPopulation: asString(rawFacilityProfile.defaultPopulation),
    memoryCareActivityOptionsEnabled: asBoolean(rawFacilityProfile.memoryCareActivityOptionsEnabled, profile.type === "MemoryCare")
  };
}

function parseCalendarSettings(facilitySettings: FacilitySettings): ProductionCalendarSettings {
  const attendance = asRecord(facilitySettings.attendanceRulesJson);
  const parsed = asRecord(attendance.calendarSettings);
  const rules = asRecord(facilitySettings.attendanceRulesJson);
  const locations = asStringArray(rules.locations, ["Activity Room"]);
  const printDefaults = asPrintDefaults(facilitySettings.printDefaultsJson);
  const setupBuffer = asEnum(String(asNumber(parsed.setupBufferMinutes, 5)), ["0", "5", "10", "15", "30"] as const, "5");

  return {
    defaultCalendarView: asEnum(parsed.defaultView, ["MONTH", "WEEK", "DAY"] as const, "WEEK"),
    firstDayOfWeek: asEnum(parsed.firstDayOfWeek, ["SUNDAY", "MONDAY"] as const, "SUNDAY"),
    timeFormat: asEnum(parsed.timeFormat, ["12H", "24H"] as const, "12H"),
    defaultActivityDurationMinutes: asNumber(rules.groupMinutes, 45),
    defaultOneToOneDurationMinutes: asNumber(rules.oneToOneMinutes, 20),
    defaultActivityLocation: asString(parsed.defaultActivityLocation, locations[0] ?? ""),
    defaultStaffMember: asString(parsed.defaultStaffMember),
    showWeekends: asBoolean(parsed.showWeekends, true),
    showResidentBirthdays: asBoolean(parsed.showResidentBirthdays, true),
    showHolidays: asBoolean(parsed.showHolidays, true),
    showSpecialEvents: asBoolean(parsed.showSpecialEvents, true),
    categoryColors: {
      social: "#2dd4bf",
      cognitive: "#38bdf8",
      physical: "#f59e0b",
      creative: "#f472b6",
      spiritual: "#a78bfa",
      oneToOne: "#34d399",
      outing: "#fb7185",
      ...asRecord(parsed.categoryColors)
    } as Record<string, string>,
    defaultAttendanceStatus: asEnum(parsed.defaultAttendanceStatus, ["Attended", "Declined", "Unavailable", "Not Recorded"] as const, "Not Recorded"),
    allowOverlappingActivities: asBoolean(parsed.allowOverlappingActivities, false),
    includeSetupCleanupTime: asBoolean(parsed.includeSetupCleanupTime, true),
    setupBufferMinutes: setupBuffer,
    printableCalendarOrientation: asEnum(parsed.printableCalendarOrientation, ["PORTRAIT", "LANDSCAPE"] as const, "LANDSCAPE"),
    printableCalendarFontSize: asEnum(parsed.printableCalendarFontSize, ["SMALL", "STANDARD", "LARGE"] as const, "STANDARD"),
    printableCalendarFooterText: asString(parsed.printableCalendarFooterText),
    showFacilityLogoOnPrintedCalendars: asBoolean(parsed.showFacilityLogoOnPrintedCalendars, printDefaults.includeFooter)
  };
}

function parseDocumentationSettings(facilitySettings: FacilitySettings): ProductionDocumentationSettings {
  const docs = asRecord(facilitySettings.documentationRulesJson);
  const parsed = asDocumentationRules(facilitySettings.documentationRulesJson);
  const templates = asRecord(docs.templates);
  const notSeen = asRecord(docs.notSeenThresholds);

  return {
    defaultNoteType: asEnum(docs.defaultNoteType, ["Progress Note", "1:1 Note", "Group Activity Note", "Refusal Note", "Care Plan Note"] as const, "Progress Note"),
    groupNoteTemplate: asString(templates.groupNote, "Resident attended group activity and participated as tolerated."),
    oneToOneNoteTemplate: asString(templates.oneToOneNote, "AD provided 1:1 visit with resident. Resident response documented objectively."),
    carePlanNoteTemplate: asString(templates.carePlanNote, "Offer activities of choice to support leisure engagement and quality of life."),
    admissionUdaTemplate: asString(templates.admissionUda, "Resident activity preferences reviewed on admission."),
    quarterlyUdaTemplate: asString(templates.quarterlyUda, "Quarterly activity review completed using documented participation and preferences."),
    annualUdaTemplate: asString(templates.annualUda, "Annual activity review completed using resident preferences and participation history."),
    defaultDocumentationTone: asEnum(docs.defaultDocumentationTone, ["Professional", "Concise", "Detailed", "Warm"] as const, "Professional"),
    noteLength: asEnum(docs.noteLength, ["Concise", "Balanced", "Detailed"] as const, "Balanced"),
    requiredFields: asStringArray(docs.requiredFields, parsed.noteRequiredFields),
    autoSaveIntervalSeconds: asNumber(docs.autoSaveIntervalSeconds, 60),
    defaultFollowUpStatus: asEnum(docs.defaultFollowUpStatus, ["No follow-up", "Follow up this week", "Add to 1:1 list", "Review care plan"] as const, "Follow up this week"),
    weeklyNotSeenThresholdDays: asNumber(notSeen.weeklyDays, 7),
    monthlyNotSeenThresholdDays: asNumber(notSeen.monthlyDays, 31),
    participationRule: asEnum(docs.participationRule, ["GROUP_AND_COMPLETED_1TO1", "GROUP_ONLY", "COMPLETED_1TO1_ONLY"] as const, "GROUP_AND_COMPLETED_1TO1"),
    refusalsCountAsDocumentedContacts: asBoolean(docs.refusalsCountAsDocumentedContacts, false),
    passiveAttendanceCountsAsParticipation: asBoolean(docs.passiveAttendanceCountsAsParticipation, false),
    requireStaffInitialsOrSignature: parsed.signature.required,
    requireCompletionDateTime: asBoolean(docs.requireCompletionDateTime, true)
  };
}

function parseAssistantSettings(facilitySettings: FacilitySettings): ProductionAssistantSettings {
  const docs = asRecord(facilitySettings.documentationRulesJson);
  const assistant = asRecord(docs.aiAssistant);
  return {
    ...defaultAssistantSettings,
    defaultResponseLength: asEnum(assistant.defaultResponseLength, ["Short", "Balanced", "Detailed"] as const, defaultAssistantSettings.defaultResponseLength),
    preferredDocumentationStyle: asEnum(assistant.preferredDocumentationStyle, ["PCC-ready", "State-ready", "Plain language", "Care-plan focused"] as const, defaultAssistantSettings.preferredDocumentationStyle),
    tone: asEnum(assistant.tone, ["Professional", "Warm", "Formal", "Conversational"] as const, defaultAssistantSettings.tone),
    readingLevel: asEnum(assistant.readingLevel, ["Simple", "Standard", "Detailed"] as const, defaultAssistantSettings.readingLevel),
    allowResidentFacingLanguage: asBoolean(assistant.allowResidentFacingLanguage, defaultAssistantSettings.allowResidentFacingLanguage),
    defaultBibleTranslation: asEnum(assistant.defaultBibleTranslation, ["ERV", "KJV", "NIV", "NLT", "None"] as const, defaultAssistantSettings.defaultBibleTranslation),
    preferredActivityDifficulty: asEnum(assistant.preferredActivityDifficulty, ["Low", "Moderate", "High", "Mixed"] as const, defaultAssistantSettings.preferredActivityDifficulty),
    preferredGroupSize: asEnum(assistant.preferredGroupSize, ["1:1", "Small group", "Large group", "Mixed"] as const, defaultAssistantSettings.preferredGroupSize),
    defaultActivityDurationMinutes: asNumber(assistant.defaultActivityDurationMinutes, defaultAssistantSettings.defaultActivityDurationMinutes),
    customFacilityInstructions: asString(assistant.customFacilityInstructions),
    approvedTerminology: asStringArray(assistant.approvedTerminology, defaultAssistantSettings.approvedTerminology),
    termsToAvoid: asStringArray(assistant.termsToAvoid, defaultAssistantSettings.termsToAvoid),
    enableAiSuggestions: asBoolean(assistant.enableAiSuggestions, defaultAssistantSettings.enableAiSuggestions),
    enableActivityAdaptations: asBoolean(assistant.enableActivityAdaptations, defaultAssistantSettings.enableActivityAdaptations),
    enableSupplyLists: asBoolean(assistant.enableSupplyLists, defaultAssistantSettings.enableSupplyLists),
    enableCarePlanSuggestions: asBoolean(assistant.enableCarePlanSuggestions, defaultAssistantSettings.enableCarePlanSuggestions),
    requireConfirmationBeforeResidentInfo: asBoolean(assistant.requireConfirmationBeforeResidentInfo, defaultAssistantSettings.requireConfirmationBeforeResidentInfo)
  };
}

function parseDailyChronicleSettings(facilitySettings: FacilitySettings): ProductionDailyChronicleSettings {
  const reportSettings = asRecord(facilitySettings.reportSettingsJson);
  const chronicle = asRecord(reportSettings.dailyChronicle);
  const sections = asRecord(chronicle.sections);
  return {
    ...defaultDailyChronicleSettings,
    enabled: asBoolean(chronicle.enabled, defaultDailyChronicleSettings.enabled),
    defaultPublicationTime: asString(chronicle.defaultPublicationTime, defaultDailyChronicleSettings.defaultPublicationTime),
    sections: {
      nationalNews: asBoolean(sections.nationalNews, defaultDailyChronicleSettings.sections.nationalNews),
      localNews: asBoolean(sections.localNews, defaultDailyChronicleSettings.sections.localNews),
      facilityNews: asBoolean(sections.facilityNews, defaultDailyChronicleSettings.sections.facilityNews),
      weather: asBoolean(sections.weather, defaultDailyChronicleSettings.sections.weather),
      residentBirthdays: asBoolean(sections.residentBirthdays, defaultDailyChronicleSettings.sections.residentBirthdays),
      activitySchedule: asBoolean(sections.activitySchedule, defaultDailyChronicleSettings.sections.activitySchedule),
      bibleDevotional: asBoolean(sections.bibleDevotional, defaultDailyChronicleSettings.sections.bibleDevotional),
      triviaHistory: asBoolean(sections.triviaHistory, defaultDailyChronicleSettings.sections.triviaHistory),
      positiveClosing: asBoolean(sections.positiveClosing, defaultDailyChronicleSettings.sections.positiveClosing)
    },
    readingLevel: asEnum(chronicle.readingLevel, ["Simple", "Standard", "Large-print friendly"] as const, defaultDailyChronicleSettings.readingLevel),
    largePrintMode: asBoolean(chronicle.largePrintMode, defaultDailyChronicleSettings.largePrintMode),
    maximumArticleLength: asEnum(chronicle.maximumArticleLength, ["Brief", "Standard", "Expanded"] as const, defaultDailyChronicleSettings.maximumArticleLength),
    defaultBibleTranslation: asEnum(chronicle.defaultBibleTranslation, ["ERV", "KJV", "NIV", "NLT"] as const, defaultDailyChronicleSettings.defaultBibleTranslation),
    useFacilityAddressForLocalInfo: asBoolean(chronicle.useFacilityAddressForLocalInfo, defaultDailyChronicleSettings.useFacilityAddressForLocalInfo),
    displaySourceNames: asBoolean(chronicle.displaySourceNames, defaultDailyChronicleSettings.displaySourceNames),
    displayClickableSourceLinks: asBoolean(chronicle.displayClickableSourceLinks, defaultDailyChronicleSettings.displayClickableSourceLinks),
    displayRetrievedDateTime: asBoolean(chronicle.displayRetrievedDateTime, defaultDailyChronicleSettings.displayRetrievedDateTime),
    requiredNewsPublishedWithinDays: asNumber(chronicle.requiredNewsPublishedWithinDays, defaultDailyChronicleSettings.requiredNewsPublishedWithinDays),
    approvedNewsDomains: asStringArray(chronicle.approvedNewsDomains, defaultDailyChronicleSettings.approvedNewsDomains),
    blockedNewsDomains: asStringArray(chronicle.blockedNewsDomains, defaultDailyChronicleSettings.blockedNewsDomains)
  };
}

function parseReportsPrintingSettings(facilitySettings: FacilitySettings): ProductionReportsPrintingSettings {
  const reportSettings = asReportSettings(facilitySettings.reportSettingsJson);
  const rawReports = asRecord(facilitySettings.reportSettingsJson);
  const production = asRecord(rawReports.productionReports);
  const printDefaults = asPrintDefaults(facilitySettings.printDefaultsJson);
  return {
    defaultReportPeriod: asEnum(production.defaultReportPeriod, ["Today", "This week", "This month", "Last month", "Rolling 30"] as const, "This month"),
    defaultParticipationCalculation: asEnum(production.defaultParticipationCalculation, ["Group and completed 1:1", "Group only", "Completed 1:1 only"] as const, "Group and completed 1:1"),
    includeGroupAttendance: asBoolean(production.includeGroupAttendance, true),
    includeOneToOneVisits: asBoolean(production.includeOneToOneVisits, true),
    includeRefusals: asBoolean(production.includeRefusals, false),
    includePassiveParticipation: asBoolean(production.includePassiveParticipation, false),
    displayMode: asEnum(production.displayMode, ["Percentages and totals", "Percentages only", "Totals only"] as const, "Percentages and totals"),
    paperSize: printDefaults.paperSize,
    orientation: asEnum(production.orientation, ["PORTRAIT", "LANDSCAPE"] as const, "PORTRAIT"),
    printColorMode: asEnum(production.printColorMode, ["Color", "Ink-friendly"] as const, "Ink-friendly"),
    largePrintMode: asBoolean(production.largePrintMode, false),
    includeFacilityLogo: reportSettings.pdf.includeLogo,
    includeFacilityAddress: asBoolean(production.includeFacilityAddress, true),
    includeStaffSignatureLine: asBoolean(production.includeStaffSignatureLine, true),
    includeGeneratedDateTime: printDefaults.includeFooterMeta,
    defaultFooter: asString(production.defaultFooter, "Generated by Actify"),
    exportFormats: reportSettings.exportFormats,
    csvDateFormat: asEnum(production.csvDateFormat, ["MM/DD/YYYY", "YYYY-MM-DD"] as const, "MM/DD/YYYY"),
    pdfNamingConvention: asString(production.pdfNamingConvention, "Actify-{report}-{date}")
  };
}

function parseNotificationsSettings(facilitySettings: FacilitySettings): ProductionNotificationsSettings {
  const notifications = asNotificationDefaults(facilitySettings.notificationDefaultsJson);
  const rawNotifications = asRecord(facilitySettings.notificationDefaultsJson);
  const triggers = asRecord(rawNotifications.productionTriggers);
  return {
    method: "In-app only",
    frequency:
      notifications.digest.mode === "DAILY"
        ? "Daily digest"
        : notifications.digest.mode === "WEEKLY"
          ? "Weekly digest"
          : notifications.channels.inApp
            ? "Immediate"
            : "Off",
    quietHoursEnabled: notifications.quietHours.enabled,
    quietHoursStart: notifications.quietHours.start,
    quietHoursEnd: notifications.quietHours.end,
    triggers: {
      upcomingActivityReminders: asBoolean(triggers.upcomingActivityReminders, notifications.triggers.oneToOneDueToday),
      overdueDocumentation: asBoolean(triggers.overdueDocumentation, notifications.triggers.noteNeedsCosign),
      missingAttendance: asBoolean(triggers.missingAttendance, true),
      residentsNotSeenThisWeek: asBoolean(triggers.residentsNotSeenThisWeek, true),
      residentsNotSeenThisMonth: asBoolean(triggers.residentsNotSeenThisMonth, true),
      upcomingBirthdays: asBoolean(triggers.upcomingBirthdays, true),
      upcomingUdaDueDates: asBoolean(triggers.upcomingUdaDueDates, notifications.triggers.carePlanReviewDue),
      calendarConflicts: asBoolean(triggers.calendarConflicts, true),
      lowInventory: asBoolean(triggers.lowInventory, notifications.triggers.lowInventory),
      volunteerReminders: asBoolean(triggers.volunteerReminders, true),
      residentCouncilFollowUps: asBoolean(triggers.residentCouncilFollowUps, true),
      dailyChronicleReady: asBoolean(triggers.dailyChronicleReady, true),
      weeklyParticipationSummary: asBoolean(triggers.weeklyParticipationSummary, true),
      monthlyParticipationSummary: asBoolean(triggers.monthlyParticipationSummary, true)
    }
  };
}

function parseSecurityDataSettings(facilitySettings: FacilitySettings): ProductionSecurityDataSettings {
  const compliance = asComplianceDefaults(facilitySettings.complianceJson);
  const rawCompliance = asRecord(facilitySettings.complianceJson);
  const dataControls = asRecord(rawCompliance.dataControls);
  return {
    hipaaModeEnabled: compliance.hipaaMode.enabled,
    autoLogoutMinutes: String(compliance.hipaaMode.autoLogoutMinutes) as "5" | "10" | "15" | "30",
    maskPhiInExports: compliance.hipaaMode.maskPHIInExports,
    auditLogAccessEnabled: compliance.accessLogs.enabled,
    onlyAdminsCanExport: compliance.exportRestrictions.onlyAdminsCanExport,
    requireMfaForAdmins: compliance.security.requireMFAForAdmins,
    deviceTrustEnabled: compliance.security.deviceTrustEnabled,
    dataRetentionYears: compliance.dataRetention.years,
    auditRetentionDays: compliance.auditRetentionDays,
    exportRetentionDays: compliance.exportRetentionDays,
    allowFacilityDataExport: asBoolean(dataControls.allowFacilityDataExport, true),
    allowPersonalDataDownload: asBoolean(dataControls.allowPersonalDataDownload, true),
    dangerZoneConfirmationPhrase: asString(dataControls.dangerZoneConfirmationPhrase, "DELETE MY ACCOUNT")
  };
}

export function buildProductionSettingsSnapshot(input: {
  user: { name: string; email: string };
  facilityName: string;
  facilityTimezone: string;
  facilitySettings: FacilitySettings;
  userSettings: UserSettings;
}): ProductionSettingsSnapshot {
  return {
    values: {
      profile: parseProfileSettings({
        user: input.user,
        userSettings: input.userSettings,
        facilityTimezone: input.facilityTimezone
      }),
      facility: parseFacilitySettings({
        facilityName: input.facilityName,
        facilityTimezone: input.facilityTimezone,
        facilitySettings: input.facilitySettings
      }),
      calendar: parseCalendarSettings(input.facilitySettings),
      documentation: parseDocumentationSettings(input.facilitySettings),
      assistant: parseAssistantSettings(input.facilitySettings),
      chronicle: parseDailyChronicleSettings(input.facilitySettings),
      reports: parseReportsPrintingSettings(input.facilitySettings),
      notifications: parseNotificationsSettings(input.facilitySettings),
      security: parseSecurityDataSettings(input.facilitySettings)
    },
    permissions: asRolePermissionMatrix(input.facilitySettings.permissionsJson),
    roles: asRoleSettingsConfig(input.facilitySettings.permissionsJson)
  };
}

export function normalizeSectionParam(value?: string | null): SettingsSectionKey {
  if (!value) return "profile";
  if (SETTINGS_SECTIONS.includes(value as SettingsSectionKey)) return value as SettingsSectionKey;
  return legacySettingsSectionMap[value] ?? "profile";
}

export function subscriptionStatusLabel(status: SubscriptionStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}

export function roleDisplayLabel(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "Owner / Administrator";
    case Role.AD:
      return "Activities Director";
    case Role.ASSISTANT:
      return "Activities Assistant";
    case Role.READ_ONLY:
      return "Read-Only Viewer";
    default:
      return role;
  }
}
