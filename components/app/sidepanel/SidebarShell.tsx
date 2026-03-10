"use client";

import { cn } from "@/lib/utils";

export function SidebarShell({
  expanded,
  className,
  children
}: {
  expanded: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative h-full rounded-[1.9rem] border border-emerald-700/45 bg-[linear-gradient(180deg,#08120f_0%,#0c1a14_48%,#09120f_100%)] p-2.5 shadow-[0_32px_52px_-36px_rgba(16,185,129,0.55)]",
        expanded ? "w-[306px]" : "w-[92px]",
        "transition-[width] duration-220 ease-out",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-[1px] rounded-[1.8rem] border border-emerald-400/12" />
      <div className="pointer-events-none absolute inset-x-4 top-2 h-6 rounded-full bg-emerald-300/8 blur-md" />
      <div className="relative z-10 flex h-full gap-2">
        {children}
      </div>
    </div>
  );
}
