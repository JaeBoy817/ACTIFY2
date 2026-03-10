"use client";

import Link from "next/link";
import { LifeBuoy, Settings } from "lucide-react";

import { ActifyLogo } from "@/components/ActifyLogo";
import { SidebarNavGroup } from "@/components/app/sidepanel/SidebarNavGroup";
import { SidebarTooltip } from "@/components/app/sidepanel/SidebarTooltip";
import type { SidebarGroup } from "@/components/app/sidepanel/types";
import { cn } from "@/lib/utils";

export function SidebarRail({
  groups,
  pathname,
  onPrefetch,
  onNavigate
}: {
  groups: SidebarGroup[];
  pathname: string;
  onPrefetch?: (href: string) => void;
  onNavigate?: (href: string) => void;
}) {
  const compactGroups: SidebarGroup[] = groups.map((group) => ({ ...group }));

  return (
    <div
      className={cn(
        "flex h-full w-[74px] flex-col rounded-[1.6rem] border border-emerald-700/50 bg-[linear-gradient(180deg,#0b1713_0%,#10231b_45%,#0b1612_100%)] p-2.5 shadow-[0_20px_40px_-30px_rgba(16,185,129,0.45)]"
      )}
    >
      <div className="flex items-center justify-between">
        <SidebarTooltip label="Actify Home">
          <Link
            href="/app"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/60 bg-[#123126] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45"
          >
            <ActifyLogo variant="icon" size={24} />
          </Link>
        </SidebarTooltip>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
        {compactGroups.map((group) => (
          <SidebarNavGroup
            key={`rail-${group.id}`}
            group={group}
            pathname={pathname}
            compact
            onPrefetch={onPrefetch}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-emerald-800/70 pt-2.5">
        <SidebarTooltip label="Settings">
          <Link
            href="/app/settings"
            onMouseEnter={() => onPrefetch?.("/app/settings")}
            onFocus={() => onPrefetch?.("/app/settings")}
            onTouchStart={() => onPrefetch?.("/app/settings")}
            onClick={() => onNavigate?.("/app/settings")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-transparent bg-[#10281f] text-emerald-100/80 transition hover:border-emerald-500/50 hover:bg-[#133326] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </SidebarTooltip>
        <SidebarTooltip label="Help">
          <Link
            href="/contact"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-transparent bg-[#10281f] text-emerald-100/80 transition hover:border-emerald-500/50 hover:bg-[#133326] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45"
          >
            <LifeBuoy className="h-4 w-4" />
          </Link>
        </SidebarTooltip>
      </div>
    </div>
  );
}
