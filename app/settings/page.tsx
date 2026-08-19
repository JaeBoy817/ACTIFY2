import type { FacilitySettings, Role, SubscriptionStatus, UserSettings } from "@prisma/client";

import { ProductionSettingsWorkspaceLazy } from "@/app/app/settings/_components/ProductionSettingsWorkspaceLazy";
import { WorkspaceLayoutShell } from "@/components/workspace/WorkspaceLayoutShell";
import { defaultFacilitySettingsInput, defaultUserSettingsInput } from "@/lib/settings/defaults";
import { buildProductionSettingsSnapshot, normalizeSectionParam } from "@/lib/settings/production-settings";

const FALLBACK_FACILITY_ID = "settings-fallback-facility";
const FALLBACK_USER_ID = "settings-user";
const FALLBACK_FACILITY_NAME = "Actify Settings";
const FALLBACK_TIMEZONE = "America/Chicago";
const FALLBACK_ROLE = "ADMIN" as Role;
const SUBSCRIPTION_NONE = "NONE" as SubscriptionStatus;

type SettingsSearchParams = {
  section?: string;
  tab?: string;
};

function formatToday(timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timeZone || FALLBACK_TIMEZONE
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

function fallbackFacilitySettings(): FacilitySettings {
  const now = new Date();
  return {
    id: `fallback-facility-settings-${FALLBACK_FACILITY_ID}`,
    facilityId: FALLBACK_FACILITY_ID,
    ...defaultFacilitySettingsInput({
      timezone: FALLBACK_TIMEZONE,
      moduleFlags: undefined
    }),
    createdAt: now,
    updatedAt: now
  };
}

function fallbackUserSettings(): UserSettings {
  const now = new Date();
  return {
    id: `fallback-user-settings-${FALLBACK_USER_ID}`,
    userId: FALLBACK_USER_ID,
    ...defaultUserSettingsInput(),
    createdAt: now,
    updatedAt: now
  };
}

export default function StandaloneSettingsPage({
  searchParams
}: {
  searchParams?: SettingsSearchParams;
}) {
  const settingsSnapshot = buildProductionSettingsSnapshot({
    user: {
      name: "Settings User",
      email: "settings@example.com"
    },
    facilityName: FALLBACK_FACILITY_NAME,
    facilityTimezone: FALLBACK_TIMEZONE,
    facilitySettings: fallbackFacilitySettings(),
    userSettings: fallbackUserSettings()
  });

  return (
    <WorkspaceLayoutShell firstName="there" todayLabel={formatToday(FALLBACK_TIMEZONE)}>
      <div className="min-h-[calc(100vh-9.5rem)] space-y-4">
        <ProductionSettingsWorkspaceLazy
          initialSection={normalizeSectionParam(searchParams?.section ?? searchParams?.tab)}
          role={FALLBACK_ROLE}
          facilityName={FALLBACK_FACILITY_NAME}
          values={settingsSnapshot.values}
          users={[]}
          auditEntries={[]}
          billing={{
            status: SUBSCRIPTION_NONE,
            currentPeriodEnd: null,
            stripeCustomerId: null,
            stripePriceId: null,
            hasActiveSubscription: false,
            planName: "Actify Pro",
            planPriceLabel: "$5.99 monthly or $60 yearly"
          }}
        />
      </div>
    </WorkspaceLayoutShell>
  );
}
