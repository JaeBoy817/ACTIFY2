import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
};

export function EmptyState({ title, description, icon: Icon = Sparkles, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/80 p-4 text-center", className)}>
      <span className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
