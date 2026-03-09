"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Settings, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ActifyLogo } from "@/components/ActifyLogo";
import { GlassSidebar } from "@/components/glass/GlassSidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { asModuleFlags, type ModuleFlags } from "@/lib/module-flags";
import { getModuleRegistryItem, SIDEBAR_MODULE_GROUPS } from "@/lib/moduleRegistry";
import { cn } from "@/lib/utils";

type SidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  accentGradientClasses: string;
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
      accentGradientClasses: module.accentGradientClasses,
      moduleKey: module.moduleFlagKey
    }))
}));

const settingsLink = { href: "/app/settings", label: "Settings", icon: Settings };

export function AppSidebar({ moduleFlagsRaw }: { moduleFlagsRaw?: unknown }) {
  const pathname = usePathname();
  const router = useRouter();
  const moduleFlags = useMemo(() => asModuleFlags(moduleFlagsRaw), [moduleFlagsRaw]);
  const [search, setSearch] = useState("");

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

  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return visibleGroups;
    return visibleGroups
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => link.label.toLowerCase().includes(needle))
      }))
      .filter((group) => group.links.length > 0);
  }, [search, visibleGroups]);

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
    <GlassSidebar variant="dense" className="actify-shell-solid liquid-enter flex h-full w-full flex-col gap-3 overflow-hidden">
      <div className="space-y-3">
        <Link href="/app" className="inline-flex items-center">
          <ActifyLogo variant="lockup" size={34} />
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("actify:open-command-palette"))}
          className="inline-flex w-full items-center justify-between rounded-xl border border-white/35 bg-white/62 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.11em] text-foreground/70 transition hover:bg-white/78"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-actifyBlue" />
            Command Center
          </span>
          <span className="rounded border border-white/45 bg-white/75 px-1.5 py-0.5 text-[10px]">⌘K</span>
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/55" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find module"
            className="h-10 bg-white/76 pl-9"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        <Accordion type="single" collapsible value={openGroup} onValueChange={setOpenGroup} className="space-y-2">
          {filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = group.links.some((link) =>
              link.href === "/app" ? pathname === "/app" : pathname === link.href || pathname.startsWith(`${link.href}/`)
            );
            return (
              <AccordionItem key={group.id} value={group.id} className="border-none">
                <AccordionTrigger
                  className={cn(
                    "sidebar-group-trigger rounded-xl border border-white/25 px-3 py-2 text-sm hover:no-underline",
                    groupActive
                      ? "actify-nav-active bg-white/68 text-foreground shadow-sm"
                      : "bg-white/46 text-muted-foreground hover:bg-white/62 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="actify-nav-icon h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{group.label}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="sidebar-dropdown-content pb-1 pt-1">
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
                            "sidebar-nav-link actify-nav-item ml-1.5 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "actify-nav-active border-white/45 bg-white/84 text-foreground shadow-md shadow-black/12"
                              : "border-transparent bg-white/42 text-muted-foreground hover:border-white/35 hover:bg-white/65 hover:text-foreground"
                          )}
                        >
                          <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/35 bg-gradient-to-br", link.accentGradientClasses)}>
                            <Icon className="actify-nav-icon h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          </span>
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

      <div className="border-t border-white/40 pt-3">
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
                "sidebar-nav-link actify-nav-item flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "actify-nav-active border-white/45 bg-white/84 text-foreground shadow-md shadow-black/12"
                  : "border-transparent bg-white/42 text-muted-foreground hover:border-white/35 hover:bg-white/65 hover:text-foreground"
              )}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/35 bg-gradient-to-br from-slate-500/25 to-slate-300/10">
                <Icon className="actify-nav-icon h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </span>
              <span>{settingsLink.label}</span>
            </Link>
          );
        })()}
      </div>
    </GlassSidebar>
  );
}
