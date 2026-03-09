import Link from "next/link";
import { ActivitySquare, Settings2 } from "lucide-react";

import { DashboardCommandCenter } from "@/components/dashboard/v3/DashboardCommandCenter";
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
    <div className="relative -mt-1 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/app/dashboard/activity-feed"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100 hover:border-zinc-500 hover:text-white"
        >
          <ActivitySquare className="h-4 w-4" />
          Activity Feed
        </Link>
        <Link
          href="/app/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100 hover:border-zinc-500 hover:text-white"
        >
          <Settings2 className="h-4 w-4" />
          Dashboard Settings
        </Link>
      </div>
      <DashboardCommandCenter summary={summary} />
    </div>
  );
}
