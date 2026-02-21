import { LineChart } from "lucide-react";

import { AnalyticsCardClient } from "@/components/dashboard/AnalyticsCardClient";
import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardHomeSummary } from "@/lib/dashboard/getDashboardHomeSummary";

export async function AnalyticsCard({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardHomeSummary>;
}) {
  const summary = await summaryPromise;

  return (
    <GlassCard variant="dense" className="rounded-3xl p-0">
      <div className="rounded-t-3xl border-b border-white/35 bg-gradient-to-r from-blue-500/22 via-indigo-500/18 to-cyan-500/22 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground/80">Participation Insights</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/35 bg-white/70 text-indigo-700">
            <LineChart className="h-4 w-4" />
          </span>
        </div>
      </div>
      <div className="p-5">
        <AnalyticsCardClient
          analytics={summary.analytics}
        />
      </div>
    </GlassCard>
  );
}

export function AnalyticsCardSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="mb-4 space-y-2">
        <div className="skeleton shimmer h-5 w-28 rounded" />
        <div className="skeleton shimmer h-3 w-64 rounded" />
      </div>
      <div className="mb-3 inline-flex rounded-xl border border-white/40 bg-white/65 p-1">
        <div className="skeleton shimmer h-8 w-20 rounded-lg" />
        <div className="ml-1 skeleton shimmer h-8 w-24 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/65 p-3">
          <div className="skeleton shimmer h-3 w-24 rounded" />
          <div className="mt-2 skeleton shimmer h-8 w-20 rounded" />
          <div className="mt-2 skeleton shimmer h-3 w-40 rounded" />
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/65 p-3">
          <div className="skeleton shimmer h-3 w-32 rounded" />
          <div className="mt-2 skeleton shimmer h-8 w-16 rounded" />
          <div className="mt-2 skeleton shimmer h-3 w-36 rounded" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-white/40 bg-white/65 px-3 py-2">
            <div className="skeleton shimmer h-3 w-20 rounded" />
            <div className="mt-2 skeleton shimmer h-4 w-12 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
