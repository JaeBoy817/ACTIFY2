import { Role } from "@prisma/client";

import { SettingsTabs, type SettingsTabKey } from "@/app/app/settings/_components/SettingsTabs";
import { requireFacilityContext } from "@/lib/auth";
import { parseFacilitySettingsRow, parseUserSettingsRow } from "@/lib/settings/defaults";
import { ensureFacilitySettingsRecord, ensureUserSettingsRecord } from "@/lib/settings/ensure";
import { prisma } from "@/lib/prisma";

const validTabs: SettingsTabKey[] = [
  "facility",
  "roles",
  "modules",
  "calendar",
  "docs",
  "careplan",
  "reports",
  "inventory",
  "notifications",
  "compliance",
  "personal"
];

function getInitialTab(tab?: string): SettingsTabKey {
  if (!tab) return "facility";
  if (validTabs.includes(tab as SettingsTabKey)) {
    return tab as SettingsTabKey;
  }
  return "facility";
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: { tab?: string };
}) {
  const context = await requireFacilityContext();

  const [facilitySettings, userSettings, users, units, auditEntries] = await Promise.all([
    ensureFacilitySettingsRecord({
      facilityId: context.facilityId,
      timezone: context.facility.timezone,
      moduleFlags: context.facility.moduleFlags
    }),
    ensureUserSettingsRecord(context.user.id),
    prisma.user.findMany({
      where: { facilityId: context.facilityId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: [{ role: "asc" }, { email: "asc" }]
    }),
    prisma.unit.findMany({
      where: { facilityId: context.facilityId },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: "asc" }
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
    })
  ]);

  const initialTab = getInitialTab(searchParams?.tab);

  return (
    <SettingsTabs
      initialTab={initialTab}
      role={context.role}
      facilityName={context.facility.name}
      facilityTimezone={context.facility.timezone}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role
      }))}
      units={units}
      auditEntries={auditEntries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        createdAt: entry.createdAt.toISOString(),
        actorName: entry.actorUser?.name ?? null
      }))}
      facilitySettings={parseFacilitySettingsRow(facilitySettings)}
      userSettings={parseUserSettingsRow(userSettings)}
    />
  );
}
