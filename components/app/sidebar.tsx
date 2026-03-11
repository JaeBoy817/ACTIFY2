"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { MobileSidebarDrawer } from "@/components/app/sidepanel/MobileSidebarDrawer";
import { SidebarRail } from "@/components/app/sidepanel/SidebarRail";
import type { SidebarGroup } from "@/components/app/sidepanel/types";
import { asModuleFlags } from "@/lib/module-flags";
import { getModuleRegistryItem, SIDEBAR_MODULE_GROUPS } from "@/lib/moduleRegistry";

const groupedLinks: SidebarGroup[] = SIDEBAR_MODULE_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  icon: group.icon,
  links: group.moduleKeys
    .map((moduleKey) => getModuleRegistryItem(moduleKey))
    .filter((module): module is NonNullable<typeof module> => Boolean(module))
    .map((module) => ({
      href: module.href,
      label: module.title,
      icon: module.icon,
      accentGradientClasses: module.accentGradientClasses,
      moduleKey: module.moduleFlagKey
    }))
}));

export function AppSidebar({ moduleFlagsRaw }: { moduleFlagsRaw?: unknown }) {
  const pathname = usePathname();
  const router = useRouter();
  const moduleFlags = useMemo(() => asModuleFlags(moduleFlagsRaw), [moduleFlagsRaw]);

  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleGroups = useMemo(
    () =>
      groupedLinks
        .map((group) => ({
          ...group,
          links: group.links.filter((link) => {
            if (!link.moduleKey) return true;
            const moduleKey = link.moduleKey as keyof typeof moduleFlags.modules;
            return moduleFlags.modules[moduleKey];
          })
        }))
        .filter((group) => group.links.length > 0),
    [moduleFlags]
  );

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  const markNavigationStart = useCallback((href: string) => {
    if (typeof window === "undefined" || typeof performance === "undefined") return;
    performance.mark("actify-nav-start");
    window.sessionStorage.setItem("actify-nav-target", href);
    window.sessionStorage.setItem("actify-nav-start", String(performance.now()));
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      markNavigationStart(href);
      setMobileOpen(false);
    },
    [markNavigationStart]
  );

  return (
    <div className="relative z-10 h-full">
      <MobileSidebarDrawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        groups={visibleGroups}
        pathname={pathname}
        onPrefetch={prefetchRoute}
        onNavigate={handleNavigate}
      />

      <div className="hidden h-full md:block">
        <SidebarRail
          groups={visibleGroups}
          pathname={pathname}
          onPrefetch={prefetchRoute}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}
