"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function ResidentAccordionSection({
  title,
  defaultOpen,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const id = useId();

  return (
    <details
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 transition duration-200 open:shadow-sm"
      open={defaultOpen}
    >
      <summary
        aria-controls={id}
        className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-500 transition-transform duration-200",
            "group-open:rotate-180"
          )}
          aria-hidden
        />
      </summary>
      <div id={id} className="px-4 pb-4 pt-1 text-sm text-slate-700 transition duration-200">
        {children}
      </div>
    </details>
  );
}
