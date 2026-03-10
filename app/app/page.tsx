import { DashboardShell } from "@/components/dashboard/v4/DashboardShell";
import { requireFacilityContext } from "@/lib/auth";
import { getDashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";
import { ensureUserNotificationFeed } from "@/lib/notifications/service";

export default async function DashboardPage() {
  const context = await requireFacilityContext();

  ensureUserNotificationFeed({
    userId: context.user.id,
    facilityId: context.facilityId,
    timezone: context.timeZone
  }).catch(() => undefined);

  const summary = await getDashboardCommandCenterSummary({
    facilityId: context.facilityId,
    facilityName: context.facility.name,
    timeZone: context.timeZone
  });

  return <DashboardShell summary={summary} />;
}
