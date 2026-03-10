"use client";

import { useCallback, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { MobileSidebarDrawer } from "@/components/app/sidepanel/MobileSidebarDrawer";
import { SidebarRail } from "@/components/app/sidepanel/SidebarRail";
import type { SidebarGroup } from "@/components/app/sidepanel/types";
import { asModuleFlags } from "@/lib/module-flags";
import { getModuleRegistryItem, SIDEBAR_MODULE_GROUPS } from "@/lib/moduleRegistry";

function withOneToOneLink(groups: SidebarGroup[]) {
  return groups.map((group) => {
    if (group.id !== "daily-workflow") return group;

    const notesIndex = group.links.findIndex((link) => link.href === "/app/notes");
    if (notesIndex === -1) return group;

    const existing = group.links.some((link) => link.href === "/app/notes/one-to-one");
    if (existing) return group;

    const nextLinks = [...group.links];
    nextLinks.splice(notesIndex + 1, 0, {
      href: "/app/notes/one-to-one",
      label: "1:1 Notes",
      icon: UserRound,
      accentGradientClasses: "from-orange-300 to-orange-500 text-zinc-950",
      moduleKey: "notes"
    });

    return { ...group, links: nextLinks };
  });
}

const groupedLinks: SidebarGroup[] = withOneToOneLink(
  SIDEBAR_MODULE_GROUPS.map((group) => ({
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
  }))
);

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
    <div className="h-full">
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
