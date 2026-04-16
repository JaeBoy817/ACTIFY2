"use client";

import { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

export type ResidentMoreMenuAction = {
  id: string;
  label: string;
  onClick: () => void;
};

export function ResidentMoreMenu({
  actions,
  compact
}: {
  actions: ResidentMoreMenuAction[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
          compact ? "h-8 px-2.5" : "h-9 px-3"
        )}
      >
        {compact ? <MoreHorizontal className="h-4 w-4" aria-hidden /> : "More"}
        {!compact ? <ChevronDown className="h-4 w-4" aria-hidden /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                action.onClick();
                setOpen(false);
              }}
              className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
