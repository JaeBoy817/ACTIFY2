import { Bell, CalendarRange, SlidersHorizontal, UserCircle2 } from "lucide-react";

import { DashboardSearchField } from "@/components/dashboard/v4/DashboardSearchField";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import { PremiumSegmentControl } from "@/components/dashboard/v4/PremiumSegmentControl";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export function DashboardTopBar({ summary }: { summary: DashboardCommandCenterSummary }) {
  return (
    <section className="relative space-y-4 overflow-hidden rounded-[1.8rem] border border-[#2a3f67] bg-[linear-gradient(180deg,#091327_0%,#0b1428_46%,#090f1f_100%)] p-4 shadow-[0_32px_52px_-36px_rgba(37,99,235,0.65)] md:p-5">
      <div className="pointer-events-none absolute inset-[1px] rounded-[1.7rem] border border-white/10" />
      <div className="pointer-events-none absolute inset-x-4 top-2 h-6 rounded-full bg-blue-300/10 blur-md" />
      <div className="relative z-10 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9bb3db]">Dashboard</p>
          <h1 className="mt-1 text-3xl font-black leading-none text-white md:text-4xl">Today in Actify</h1>
          <p className="mt-2 text-sm text-[#bdd0f0]">{summary.hero.smartSummary}</p>
        </div>
        <div className="flex items-center gap-2">
          <PremiumPillButton label="Activity Feed" href="/app/dashboard/activity-feed" tone="neutral" />
          <PremiumPillButton label="Settings" href="/app/dashboard/settings" tone="neutral" />
        </div>
      </div>

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
      </div>
    </section>
  );
}
