import dynamic from "next/dynamic";

import { GlassCard } from "@/components/glass/GlassCard";

const DailyBoostQuote = dynamic(
  () => import("@/components/dashboard/DailyBoostQuote").then((module) => module.DailyBoostQuote),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="skeleton shimmer h-4 w-28 rounded" />
        <div className="rounded-xl border border-white/40 bg-white/65 p-4">
          <div className="skeleton shimmer h-4 w-3/4 rounded" />
          <div className="mt-2 skeleton shimmer h-4 w-full rounded" />
          <div className="mt-2 skeleton shimmer h-4 w-11/12 rounded" />
        </div>
      </div>
    )
  }
);

export function DailyMotivationCard() {
  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <DailyBoostQuote />
    </GlassCard>
  );
}
