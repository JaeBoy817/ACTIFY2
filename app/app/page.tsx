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

  return (
    <div className="-mx-2 -mt-4 min-h-[calc(100vh-5.5rem)] bg-[#050507] px-2 pb-6 pt-4 md:-mx-3 md:px-3">
      <DashboardShell summary={summary} />
    </div>
  );
}
