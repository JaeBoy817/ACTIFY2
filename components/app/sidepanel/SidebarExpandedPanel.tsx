"use client";

import { Sparkles } from "lucide-react";

import { SidebarNavGroup } from "@/components/app/sidepanel/SidebarNavGroup";
import { SidebarUtilitySection } from "@/components/app/sidepanel/SidebarUtilitySection";
import type { SidebarGroup } from "@/components/app/sidepanel/types";
import { cn } from "@/lib/utils";

export function SidebarExpandedPanel({
  groups,
  pathname,
  visible,
  topContent,
  onPrefetch,
  onNavigate
}: {
  groups: SidebarGroup[];
  pathname: string;
  visible: boolean;
  topContent?: React.ReactNode;
  onPrefetch?: (href: string) => void;
  onNavigate?: (href: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative hidden h-full min-h-0 w-[214px] rounded-[1.6rem] border border-emerald-700/55 bg-[linear-gradient(180deg,#0f2019_0%,#123126_38%,#0f1c17_100%)] p-3 shadow-[0_24px_42px_-32px_rgba(16,185,129,0.5)] md:flex md:flex-col",
        "transition-all duration-220 ease-out",
        visible ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-3 opacity-0"
      )}
      aria-hidden={!visible}
    >
      <div className="mb-3 rounded-xl border border-emerald-700/55 bg-[#153529] px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200/70">Workspace</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-100/85">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
          Actify Navigation
        </p>
      </div>

      {topContent ? <div className="mb-3">{topContent}</div> : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {groups.map((group) => (
          <SidebarNavGroup
            key={`expanded-${group.id}`}
            group={group}
            pathname={pathname}
            onPrefetch={onPrefetch}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div className="mt-3">
        <SidebarUtilitySection pathname={pathname} onPrefetch={onPrefetch} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
