"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Command, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { MODULE_REGISTRY, SIDEBAR_MODULE_GROUPS } from "@/lib/moduleRegistry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  return (
    <section className="nb-surface nb-panel relative overflow-hidden rounded-3xl border p-5">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-gradient-to-r",
          activeModule.accentGradientClasses
        )}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
              activeModule.accentGradientClasses
            )}
          >
            <Icon className="h-5 w-5 text-zinc-950" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Workspace</p>
            <h1 className="font-[var(--font-display)] text-3xl leading-none text-zinc-950">{activeModule.title}</h1>
            <p className="max-w-2xl text-sm text-zinc-600">{activeModule.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 border-zinc-300 bg-zinc-100"
            onClick={() => {
              window.dispatchEvent(new Event("actify:open-command-palette"));
            }}
          >
            <Command className="h-4 w-4" />
            Command
          </Button>
          <Badge variant="outline" className="inline-flex items-center gap-1 border-zinc-300 bg-white text-zinc-700">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Actify 1.0
          </Badge>
        </div>
      </div>

      {related.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Quick jump</p>
          {related.map((module) => {
            const RelatedIcon = module.icon;
            return (
              <Link
                key={module.key}
                href={module.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:-translate-y-px hover:bg-zinc-50"
              >
                <RelatedIcon className="h-3.5 w-3.5" />
                {module.title}
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
