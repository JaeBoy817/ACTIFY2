import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { ActifyLogo } from "@/components/ActifyLogo";
import { AppSidebar } from "@/components/app/sidebar";
import { GlassNavbar } from "@/components/glass/GlassNavbar";
import { LiquidOrbs } from "@/components/glass/LiquidOrbs";
import { RouteTransition } from "@/components/motion/RouteTransition";
import { Badge } from "@/components/ui/badge";
import { ensureUserAndFacility } from "@/lib/auth";
import { actifyUserButtonAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureUserAndFacility();

  return (
    <div className="min-h-screen bg-actify-dashboard bg-actify-orbs md:flex">
      <LiquidOrbs />
      <div className="w-full p-4 md:sticky md:top-0 md:h-screen md:w-72 md:p-4">
        <AppSidebar moduleFlagsRaw={user.facility.moduleFlags} />
      </div>
      <div className="flex-1 pb-8">
        <div className="px-4 pt-4">
          <GlassNavbar variant="dense" className="liquid-enter !p-0 overflow-hidden">
            <div className="h-1.5 bg-actify-brand" />
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
                <Badge variant="secondary">Workspace</Badge>
                <Badge variant="outline">{user.role}</Badge>
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
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </div>
  );
}
