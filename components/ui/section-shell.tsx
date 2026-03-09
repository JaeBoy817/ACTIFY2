import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionShellProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  actions?: React.ReactNode;
};

export function SectionShell({
  title,
  description,
  icon: Icon,
  iconClassName,
  actions,
  className,
  children,
  ...props
}: SectionShellProps) {
  return (
    <section
      className={cn(
        "nb-surface rounded-2xl border p-4 md:p-5",
        className
      )}
      {...props}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white",
                iconClassName
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight md:text-lg">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}
