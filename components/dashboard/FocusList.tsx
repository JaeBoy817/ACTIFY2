import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardSummary } from "@/lib/dashboard/getDashboardSummary";
import { FocusListClient } from "@/components/dashboard/FocusListClient";

export async function FocusList({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardSummary>;
}) {
  const summary = await summaryPromise;
  return <FocusListClient initialFocus={summary.focus} viewAllHref={summary.links.focusViewAll} />;
}

export function FocusListSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="space-y-2">
          <div className="skeleton shimmer h-5 w-28 rounded" />
          <div className="skeleton shimmer h-3 w-72 rounded" />
        </div>
        <div className="skeleton shimmer h-9 w-44 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-white/35 bg-white/60 px-3 py-3">
            <div className="skeleton shimmer h-4 w-44 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-72 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
