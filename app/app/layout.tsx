import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

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
import { GlassNavbar } from "@/components/glass/GlassNavbar";
import { RouteTransition } from "@/components/motion/RouteTransition";
import { Badge } from "@/components/ui/badge";
import { ensureUserAndFacility } from "@/lib/auth";
import { actifyUserButtonAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";
import { getUnreadNotificationCount } from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import { asComplianceDefaults } from "@/lib/settings/defaults";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureUserAndFacility();

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
    <ActifyThemeShell className="actify-editorial-shell min-h-screen md:flex">
      <div className="relative z-30 w-full p-3 md:sticky md:top-0 md:h-screen md:w-[88px] md:shrink-0 md:px-2 md:py-3">
        <AppSidebar moduleFlagsRaw={user.facility.moduleFlags} />
      </div>
      <div className="min-w-0 flex-1 pb-8 pr-3">
        {isClerkConfigured ? (
          <IdleComplianceGuard
            enabled={compliance.hipaaMode.enabled}
            autoLogoutMinutes={compliance.hipaaMode.autoLogoutMinutes}
          />
        ) : null}
        <div className="relative z-30 px-2 pt-3 md:px-3">
          <GlassNavbar variant="dense" className="actify-shell-solid !overflow-hidden !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Link href="/app" className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ActifyLogo variant="icon" size={34} aria-label="ACTIFY app home" />
                </Link>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Facility</p>
                  <p className="text-base font-bold text-zinc-900">{user.facility.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="border-zinc-300 bg-zinc-100 text-zinc-800">
                  Workspace
                </Badge>
                <Badge variant="outline" className="border-zinc-300 bg-white text-zinc-700">{user.role}</Badge>
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
          </GlassNavbar>
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
