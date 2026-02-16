import Link from "next/link";
import { CalendarRange, ExternalLink, FileText, Sheet } from "lucide-react";

import { ActifyLogo } from "@/components/ActifyLogo";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireModulePage } from "@/lib/page-guards";
import { canExportMonthlyReport } from "@/lib/permissions";
import { getMonthlyReportData, parseMonthParam } from "@/lib/reports";

export default async function ReportsPage({ searchParams }: { searchParams?: { month?: string } }) {
  const context = await requireModulePage("reports");
  const month = searchParams?.month;
  const parsedMonth = parseMonthParam(month);
  const reportData = await getMonthlyReportData(context.facilityId, parsedMonth);

  const canExport = canExportMonthlyReport(context.role);
  const monthParam = month || `${parsedMonth.getFullYear()}-${String(parsedMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthlyParticipation = reportData.monthlyParticipation;
  const pdfDownloadHref = `/app/reports/pdf?month=${monthParam}`;
  const pdfPreviewHref = `/app/reports/pdf?month=${monthParam}&preview=1&t=${Date.now()}`;
  const summaryTiles = [
    {
      label: "Total Attended Residents",
      value: monthlyParticipation.totalResidentsInCurrentMonthThatHaveAttended,
      detail: `${monthlyParticipation.activeResidentCount} active residents in facility`,
      tone: "bg-actifyBlue/10 text-actifyBlue"
    },
    {
      label: "Residents Participated",
      value: monthlyParticipation.residentsParticipated,
      detail: "Unique residents with Present/Active/Leading",
      tone: "bg-actifyMint/20 text-foreground"
    },
    {
      label: "Participation %",
      value: `${monthlyParticipation.participationPercent.toFixed(1)}%`,
      detail: `${monthlyParticipation.residentsParticipated} of ${monthlyParticipation.activeResidentCount} active residents`,
      tone: "bg-actifyCoral/20 text-foreground"
    },
    {
      label: "Average Daily %",
      value: `${monthlyParticipation.averageDailyPercent.toFixed(1)}%`,
      detail: "Average daily resident participation this month",
      tone: "bg-amber-100 text-amber-700"
    }
  ] as const;

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative !p-0 overflow-hidden">
        <div className="h-1.5 bg-actify-brand" />
        <div className="relative space-y-5 p-5 md:p-6">
          <div aria-hidden className="pointer-events-none absolute -left-10 -top-8 h-36 w-36 rounded-full bg-actifyMint/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-8 h-40 w-40 rounded-full bg-actifyBlue/20 blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Monthly Report Export</h1>
              <p className="text-sm text-foreground/75">
                Build polished monthly reports with attendance trends, top programs, barriers, and resident outcomes.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="outline" className="gap-1 bg-white/70">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {reportData.monthLabel}
                </Badge>
                {!canExport ? <Badge variant="destructive">Your role cannot export monthly report</Badge> : null}
              </div>
              <div className="rounded-xl border border-white/60 bg-white/80 p-2 shadow-sm">
                <ActifyLogo variant="icon" size={30} aria-label="ACTIFY reports" />
              </div>
            </div>
          </div>

          <form method="GET" className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Month
              <Input type="month" name="month" defaultValue={monthParam} className="mt-1 bg-white/85" />
            </label>
            <Button type="submit" variant="outline">Load month</Button>
          </form>

          <div className="grid gap-3 md:grid-cols-4">
            {summaryTiles.map((tile) => (
              <GlassCard key={tile.label} variant="dense" className="p-4">
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tile.tone}`}>{tile.label}</span>
                <p className="mt-3 text-2xl font-semibold text-foreground">{tile.value}</p>
                <p className="mt-1 text-xs text-foreground/70">{tile.detail}</p>
              </GlassCard>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <GlassButton asChild disabled={!canExport}>
              <Link href={`/app/reports/csv?month=${monthParam}`}>
                <Sheet className="mr-1 h-4 w-4" />
                Download CSV
              </Link>
            </GlassButton>
            <GlassButton asChild variant="dense" disabled={!canExport}>
              <Link href={pdfDownloadHref}>
                <FileText className="mr-1 h-4 w-4" />
                Download PDF
              </Link>
            </GlassButton>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-foreground/70">
            Preview uses the same generated PDF as download.
          </div>
        </div>
      </GlassPanel>

      <GlassPanel variant="dense" className="space-y-3 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Simple Preview</h2>
            <p className="text-sm text-foreground/70">Quick inline preview before downloading.</p>
          </div>
          <Button asChild variant="outline" size="sm" disabled={!canExport}>
            <Link href={pdfPreviewHref} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              Open full preview
            </Link>
          </Button>
        </div>

        {canExport ? (
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/90">
            <iframe
              key={pdfPreviewHref}
              title="Monthly report preview"
              src={pdfPreviewHref}
              className="h-[680px] w-full"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-white/80 px-4 py-5 text-sm text-muted-foreground">
            Your role cannot preview or download the monthly PDF.
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
