import { HeartHandshake } from "lucide-react";

import { OneToOneNotesCardClient } from "@/components/dashboard/OneToOneNotesCardClient";
import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardHomeSummary } from "@/lib/dashboard/getDashboardHomeSummary";

export async function OneToOneNotesCard({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardHomeSummary>;
}) {
  const summary = await summaryPromise;

  return (
    <GlassCard variant="dense" className="rounded-3xl p-0">
      <div className="rounded-t-3xl border-b border-white/35 bg-gradient-to-r from-amber-500/22 via-orange-400/18 to-rose-400/22 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground/80">Right Rail Workspace</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/35 bg-white/70 text-amber-700">
            <HeartHandshake className="h-4 w-4" />
          </span>
        </div>
      </div>
      <div className="p-5">
        <OneToOneNotesCardClient initialState={summary.oneToOne} recentNotes={summary.recentOneToOneNotes} />
      </div>
    </GlassCard>
  );
}

export function OneToOneNotesCardSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="mb-4 space-y-2">
        <div className="skeleton shimmer h-5 w-28 rounded" />
        <div className="skeleton shimmer h-3 w-56 rounded" />
      </div>
      <div className="rounded-2xl border border-white/40 bg-white/65 p-3">
        <div className="skeleton shimmer h-3 w-24 rounded" />
        <div className="mt-2 skeleton shimmer h-2 w-full rounded" />
        <div className="mt-2 skeleton shimmer h-4 w-40 rounded" />
      </div>
      <div className="mt-3 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-white/40 bg-white/65 px-3 py-2">
            <div className="skeleton shimmer h-3.5 w-32 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-44 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-white/40 bg-white/65 px-3 py-2">
            <div className="skeleton shimmer h-3.5 w-28 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-32 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
