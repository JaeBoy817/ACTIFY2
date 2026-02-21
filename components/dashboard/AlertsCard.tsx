import Link from "next/link";
import { AlertTriangle, BellRing } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardHomeSummary } from "@/lib/dashboard/getDashboardHomeSummary";

function toneClasses(tone: "default" | "warn" | "danger") {
  if (tone === "danger") {
    return "border-rose-200/80 bg-rose-50/75 text-rose-800";
  }
  if (tone === "warn") {
    return "border-amber-200/80 bg-amber-50/75 text-amber-800";
  }
  return "border-white/45 bg-white/75 text-foreground";
}

export async function AlertsCard({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardHomeSummary>;
}) {
  const summary = await summaryPromise;
  if (summary.alerts.count === 0) {
    return null;
  }

  return (
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="-mx-5 -mt-5 mb-4 rounded-t-3xl border-b border-white/35 bg-gradient-to-r from-amber-500/24 via-rose-500/18 to-orange-400/22 px-5 py-3">
        <p className="text-sm font-semibold text-foreground/80">Action Required</p>
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Alerts & Compliance</h2>
          <p className="text-sm text-foreground/70">Top actionable alerts only.</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/35 bg-white/75">
          <BellRing className="h-4 w-4 text-amber-700" />
        </span>
      </div>

      <div className="space-y-2">
        {summary.alerts.items.map((alert) => (
          <Link
            key={alert.id}
            href={alert.href}
            className={`flex items-start justify-between gap-3 rounded-2xl border px-3 py-2.5 transition hover:brightness-105 ${toneClasses(alert.tone)}`}
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs opacity-85">{alert.detail}</p>
            </div>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}

export function AlertsCardSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="mb-3 space-y-2">
        <div className="skeleton shimmer h-5 w-36 rounded" />
        <div className="skeleton shimmer h-3 w-44 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/40 bg-white/65 px-3 py-2.5">
            <div className="skeleton shimmer h-3.5 w-40 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-52 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
