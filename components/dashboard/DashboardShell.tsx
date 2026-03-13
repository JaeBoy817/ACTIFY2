import Link from "next/link";
import { ActivitySquare, Home, SlidersHorizontal } from "lucide-react";

import { LiveDateTimeText } from "@/components/app/live-date-time-text";
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
  timeZone,
  statusLine,
  children
}: {
  active: "home" | "activity-feed" | "settings";
  dateLabel: string;
  timeZone?: string | null;
  statusLine: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="rounded-3xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-[var(--font-display)] text-3xl text-zinc-950">Dashboard</h1>
            <p className="text-sm text-zinc-600">
              {timeZone ? <LiveDateTimeText timeZone={timeZone} mode="long-date" /> : dateLabel}
            </p>
            <p className="text-sm text-zinc-600">{statusLine}</p>
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
                      ? "border-zinc-300 bg-zinc-900 text-zinc-100 shadow-sm"
                      : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
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
