import { prisma } from "@/lib/prisma";
import { defaultFacilitySettingsInput, defaultUserSettingsInput } from "@/lib/settings/defaults";

export async function ensureFacilitySettingsRecord(args: {
  facilityId: string;
  timezone: string;
  moduleFlags?: unknown;
}) {
  return prisma.facilitySettings.upsert({
    where: { facilityId: args.facilityId },
    create: {
      facilityId: args.facilityId,
      ...defaultFacilitySettingsInput({
        timezone: args.timezone,
        moduleFlags: args.moduleFlags
      })
    },
    update: {}
  });
}

export async function ensureUserSettingsRecord(userId: string) {
  return prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...defaultUserSettingsInput()
    },
    update: {}
  });
}

export async function ensureSettingsForUserAndFacility(args: {
  facilityId: string;
  userId: string;
  timezone: string;
  moduleFlags?: unknown;
}) {
  const [facilitySettings, userSettings] = await Promise.all([
    ensureFacilitySettingsRecord({
      facilityId: args.facilityId,
      timezone: args.timezone,
      moduleFlags: args.moduleFlags
    }),
    ensureUserSettingsRecord(args.userId)
  ]);

  return {
    facilitySettings,
    userSettings
  };
}
