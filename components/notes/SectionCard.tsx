"use client";

import { ChevronDown } from "lucide-react";
import { memo, useState } from "react";

import { cn } from "@/lib/utils";

type SectionCardProps = {
  id?: string;
  title: string;
  icon: React.ReactNode;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export const SectionCard = memo(function SectionCard({
  id,
  title,
  icon,
  description,
  defaultOpen = false,
  children
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="rounded-2xl border border-white/25 bg-white/75 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--actify-accent)]/15 text-[color:var(--actify-accent)]">
            {icon}
          </span>
          <span>
            <span className="block font-semibold text-foreground">{title}</span>
            {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/25 px-4 pb-4 pt-3">{children}</div>
        </div>
      </div>
    </section>
  );
});
