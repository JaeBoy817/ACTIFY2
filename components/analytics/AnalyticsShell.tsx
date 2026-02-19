import { Sparkles } from "lucide-react";

import { AnalyticsFiltersBar } from "@/components/analytics/AnalyticsFiltersBar";
import { AnalyticsSectionNav } from "@/components/analytics/AnalyticsSectionNav";
import { KpiCardGlass } from "@/components/analytics/KpiCardGlass";
import type { AnalyticsSectionKey } from "@/components/analytics/section-links";
import { DailyMotivationCard } from "@/components/dashboard/DailyMotivationCard";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsFilterOptions, AnalyticsFilters, AnalyticsKpi } from "@/lib/analytics/types";

export function AnalyticsShell({
  activeSection,
  title,
  subtitle,
  rangeLabel,
  filters,
  options,
  kpis,
  children,
  showDailyMotivation = false
}: {
  activeSection: AnalyticsSectionKey;
  title: string;
  subtitle: string;
  rangeLabel: string;
  filters: AnalyticsFilters;
  options: AnalyticsFilterOptions;
  kpis: AnalyticsKpi[];
  children: React.ReactNode;
  showDailyMotivation?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/20">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">{title}</h1>
              <p className="text-sm text-foreground/80">{subtitle}</p>
              <p className="inline-flex items-center gap-1 text-xs text-foreground/65">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                {rangeLabel}
              </p>
            </div>
          </div>

          <AnalyticsSectionNav active={activeSection} />
          <AnalyticsFiltersBar filters={filters} options={options} />
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCardGlass key={kpi.key} kpi={kpi} />
        ))}
      </section>

      {children}

      {showDailyMotivation ? (
        <section className="pt-1">
          <DailyMotivationCard />
        </section>
      ) : null}
    </div>
  );
}
