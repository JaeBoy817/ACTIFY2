import Link from "next/link";
import { AlertTriangle, ArrowRight, BellRing, FileClock, UserRound } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardSummary } from "@/lib/dashboard/getDashboardSummary";

function toneClasses(tone: "default" | "warn" | "danger") {
  if (tone === "danger") {
    return "border-rose-200/80 bg-rose-50/70 text-rose-800";
  }
  if (tone === "warn") {
    return "border-amber-200/80 bg-amber-50/70 text-amber-800";
  }
  return "border-white/45 bg-white/70 text-foreground";
}

export async function RecentAndAlerts({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardSummary>;
}) {
  const summary = await summaryPromise;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Recently Updated</h2>
            <p className="text-sm text-foreground/70">Last 5 updates across notes and residents.</p>
          </div>
          <UserRound className="h-4 w-4 text-foreground/65" />
        </div>

        {summary.recentItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/45 bg-white/60 px-4 py-6 text-sm text-foreground/70">
            No recent updates yet.
          </div>
        ) : (
          <div className="space-y-2">
            {summary.recentItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/45 bg-white/70 px-3 py-2.5 transition hover:bg-white/85"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-foreground/70">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-foreground/65">{item.timestamp}</span>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Alerts</h2>
            <p className="text-sm text-foreground/70">Only actionable items that need follow-through.</p>
          </div>
          <BellRing className="h-4 w-4 text-foreground/65" />
        </div>

        {summary.alerts.length === 0 ? (
          <div className="rounded-xl border border-white/45 bg-white/70 px-4 py-6 text-sm text-foreground/70">
            No active alerts right now.
          </div>
        ) : (
          <div className="space-y-2">
            {summary.alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 transition hover:brightness-105 ${toneClasses(alert.tone)}`}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs opacity-85">{alert.detail}</p>
                </div>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Link href={summary.links.activityFeed} className="inline-flex items-center gap-1 text-sm font-medium text-actifyBlue hover:underline">
            View all dashboard widgets
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

export function RecentAndAlertsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="space-y-2">
          <div className="skeleton shimmer h-5 w-40 rounded" />
          <div className="skeleton shimmer h-3 w-72 rounded" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-white/35 bg-white/60 px-3 py-2.5">
              <div className="skeleton shimmer h-3.5 w-56 rounded" />
              <div className="mt-2 skeleton shimmer h-3 w-36 rounded" />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="space-y-2">
          <div className="skeleton shimmer h-5 w-20 rounded" />
          <div className="skeleton shimmer h-3 w-72 rounded" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-white/35 bg-white/60 px-3 py-2.5">
              <div className="skeleton shimmer h-3.5 w-48 rounded" />
              <div className="mt-2 skeleton shimmer h-3 w-56 rounded" />
            </div>
          ))}
          <div className="pt-1">
            <span className="inline-flex items-center gap-1 text-xs text-foreground/60">
              <FileClock className="h-3.5 w-3.5" />
              Loading widgets...
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
