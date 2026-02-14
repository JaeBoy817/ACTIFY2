import { RoomFormatRule } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  asAttendanceRules,
  asCarePlanRules,
  asComplianceDefaults,
  asDocumentationRules,
  asInventoryDefaults,
  asModuleFlagsFromSettings,
  asNotificationDefaults,
  asPolicyFlags,
  asPrintDefaults,
  asPrizeCartDefaults,
  asReportSettings,
  asRolePermissionMatrix
} from "@/lib/settings/defaults";

export async function getEffectiveAttendanceWeights(facilityId: string) {
  const settings = await prisma.facilitySettings.findUnique({
    where: { facilityId },
    select: {
      attendanceRulesJson: true
    }
  });

  return asAttendanceRules(settings?.attendanceRulesJson).engagementWeights;
}

export async function getEffectiveDocumentationRules(facilityId: string) {
  const settings = await prisma.facilitySettings.findUnique({
    where: { facilityId },
    select: {
      documentationRulesJson: true
    }
  });

  return asDocumentationRules(settings?.documentationRulesJson);
}

export async function getEffectiveReportSettings(facilityId: string) {
  const settings = await prisma.facilitySettings.findUnique({
    where: { facilityId },
    select: {
      reportSettingsJson: true,
      printDefaultsJson: true,
      policyFlagsJson: true,
      complianceJson: true,
      attendanceRulesJson: true,
      moduleFlagsJson: true,
      inventoryDefaultsJson: true,
      prizeCartDefaultsJson: true,
      notificationDefaultsJson: true,
      carePlanRulesJson: true,
      businessHoursJson: true,
      roomFormatRule: true,
      roomFormatHint: true,
      timezone: true,
      documentationRulesJson: true,
      permissionsJson: true
    }
  });

  if (!settings) {
    return {
      reportSettings: asReportSettings(undefined),
      printDefaults: asPrintDefaults(undefined),
      policyFlags: asPolicyFlags(undefined),
      compliance: asComplianceDefaults(undefined),
      attendanceRules: asAttendanceRules(undefined),
      moduleFlags: asModuleFlagsFromSettings(undefined),
      inventoryDefaults: asInventoryDefaults(undefined),
      prizeCartDefaults: asPrizeCartDefaults(undefined),
      notificationDefaults: asNotificationDefaults(undefined),
      carePlanRules: asCarePlanRules(undefined),
      businessHours: undefined,
      roomFormatRule: RoomFormatRule.A_B,
      roomFormatHint: "",
      timezone: "America/New_York",
      documentationRules: asDocumentationRules(undefined),
      permissions: asRolePermissionMatrix(undefined)
    };
  }

  return {
    reportSettings: asReportSettings(settings.reportSettingsJson),
    printDefaults: asPrintDefaults(settings.printDefaultsJson),
    policyFlags: asPolicyFlags(settings.policyFlagsJson),
    compliance: asComplianceDefaults(settings.complianceJson),
    attendanceRules: asAttendanceRules(settings.attendanceRulesJson),
    moduleFlags: asModuleFlagsFromSettings(settings.moduleFlagsJson),
    inventoryDefaults: asInventoryDefaults(settings.inventoryDefaultsJson),
    prizeCartDefaults: asPrizeCartDefaults(settings.prizeCartDefaultsJson),
    notificationDefaults: asNotificationDefaults(settings.notificationDefaultsJson),
    carePlanRules: asCarePlanRules(settings.carePlanRulesJson),
    businessHours: settings.businessHoursJson,
    roomFormatRule: settings.roomFormatRule,
    roomFormatHint: settings.roomFormatHint ?? "",
    timezone: settings.timezone,
    documentationRules: asDocumentationRules(settings.documentationRulesJson),
    permissions: asRolePermissionMatrix(settings.permissionsJson)
  };
}
