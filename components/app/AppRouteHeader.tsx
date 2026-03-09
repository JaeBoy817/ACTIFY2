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
    <section className="relative overflow-hidden rounded-3xl border border-white/32 bg-white/52 p-5 shadow-xl shadow-black/12 backdrop-blur-md">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r",
          activeModule.accentGradientClasses
        )}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/38 bg-gradient-to-br",
              activeModule.accentGradientClasses
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-foreground/60">Workspace</p>
            <h1 className="font-[var(--font-display)] text-3xl leading-none text-foreground">{activeModule.title}</h1>
            <p className="max-w-2xl text-sm text-foreground/70">{activeModule.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="bg-white/70"
            onClick={() => {
              window.dispatchEvent(new Event("actify:open-command-palette"));
            }}
          >
            <Command className="h-4 w-4" />
            Command
          </Button>
          <Badge variant="outline" className="inline-flex items-center gap-1 bg-white/70">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
            Premium workspace
          </Badge>
        </div>
      </div>

      {related.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.12em] text-foreground/60">Quick jump</p>
          {related.map((module) => {
            const RelatedIcon = module.icon;
            return (
              <Link
                key={module.key}
                href={module.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/72 px-3 py-1.5 text-xs font-semibold text-foreground/85 transition hover:translate-y-[-1px] hover:bg-white/88"
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
