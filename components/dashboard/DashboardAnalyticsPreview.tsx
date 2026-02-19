import { GlassCard } from "@/components/glass/GlassCard";
import { DashboardOptionalInsightsCard } from "@/components/dashboard/DashboardOptionalInsightsCard";
import type { DashboardSummary } from "@/lib/dashboard/getDashboardSummary";

export async function DashboardAnalyticsPreview({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardSummary>;
}) {
  const summary = await summaryPromise;

  return <DashboardOptionalInsightsCard preview={summary.participationPreview} />;
}

export function DashboardAnalyticsPreviewSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <div className="mb-3 space-y-2">
        <div className="skeleton shimmer h-5 w-36 rounded" />
        <div className="skeleton shimmer h-3 w-64 rounded" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/35 bg-white/60 p-3.5">
            <div className="skeleton shimmer h-3 w-28 rounded" />
            <div className="mt-2 skeleton shimmer h-8 w-20 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-48 rounded" />
            <div className="mt-2 skeleton shimmer h-2 w-full rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
