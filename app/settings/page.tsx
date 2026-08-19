import { auth, currentUser } from "@clerk/nextjs/server";
import type { FacilitySettings, Role, SubscriptionStatus, UserSettings } from "@prisma/client";
import { redirect } from "next/navigation";

import { ProductionSettingsWorkspaceLazy } from "@/app/app/settings/_components/ProductionSettingsWorkspaceLazy";
import { WorkspaceLayoutShell } from "@/components/workspace/WorkspaceLayoutShell";
import { ensureUserAndFacility } from "@/lib/auth";
import { getFacilityBillingState, type FacilityBillingState } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { defaultFacilitySettingsInput, defaultUserSettingsInput } from "@/lib/settings/defaults";
import { ensureFacilitySettingsRecord, ensureUserSettingsRecord } from "@/lib/settings/ensure";
import { buildProductionSettingsSnapshot, normalizeSectionParam } from "@/lib/settings/production-settings";
import { getStripePlanDetailsFromPriceId } from "@/lib/stripe";

const FALLBACK_ROLE = "ADMIN" as Role;
const SUBSCRIPTION_NONE = "NONE" as SubscriptionStatus;

type SettingsSearchParams = {
  section?: string;
  tab?: string;
};

function logSettingsLoadError(label: string, error: unknown) {
  console.error(`[settings-standalone] ${label} failed`, error);
}

function firstNameFromName(name: string | null | undefined) {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function formatToday(timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timeZone || "America/Chicago"
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }
}

function fallbackBillingState(facilityId: string): FacilityBillingState {
  return {
    facilityId,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    subscriptionStatus: SUBSCRIPTION_NONE,
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

async function getFallbackIdentity() {
  const clerk = await currentUser().catch((error) => {
    logSettingsLoadError("clerk profile lookup", error);
    return null;
  });

  const email =
    clerk?.emailAddresses.find((address) => address.id === clerk.primaryEmailAddressId)?.emailAddress ??
    clerk?.emailAddresses[0]?.emailAddress ??
    "settings@example.com";
  const name = [clerk?.firstName, clerk?.lastName].filter(Boolean).join(" ") || clerk?.username || "Settings User";

  return {
    id: clerk?.id ?? "settings-user",
    name,
    email
  };
}

export default async function StandaloneSettingsPage({
  searchParams
}: {
  searchParams?: SettingsSearchParams;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/settings");
  }

  const fallbackIdentity = await getFallbackIdentity();
  const dbUser = await ensureUserAndFacility().catch((error) => {
    logSettingsLoadError("user and facility lookup", error);
    return null;
  });

  const facilityId = dbUser?.facilityId ?? "settings-fallback-facility";
  const userRecordId = dbUser?.id ?? fallbackIdentity.id;
  const facilityName = dbUser?.facility.name ?? "Actify Settings";
  const facilityTimezone = dbUser?.facility.timezone ?? "America/Chicago";
  const moduleFlags = dbUser?.facility.moduleFlags ?? undefined;
  const role = dbUser?.role ?? FALLBACK_ROLE;
  const userName = dbUser?.name ?? fallbackIdentity.name;
  const userEmail = dbUser?.email ?? fallbackIdentity.email;

  const [facilitySettings, userSettings, users, auditEntries, billing] = await Promise.all([
    dbUser
      ? ensureFacilitySettingsRecord({
          facilityId,
          timezone: facilityTimezone,
          moduleFlags
        }).catch((error) => {
          logSettingsLoadError("facility settings lookup", error);
          return fallbackFacilitySettings({ facilityId, timezone: facilityTimezone, moduleFlags });
        })
      : Promise.resolve(fallbackFacilitySettings({ facilityId, timezone: facilityTimezone, moduleFlags })),
    dbUser
      ? ensureUserSettingsRecord(userRecordId).catch((error) => {
          logSettingsLoadError("user settings lookup", error);
          return fallbackUserSettings(userRecordId);
        })
      : Promise.resolve(fallbackUserSettings(userRecordId)),
    dbUser
      ? prisma.user
          .findMany({
            where: { facilityId },
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            },
            orderBy: [{ role: "asc" }, { email: "asc" }]
          })
          .catch((error) => {
            logSettingsLoadError("team lookup", error);
            return [{ id: userRecordId, name: userName, email: userEmail, role }];
          })
      : Promise.resolve([{ id: userRecordId, name: userName, email: userEmail, role }]),
    dbUser
      ? prisma.auditLog
          .findMany({
            where: {
              facilityId,
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
          })
          .catch((error) => {
            logSettingsLoadError("audit lookup", error);
            return [];
          })
      : Promise.resolve([]),
    dbUser
      ? getFacilityBillingState(facilityId).catch((error) => {
          logSettingsLoadError("billing lookup", error);
          return fallbackBillingState(facilityId);
        })
      : Promise.resolve(fallbackBillingState(facilityId))
  ]);

  const snapshotInput = {
    user: {
      name: userName,
      email: userEmail
    },
    facilityName,
    facilityTimezone,
    facilitySettings,
    userSettings
  };

  const settingsSnapshot = (() => {
    try {
      return buildProductionSettingsSnapshot(snapshotInput);
    } catch (error) {
      logSettingsLoadError("settings snapshot build", error);
      return buildProductionSettingsSnapshot({
        ...snapshotInput,
        facilitySettings: fallbackFacilitySettings({ facilityId, timezone: facilityTimezone, moduleFlags }),
        userSettings: fallbackUserSettings(userRecordId)
      });
    }
  })();

  const planDetails = (() => {
    try {
      return getStripePlanDetailsFromPriceId(billing.stripePriceId);
    } catch (error) {
      logSettingsLoadError("plan lookup", error);
      return null;
    }
  })();
  const planName = planDetails?.planName ?? "Actify Pro";
  const planPriceLabel =
    planDetails?.planKey === "annual"
      ? "$60 / year"
      : planDetails?.planKey === "monthly"
        ? "$5.99 / month"
        : "$5.99 monthly or $60 yearly";

  return (
    <WorkspaceLayoutShell firstName={firstNameFromName(userName)} todayLabel={formatToday(facilityTimezone)}>
      <div className="min-h-[calc(100vh-9.5rem)] space-y-4">
        <ProductionSettingsWorkspaceLazy
          initialSection={normalizeSectionParam(searchParams?.section ?? searchParams?.tab)}
          role={role}
          facilityName={facilityName}
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
      </div>
    </WorkspaceLayoutShell>
  );
}
