import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

import { DashboardActivityFeedExtras } from "@/components/dashboard/DashboardActivityFeedExtras";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { requireFacilityContext } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/dashboard/getDashboardSummary";
import { asModuleFlags } from "@/lib/module-flags";
import { serializeOneOnOneSpotlightSnapshot, getOneOnOneSpotlightSnapshot } from "@/lib/one-on-one-queue/service";
import { canWrite } from "@/lib/permissions";

const OneOnOneSpotlight = dynamic(
  () => import("@/components/dashboard/one-on-one-spotlight").then((module) => module.OneOnOneSpotlight),
  {
    loading: () => (
      <GlassCard variant="dense" className="rounded-2xl p-5">
        <p className="text-sm text-foreground/70">Loading 1:1 workspace...</p>
      </GlassCard>
    )
  }
);

export default async function DashboardActivityFeedPage() {
  const context = await requireFacilityContext();
  const moduleFlags = asModuleFlags(context.facility.moduleFlags);

  const [summary, oneOnOneSnapshot] = await Promise.all([
    getDashboardSummary({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      showBirthdaysWidget: moduleFlags.widgets.birthdays,
      includeExtended: true
    }),
    getOneOnOneSpotlightSnapshot({
      facilityId: context.facilityId,
      timeZone: context.timeZone
    })
  ]);

  return (
    <DashboardShell
      active="activity-feed"
      dateLabel={summary.dateLabel}
      statusLine="Expanded dashboard widgets moved out of Home so the main dashboard stays fast and focused."
    >
      <div className="space-y-4">
        <GlassCard variant="dense" className="rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Dashboard Activity Feed</p>
              <p className="text-sm text-foreground/70">Use this page for deeper dashboard widgets and optional context cards.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Queue {summary.focus.queueDateKey}</Badge>
              <Link
                href="/app"
                className="inline-flex items-center gap-1 rounded-lg border border-white/40 bg-white/80 px-3 py-1.5 text-sm text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Home
              </Link>
              <Link
                href="/app/dashboard/settings"
                className="inline-flex items-center gap-1 rounded-lg border border-white/40 bg-white/80 px-3 py-1.5 text-sm text-foreground"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Preferences
              </Link>
            </div>
          </div>
        </GlassCard>

        <OneOnOneSpotlight
          initialSnapshot={serializeOneOnOneSpotlightSnapshot(oneOnOneSnapshot)}
          canEdit={canWrite(context.role)}
          timeZone={context.timeZone}
        />

        <DashboardActivityFeedExtras
          extended={summary.extended}
          showBirthdaysWidget={moduleFlags.widgets.birthdays}
        />
      </div>
    </DashboardShell>
  );
}
