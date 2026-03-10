import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

import { DashboardAlertsPanel } from "@/components/dashboard/v4/DashboardAlertsPanel";
import { DashboardDocumentationCard } from "@/components/dashboard/v4/DashboardDocumentationCard";
import { DashboardHeroCard } from "@/components/dashboard/v4/DashboardHeroCard";
import { DashboardInventoryCard } from "@/components/dashboard/v4/DashboardInventoryCard";
import { DashboardParticipationCard } from "@/components/dashboard/v4/DashboardParticipationCard";
import { DashboardQuickActions } from "@/components/dashboard/v4/DashboardQuickActions";
import { DashboardResidentFollowUpCard } from "@/components/dashboard/v4/DashboardResidentFollowUpCard";
import { DashboardScheduleCard } from "@/components/dashboard/v4/DashboardScheduleCard";
import { DashboardTopBar } from "@/components/dashboard/v4/DashboardTopBar";
import { DarkSkeletonLoader } from "@/components/dashboard/v4/DarkSkeletonLoader";

export function DashboardShell({ summary }: { summary: DashboardCommandCenterSummary }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-8%_0%,rgba(56,189,248,0.18),transparent_62%),radial-gradient(980px_420px_at_95%_0%,rgba(139,92,246,0.24),transparent_62%),radial-gradient(800px_380px_at_45%_100%,rgba(59,130,246,0.14),transparent_72%)]" />
      <div className="relative z-10 space-y-4">
        <DashboardTopBar summary={summary} />

        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <DashboardHeroCard summary={summary} />
            <DashboardQuickActions summary={summary} />
            <DashboardScheduleCard summary={summary} />
            <div className="grid gap-4 lg:grid-cols-2">
              <DashboardParticipationCard summary={summary} />
              <DashboardDocumentationCard summary={summary} />
            </div>
            <DashboardResidentFollowUpCard summary={summary} />
            <DashboardInventoryCard summary={summary} />
          </div>

          <aside className="space-y-4 xl:col-span-4">
            <DashboardAlertsPanel summary={summary} />
          </aside>
        </div>
      </div>
    </div>
  );
}

export function DashboardShellSkeleton() {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-8%_0%,rgba(56,189,248,0.16),transparent_62%),radial-gradient(980px_420px_at_95%_0%,rgba(139,92,246,0.2),transparent_62%)]" />
      <div className="relative z-10 space-y-4">
        <DarkSkeletonLoader className="h-36 rounded-[1.8rem]" />
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <DarkSkeletonLoader className="h-[380px]" />
            <DarkSkeletonLoader className="h-20" />
            <DarkSkeletonLoader className="h-[420px]" />
            <div className="grid gap-4 lg:grid-cols-2">
              <DarkSkeletonLoader className="h-[320px]" />
              <DarkSkeletonLoader className="h-[320px]" />
            </div>
            <DarkSkeletonLoader className="h-[360px]" />
          </div>
          <div className="space-y-4 xl:col-span-4">
            <DarkSkeletonLoader className="h-[260px]" />
            <DarkSkeletonLoader className="h-[260px]" />
            <DarkSkeletonLoader className="h-[260px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
