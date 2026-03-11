import { Bell, CalendarRange, LayoutDashboard, SlidersHorizontal, UserCircle2 } from "lucide-react";

import { TopContentHeader } from "@/components/app/TopContentHeader";
import { DashboardSearchField } from "@/components/dashboard/v4/DashboardSearchField";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import { PremiumSegmentControl } from "@/components/dashboard/v4/PremiumSegmentControl";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export function DashboardTopBar({ summary }: { summary: DashboardCommandCenterSummary }) {
  return (
    <TopContentHeader
      eyebrow="Dashboard"
      title="Today in Actify"
      subtitle={summary.hero.smartSummary}
      icon={LayoutDashboard}
      accentGradientClasses="from-cyan-300 to-blue-500"
      actions={
        <>
          <PremiumPillButton label="Activity Feed" href="/app/dashboard/activity-feed" tone="neutral" />
          <PremiumPillButton label="Settings" href="/app/dashboard/settings" tone="neutral" />
        </>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto]">
        <DashboardSearchField />
        <PremiumSegmentControl
          items={[
            { id: "today", label: "Today", href: "/app", active: true },
            { id: "week", label: "7D", href: "/app/analytics?range=7d" },
            { id: "month", label: "30D", href: "/app/analytics?range=30d" }
          ]}
        />
        <div className="flex items-center gap-2">
          <PremiumPillButton label="Range" icon={CalendarRange} tone="neutral" href="/app/analytics" />
          <PremiumPillButton label="Filters" icon={SlidersHorizontal} tone="neutral" href="/app/analytics" />
          <PremiumPillButton label="Alerts" icon={Bell} tone="emerald" href="/app/notifications" />
          <PremiumPillButton label="Profile" icon={UserCircle2} tone="neutral" href="/app/settings/profile" />
        </div>
      </div>
    </TopContentHeader>
  );
}
