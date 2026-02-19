import { Suspense } from "react";

import { DailyMotivationCard } from "@/components/dashboard/DailyMotivationCard";
import { DashboardAnalyticsPreview, DashboardAnalyticsPreviewSkeleton } from "@/components/dashboard/DashboardAnalyticsPreview";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FocusList, FocusListSkeleton } from "@/components/dashboard/FocusList";
import { QuickActions, type DashboardQuickAction } from "@/components/dashboard/QuickActions";
import { RecentAndAlerts, RecentAndAlertsSkeleton } from "@/components/dashboard/RecentAndAlerts";
import { TodayAtAGlance, TodayAtAGlanceSkeleton } from "@/components/dashboard/TodayAtAGlance";
import { requireFacilityContext } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/dashboard/getDashboardSummary";
import { asModuleFlags } from "@/lib/module-flags";
import { ensureUserNotificationFeed } from "@/lib/notifications/service";
import { formatInTimeZone } from "@/lib/timezone";

export default async function DashboardPage() {
  const context = await requireFacilityContext();
  const moduleFlags = asModuleFlags(context.facility.moduleFlags);

  await ensureUserNotificationFeed({
    userId: context.user.id,
    facilityId: context.facilityId,
    timezone: context.facility.timezone
  });

  const summaryPromise = getDashboardSummary({
    facilityId: context.facilityId,
    timeZone: context.facility.timezone,
    showBirthdaysWidget: moduleFlags.widgets.birthdays,
    includeExtended: false
  });

  const dashboardQuickActions = [
    {
      href: "/app/calendar",
      label: "Calendar",
      hint: "Open week schedule",
      icon: "calendar"
    },
    {
      href: "/app/attendance",
      label: "Attendance",
      hint: "Quick take attendance",
      icon: "attendance"
    },
    {
      href: "/app/residents",
      label: "Residents",
      hint: "Open resident workspace",
      icon: "residents"
    },
    {
      href: "/app/notes/new?type=general",
      label: "New Note",
      hint: "Start general note",
      icon: "new-note"
    },
    {
      href: "/app/notes/new?type=1on1",
      label: "1:1 Note",
      hint: "Start resident 1:1 note",
      icon: "one-on-one"
    },
    {
      href: "/app/care-plans",
      label: "Care Plan",
      hint: "Open care plans",
      icon: "care-plan",
      requiresPreference: "showCarePlanQuickAction"
    },
    {
      href: "/app/reports",
      label: "Reports",
      hint: "Generate exports",
      icon: "reports",
      requiresPreference: "showReportsQuickAction"
    }
  ] satisfies DashboardQuickAction[];

  const quickActions = dashboardQuickActions.filter((item) => {
    if (item.href.startsWith("/app/calendar")) return moduleFlags.modules.calendar;
    if (item.href.startsWith("/app/attendance")) return moduleFlags.modules.attendanceTracking;
    if (item.href.startsWith("/app/notes")) return moduleFlags.modules.notes;
    if (item.href.startsWith("/app/care-plans")) return moduleFlags.modules.carePlan;
    if (item.href.startsWith("/app/reports")) return moduleFlags.modules.reports;
    return true;
  });

  return (
    <DashboardShell
      active="home"
      dateLabel={formatInTimeZone(new Date(), context.facility.timezone, {
        weekday: "long",
        month: "short",
        day: "numeric"
      })}
      statusLine="One calm workspace for today’s priorities. Open deeper widgets from Activity Feed when needed."
    >
      <div className="space-y-4">
        <QuickActions actions={quickActions} />

        <Suspense fallback={<TodayAtAGlanceSkeleton />}>
          <TodayAtAGlance summaryPromise={summaryPromise} />
        </Suspense>

        <Suspense fallback={<FocusListSkeleton />}>
          <FocusList summaryPromise={summaryPromise} />
        </Suspense>

        <Suspense fallback={<RecentAndAlertsSkeleton />}>
          <RecentAndAlerts summaryPromise={summaryPromise} />
        </Suspense>

        <Suspense fallback={<DashboardAnalyticsPreviewSkeleton />}>
          <DashboardAnalyticsPreview summaryPromise={summaryPromise} />
        </Suspense>

        <section className="pt-2">
          <DailyMotivationCard />
        </section>
      </div>
    </DashboardShell>
  );
}
