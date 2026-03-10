"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function SidebarToggleButton({
  expanded,
  onToggle,
  className
}: {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700/60 bg-[#103125] text-emerald-100 transition hover:bg-[#14402f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45",
        className
      )}
      aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
    >
      {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  );
}
