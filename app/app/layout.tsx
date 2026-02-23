import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { ActifyLogo } from "@/components/ActifyLogo";
import { ActifyThemeShell } from "@/components/app/ActifyThemeShell";
import { IdleComplianceGuard } from "@/components/app/IdleComplianceGuard";
import { NotificationBellDropdown } from "@/components/app/NotificationBellDropdown";
import { PerformanceReporter } from "@/components/app/PerformanceReporter";
import { RoutePrefetcher } from "@/components/app/RoutePrefetcher";
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

  const [settings, unreadNotificationCount] = await Promise.all([
    prisma.facilitySettings.findUnique({
      where: { facilityId: user.facilityId },
      select: { complianceJson: true }
    }),
    getUnreadNotificationCount(user.id)
  ]);
  const compliance = asComplianceDefaults(settings?.complianceJson);

  return (
    <ActifyThemeShell className="min-h-screen bg-actify-orbs md:flex">
      <div className="relative z-30 w-full p-4 md:sticky md:top-0 md:h-screen md:w-72 md:p-4">
        <AppSidebar moduleFlagsRaw={user.facility.moduleFlags} />
      </div>
      <div className="flex-1 pb-8">
        {isClerkConfigured ? (
          <IdleComplianceGuard
            enabled={compliance.hipaaMode.enabled}
            autoLogoutMinutes={compliance.hipaaMode.autoLogoutMinutes}
          />
        ) : null}
        <div className="relative z-30 px-4 pt-4">
          <GlassNavbar variant="dense" className="actify-shell-solid actify-header-white liquid-enter !p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <Link href="/app" className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ActifyLogo variant="icon" size={34} aria-label="ACTIFY app home" />
                </Link>
                <div>
                  <p className="text-sm text-muted-foreground">Facility</p>
                  <p className="font-semibold">{user.facility.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="actify-accent-badge">
                  Workspace
                </Badge>
                <Badge variant="outline">{user.role}</Badge>
                <NotificationBellDropdown
                  viewerId={user.id}
                  unreadCount={unreadNotificationCount}
                />
                {isClerkConfigured ? (
                  <UserButton afterSignOutUrl="/" appearance={actifyUserButtonAppearance} />
                ) : (
                  <Badge variant="secondary">Clerk not configured</Badge>
                )}
              </div>
            </div>
          </GlassNavbar>
        </div>
        <main className="container py-6">
          <RoutePrefetcher />
          <PerformanceReporter />
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </ActifyThemeShell>
  );
}
