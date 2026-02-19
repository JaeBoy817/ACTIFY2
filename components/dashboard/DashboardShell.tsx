import Link from "next/link";
import { ActivitySquare, Home, SlidersHorizontal } from "lucide-react";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { cn } from "@/lib/utils";

const dashboardSubsections = [
  {
    key: "home",
    href: "/app",
    label: "Dashboard Home",
    icon: Home
  },
  {
    key: "activity-feed",
    href: "/app/dashboard/activity-feed",
    label: "Activity Feed",
    icon: ActivitySquare
  },
  {
    key: "settings",
    href: "/app/dashboard/settings",
    label: "Dashboard Settings",
    icon: SlidersHorizontal
  }
] as const;

export function DashboardShell({
  active,
  dateLabel,
  statusLine,
  children
}: {
  active: "home" | "activity-feed" | "settings";
  dateLabel: string;
  statusLine: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="rounded-3xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">Dashboard</h1>
            <p className="text-sm text-foreground/75">{dateLabel}</p>
            <p className="text-sm text-foreground/70">{statusLine}</p>
          </div>

          <nav aria-label="Dashboard sections" className="flex flex-wrap items-center gap-2">
            {dashboardSubsections.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-white/50 bg-white/80 text-foreground shadow-sm"
                      : "border-white/40 bg-white/60 text-foreground/75 hover:bg-white/70"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </GlassPanel>

      {children}
    </div>
  );
}
