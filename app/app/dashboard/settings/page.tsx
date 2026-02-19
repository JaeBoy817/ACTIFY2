import { DashboardSettingsPanel } from "@/components/dashboard/DashboardSettingsPanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireFacilityContext } from "@/lib/auth";
import { formatInTimeZone } from "@/lib/timezone";

export default async function DashboardSettingsPage() {
  const { facility } = await requireFacilityContext();
  const now = new Date();

  return (
    <DashboardShell
      active="settings"
      dateLabel={formatInTimeZone(now, facility.timezone, {
        weekday: "long",
        month: "short",
        day: "numeric"
      })}
      statusLine="Set which optional dashboard elements are visible. Defaults keep the home view minimal."
    >
      <DashboardSettingsPanel />
    </DashboardShell>
  );
}
