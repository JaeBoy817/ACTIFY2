"use client";

import Link from "next/link";

import { ActiveRouteIndicator } from "@/components/app/sidepanel/ActiveRouteIndicator";
import { SidebarTooltip } from "@/components/app/sidepanel/SidebarTooltip";
import type { SidebarLink } from "@/components/app/sidepanel/types";
import { cn } from "@/lib/utils";

export function SidebarNavItem({
  link,
  active,
  compact,
  onPrefetch,
  onNavigate
}: {
  link: SidebarLink;
  active: boolean;
  compact?: boolean;
  onPrefetch?: (href: string) => void;
  onNavigate?: (href: string) => void;
}) {
  const Icon = link.icon;

  const content = (
    <Link
      href={link.href}
      onMouseEnter={() => onPrefetch?.(link.href)}
      onFocus={() => onPrefetch?.(link.href)}
      onTouchStart={() => onPrefetch?.(link.href)}
      onClick={() => onNavigate?.(link.href)}
      className={cn(
        "group relative flex items-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50",
        compact
          ? "h-11 w-11 justify-center border border-transparent"
          : "h-11 w-full gap-2 border pl-9 pr-3",
        active
          ? compact
            ? "border-emerald-300/45 bg-gradient-to-br from-emerald-200/95 to-emerald-400/95 text-[#102118] shadow-[0_10px_24px_-16px_rgba(16,185,129,0.55)]"
            : "border-emerald-300/50 bg-gradient-to-r from-emerald-200/90 to-emerald-400/90 text-[#102118] shadow-[0_12px_28px_-18px_rgba(16,185,129,0.6)]"
          : compact
            ? "bg-[#10281f] text-emerald-100/80 hover:border-emerald-500/50 hover:bg-[#133326]"
            : "border-transparent bg-transparent text-emerald-100/80 hover:border-emerald-700/50 hover:bg-[#133326]"
      )}
      aria-current={active ? "page" : undefined}
    >
      {!compact ? <ActiveRouteIndicator active={active} /> : null}
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br",
          active ? "from-white/90 to-white/70" : link.accentGradientClasses
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", active ? "text-[#0f2a1f]" : "text-zinc-950")} aria-hidden />
      </span>
      {!compact ? <span className="truncate text-sm font-medium">{link.label}</span> : null}
    </Link>
  );

  if (compact) {
    return <SidebarTooltip label={link.label}>{content}</SidebarTooltip>;
  }

  return content;
}
