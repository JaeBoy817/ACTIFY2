"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Command, Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { TopContentHeader } from "@/components/app/TopContentHeader";
import { MODULE_REGISTRY, SIDEBAR_MODULE_GROUPS } from "@/lib/moduleRegistry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function findActiveModule(pathname: string) {
  return (
    MODULE_REGISTRY.find((module) =>
      module.href === "/app"
        ? pathname === "/app"
        : pathname === module.href || pathname.startsWith(`${module.href}/`)
    ) ?? MODULE_REGISTRY[0]
  );
}

export function AppRouteHeader() {
  const pathname = usePathname();
  const isDashboardRoot = pathname === "/app";
  const activeModule = useMemo(() => findActiveModule(pathname ?? "/app"), [pathname]);

  const related = useMemo(() => {
    const group = SIDEBAR_MODULE_GROUPS.find((item) => item.id === activeModule.sidebarGroup);
    if (!group) return [];
    return group.moduleKeys
      .filter((moduleKey) => moduleKey !== activeModule.key)
      .map((moduleKey) => MODULE_REGISTRY.find((module) => module.key === moduleKey))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 3);
  }, [activeModule.key, activeModule.sidebarGroup]);

  const Icon = activeModule.icon;

  if (isDashboardRoot) {
    return null;
  }

  return (
    <TopContentHeader
      eyebrow="Workspace"
      title={activeModule.title}
      subtitle={activeModule.description}
      icon={Icon}
      accentGradientClasses={activeModule.accentGradientClasses}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-9 border-[#3d5e8c] bg-[#0f1d35] text-[#d8e6ff] hover:bg-[#152a4a] hover:text-white"
            onClick={() => {
              window.dispatchEvent(new Event("actify:open-command-palette"));
            }}
          >
            <Command className="h-4 w-4" />
            Command
          </Button>
          <Badge variant="outline" className="inline-flex items-center gap-1 border-[#3d5e8c] bg-[#0f1d35] text-[#bdd0f0]">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Actify 1.0
          </Badge>
        </>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new Event("actify:open-command-palette"));
          }}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-[#2f456e] bg-[#0f1a30] px-3 text-left text-sm text-[#9fb4da] transition hover:border-[#4c6ea7] hover:bg-[#13203a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/35"
          aria-label={`Search ${activeModule.title}`}
        >
          <span className="inline-flex items-center gap-2 truncate">
            <Search className="h-4 w-4 shrink-0 text-[#9bb3db]" />
            Search {activeModule.title.toLowerCase()}...
          </span>
          <span className="ml-2 rounded-md border border-[#35537f] bg-[#10213f] px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-[#c5d6f4]">
            CMD K
          </span>
        </button>

        {related.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.12em] text-[#93a9d1]">Quick jump</p>
            {related.map((module) => {
              const RelatedIcon = module.icon;
              return (
                <Link
                  key={module.key}
                  href={module.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#3d5e8c] bg-[#0f1d35] px-3 py-1.5 text-xs font-semibold text-[#d8e6ff] transition hover:-translate-y-px hover:border-[#4f76ad] hover:bg-[#142744]"
                >
                  <RelatedIcon className="h-3.5 w-3.5" />
                  {module.title}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </TopContentHeader>
  );
}
