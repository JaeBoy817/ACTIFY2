"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  LayoutTemplate,
  Printer,
  Search,
  Sparkles,
  Star,
  Timer,
  WandSparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReportAudiencePreset, ReportsWorkspaceData, ReportTypeId } from "@/lib/reports/workspace-types";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

const SHELL =
  "rounded-[1.35rem] border border-[#34435e]/90 bg-[linear-gradient(180deg,#10182a_0%,#0d1524_50%,#09101d_100%)] shadow-[0_30px_58px_-36px_rgba(36,78,142,0.7)]";
const SOFT_PANEL =
  "rounded-2xl border border-[#41577b]/80 bg-[linear-gradient(180deg,rgba(23,35,54,0.86)_0%,rgba(15,24,38,0.93)_100%)]";
const FIELD =
  "h-10 rounded-xl border border-[#4b6188] bg-[#16243b] px-3 text-sm text-[#d6e4ff] placeholder:text-[#93aad0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7698d3]";
const SECTION_TONES: Record<ReportTypeId, string> = {
  "participation-summary": "text-sky-100",
  "resident-engagement": "text-emerald-100",
  "monthly-activity-recap": "text-violet-100",
  "due-documentation": "text-amber-100",
  "follow-up": "text-rose-100"
};

const AUDIENCE_OPTIONS: Array<{ key: ReportAudiencePreset; label: string }> = [
  { key: "LEADERSHIP", label: "Leadership" },
  { key: "SURVEY_PREP", label: "Survey Prep" },
  { key: "INTERNAL_REVIEW", label: "Internal Review" },
  { key: "DEPARTMENT_SUMMARY", label: "Department Summary" },
  { key: "RESIDENT_SPECIFIC", label: "Resident-Specific" }
];

function statusTone(value: "HIGH" | "MODERATE" | "LOW") {
  if (value === "HIGH") return "border-emerald-300/45 bg-emerald-500/15 text-emerald-100";
  if (value === "LOW") return "border-rose-300/45 bg-rose-500/15 text-rose-100";
  return "border-amber-300/45 bg-amber-500/15 text-amber-100";
}

function priorityTone(value: "HIGH" | "MEDIUM" | "LOW") {
  if (value === "HIGH") return "border-rose-300/50 bg-rose-500/15 text-rose-100";
  if (value === "LOW") return "border-emerald-300/50 bg-emerald-500/15 text-emerald-100";
  return "border-amber-300/50 bg-amber-500/15 text-amber-100";
}

function urgencyTone(value: "OVERDUE" | "DUE_NOW" | "DUE_SOON") {
  if (value === "OVERDUE") return "border-rose-300/55 bg-rose-500/15 text-rose-100";
  if (value === "DUE_NOW") return "border-amber-300/55 bg-amber-500/15 text-amber-100";
  return "border-sky-300/55 bg-sky-500/15 text-sky-100";
}

function reportTypeTitle(type: ReportTypeId) {
  if (type === "participation-summary") return "Participation Summary";
  if (type === "resident-engagement") return "Resident Engagement Report";
  if (type === "monthly-activity-recap") return "Monthly Activity Recap";
  if (type === "due-documentation") return "Due Documentation Report";
  return "Follow-Up Report";
}

function iconForSummary(id: string) {
  if (id === "reports-generated") return <FileText className="h-4 w-4" aria-hidden />;
  if (id === "most-used") return <Star className="h-4 w-4" aria-hidden />;
  if (id === "last-exported") return <Timer className="h-4 w-4" aria-hidden />;
  return <LayoutTemplate className="h-4 w-4" aria-hidden />;
}

