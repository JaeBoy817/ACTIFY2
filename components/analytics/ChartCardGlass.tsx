import { IconBadge } from "@/components/analytics/IconBadge";
import type { LucideIcon } from "lucide-react";

export function ChartCardGlass({
  title,
  description,
  icon,
  iconClassName,
  children
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-2xl border-white/20 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-[var(--font-display)] text-lg text-foreground">{title}</h3>
          {description ? <p className="text-xs text-foreground/70">{description}</p> : null}
        </div>
        <IconBadge icon={icon} size="sm" className={iconClassName} />
      </div>
      {children}
    </section>
  );
}

export function ChartCardGlassSkeleton() {
  return (
    <section className="glass-panel rounded-2xl border-white/20 p-4">
      <div className="skeleton shimmer h-4 w-48 rounded" />
      <div className="mt-2 skeleton shimmer h-3 w-64 rounded" />
      <div className="mt-4 h-56 animate-pulse rounded-xl bg-white/55" />
    </section>
  );
}
