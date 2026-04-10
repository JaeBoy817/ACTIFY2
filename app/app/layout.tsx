import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActifyLogo } from "@/components/ActifyLogo";
import { AppRouteHeader } from "@/components/app/AppRouteHeader";
import { ActifyThemeShell } from "@/components/app/ActifyThemeShell";
import { GlobalCommandPalette } from "@/components/app/GlobalCommandPalette";
import { IdleComplianceGuard } from "@/components/app/IdleComplianceGuard";
import { NotificationBellDropdown } from "@/components/app/NotificationBellDropdown";
import { PerformanceReporter } from "@/components/app/PerformanceReporter";
import { RoutePrefetcher } from "@/components/app/RoutePrefetcher";
import { TimezoneSync } from "@/components/app/TimezoneSync";
import { AppSidebar } from "@/components/app/sidebar";
import { RouteTransition } from "@/components/motion/RouteTransition";
import { Badge } from "@/components/ui/badge";
import { ensureUserAndFacility } from "@/lib/auth";
import { getFacilityBillingState } from "@/lib/billing";
import { actifyUserButtonAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";
import { getUnreadNotificationCount } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import { asComplianceDefaults } from "@/lib/settings/defaults";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureUserAndFacility();
  try {
    const billing = await getFacilityBillingState(user.facilityId);
    if (!billing.hasActiveSubscription) {
      redirect("/subscribe");
    }
  } catch (error) {
    // Never hard-crash the app shell on billing lookup failures.
    // We log and continue so users don't land on a blank page.
    console.error("[billing] app layout gating check failed", error);
  }

  const [settingsResult, unreadResult] = await Promise.allSettled([
    prisma.facilitySettings.findUnique({
      where: { facilityId: user.facilityId },
      select: { complianceJson: true }
    }),
    getUnreadNotificationCount(user.id)
  ]);
  const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
  const unreadNotificationCount = unreadResult.status === "fulfilled" ? unreadResult.value : 0;
  const compliance = asComplianceDefaults(settings?.complianceJson);

  return (
    <ActifyThemeShell className="actify-editorial-shell actify-app-shell min-h-screen md:flex">
      <div className="actify-shell-sidebar-layer w-full p-3 md:sticky md:top-0 md:h-screen md:w-[88px] md:shrink-0 md:px-2 md:py-3">
        <AppSidebar moduleFlagsRaw={user.facility.moduleFlags} />
      </div>
      <div className="actify-shell-content-layer min-w-0 flex-1 pb-8 pr-3">
        {isClerkConfigured ? (
          <IdleComplianceGuard
            enabled={compliance.hipaaMode.enabled}
            autoLogoutMinutes={compliance.hipaaMode.autoLogoutMinutes}
          />
        ) : null}
        <div className="actify-shell-header-layer px-2 pt-3 md:px-3">
          <header className="relative overflow-hidden rounded-[1.8rem] border border-[#2a3f67] bg-[linear-gradient(180deg,#091327_0%,#0b1428_46%,#090f1f_100%)] shadow-[0_30px_50px_-36px_rgba(37,99,235,0.65)]">
            <div className="pointer-events-none absolute inset-[1px] rounded-[1.7rem] border border-white/10" />
            <div className="pointer-events-none absolute inset-x-4 top-2 h-6 rounded-full bg-blue-300/10 blur-md" />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
              <div className="flex items-center gap-3">
                <Link href="/app" className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ActifyLogo variant="icon" size={34} aria-label="ACTIFY app home" />
                </Link>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9bb3db]">Facility</p>
                  <p className="text-base font-bold text-white">{user.facility.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="border-[#35537f] bg-[#132542] text-[#d7e6ff]">
                  Workspace
                </Badge>
                <Badge variant="outline" className="border-[#3d5e8c] bg-[#0f1d35] text-[#bdd0f0]">{user.role}</Badge>
                <NotificationBellDropdown
                  viewerId={user.id}
                  unreadCount={unreadNotificationCount}
                />
                {isClerkConfigured ? (
                  <UserButton afterSignOutUrl="/signed-out" appearance={actifyUserButtonAppearance} />
                ) : (
                  <Badge variant="secondary">Clerk not configured</Badge>
                )}
              </div>
            </div>
          </header>
        </div>
        <main className="px-2 py-4 md:px-3">
          <div className="space-y-4">
            <AppRouteHeader />
          </div>
          <RoutePrefetcher />
          <TimezoneSync />
          <PerformanceReporter />
          <GlobalCommandPalette />
          <div className="mt-4">
            <RouteTransition>{children}</RouteTransition>
          </div>
        </main>
      </div>
    </ActifyThemeShell>
  );
}
