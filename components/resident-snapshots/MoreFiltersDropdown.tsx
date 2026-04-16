"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function MoreFiltersDropdown<T extends string>({
  options,
  selected,
  onToggle,
  onClear
}: {
  options: Array<{ key: T; label: string }>;
  selected: T[];
  onToggle: (key: T) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
          selected.length > 0
            ? "border-sky-300 bg-sky-50 text-sky-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        )}
      >
        More Filters
        {selected.length > 0 ? `(${selected.length})` : ""}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-200", open ? "rotate-180" : "rotate-0")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">More Filters</p>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {options.map((option) => {
              const active = selected.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onToggle(option.key)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left text-sm transition",
                    active
                      ? "border-sky-300 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
