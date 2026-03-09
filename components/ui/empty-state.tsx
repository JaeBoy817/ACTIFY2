import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-white/45 bg-white/55 p-6 text-center shadow-sm shadow-black/5",
        className
      )}
      {...props}
    >
      {Icon ? (
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-gradient-to-br from-indigo-500/25 to-cyan-500/10 text-indigo-700">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
