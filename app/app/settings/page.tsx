import { SubscriptionStatus, type FacilitySettings, type UserSettings } from "@prisma/client";

import { ProductionSettingsWorkspaceLazy } from "@/app/app/settings/_components/ProductionSettingsWorkspaceLazy";
import { requireFacilityContext } from "@/lib/auth";
import { getFacilityBillingState, type FacilityBillingState } from "@/lib/billing";
import { getStripePlanDetailsFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { defaultFacilitySettingsInput, defaultUserSettingsInput } from "@/lib/settings/defaults";
import { ensureFacilitySettingsRecord, ensureUserSettingsRecord } from "@/lib/settings/ensure";
import { buildProductionSettingsSnapshot, normalizeSectionParam } from "@/lib/settings/production-settings";

function logSettingsLoadError(label: string, error: unknown) {
  console.error(`[settings] ${label} failed`, error);
}

function fallbackBillingState(facilityId: string): FacilityBillingState {
  return {
    facilityId,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    subscriptionStatus: SubscriptionStatus.NONE,
    subscriptionCurrentPeriodEnd: null,
    hasActiveSubscription: false
  };
}

function fallbackFacilitySettings(args: {
  facilityId: string;
  timezone: string;
  moduleFlags?: unknown;
}): FacilitySettings {
  const now = new Date();
  return {
    id: `fallback-facility-settings-${args.facilityId}`,
    facilityId: args.facilityId,
    ...defaultFacilitySettingsInput({
      timezone: args.timezone,
      moduleFlags: args.moduleFlags
    }),
    createdAt: now,
    updatedAt: now
  };
}

function fallbackUserSettings(userId: string): UserSettings {
  const now = new Date();
  return {
    id: `fallback-user-settings-${userId}`,
    userId,
    ...defaultUserSettingsInput(),
    createdAt: now,
    updatedAt: now
  };
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: { section?: string; tab?: string };
}) {
  const context = await requireFacilityContext();

  const [facilitySettings, userSettings, users, auditEntries, billing] = await Promise.all([
    ensureFacilitySettingsRecord({
      facilityId: context.facilityId,
      timezone: context.facility.timezone,
      moduleFlags: context.facility.moduleFlags
    }).catch((error) => {
      logSettingsLoadError("facility settings lookup", error);
      return fallbackFacilitySettings({
        facilityId: context.facilityId,
        timezone: context.facility.timezone,
        moduleFlags: context.facility.moduleFlags
      });
    }),
    ensureUserSettingsRecord(context.user.id).catch((error) => {
      logSettingsLoadError("user settings lookup", error);
      return fallbackUserSettings(context.user.id);
    }),
    prisma.user.findMany({
      where: { facilityId: context.facilityId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: [{ role: "asc" }, { email: "asc" }]
    }).catch((error) => {
      logSettingsLoadError("team lookup", error);
      return [
        {
          id: context.user.id,
          name: context.user.name,
          email: context.user.email,
          role: context.role
        }
      ];
    }),
    prisma.auditLog.findMany({
      where: {
        facilityId: context.facilityId,
        OR: [{ action: "SETTINGS_UPDATE" }, { action: "ROLE_UPDATE" }]
      },
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actorUser: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }).catch((error) => {
      logSettingsLoadError("audit lookup", error);
      return [];
    }),
    getFacilityBillingState(context.facilityId).catch((error) => {
      logSettingsLoadError("billing lookup", error);
      return fallbackBillingState(context.facilityId);
    })
  ]);

  const settingsSnapshot = buildProductionSettingsSnapshot({
    user: {
      name: context.user.name,
      email: context.user.email
    },
    facilityName: context.facility.name,
    facilityTimezone: context.facility.timezone,
    facilitySettings,
    userSettings
  });

  const planDetails = getStripePlanDetailsFromPriceId(billing.stripePriceId);
  const planName = planDetails?.planName ?? "Actify Pro";
  const planPriceLabel =
    planDetails?.planKey === "annual"
      ? "$60 / year"
      : planDetails?.planKey === "monthly"
        ? "$5.99 / month"
        : "$5.99 monthly or $60 yearly";

  return (
    <ProductionSettingsWorkspaceLazy
      initialSection={normalizeSectionParam(searchParams?.section ?? searchParams?.tab)}
      role={context.role}
      facilityName={context.facility.name}
      values={settingsSnapshot.values}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }))}
      auditEntries={auditEntries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        createdAt: entry.createdAt.toISOString(),
        actorName: entry.actorUser?.name ?? null
      }))}
      billing={{
        status: billing.subscriptionStatus,
        currentPeriodEnd: billing.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
        stripeCustomerId: billing.stripeCustomerId,
        stripePriceId: billing.stripePriceId,
        hasActiveSubscription: billing.hasActiveSubscription,
        planName,
        planPriceLabel
      }}
    />
  );
}
