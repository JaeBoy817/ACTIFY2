"use server";

import { type Prisma } from "@prisma/client";

import { logAudit } from "@/lib/audit";
import { requireFacilityContext } from "@/lib/auth";
import { assertAdmin, assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  asRolePermissionMatrix,
  parseFacilitySettingsRow
} from "@/lib/settings/defaults";
import { ensureFacilitySettingsRecord, ensureUserSettingsRecord } from "@/lib/settings/ensure";
import {
  facilitySettingsPayloadSchema,
  updatePermissionsMatrixSchema,
  updateUserRoleSchema,
  userSettingsPayloadSchema
} from "@/lib/settings/schemas";

export async function upsertFacilitySettings(payload: unknown) {
  const context = await requireFacilityContext();
  assertWritable(context.role);

  const settings = await ensureFacilitySettingsRecord({
    facilityId: context.facilityId,
    timezone: context.facility.timezone,
    moduleFlags: context.facility.moduleFlags
  });

  const permissions = asRolePermissionMatrix(settings.permissionsJson);
  const canEditSettings = permissions[context.role]?.settingsEdit;
  if (!canEditSettings) {
    throw new Error("You do not have permission to edit facility settings.");
  }

  const parsed = facilitySettingsPayloadSchema.parse(payload);

  if (parsed.section === "compliance") {
    assertAdmin(context.role);
  }

  const current = parseFacilitySettingsRow(settings);

  let updateData: Prisma.FacilitySettingsUpdateInput = {};
  let facilityUpdateData: Prisma.FacilityUpdateInput | undefined;

  if (parsed.section === "facility") {
    const nextBusinessHours = {
      start: parsed.values.businessHoursStart,
      end: parsed.values.businessHoursEnd,
      days: parsed.values.businessDays
    };
    const nextPolicy = {
      ...current.policyFlags,
      allowSmokingTracking: parsed.values.allowSmokingTracking,
      hideTriggersInPrint: parsed.values.hideTriggersInPrint,
      maskSensitiveFieldsInPrint: parsed.values.maskSensitiveFieldsInPrint,
      maskFamilyContactInPrint: parsed.values.maskFamilyContactInPrint
    };

    updateData = {
      timezone: parsed.values.timezone,
      roomFormatRule: parsed.values.roomFormatRule,
      roomFormatHint: parsed.values.roomFormatHint?.trim() || null,
      businessHoursJson: nextBusinessHours,
      policyFlagsJson: nextPolicy,
      attendanceRulesJson: {
        ...current.attendanceRules,
        useBusinessHoursDefaults: parsed.values.useBusinessHoursDefaults
      }
    };
    facilityUpdateData = {
      timezone: parsed.values.timezone
    };
  }

  if (parsed.section === "modules") {
    const nextModuleFlags = {
      mode: parsed.values.mode,
      modules: parsed.values.modules
    };

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
        groupMinutes: parsed.values.groupMinutes,
        oneToOneMinutes: parsed.values.oneToOneMinutes,
        locations: parsed.values.locations,
        warnTherapyOverlap: parsed.values.warnTherapyOverlap,
        warnOutsideBusinessHours: parsed.values.warnOutsideBusinessHours
      }
    };
  }

  if (parsed.section === "docs") {
    updateData = {
      attendanceRulesJson: {
        ...current.attendanceRules,
        engagementWeights: {
          present: parsed.values.presentWeight,
          active: parsed.values.activeWeight,
          leading: parsed.values.leadingWeight
        },
        requireBarrierNoteFor: parsed.values.requireNoteForBarriers
      },
      documentationRulesJson: {
        ...current.documentationRules,
        noteRequiredFields: parsed.values.noteRequiredFields,
        minNarrativeLen: parsed.values.minNarrativeLen,
        requireGoalLinkForOneToOne: parsed.values.requireGoalLinkForOneToOne
      }
    };
  }

  if (parsed.section === "careplan") {
    const cadenceDays = parsed.values.cadencePreset === "CUSTOM" ? parsed.values.customCadenceDays ?? 30 : Number(parsed.values.cadencePreset);
    updateData = {
      carePlanRulesJson: {
        ...current.carePlanRules,
        reviewCadenceDays: cadenceDays,
        requirePersonalization: parsed.values.requirePersonalization,
        blockReviewCompletionIfGeneric: parsed.values.blockReviewCompletionIfGeneric
      }
    };
  }

  if (parsed.section === "reports") {
    updateData = {
      reportSettingsJson: {
        ...current.reportSettings,
        theme: parsed.values.theme,
        accent: parsed.values.accent,
        includeSections: parsed.values.includeSections
      },
      printDefaultsJson: {
        ...current.printDefaults,
        paperSize: parsed.values.paperSize,
        margins: parsed.values.margins,
        includeFooterMeta: parsed.values.includeFooterMeta
      }
    };
  }

  if (parsed.section === "inventory") {
    updateData = {
      inventoryDefaultsJson: {
        ...current.inventoryDefaults,
        reorderThresholdMultiplier: parsed.values.reorderThresholdMultiplier,
        showLowStockBanner: parsed.values.showLowStockBanner
      },
      prizeCartDefaultsJson: {
        ...current.prizeCartDefaults,
        presets: parsed.values.presets,
        enableRestockSuggestions: parsed.values.enableRestockSuggestions,
        restockAggressiveness: parsed.values.restockAggressiveness
      }
    };
  }

  if (parsed.section === "notifications") {
    updateData = {
      notificationDefaultsJson: {
        ...current.notificationDefaults,
        dailyDigestEnabled: parsed.values.dailyDigestEnabled,
        dailyDigestTime: parsed.values.dailyDigestTime || current.notificationDefaults.dailyDigestTime,
        weeklyDigestEnabled: parsed.values.weeklyDigestEnabled,
        weeklyDigestDay: parsed.values.weeklyDigestDay,
        taskReminders: parsed.values.taskReminders,
        reminderLeadTimeMinutes: Number(parsed.values.reminderLeadTimeMinutes)
      }
    };
  }

  if (parsed.section === "compliance") {
    const nextPolicy = {
      ...current.policyFlags,
      hideTriggersInPrint: parsed.values.hideTriggersInPrint,
      maskFamilyContactInPrint: parsed.values.maskFamilyContactInPrint
    };

    updateData = {
      complianceJson: {
        ...current.compliance,
        auditRetentionDays: parsed.values.auditRetentionDays,
        exportRetentionDays: parsed.values.exportRetentionDays,
        hideTriggersInPrint: parsed.values.hideTriggersInPrint,
        maskFamilyContactInPrint: parsed.values.maskFamilyContactInPrint
      },
      policyFlagsJson: nextPolicy
    };
  }

  const before = {
    section: parsed.section,
    values: parsed.section === "facility" ? current : undefined
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
    action: "UPDATE",
    entityType: "FacilitySettings",
    entityId: updated.id,
    before,
    after: {
      section: parsed.section,
      updatedAt: updated.updatedAt
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

  const quickPhrases = parsed.values.quickPhrases.map((phrase) => phrase.trim()).filter(Boolean).slice(0, 100);

  const updated = await prisma.userSettings.update({
    where: { userId: context.user.id },
    data: {
      defaultLanding: parsed.values.defaultLanding,
      reduceMotion: parsed.values.reduceMotion,
      highContrast: parsed.values.highContrast,
      fontScale: parsed.values.fontScale,
      myQuickPhrasesJson: quickPhrases,
      shortcutsEnabled: parsed.values.shortcutsEnabled,
      printPrefsJson: {
        ...(existing.printPrefsJson as Record<string, unknown>),
        paperSize: "LETTER",
        includeFooterMeta: true
      }
    }
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "UPDATE",
    entityType: "UserSettings",
    entityId: updated.id,
    before: {
      defaultLanding: existing.defaultLanding,
      reduceMotion: existing.reduceMotion,
      highContrast: existing.highContrast,
      fontScale: existing.fontScale,
      shortcutsEnabled: existing.shortcutsEnabled
    },
    after: {
      defaultLanding: updated.defaultLanding,
      reduceMotion: updated.reduceMotion,
      highContrast: updated.highContrast,
      fontScale: updated.fontScale,
      shortcutsEnabled: updated.shortcutsEnabled
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

  const matrix = asRolePermissionMatrix(parsed.permissionsJson);

  const settings = await ensureFacilitySettingsRecord({
    facilityId: context.facilityId,
    timezone: context.facility.timezone,
    moduleFlags: context.facility.moduleFlags
  });

  const updated = await prisma.facilitySettings.update({
    where: { facilityId: context.facilityId },
    data: {
      permissionsJson: matrix
    }
  });

  await logAudit({
    facilityId: context.facilityId,
    actorUserId: context.user.id,
    action: "UPDATE",
    entityType: "FacilitySettings.permissionsJson",
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
    action: "UPDATE",
    entityType: "User.role",
    entityId: updated.id,
    before: { role: targetUser.role },
    after: { role: updated.role }
  });

  return {
    ok: true
  };
}
