"use client";

import { Menu, X } from "lucide-react";

import { SidebarNavGroup } from "@/components/app/sidepanel/SidebarNavGroup";
import { SidebarUtilitySection } from "@/components/app/sidepanel/SidebarUtilitySection";
import type { SidebarGroup } from "@/components/app/sidepanel/types";
import { cn } from "@/lib/utils";

export function MobileSidebarDrawer({
  open,
  onOpenChange,
  groups,
  pathname,
  onPrefetch,
  onNavigate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: SidebarGroup[];
  pathname: string;
  onPrefetch?: (href: string) => void;
  onNavigate?: (href: string) => void;
}) {
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/70 bg-[#10291f] text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
        aria-label="Open sidebar navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-[90] transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute inset-0 bg-black/55"
          aria-label="Close navigation"
        />
        <aside
          className={cn(
            "absolute bottom-0 left-0 top-0 w-[88%] max-w-[330px] rounded-r-[1.8rem] border-r border-emerald-700/60 bg-[linear-gradient(180deg,#08120f_0%,#0d1f18_48%,#09120f_100%)] p-4 shadow-[0_24px_46px_-30px_rgba(16,185,129,0.52)] transition-transform duration-220 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200/70">
              Navigation
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700/70 bg-[#123327] text-emerald-100"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex h-[calc(100%-56px)] flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {groups.map((group) => (
                <SidebarNavGroup
                  key={`mobile-${group.id}`}
                  group={group}
                  pathname={pathname}
                  onPrefetch={onPrefetch}
                  onNavigate={(href) => {
                    onNavigate?.(href);
                    onOpenChange(false);
                  }}
                />
              ))}
            </div>
            <div className="mt-3">
              <SidebarUtilitySection pathname={pathname} onPrefetch={onPrefetch} onNavigate={onNavigate} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
