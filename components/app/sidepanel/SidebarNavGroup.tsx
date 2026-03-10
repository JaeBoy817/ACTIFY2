"use client";

import type { SidebarGroup } from "@/components/app/sidepanel/types";
import { SidebarNavItem } from "@/components/app/sidepanel/SidebarNavItem";
import { cn } from "@/lib/utils";

export function SidebarNavGroup({
  group,
  pathname,
  compact,
  onPrefetch,
  onNavigate
}: {
  group: SidebarGroup;
  pathname: string;
  compact?: boolean;
  onPrefetch?: (href: string) => void;
  onNavigate?: (href: string) => void;
}) {
  return (
    <section className={cn("space-y-2", compact && "space-y-1.5")}>
      {!compact ? (
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/55">
          {group.label}
        </p>
      ) : null}
      <div className={cn("space-y-1.5", compact && "space-y-1")}>
        {group.links.map((link) => {
          const active =
            link.href === "/app"
              ? pathname === "/app"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <SidebarNavItem
              key={link.href}
              link={link}
              active={active}
              compact={compact}
              onPrefetch={onPrefetch}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </section>
  );
}
