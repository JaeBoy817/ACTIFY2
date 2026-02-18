"use server";

import { FontScale, Role, type Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { logAudit } from "@/lib/audit";
import { requireFacilityContext } from "@/lib/auth";
import { asModuleFlags } from "@/lib/module-flags";
import { assertAdmin, assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  asRolePermissionMatrix,
  asRoleSettingsConfig,
  buildPermissionsJsonEnvelope,
  parseFacilitySettingsRow
} from "@/lib/settings/defaults";
import { ensureFacilitySettingsRecord, ensureUserSettingsRecord } from "@/lib/settings/ensure";
import {
  facilitySettingsPayloadSchema,
  updatePermissionsMatrixSchema,
  updateUserRoleSchema,
  userSettingsPayloadSchema
} from "@/lib/settings/schemas";

const adminOnlySections = new Set(["roles", "modules", "compliance", "docs"]);
const directorSections = new Set(["facility", "calendar", "careplan", "reports", "inventory", "notifications"]);

function getRequestMetadata() {
  const headerStore = headers();
  return {
    ip: headerStore.get("x-forwarded-for") ?? null,
    userAgent: headerStore.get("user-agent") ?? null
  };
}

function assertSectionAccess(role: Role, section: string) {
  if (adminOnlySections.has(section)) {
    assertAdmin(role);
    return;
  }

  if (directorSections.has(section) && role !== Role.ADMIN && role !== Role.AD) {
    throw new Error("Only Admin or Activities Director can edit this settings section.");
  }
}

function noteRequiredFieldsFromDocsFlags(flags: {
  mood: boolean;
  participationLevel: boolean;
  cues: boolean;
  responseType: boolean;
  followUp: boolean;
}) {
  const fields: Array<"participationLevel" | "moodAffect" | "cuesRequired" | "response" | "followUp"> = [];
  if (flags.participationLevel) fields.push("participationLevel");
  if (flags.mood) fields.push("moodAffect");
  if (flags.cues) fields.push("cuesRequired");
  if (flags.responseType) fields.push("response");
  if (flags.followUp) fields.push("followUp");
  return fields;
}

export async function upsertFacilitySettings(payload: unknown) {
  const context = await requireFacilityContext();
  assertWritable(context.role);

  const settings = await ensureFacilitySettingsRecord({
    facilityId: context.facilityId,
    timezone: context.facility.timezone,
    moduleFlags: context.facility.moduleFlags
  });

  const parsed = facilitySettingsPayloadSchema.parse(payload);
  assertSectionAccess(context.role, parsed.section);

  const current = parseFacilitySettingsRow(settings);
  const metadata = getRequestMetadata();

  let updateData: Prisma.FacilitySettingsUpdateInput = {};
  let facilityUpdateData: Prisma.FacilityUpdateInput | undefined;

  if (parsed.section === "facility") {
    updateData = {
      timezone: parsed.values.facility.timezone,
      roomFormatRule: parsed.values.facility.roomFormatRule,
      roomFormatHint: parsed.values.facility.roomFormatHint?.trim() || null,
      businessHoursJson: parsed.values.facility.businessHours,
      policyFlagsJson: {
        ...current.policyFlags,
        ...parsed.values.policyFlags,
        allowSmokingTracking: parsed.values.facility.smoking.enabled,
        facilityProfile: parsed.values.facility
      }
    };
    facilityUpdateData = {
      name: parsed.values.facility.name,
      timezone: parsed.values.facility.timezone
    };
  }

  if (parsed.section === "roles") {
    const matrix = asRolePermissionMatrix(parsed.values.permissionsJson);
    const roleConfig = asRoleSettingsConfig(parsed.values.roles);
    updateData = {
      permissionsJson: buildPermissionsJsonEnvelope(matrix, roleConfig)
    };
  }

  if (parsed.section === "modules") {
    const nextModuleFlags = asModuleFlags({
      mode: parsed.values.mode,
      modules: parsed.values.modules,
      widgets: parsed.values.widgets
    });

    updateData = {
      moduleFlagsJson: nextModuleFlags
    };
    facilityUpdateData = {
      moduleFlags: nextModuleFlags
    };
  }

  if (parsed.section === "calendar") {
    updateData = {
      attendanceRulesJson: {
        ...current.attendanceRules,
        groupMinutes: parsed.values.defaults.groupMinutes,
        oneToOneMinutes: parsed.values.defaults.oneToOneMinutes,
        locations: parsed.values.defaults.locations,
        warnTherapyOverlap: parsed.values.defaults.warnTherapyOverlap,
        warnOutsideBusinessHours: parsed.values.defaults.warnOutsideBusinessHours,
        useBusinessHoursDefaults: parsed.values.defaults.useBusinessHoursDefaults,
        calendarSettings: {
          ...current.attendanceRules.calendarSettings,
          ...parsed.values.calendar,
          setupBufferMinutes: Number(parsed.values.calendar.setupBufferMinutes)
        }
      }
    };
  }

  if (parsed.section === "docs") {
    const noteRequiredFields = noteRequiredFieldsFromDocsFlags(parsed.values.docs.requiredFields);
    updateData = {
      attendanceRulesJson: {
        ...current.attendanceRules,
        engagementWeights: {
          present: parsed.values.scoring.presentWeight,
          active: parsed.values.scoring.activeWeight,
          leading: parsed.values.scoring.leadingWeight
        },
        requireBarrierNoteFor: parsed.values.scoring.requireNoteForBarriers
      },
      documentationRulesJson: {
        ...current.documentationRules,
        noteRequiredFields,
        minNarrativeLen: parsed.values.scoring.minNarrativeLen,
        requireGoalLinkForOneToOne: parsed.values.scoring.requireGoalLinkForOneToOne,
        onlyAllowTemplateNotes: parsed.values.docs.onlyAllowTemplateNotes,
        lockNotesAfterDays:
          parsed.values.docs.lockNotesAfterDays === "OFF" ? "OFF" : Number(parsed.values.docs.lockNotesAfterDays),
        signature: parsed.values.docs.signature,
        autoAddStandardLine: parsed.values.docs.autoAddStandardLine,
        terminologyWarnings: parsed.values.docs.terminologyWarnings,
        attachments: parsed.values.docs.attachments,
        lateEntryMode: parsed.values.docs.lateEntryMode,
        retentionYears: parsed.values.docs.retentionYears
      }
    };
  }

  if (parsed.section === "careplan") {
    const cadenceDays =
      parsed.values.carePlan.reviewCadence.preset === "CUSTOM"
        ? parsed.values.carePlan.reviewCadence.customDays ?? 30
        : Number(parsed.values.carePlan.reviewCadence.preset);
    updateData = {
      carePlanRulesJson: {
        ...current.carePlanRules,
        reviewCadenceDays: cadenceDays,
        requirePersonalization: parsed.values.carePlan.requirePersonalization,
        blockReviewCompletionIfGeneric: parsed.values.carePlan.blockReviewCompletionIfGeneric,
        interventionsLibraryEnabled: parsed.values.carePlan.interventionsLibraryEnabled,
        defaultInterventions: parsed.values.carePlan.defaultInterventions,
        goalMappingEnabled: parsed.values.carePlan.goalMappingEnabled,
        defaultFrequencies: parsed.values.carePlan.defaultFrequencies,
        autoSuggestByTagsEnabled: parsed.values.carePlan.autoSuggestByTagsEnabled,
        reviewReminders: {
          enabled: parsed.values.carePlan.reviewReminders.enabled,
          days: Number(parsed.values.carePlan.reviewReminders.days)
        },
        export: parsed.values.carePlan.export
      }
    };
  }

  if (parsed.section === "reports") {
    updateData = {
      reportSettingsJson: {
        ...current.reportSettings,
        ...parsed.values.reports
      },
      printDefaultsJson: {
        ...current.printDefaults,
        ...parsed.values.printDefaults
      }
    };
  }

  if (parsed.section === "inventory") {
    updateData = {
      inventoryDefaultsJson: {
        ...current.inventoryDefaults,
        ...parsed.values.inventory
      },
      prizeCartDefaultsJson: {
        ...current.prizeCartDefaults,
        ...parsed.values.prizeCart
      }
    };
  }

  if (parsed.section === "notifications") {
    const digestMode = parsed.values.notifications.digest.mode;
    updateData = {
      notificationDefaultsJson: {
        ...current.notificationDefaults,
        ...parsed.values.notifications,
        dailyDigestEnabled: digestMode === "DAILY",
        dailyDigestTime: parsed.values.notifications.digest.time || current.notificationDefaults.dailyDigestTime,
        weeklyDigestEnabled: digestMode === "WEEKLY",
        taskReminders: parsed.values.notifications.triggers.oneToOneDueToday,
        reminderLeadTimeMinutes: current.notificationDefaults.reminderLeadTimeMinutes,
        weeklyDigestDay: current.notificationDefaults.weeklyDigestDay
      }
    };
  }

  if (parsed.section === "compliance") {
    updateData = {
      complianceJson: {
        ...current.compliance,
        ...parsed.values.compliance,
        hipaaMode: {
          ...parsed.values.compliance.hipaaMode,
          autoLogoutMinutes: Number(parsed.values.compliance.hipaaMode.autoLogoutMinutes)
        }
      },
      policyFlagsJson: {
        ...current.policyFlags,
        hideTriggersInPrint: parsed.values.compliance.hideTriggersInPrint,
        maskFamilyContactInPrint: parsed.values.compliance.maskFamilyContactInPrint
      }
    };
  }

  const beforeBySection: Record<string, unknown> = {
    facility: {
      facility: current.facilityProfile,
      policyFlags: current.policyFlags
    },
    roles: {
      roles: current.roleSettings,
      permissionsJson: current.permissions
    },
    modules: current.moduleFlags,
    calendar: {
      calendar: current.attendanceRules.calendarSettings,
      defaults: {
        groupMinutes: current.attendanceRules.groupMinutes,
        oneToOneMinutes: current.attendanceRules.oneToOneMinutes,
        locations: current.attendanceRules.locations,
        warnTherapyOverlap: current.attendanceRules.warnTherapyOverlap,
        warnOutsideBusinessHours: current.attendanceRules.warnOutsideBusinessHours,
        useBusinessHoursDefaults: current.attendanceRules.useBusinessHoursDefaults
      }
    },
    docs: current.documentationRules,
    careplan: current.carePlanRules,
    reports: {
      reports: current.reportSettings,
      printDefaults: current.printDefaults
    },
    inventory: {
      inventory: current.inventoryDefaults,
      prizeCart: current.prizeCartDefaults
    },
    notifications: current.notificationDefaults,
    compliance: current.compliance
  };

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
    before: beforeBySection[parsed.section],
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

export async function upsertUserSettings(payload: unknown) {
  const context = await requireFacilityContext();
  const parsed = userSettingsPayloadSchema.parse(payload);

  const existing = await ensureUserSettingsRecord(context.user.id);
  const metadata = getRequestMetadata();

  const quickPhrases = parsed.values.account.quickPhrases.map((phrase) => phrase.trim()).filter(Boolean).slice(0, 100);

  const fontFromAccessibility =
    parsed.values.personal.accessibility.fontSize === "SM" ||
    parsed.values.personal.accessibility.fontSize === "MD" ||
    parsed.values.personal.accessibility.fontSize === "LG"
      ? parsed.values.personal.accessibility.fontSize
      : "LG";

  const nextFontScale = FontScale[fontFromAccessibility as keyof typeof FontScale] ?? FontScale.MD;

  const updated = await prisma.userSettings.update({
    where: { userId: context.user.id },
    data: {
      defaultLanding: parsed.values.account.defaultLanding,
      reduceMotion: parsed.values.account.reduceMotion,
      highContrast: parsed.values.account.highContrast,
      fontScale: nextFontScale,
      myQuickPhrasesJson: quickPhrases,
      shortcutsEnabled: parsed.values.account.shortcutsEnabled,
      printPrefsJson: {
        ...(existing.printPrefsJson as Record<string, unknown>),
        paperSize: "LETTER",
        includeFooterMeta: true,
        personal: parsed.values.personal
      }
    }
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "SETTINGS_UPDATE",
    entityType: "Settings.personal",
    entityId: updated.id,
    before: {
      defaultLanding: existing.defaultLanding,
      reduceMotion: existing.reduceMotion,
      highContrast: existing.highContrast,
      fontScale: existing.fontScale,
      shortcutsEnabled: existing.shortcutsEnabled
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

export async function updatePermissionsMatrix(payload: unknown) {
  const context = await requireFacilityContext();
  assertAdmin(context.role);

  const parsed = updatePermissionsMatrixSchema.parse(payload);
  const settings = await ensureFacilitySettingsRecord({
    facilityId: context.facilityId,
    timezone: context.facility.timezone,
    moduleFlags: context.facility.moduleFlags
  });

  const matrix = asRolePermissionMatrix(parsed.permissionsJson);
  const existingRoles = asRoleSettingsConfig(settings.permissionsJson);

  const updated = await prisma.facilitySettings.update({
    where: { facilityId: context.facilityId },
    data: {
      permissionsJson: buildPermissionsJsonEnvelope(matrix, existingRoles)
    }
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "ROLE_UPDATE",
    entityType: "Settings.roles.permissions",
    entityId: settings.id,
    before: settings.permissionsJson,
    after: updated.permissionsJson
  });

  return {
    ok: true,
    updatedAt: updated.updatedAt.toISOString()
  };
}

export async function updateUserRole(payload: unknown) {
  const context = await requireFacilityContext();
  assertAdmin(context.role);

  const parsed = updateUserRoleSchema.parse(payload);

  const targetUser = await prisma.user.findFirst({
    where: {
      id: parsed.userId,
      facilityId: context.facilityId
    }
  });

  if (!targetUser) {
    throw new Error("User not found in this facility.");
  }

  const updated = await prisma.user.update({
    where: { id: parsed.userId },
    data: {
      role: parsed.role
    }
  });

  await ensureUserSettingsRecord(updated.id);

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "ROLE_UPDATE",
    entityType: "User.role",
    entityId: updated.id,
    before: { role: targetUser.role },
    after: { role: updated.role, metadata: getRequestMetadata() }
  });

  return {
    ok: true
  };
}
