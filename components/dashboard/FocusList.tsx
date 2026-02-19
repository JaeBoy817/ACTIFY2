import Link from "next/link";
import { ArrowRight, CalendarClock, Pin, Sparkles } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import type { DashboardSummary } from "@/lib/dashboard/getDashboardSummary";

function formatLastOneOnOne(value: string | null) {
  if (!value) return "No prior 1:1";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No prior 1:1";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function FocusList({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardSummary>;
}) {
  const summary = await summaryPromise;
  const { focus } = summary;
  const coveragePercent = focus.totalEligibleResidents === 0
    ? 0
    : Math.round((focus.residentsWithNoteThisMonth / focus.totalEligibleResidents) * 100);

  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">1:1 To-Do</h2>
          <p className="text-sm text-foreground/70">Stable for today. Prioritized by monthly coverage and recent follow-up needs.</p>
        </div>
        <div className="min-w-[220px] rounded-xl border border-white/40 bg-white/70 px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-foreground/70">
            <span>Monthly coverage</span>
            <span>{focus.residentsWithNoteThisMonth}/{focus.totalEligibleResidents}</span>
          </div>
          <div className="h-2 rounded-full bg-white/60">
            <div className="h-2 rounded-full bg-actify-brand" style={{ width: `${coveragePercent}%` }} />
          </div>
        </div>
      </div>

      {focus.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/45 bg-white/60 px-4 py-6 text-sm text-foreground/70">
          No residents in today&apos;s queue yet.
        </div>
      ) : (
        <div className="space-y-2">
          {focus.items.slice(0, 8).map((item, index) => (
            <div key={item.id} className="rounded-xl border border-white/45 bg-white/70 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-actifyBlue/15 px-1.5 text-[11px] font-semibold text-actifyBlue">
                      {index + 1}
                    </span>
                    <p className="font-medium text-foreground">{item.residentName}</p>
                    <Badge variant="outline" className="bg-white/80">Room {item.room}</Badge>
                    <Badge variant="outline" className={item.statusLabel.toLowerCase().includes("bed bound") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                      {item.statusLabel}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/70">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Last 1:1 {formatLastOneOnOne(item.lastOneOnOneAt)}
                    </span>
                    <span>{item.daysSinceLastOneOnOne ?? "-"} day(s) since</span>
                    <span className="inline-flex items-center gap-1">
                      <Pin className="h-3 w-3" />
                      {item.reason}
                    </span>
                  </div>
                </div>

                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/40 bg-white/85 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-white"
                >
                  Log 1:1
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-foreground/70">
          <Sparkles className="h-3.5 w-3.5" />
          Queue date {focus.queueDateKey}
        </span>
        <Link href={summary.links.focusViewAll} className="text-sm font-medium text-actifyBlue hover:underline">
          View all 1:1 actions
        </Link>
      </div>
    </GlassCard>
  );
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
