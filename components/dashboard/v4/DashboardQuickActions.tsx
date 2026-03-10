import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";

import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { moduleToneFor } from "@/components/dashboard/v4/theme";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export function DashboardQuickActions({ summary }: { summary: DashboardCommandCenterSummary }) {
  return (
    <GlowCard title="Quick Actions" subtitle="Command dock" accent="violet" icon={<Zap className="h-4 w-4" />}>
      <div className="flex flex-wrap gap-2">
        {summary.quickActions.map((action) => {
          const tone = moduleToneFor(action.module);
          return (
            <PremiumPillButton
              key={action.id}
              label={action.label}
              href={action.href}
              tone="neutral"
              className={`ring-1 ${tone.ring}`}
            />
          );
        })}
      </div>
      <Link
        href="/app/calendar?quickAdd=1"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#a6bbdf] hover:text-white"
      >
        Open quick-add workflow
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </GlowCard>
  );
}
