import { Suspense } from "react";
import Link from "next/link";
import { ActivitySquare, Home, SlidersHorizontal } from "lucide-react";

import { AlertsCard, AlertsCardSkeleton } from "@/components/dashboard/AlertsCard";
import { AnalyticsCard, AnalyticsCardSkeleton } from "@/components/dashboard/AnalyticsCard";
import { DailySnapshotCard, DailySnapshotCardSkeleton } from "@/components/dashboard/DailySnapshotCard";
import { DailyMotivationCard } from "@/components/dashboard/DailyMotivationCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { OneToOneNotesCard, OneToOneNotesCardSkeleton } from "@/components/dashboard/OneToOneNotesCard";
import { QuickActionsCard, QuickActionsCardSkeleton } from "@/components/dashboard/QuickActionsCard";
import { QuoteFooter } from "@/components/dashboard/QuoteFooter";
import { requireFacilityContext } from "@/lib/auth";
import { getDashboardHomeSummary } from "@/lib/dashboard/getDashboardHomeSummary";
import { asModuleFlags } from "@/lib/module-flags";
import { ensureUserNotificationFeed } from "@/lib/notifications/service";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "@/lib/timezone";

export default async function DashboardPage() {
  const context = await requireFacilityContext();
  const moduleFlags = asModuleFlags(context.facility.moduleFlags);

  await ensureUserNotificationFeed({
    userId: context.user.id,
    facilityId: context.facilityId,
    timezone: context.facility.timezone
  });

  const summaryPromise = getDashboardHomeSummary({
    facilityId: context.facilityId,
    timeZone: context.facility.timezone
  });

  return (
    <div className="dashboard-spectrum relative -mt-2 min-h-[calc(100vh-7rem)] space-y-3 pb-2">
      <DashboardHeader
        welcomeText={`Welcome back, ${context.user.name.split(" ")[0] || "team"}`}
        dateLabel={formatInTimeZone(new Date(), context.facility.timezone, {
          weekday: "long",
          month: "short",
          day: "numeric"
        })}
        statusLine="One calm workspace for today’s priorities. Keep chart-heavy views inside Analytics."
      />

      <nav className="relative z-10 flex flex-wrap items-center gap-2" aria-label="Dashboard sections">
        {[
          {
            key: "home",
            href: "/app",
            label: "Dashboard Home",
            icon: Home
          },
          {
            key: "activity-feed",
            href: "/app/dashboard/activity-feed",
            label: "Activity Feed",
            icon: ActivitySquare
          },
          {
            key: "settings",
            href: "/app/dashboard/settings",
            label: "Dashboard Settings",
            icon: SlidersHorizontal
          }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = item.key === "home";

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-white/55 bg-gradient-to-r from-blue-500/25 via-indigo-500/20 to-cyan-500/20 text-foreground shadow-sm"
                  : "border-white/40 bg-white/65 text-foreground/75 hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-cyan-500/10"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2">
        <div className="grid gap-4 xl:grid-cols-12">
          <section className="space-y-4 xl:col-span-4">
            <Suspense fallback={<DailySnapshotCardSkeleton />}>
              <DailySnapshotCard summaryPromise={summaryPromise} />
            </Suspense>
            <Suspense fallback={<QuickActionsCardSkeleton />}>
              <QuickActionsCard moduleFlags={moduleFlags.modules} />
            </Suspense>
          </section>

          <section className="space-y-4 xl:col-span-5">
            <Suspense fallback={<AnalyticsCardSkeleton />}>
              <AnalyticsCard summaryPromise={summaryPromise} />
            </Suspense>
            <Suspense fallback={<AlertsCardSkeleton />}>
              <AlertsCard summaryPromise={summaryPromise} />
            </Suspense>
          </section>

          <section className="space-y-4 xl:col-span-3">
            <Suspense fallback={<OneToOneNotesCardSkeleton />}>
              <OneToOneNotesCard summaryPromise={summaryPromise} />
            </Suspense>
            <QuoteFooter />
          </section>
        </div>
      </div>

      <section className="pt-1">
        <DailyMotivationCard />
      </section>
    </div>
  );
}
