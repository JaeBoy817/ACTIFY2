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
    <div className="relative isolate -mx-2 overflow-hidden rounded-[2rem] border border-zinc-900 bg-[#050507] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1300px_480px_at_12%_-18%,rgba(16,185,129,0.22),transparent_60%),radial-gradient(900px_300px_at_88%_0%,rgba(16,185,129,0.12),transparent_62%),radial-gradient(700px_280px_at_80%_80%,rgba(16,185,129,0.08),transparent_70%)]" />
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
    <div className="relative isolate -mx-2 overflow-hidden rounded-[2rem] border border-zinc-900 bg-[#050507] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1300px_480px_at_12%_-18%,rgba(16,185,129,0.2),transparent_60%),radial-gradient(900px_320px_at_90%_0%,rgba(16,185,129,0.12),transparent_62%)]" />
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