export function ReportsWorkspace({
  data,
  initialReportType
}: {
  data: ReportsWorkspaceData;
  initialReportType: ReportTypeId;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeId>(initialReportType);
  const [audiencePreset, setAudiencePreset] = useState<ReportAudiencePreset>("LEADERSHIP");
  const [searchValue, setSearchValue] = useState("");
  const [statusScope, setStatusScope] = useState<"ALL" | "FOLLOW_UP" | "LOW_ENGAGEMENT">("ALL");
  const [monthValue, setMonthValue] = useState(data.monthKey);
  const [includeSummaryMetrics, setIncludeSummaryMetrics] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeResidentDetails, setIncludeResidentDetails] = useState(true);
  const [includeFollowUp, setIncludeFollowUp] = useState(true);
  const [includeNoteSnippets, setIncludeNoteSnippets] = useState(false);
  const [includeBranding, setIncludeBranding] = useState(true);
  const [presentationMode, setPresentationMode] = useState<"COMPACT" | "PRESENTATION">("PRESENTATION");
  const [previewSeed, setPreviewSeed] = useState(() => Date.now());

  const queryToken = searchValue.trim().toLowerCase();
  const filteredResidents = useMemo(() => {
    let rows = data.residentEngagement;
    if (statusScope === "FOLLOW_UP") rows = rows.filter((row) => row.needsFollowUp);
    if (statusScope === "LOW_ENGAGEMENT") rows = rows.filter((row) => row.engagementLevel === "LOW");
    if (queryToken.length > 0) {
      rows = rows.filter((row) => {
        return (
          row.residentName.toLowerCase().includes(queryToken) ||
          row.room.toLowerCase().includes(queryToken) ||
          row.summary.toLowerCase().includes(queryToken)
        );
      });
    }
    return rows;
  }, [data.residentEngagement, queryToken, statusScope]);

  const filteredDueItems = useMemo(() => {
    if (queryToken.length === 0) return data.documentationDue;
    return data.documentationDue.filter((row) => {
      return (
        row.residentName.toLowerCase().includes(queryToken) ||
        row.room.toLowerCase().includes(queryToken) ||
        row.kind.toLowerCase().includes(queryToken) ||
        row.summary.toLowerCase().includes(queryToken)
      );
    });
  }, [data.documentationDue, queryToken]);

  const filteredFollowUps = useMemo(() => {
    if (queryToken.length === 0) return data.followUpRows;
    return data.followUpRows.filter((row) => {
      return (
        row.residentName.toLowerCase().includes(queryToken) ||
        row.room.toLowerCase().includes(queryToken) ||
        row.reason.toLowerCase().includes(queryToken)
      );
    });
  }, [data.followUpRows, queryToken]);

  const selectedReport = data.reportTypes.find((report) => report.id === selectedReportType) ?? data.reportTypes[0];
  const previewMetrics = data.reportMetricsByType[selectedReportType] ?? [];
  const supportsDirectFileExport = selectedReportType === "monthly-activity-recap";
  const canExportFiles = data.canExport && supportsDirectFileExport;

  const handleMonthChange = (nextMonth: string) => {
    setMonthValue(nextMonth);
    if (!/^\d{4}-\d{2}$/.test(nextMonth)) return;
    startTransition(() => {
      router.push(`/app/reports?month=${nextMonth}&reportType=${selectedReportType}`);
    });
  };

  const handleReportTypeChange = (nextType: ReportTypeId) => {
    setSelectedReportType(nextType);
    startTransition(() => {
      router.push(`/app/reports?month=${monthValue}&reportType=${nextType}`);
    });
  };

  const handleGeneratePreview = () => {
    setPreviewSeed(Date.now());
    toast({
      title: "Preview updated",
      description: `${reportTypeTitle(selectedReportType)} refreshed with current filters.`
    });
  };

  const handleSaveTemplate = () => {
    toast({
      title: "Template saved",
      description: "Saved template support is ready; persistent storage can be connected next."
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <section className={cn(SHELL, "relative overflow-hidden p-5 md:p-6")}>
        <div aria-hidden className="pointer-events-none absolute -left-12 -top-10 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#96aed6]">Actify Reports</p>
              <h1 className="text-3xl font-black text-white md:text-4xl">Reports</h1>
              <p className="max-w-3xl text-sm text-[#bfd1ef]">
                Generate clean, printable reports for leadership, survey prep, and internal follow-up.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#a9bee2]">
                <span className="rounded-full border border-[#4a638f] bg-[#182844] px-2.5 py-1">{data.monthLabel}</span>
                <span>{data.periodLabel}</span>
                <span aria-hidden className="text-[#6f88b4]">•</span>
                <span>Generated {data.generatedAtLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="rounded-xl bg-gradient-to-r from-slate-200 to-slate-50 text-slate-900 hover:from-slate-100 hover:to-white"
                onClick={handleGeneratePreview}
              >
                <WandSparkles className="mr-1.5 h-4 w-4" />
                Generate Preview
              </Button>
              <Button type="button" variant="outline" className="rounded-xl border-[#4e6488] bg-[#132037] text-[#d5e3ff]" onClick={handleSaveTemplate}>
                <LayoutTemplate className="mr-1.5 h-4 w-4" />
                Save Template
              </Button>
              <Button type="button" variant="outline" className="rounded-xl border-[#4e6488] bg-[#132037] text-[#d5e3ff]" onClick={handlePrint}>
                <Printer className="mr-1.5 h-4 w-4" />
                Print Preview
              </Button>
              <Button asChild disabled={!canExportFiles} variant="outline" className="rounded-xl border-[#4e6488] bg-[#132037] text-[#d5e3ff]">
                <Link href={data.exports.pdf}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Export PDF
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.summaryCards.map((card) => (
              <article key={card.id} className={cn(SOFT_PANEL, "p-4")}>
                <div className="flex items-center gap-2 text-[#b8cdec]">
                  <span className="rounded-lg border border-[#50658a] bg-[#1a2b47] p-1.5">{iconForSummary(card.id)}</span>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">{card.label}</p>
                </div>
                <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
                <p className="mt-1 text-xs text-[#9fb6da]">{card.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(360px,420px)]">
        <aside className={cn(SHELL, "space-y-4 p-4")}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#abc2e7]">Report Library</h2>
            <Sparkles className="h-4 w-4 text-[#9fb6de]" />
          </div>
          <div className="space-y-2">
            {data.reportTypes.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => handleReportTypeChange(report.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition",
                  selectedReportType === report.id
                    ? "border-[#8ca7d8] bg-[#203553] shadow-[0_16px_30px_-22px_rgba(106,145,213,0.75)]"
                    : "border-[#41587f] bg-[#132038] hover:border-[#6582b5] hover:bg-[#162745]"
                )}
              >
                <p className={cn("text-sm font-semibold", selectedReportType === report.id ? "text-white" : "text-[#d2e0fb]")}>
                  {report.title}
                </p>
                <p className="mt-1 text-xs text-[#9ab3dc]">{report.description}</p>
                <p className="mt-2 text-[11px] text-[#7f9bc9]">{report.useCase}</p>
              </button>
            ))}
          </div>

          <div className={cn(SOFT_PANEL, "space-y-2 p-3")}>
            <div className="flex items-center gap-2 text-[#c4d6f2]">
              <LayoutTemplate className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Saved Templates</p>
            </div>
            {data.templates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#47638f] bg-[#13243f] px-3 py-2 text-xs text-[#9ab4dc]">
                No saved report templates yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.templates.map((template) => (
                  <article key={template.id} className="rounded-lg border border-[#456088] bg-[#122038] px-3 py-2">
                    <p className="text-sm font-semibold text-white">{template.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#9ab3dc]">{template.description}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#7f99c8]">{template.lastUsedLabel}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className={cn(SOFT_PANEL, "space-y-2 p-3")}>
            <div className="flex items-center gap-2 text-[#c4d6f2]">
              <History className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Recent Exports</p>
            </div>
            {data.history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#47638f] bg-[#13243f] px-3 py-2 text-xs text-[#9ab4dc]">
                Generated reports will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {data.history.slice(0, 4).map((item) => (
                  <article key={item.id} className="rounded-lg border border-[#456088] bg-[#122038] px-3 py-2">
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-[11px] text-[#9ab3dc]">{item.format} · {item.generatedBy}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className={cn(SHELL, "space-y-4 p-4 md:p-5")}>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-semibold", SECTION_TONES[selectedReportType])}>{selectedReport.title}</h2>
              <p className="text-sm text-[#a8bfdf]">{selectedReport.useCase}</p>
            </div>
            <div className="rounded-xl border border-[#476089] bg-[#13233c] px-3 py-2 text-xs text-[#b1c6e8]">
              Audience: {selectedReport.audience}
            </div>
          </header>

          <div className={cn(SOFT_PANEL, "space-y-3 p-3 md:p-4")}>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95add6]">Month</span>
                <select value={monthValue} onChange={(event) => handleMonthChange(event.target.value)} className={FIELD} aria-label="Select month">
                  {data.monthOptions.map((option) => (
                    <option key={option.key} value={option.key} className="bg-[#16243b] text-[#d6e4ff]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95add6]">Audience Preset</span>
                <select value={audiencePreset} onChange={(event) => setAudiencePreset(event.target.value as ReportAudiencePreset)} className={FIELD} aria-label="Select audience">
                  {AUDIENCE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key} className="bg-[#16243b] text-[#d6e4ff]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2 xl:col-span-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95add6]">Search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa8d3]" />
                  <Input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    className={cn(FIELD, "pl-9")}
                    placeholder="Search resident, room, note, or keyword"
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95add6]">Scope</span>
                <select value={statusScope} onChange={(event) => setStatusScope(event.target.value as typeof statusScope)} className={FIELD} aria-label="Select resident scope">
                  <option value="ALL" className="bg-[#16243b] text-[#d6e4ff]">All Residents</option>
                  <option value="FOLLOW_UP" className="bg-[#16243b] text-[#d6e4ff]">Follow-Up Needed</option>
                  <option value="LOW_ENGAGEMENT" className="bg-[#16243b] text-[#d6e4ff]">Low Engagement</option>
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95add6]">Export Format</span>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="rounded-lg border-[#4d6487] bg-[#13233c] text-[#d8e6ff]">
                    <FileText className="mr-1.5 h-4 w-4" />
                    PDF
                  </Button>
                  <Button type="button" variant="outline" className="rounded-lg border-[#4d6487] bg-[#13233c] text-[#d8e6ff]">
                    <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                    CSV
                  </Button>
                  <Button type="button" variant="outline" className="rounded-lg border-[#4d6487] bg-[#13233c] text-[#d8e6ff]" onClick={handlePrint}>
                    <Printer className="mr-1.5 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </label>
            </div>

            <div className="space-y-2 rounded-xl border border-[#466087] bg-[#12213a] p-3">
              <div className="flex items-center gap-2 text-[#c2d4f0]">
                <Filter className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">Section Customizer</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-[#d3e2fd]">
                  <input checked={includeSummaryMetrics} onChange={(event) => setIncludeSummaryMetrics(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#4f678f] bg-[#17253d]" />
                  Summary Metrics
                </label>
                <label className="flex items-center gap-2 text-sm text-[#d3e2fd]">
                  <input checked={includeCharts} onChange={(event) => setIncludeCharts(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#4f678f] bg-[#17253d]" />
                  Charts
                </label>
                <label className="flex items-center gap-2 text-sm text-[#d3e2fd]">
                  <input checked={includeResidentDetails} onChange={(event) => setIncludeResidentDetails(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#4f678f] bg-[#17253d]" />
                  Resident Details
                </label>
                <label className="flex items-center gap-2 text-sm text-[#d3e2fd]">
                  <input checked={includeFollowUp} onChange={(event) => setIncludeFollowUp(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#4f678f] bg-[#17253d]" />
                  Follow-Up Items
                </label>
                <label className="flex items-center gap-2 text-sm text-[#d3e2fd]">
                  <input checked={includeNoteSnippets} onChange={(event) => setIncludeNoteSnippets(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#4f678f] bg-[#17253d]" />
                  Note Snippets
                </label>
                <label className="flex items-center gap-2 text-sm text-[#d3e2fd]">
                  <input checked={includeBranding} onChange={(event) => setIncludeBranding(event.target.checked)} type="checkbox" className="h-4 w-4 rounded border-[#4f678f] bg-[#17253d]" />
                  Facility Branding
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-[#4d6489] bg-[#12213a] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPresentationMode("PRESENTATION")}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium transition",
                    presentationMode === "PRESENTATION" ? "bg-[#2b4d81] text-white" : "text-[#9bb4da]"
                  )}
                >
                  Presentation Mode
                </button>
                <button
                  type="button"
                  onClick={() => setPresentationMode("COMPACT")}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium transition",
                    presentationMode === "COMPACT" ? "bg-[#2b4d81] text-white" : "text-[#9bb4da]"
                  )}
                >
                  Compact Mode
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="rounded-lg border-[#4d6487] bg-[#13233c] text-[#d8e6ff]" onClick={() => {
                  setSearchValue("");
                  setStatusScope("ALL");
                }}>
                  Clear Filters
                </Button>
                <Button type="button" className="rounded-lg bg-gradient-to-r from-slate-200 to-slate-50 text-slate-900 hover:from-slate-100 hover:to-white" onClick={handleGeneratePreview}>
                  <Eye className="mr-1.5 h-4 w-4" />
                  Refresh Preview
                </Button>
              </div>
            </div>
          </div>

          <div className={cn(SOFT_PANEL, "space-y-3 p-3 md:p-4")}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#abc2e8]">Current Report Metrics</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {previewMetrics.map((metric) => (
                <article key={metric.id} className="rounded-xl border border-[#486289] bg-[#13233c] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8ea9d3]">{metric.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-[#9db5db]">{metric.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className={cn(SHELL, "space-y-3 p-4 md:p-5")}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#abc2e8]">Live Preview</h2>
              <p className="text-xs text-[#9ab3dc]">Presentation-ready report layout before export.</p>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-lg border-[#4d6489] bg-[#13233c] text-[#d8e6ff]" disabled={!canExportFiles}>
              <Link href={data.exports.preview} target="_blank" rel="noreferrer">
                <Eye className="mr-1.5 h-4 w-4" />
                Open PDF
              </Link>
            </Button>
          </div>

          <div
            key={`${selectedReportType}-${previewSeed}-${presentationMode}`}
            className={cn(
              "max-h-[72vh] overflow-auto rounded-2xl border border-[#d8deea] bg-white text-slate-900 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)]",
              presentationMode === "COMPACT" ? "text-[13px]" : "text-sm"
            )}
          >
            <header className="border-b border-slate-200 px-4 py-4">
              {includeBranding ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{data.facilityName}</p>
              ) : null}
              <h3 className="mt-1 text-xl font-bold text-slate-900">{reportTypeTitle(selectedReportType)}</h3>
              <p className="mt-1 text-xs text-slate-500">Period: {data.periodLabel}</p>
              <p className="text-xs text-slate-500">Prepared for: {AUDIENCE_OPTIONS.find((option) => option.key === audiencePreset)?.label}</p>
              <p className="text-xs text-slate-500">Generated: {data.generatedAtLabel}</p>
            </header>

            <div className="space-y-4 px-4 py-4">
              {includeSummaryMetrics ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Summary Metrics</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {previewMetrics.map((metric) => (
                      <article key={metric.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{metric.value}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{metric.detail}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {includeCharts ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Visual Trends</h4>
                  {selectedReportType === "due-documentation" ? (
                    <div className="space-y-2">
                      {filteredDueItems.slice(0, 6).map((row) => (
                        <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{row.residentName} · {row.room}</p>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", row.urgency === "OVERDUE" ? "border-rose-300 bg-rose-50 text-rose-700" : row.urgency === "DUE_NOW" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-sky-300 bg-sky-50 text-sky-700")}>
                              {row.urgency.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{row.kind} · {row.statusLabel} · {row.dueDateLabel}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.participationTrend.map((point) => (
                        <div key={point.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>{point.label}</span>
                            <span>{point.value.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" style={{ width: `${Math.min(100, point.value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {selectedReportType === "resident-engagement" && includeResidentDetails ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resident Engagement Snapshot</h4>
                  {filteredResidents.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                      No residents matched your current filters.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredResidents.slice(0, 10).map((resident) => (
                        <article key={resident.residentId} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{resident.residentName} · {resident.room}</p>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", resident.engagementLevel === "HIGH" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : resident.engagementLevel === "LOW" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-amber-300 bg-amber-50 text-amber-700")}>
                              {resident.engagementLevel}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{resident.summary}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {selectedReportType === "monthly-activity-recap" ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Monthly Highlights</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {data.highlights.map((line) => (
                      <li key={line} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">{line}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {selectedReportType === "participation-summary" ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Category Performance</h4>
                  {data.categoryPerformance.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                      No category performance data is available for this period.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.categoryPerformance.slice(0, 6).map((row) => (
                        <article key={row.category} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>{row.category}</span>
                            <span>{row.attendance} entries · {row.engagementRate.toFixed(1)}%</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {selectedReportType === "follow-up" && includeFollowUp ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Follow-Up Board</h4>
                  {filteredFollowUps.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                      No follow-up rows matched current filters.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredFollowUps.slice(0, 10).map((row) => (
                        <article key={`${row.residentId}-${row.reason}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{row.residentName} · {row.room}</p>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", row.priority === "HIGH" ? "border-rose-300 bg-rose-50 text-rose-700" : row.priority === "MEDIUM" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-emerald-300 bg-emerald-50 text-emerald-700")}>
                              {row.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{row.reason}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.recommendation}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {includeNoteSnippets ? (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Key Takeaways</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {data.keyTakeaways.map((line) => (
                      <li key={line} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">{line}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
              <span>Prepared in Actify Reports Studio</span>
              <span>Page 1 of 1</span>
            </footer>
          </div>

          <div className={cn(SOFT_PANEL, "space-y-2 p-3")}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#abc2e8]">This Month at a Glance</h3>
            <ul className="space-y-2 text-xs text-[#bfd2f0]">
              {data.keyTakeaways.map((line) => (
                <li key={line} className="rounded-lg border border-[#486289] bg-[#122038] px-3 py-2">{line}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-lg border-[#4d6487] bg-[#13233c] text-[#d8e6ff]" disabled={!canExportFiles}>
              <Link href={data.exports.pdf}>
                <Download className="mr-1.5 h-4 w-4" />
                Export PDF
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg border-[#4d6487] bg-[#13233c] text-[#d8e6ff]" disabled={!canExportFiles}>
              <Link href={data.exports.csv}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Download CSV
              </Link>
            </Button>
            <Button type="button" variant="outline" className="rounded-lg border-[#4d6487] bg-[#13233c] text-[#d8e6ff]" onClick={handlePrint}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </div>
          {isPending ? <p className="text-xs text-[#9eb6dd]">Updating report workspace...</p> : null}
          {data.canExport && !supportsDirectFileExport ? (
            <p className="rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
              Direct PDF/CSV export is currently enabled for Monthly Activity Recap. Use Print Preview for this report type.
            </p>
          ) : null}
          {!data.canExport ? (
            <p className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Your role can build and preview reports, but export is restricted.
            </p>
          ) : null}
        </aside>
      </section>

      <section className={cn(SHELL, "space-y-3 p-4")}>
        <div className="flex items-center gap-2 text-[#c3d6f2]">
          <History className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Report History</h2>
        </div>
        {data.history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#4a6289] bg-[#142440] px-4 py-4 text-sm text-[#9db6de]">
            No report history yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.14em] text-[#91aad2]">
                  <th className="px-3 py-1">Report</th>
                  <th className="px-3 py-1">Type</th>
                  <th className="px-3 py-1">Generated</th>
                  <th className="px-3 py-1">Format</th>
                  <th className="px-3 py-1">By</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((item) => (
                  <tr key={item.id} className="rounded-xl border border-[#4a6389] bg-[#142440] text-[#d5e4ff]">
                    <td className="rounded-l-xl px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2">{reportTypeTitle(item.reportType)}</td>
                    <td className="px-3 py-2">{new Date(item.generatedAtIso).toLocaleString()}</td>
                    <td className="px-3 py-2">{item.format}</td>
                    <td className="rounded-r-xl px-3 py-2">{item.generatedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={cn(SHELL, "space-y-3 p-4")}>
        <div className="flex items-center gap-2 text-[#c3d6f2]">
          <Filter className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Operational Queues</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <article className={cn(SOFT_PANEL, "space-y-2 p-3")}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a9c0e6]">Documentation Due</h3>
            {filteredDueItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#4b678f] bg-[#132440] px-3 py-3 text-xs text-[#9eb8df]">
                No data was found for this report range.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredDueItems.slice(0, 6).map((row) => (
                  <article key={row.id} className="rounded-lg border border-[#49658d] bg-[#122038] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{row.residentName} · {row.room}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", urgencyTone(row.urgency))}>
                        {row.urgency.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9eb8df]">{row.kind} · {row.statusLabel} · {row.dueDateLabel}</p>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className={cn(SOFT_PANEL, "space-y-2 p-3")}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a9c0e6]">Resident Follow-Up</h3>
            {filteredFollowUps.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#4b678f] bg-[#132440] px-3 py-3 text-xs text-[#9eb8df]">
                No follow-up flags are active right now.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredFollowUps.slice(0, 6).map((row) => (
                  <article key={`${row.residentId}-${row.reason}`} className="rounded-lg border border-[#49658d] bg-[#122038] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{row.residentName} · {row.room}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityTone(row.priority))}>
                        {row.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9eb8df]">{row.reason}</p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>

        <article className={cn(SOFT_PANEL, "space-y-2 p-3")}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a9c0e6]">Resident Engagement Snapshot</h3>
          {filteredResidents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#4b678f] bg-[#132440] px-3 py-3 text-xs text-[#9eb8df]">
              No residents matched your filters.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredResidents.slice(0, 9).map((resident) => (
                <article key={resident.residentId} className="rounded-lg border border-[#49658d] bg-[#122038] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{resident.residentName}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusTone(resident.engagementLevel))}>
                      {resident.engagementLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#9eb8df]">Room {resident.room}</p>
                  <p className="mt-1 text-xs text-[#9eb8df]">{resident.summary}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
