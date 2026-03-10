"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, Sparkles, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { MobileSidebarDrawer } from "@/components/app/sidepanel/MobileSidebarDrawer";
import { SidebarExpandedPanel } from "@/components/app/sidepanel/SidebarExpandedPanel";
import { SidebarRail } from "@/components/app/sidepanel/SidebarRail";
import { SidebarShell } from "@/components/app/sidepanel/SidebarShell";
import type { SidebarGroup } from "@/components/app/sidepanel/types";
import { Input } from "@/components/ui/input";
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
  const expanded = true;

  const [search, setSearch] = useState("");
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

  const hasMatches = filteredGroups.some((group) => group.links.length > 0);

  return (
    <div className="h-full">
      <MobileSidebarDrawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        groups={filteredGroups}
        pathname={pathname}
        onPrefetch={prefetchRoute}
        onNavigate={handleNavigate}
      />

      <div className="hidden h-full md:block">
        <SidebarShell expanded={expanded}>
          <SidebarRail
            groups={visibleGroups}
            pathname={pathname}
            onPrefetch={prefetchRoute}
            onNavigate={handleNavigate}
          />
          <SidebarExpandedPanel
            groups={filteredGroups}
            pathname={pathname}
            visible={expanded}
            onPrefetch={prefetchRoute}
            onNavigate={handleNavigate}
            topContent={
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("actify:open-command-palette"))}
                  className="inline-flex h-10 w-full items-center justify-between rounded-full border border-emerald-700/70 bg-[#123428] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-[#184132] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                    Command
                  </span>
                  <span className="rounded-md border border-emerald-700/80 bg-[#0f2a20] px-1.5 py-0.5 text-[10px]">
                    ⌘K
                  </span>
                </button>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-100/60" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find module"
                    className="h-10 rounded-full border-emerald-700/70 bg-[#0f2a20] pl-9 text-emerald-50 placeholder:text-emerald-100/55"
                  />
                </div>
                {search && !hasMatches ? (
                  <p className="rounded-lg border border-dashed border-emerald-700/70 bg-[#0f2a20] px-3 py-2 text-xs text-emerald-100/75">
                    No modules match “{search}”.
                  </p>
                ) : null}
              </div>
            }
          />
        </SidebarShell>
      </div>
    </div>
  );
}
