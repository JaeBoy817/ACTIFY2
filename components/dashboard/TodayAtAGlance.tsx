import Link from "next/link";
import {
  CalendarCheck2,
  ClipboardCheck,
  HeartHandshake,
  PackageSearch,
  RefreshCw,
  Stethoscope,
  UserRoundCheck
} from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardSummary } from "@/lib/dashboard/getDashboardSummary";

const iconMap = {
  calendar: CalendarCheck2,
  attendance: ClipboardCheck,
  oneOnOne: HeartHandshake,
  followUp: UserRoundCheck,
  inventory: PackageSearch,
  carePlan: Stethoscope
} as const;

const iconToneMap = {
  calendar: "from-blue-500/30 to-indigo-500/10 text-blue-700",
  attendance: "from-emerald-500/30 to-teal-500/10 text-emerald-700",
  oneOnOne: "from-amber-500/30 to-orange-500/10 text-amber-700",
  followUp: "from-violet-500/30 to-fuchsia-500/10 text-violet-700",
  inventory: "from-rose-500/30 to-orange-400/10 text-rose-700",
  carePlan: "from-cyan-500/30 to-blue-500/10 text-cyan-700"
} as const;

export async function TodayAtAGlance({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardSummary>;
}) {
  const summary = await summaryPromise;

  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Today At A Glance</h2>
          <p className="text-sm text-foreground/70">Tap a chip to jump into the matching workspace.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-2.5 py-1 text-xs text-foreground/70">
          <RefreshCw className="h-3 w-3" />
          Live summary
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summary.quickChips.map((chip) => {
          const Icon = iconMap[chip.icon];
          return (
            <Link
              key={chip.key}
              href={chip.href}
              className="group rounded-2xl border border-white/45 bg-white/65 p-3 transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-foreground/65">{chip.label}</p>
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/25 bg-gradient-to-br ${iconToneMap[chip.icon]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{chip.value}</p>
              <p className="mt-1 text-xs text-foreground/65 group-hover:text-foreground/80">{chip.helper}</p>
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}

export function TodayAtAGlanceSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <div className="mb-4 space-y-2">
        <div className="skeleton shimmer h-5 w-40 rounded" />
        <div className="skeleton shimmer h-3 w-72 rounded" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/35 bg-white/60 p-3">
            <div className="skeleton shimmer h-3 w-24 rounded" />
            <div className="mt-3 skeleton shimmer h-8 w-16 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-28 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
