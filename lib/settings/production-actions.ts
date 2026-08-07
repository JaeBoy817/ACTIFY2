"use server";

import { Role, type Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { logAudit } from "@/lib/audit";
import { requireFacilityContext } from "@/lib/auth";
import { assertAdmin, assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ensureFacilitySettingsRecord, ensureUserSettingsRecord } from "@/lib/settings/ensure";
import {
  productionSettingsPayloadSchema,
  type ProductionSettingsPayload
} from "@/lib/settings/production-settings";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getRequestMetadata() {
  const headerStore = headers();
  return {
    ip: headerStore.get("x-forwarded-for") ?? null,
    userAgent: headerStore.get("user-agent") ?? null
  };
}

const adminOnlySections = new Set<ProductionSettingsPayload["section"]>(["security"]);
const directorSections = new Set<ProductionSettingsPayload["section"]>([
  "facility",
  "calendar",
  "documentation",
  "assistant",
  "chronicle",
  "reports",
  "notifications"
]);

function assertProductionSectionAccess(role: Role, section: ProductionSettingsPayload["section"]) {
  if (section === "profile") {
    if (role === Role.READ_ONLY) {
      throw new Error("Read-only users cannot edit profile settings.");
    }
    return;
  }

  if (adminOnlySections.has(section)) {
    assertAdmin(role);
    return;
  }

  if (directorSections.has(section) && role !== Role.ADMIN && role !== Role.AD) {
    throw new Error("Only an Administrator or Activities Director can edit this settings section.");
  }
}

function mergePersonalProfile(existingPrintPrefs: unknown, values: ProductionSettingsPayload & { section: "profile" }) {
  const printPrefs = asRecord(existingPrintPrefs);
  const personal = asRecord(printPrefs.personal);
  const profile = asRecord(personal.profile);
  const accessibility = asRecord(personal.accessibility);

  return {
    ...printPrefs,
    personal: {
      ...personal,
      profile: {
        ...profile,
        displayName: values.values.fullName,
        preferredName: values.values.preferredName,
        title: values.values.jobTitle,
        initials: values.values.initials,
        phone: values.values.phone,
        profilePhotoUrl: values.values.profilePhotoUrl,
        preferredTimeFormat: values.values.preferredTimeFormat,
        personalTimezone: values.values.personalTimezone
      },
      accessibility: {
        ...accessibility,
        fontSize: values.values.fontScale,
        highContrast: values.values.highContrast,
        reduceMotion: values.values.reduceMotion
      }
    }
  };
}

function dayArray(values: number[]) {
  return values.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export async function saveProductionSettingsSection(payload: unknown) {
  const parsed = productionSettingsPayloadSchema.parse(payload);
  const context = await requireFacilityContext();
  assertWritable(context.role);
  assertProductionSectionAccess(context.role, parsed.section);

  const metadata = getRequestMetadata();

  if (parsed.section === "profile") {
    const existing = await ensureUserSettingsRecord(context.user.id);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: context.user.id },
        data: { name: parsed.values.fullName }
      });

      return tx.userSettings.update({
        where: { userId: context.user.id },
        data: {
          defaultLanding: parsed.values.defaultLandingPage,
          reduceMotion: parsed.values.reduceMotion,
          highContrast: parsed.values.highContrast,
          fontScale: parsed.values.fontScale,
          printPrefsJson: mergePersonalProfile(existing.printPrefsJson, parsed)
        }
      });
    });

    await logAudit({
      facilityId: context.facilityId,
      actorUserId: context.user.id,
      action: "SETTINGS_UPDATE",
      entityType: "Settings.profile",
      entityId: updated.id,
      before: {
        name: context.user.name,
        defaultLanding: existing.defaultLanding,
        printPrefsJson: existing.printPrefsJson
      },
      after: { values: parsed.values, metadata }
    });

    return { ok: true, updatedAt: updated.updatedAt.toISOString() };
  }

  const settings = await ensureFacilitySettingsRecord({
    facilityId: context.facilityId,
    timezone: context.facility.timezone,
    moduleFlags: context.facility.moduleFlags
  });

  const updateData: Prisma.FacilitySettingsUpdateInput = {};
  let facilityUpdateData: Prisma.FacilityUpdateInput | undefined;

  if (parsed.section === "facility") {
    const policyFlags = asRecord(settings.policyFlagsJson);
    const facilityProfile = asRecord(policyFlags.facilityProfile);
    const branding = asRecord(facilityProfile.branding);
    const address = asRecord(facilityProfile.address);

    updateData.timezone = parsed.values.facilityTimezone;
    updateData.businessHoursJson = {
      start: parsed.values.operatingHours.start,
      end: parsed.values.operatingHours.end,
      days: dayArray(parsed.values.operatingHours.days)
    };
    updateData.policyFlagsJson = {
      ...policyFlags,
      facilityProfile: {
        ...facilityProfile,
        dba: asRecord(facilityProfile).dba ?? "",
        type: parsed.values.facilityType,
        address: {
          ...address,
          line1: parsed.values.streetAddress,
          line2: parsed.values.addressLine2,
          city: parsed.values.city,
          state: parsed.values.state,
          zip: parsed.values.zipCode
        },
        branding: {
          ...branding,
          logoUrl: parsed.values.facilityLogoUrl
        },
        mainPhone: parsed.values.mainPhone,
        administratorName: parsed.values.administratorName,
        activitiesDirectorName: parsed.values.activitiesDirectorName,
        censusCapacity: parsed.values.censusCapacity,
        defaultPopulation: parsed.values.defaultPopulation,
        memoryCareActivityOptionsEnabled: parsed.values.memoryCareActivityOptionsEnabled
      }
    };
    facilityUpdateData = {
      name: parsed.values.facilityName,
      timezone: parsed.values.facilityTimezone
    };
  }

  if (parsed.section === "calendar") {
    const attendanceRules = asRecord(settings.attendanceRulesJson);
    const calendarSettings = asRecord(attendanceRules.calendarSettings);
    const locations = [parsed.values.defaultActivityLocation, ...String(attendanceRules.locations ?? "").split(",")]
      .map((item) => item.trim())
      .filter(Boolean);

    updateData.attendanceRulesJson = {
      ...attendanceRules,
      groupMinutes: parsed.values.defaultActivityDurationMinutes,
      oneToOneMinutes: parsed.values.defaultOneToOneDurationMinutes,
      locations: Array.from(new Set(locations.length ? locations : ["Activity Room"])),
      calendarSettings: {
        ...calendarSettings,
        defaultView: parsed.values.defaultCalendarView,
        firstDayOfWeek: parsed.values.firstDayOfWeek,
        timeFormat: parsed.values.timeFormat,
        defaultActivityLocation: parsed.values.defaultActivityLocation,
        defaultStaffMember: parsed.values.defaultStaffMember,
        showWeekends: parsed.values.showWeekends,
        showResidentBirthdays: parsed.values.showResidentBirthdays,
        showHolidays: parsed.values.showHolidays,
        showSpecialEvents: parsed.values.showSpecialEvents,
        categoryColors: parsed.values.categoryColors,
        defaultAttendanceStatus: parsed.values.defaultAttendanceStatus,
        allowOverlappingActivities: parsed.values.allowOverlappingActivities,
        includeSetupCleanupTime: parsed.values.includeSetupCleanupTime,
        setupBufferMinutes: Number(parsed.values.setupBufferMinutes),
        printableCalendarOrientation: parsed.values.printableCalendarOrientation,
        printableCalendarFontSize: parsed.values.printableCalendarFontSize,
        printableCalendarFooterText: parsed.values.printableCalendarFooterText,
        showFacilityLogoOnPrintedCalendars: parsed.values.showFacilityLogoOnPrintedCalendars
      }
    };
  }

  if (parsed.section === "documentation") {
    const docs = asRecord(settings.documentationRulesJson);
    const signature = asRecord(docs.signature);
    updateData.documentationRulesJson = {
      ...docs,
      defaultNoteType: parsed.values.defaultNoteType,
      defaultDocumentationTone: parsed.values.defaultDocumentationTone,
      noteLength: parsed.values.noteLength,
      requiredFields: parsed.values.requiredFields,
      noteRequiredFields: parsed.values.requiredFields,
      autoSaveIntervalSeconds: parsed.values.autoSaveIntervalSeconds,
      defaultFollowUpStatus: parsed.values.defaultFollowUpStatus,
      participationRule: parsed.values.participationRule,
      refusalsCountAsDocumentedContacts: parsed.values.refusalsCountAsDocumentedContacts,
      passiveAttendanceCountsAsParticipation: parsed.values.passiveAttendanceCountsAsParticipation,
      requireCompletionDateTime: parsed.values.requireCompletionDateTime,
      notSeenThresholds: {
        weeklyDays: parsed.values.weeklyNotSeenThresholdDays,
        monthlyDays: parsed.values.monthlyNotSeenThresholdDays
      },
      templates: {
        groupNote: parsed.values.groupNoteTemplate,
        oneToOneNote: parsed.values.oneToOneNoteTemplate,
        carePlanNote: parsed.values.carePlanNoteTemplate,
        admissionUda: parsed.values.admissionUdaTemplate,
        quarterlyUda: parsed.values.quarterlyUdaTemplate,
        annualUda: parsed.values.annualUdaTemplate
      },
      signature: {
        ...signature,
        required: parsed.values.requireStaffInitialsOrSignature
      }
    };
  }

  if (parsed.section === "assistant") {
    const docs = asRecord(settings.documentationRulesJson);
    updateData.documentationRulesJson = {
      ...docs,
      aiAssistant: parsed.values
    };
  }

  if (parsed.section === "chronicle") {
    const reportSettings = asRecord(settings.reportSettingsJson);
    updateData.reportSettingsJson = {
      ...reportSettings,
      dailyChronicle: parsed.values
    };
  }

  if (parsed.section === "reports") {
    const reportSettings = asRecord(settings.reportSettingsJson);
    const pdf = asRecord(reportSettings.pdf);
    const exportFormats = asRecord(reportSettings.exportFormats);
    const printDefaults = asRecord(settings.printDefaultsJson);

    updateData.reportSettingsJson = {
      ...reportSettings,
      exportFormats: {
        ...exportFormats,
        ...parsed.values.exportFormats
      },
      pdf: {
        ...pdf,
        includeLogo: parsed.values.includeFacilityLogo
      },
      productionReports: parsed.values
    };
    updateData.printDefaultsJson = {
      ...printDefaults,
      paperSize: parsed.values.paperSize,
      includeFooterMeta: parsed.values.includeGeneratedDateTime,
      includeFooter: true
    };
  }

  if (parsed.section === "notifications") {
    const notificationDefaults = asRecord(settings.notificationDefaultsJson);
    const channels = asRecord(notificationDefaults.channels);
    const quietHours = asRecord(notificationDefaults.quietHours);
    const digestMode =
      parsed.values.frequency === "Daily digest"
        ? "DAILY"
        : parsed.values.frequency === "Weekly digest"
          ? "WEEKLY"
          : "OFF";

    updateData.notificationDefaultsJson = {
      ...notificationDefaults,
      channels: {
        ...channels,
        inApp: parsed.values.frequency !== "Off",
        email: false,
        push: false
      },
      digest: {
        mode: digestMode,
        time: notificationDefaults.dailyDigestTime ?? "09:00"
      },
      quietHours: {
        ...quietHours,
        enabled: parsed.values.quietHoursEnabled,
        start: parsed.values.quietHoursStart,
        end: parsed.values.quietHoursEnd
      },
      productionTriggers: parsed.values.triggers
    };
  }

  if (parsed.section === "security") {
    const compliance = asRecord(settings.complianceJson);
    const hipaaMode = asRecord(compliance.hipaaMode);
    const accessLogs = asRecord(compliance.accessLogs);
    const exportRestrictions = asRecord(compliance.exportRestrictions);
    const security = asRecord(compliance.security);
    const dataRetention = asRecord(compliance.dataRetention);

    updateData.complianceJson = {
      ...compliance,
      hipaaMode: {
        ...hipaaMode,
        enabled: parsed.values.hipaaModeEnabled,
        autoLogoutMinutes: Number(parsed.values.autoLogoutMinutes),
        maskPHIInExports: parsed.values.maskPhiInExports
      },
      accessLogs: {
        ...accessLogs,
        enabled: parsed.values.auditLogAccessEnabled
      },
      exportRestrictions: {
        ...exportRestrictions,
        onlyAdminsCanExport: parsed.values.onlyAdminsCanExport
      },
      security: {
        ...security,
        requireMFAForAdmins: parsed.values.requireMfaForAdmins,
        deviceTrustEnabled: parsed.values.deviceTrustEnabled
      },
      dataRetention: {
        ...dataRetention,
        years: parsed.values.dataRetentionYears
      },
      auditRetentionDays: parsed.values.auditRetentionDays,
      exportRetentionDays: parsed.values.exportRetentionDays,
      dataControls: {
        allowFacilityDataExport: parsed.values.allowFacilityDataExport,
        allowPersonalDataDownload: parsed.values.allowPersonalDataDownload,
        dangerZoneConfirmationPhrase: parsed.values.dangerZoneConfirmationPhrase
      }
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (facilityUpdateData) {
      await tx.facility.update({
        where: { id: context.facilityId },
        data: facilityUpdateData
      });
    }

    return tx.facilitySettings.update({
      where: { facilityId: context.facilityId },
      data: updateData
    });
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "SETTINGS_UPDATE",
    entityType: `Settings.${parsed.section}`,
    entityId: updated.id,
    before: {
      facilitySettingsId: settings.id,
      section: parsed.section
    },
    after: {
      values: parsed.values,
      metadata
    }
  });

  return {
    ok: true,
    updatedAt: updated.updatedAt.toISOString()
  };
}
