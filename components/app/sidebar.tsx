"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ActifyLogo } from "@/components/ActifyLogo";
import { GlassSidebar } from "@/components/glass/GlassSidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { asModuleFlags, type ModuleFlags } from "@/lib/module-flags";
import { getModuleRegistryItem, SIDEBAR_MODULE_GROUPS } from "@/lib/moduleRegistry";
import { cn } from "@/lib/utils";

type SidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  moduleKey?: keyof ModuleFlags["modules"];
};

type SidebarGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  links: SidebarLink[];
};

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
      moduleKey: module.moduleFlagKey
    }))
}));

const settingsLink = { href: "/app/settings", label: "Settings", icon: Settings };

export function AppSidebar({ moduleFlagsRaw }: { moduleFlagsRaw?: unknown }) {
  const pathname = usePathname();
  const router = useRouter();
  const moduleFlags = useMemo(() => asModuleFlags(moduleFlagsRaw), [moduleFlagsRaw]);

  const visibleGroups = useMemo(
    () =>
      groupedLinks
        .map((group) => ({
          ...group,
          links: group.links.filter((link) => (link.moduleKey ? moduleFlags.modules[link.moduleKey] : true))
        }))
        .filter((group) => group.links.length > 0),
    [moduleFlags]
  );

  const activeGroupId = useMemo(
    () =>
      visibleGroups.find((group) =>
        group.links.some((link) =>
          link.href === "/app" ? pathname === "/app" : pathname === link.href || pathname.startsWith(`${link.href}/`)
        )
      )?.id ?? "",
    [pathname, visibleGroups]
  );
  const [openGroup, setOpenGroup] = useState<string>(activeGroupId || visibleGroups[0]?.id || "");

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroup(activeGroupId);
  }, [activeGroupId]);

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

  return (
    <GlassSidebar variant="dense" className="actify-shell-solid liquid-enter flex h-full w-full flex-col">
      <Link href="/app" className="mb-4 inline-flex items-center">
        <ActifyLogo variant="lockup" size={34} />
      </Link>
      <nav className="space-y-1.5">
        <Accordion type="single" collapsible value={openGroup} onValueChange={setOpenGroup} className="space-y-1">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = group.links.some((link) =>
              link.href === "/app" ? pathname === "/app" : pathname === link.href || pathname.startsWith(`${link.href}/`)
            );

            return (
              <AccordionItem key={group.id} value={group.id} className="border-none">
                <AccordionTrigger
                  className={cn(
                    "actify-nav-item rounded-lg px-3 py-2 text-sm hover:no-underline",
                    groupActive
                      ? "actify-nav-active text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="actify-nav-icon h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{group.label}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="sidebar-dropdown-content pb-1 pt-1 data-[state=closed]:animate-none data-[state=open]:animate-none">
                  <div className="space-y-1">
                    {group.links.map((link) => {
                      const active =
                        link.href === "/app"
                          ? pathname === "/app"
                          : pathname === link.href || pathname.startsWith(`${link.href}/`);
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onMouseEnter={() => prefetchRoute(link.href)}
                          onFocus={() => prefetchRoute(link.href)}
                          onTouchStart={() => prefetchRoute(link.href)}
                          onClick={() => markNavigationStart(link.href)}
                          className={cn(
                            "actify-nav-item ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "actify-nav-active text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="actify-nav-icon h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </nav>
      <div className="mt-auto border-t border-white/60 pt-3">
        {(() => {
          const Icon = settingsLink.icon;
          const active = pathname === settingsLink.href || pathname.startsWith(`${settingsLink.href}/`);
          return (
            <Link
              href={settingsLink.href}
              onMouseEnter={() => prefetchRoute(settingsLink.href)}
              onFocus={() => prefetchRoute(settingsLink.href)}
              onTouchStart={() => prefetchRoute(settingsLink.href)}
              onClick={() => markNavigationStart(settingsLink.href)}
              className={cn(
                "actify-nav-item flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "actify-nav-active text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="actify-nav-icon h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{settingsLink.label}</span>
            </Link>
          );
        })()}
      </div>
    </GlassSidebar>
  );
}
