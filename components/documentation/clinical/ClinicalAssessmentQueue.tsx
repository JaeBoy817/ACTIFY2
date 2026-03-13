"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Filter, Search, UserRound } from "lucide-react";

import type { ClinicalAssessmentKind, ClinicalAssessmentQueueRow } from "@/app/app/documentation/_lib";
import type { DocumentationStatus } from "@/lib/documentation/types";
import { cn } from "@/lib/utils";

type DueFilter = "all" | "overdue" | "due_soon" | "no_due";
type ViewFilterStatus = "all" | DocumentationStatus;
type AssessmentTypeFilter = "all" | "ANNUAL" | "QUARTERLY" | "SECTION_F";

const STATUS_LABEL: Record<DocumentationStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  READY_REVIEW: "Ready to Review",
  COMPLETED: "Completed"
};

const STATUS_BADGE: Record<DocumentationStatus, string> = {
  DRAFT: "border-slate-300/30 bg-slate-500/20 text-slate-100",
  IN_PROGRESS: "border-sky-300/35 bg-sky-500/20 text-sky-100",
  READY_REVIEW: "border-violet-300/35 bg-violet-500/20 text-violet-100",
  COMPLETED: "border-emerald-300/35 bg-emerald-500/20 text-emerald-100"
};

const COMPLIANCE_LABEL: Record<ClinicalAssessmentQueueRow["complianceStatus"], string> = {
  CURRENT: "Current",
  DUE_SOON: "Due Soon",
  DUE_THIS_MONTH: "Due This Month",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
  MISSING: "Missing",
  FOLLOW_UP_NEEDED: "Follow-Up Needed"
};

const COMPLIANCE_BADGE: Record<ClinicalAssessmentQueueRow["complianceStatus"], string> = {
  CURRENT: "border-emerald-300/35 bg-emerald-500/16 text-emerald-100",
  DUE_SOON: "border-amber-300/35 bg-amber-500/16 text-amber-100",
  DUE_THIS_MONTH: "border-amber-300/35 bg-amber-500/16 text-amber-100",
  OVERDUE: "border-rose-300/35 bg-rose-500/16 text-rose-100",
  COMPLETED: "border-emerald-300/35 bg-emerald-500/16 text-emerald-100",
  MISSING: "border-rose-300/35 bg-rose-500/16 text-rose-100",
  FOLLOW_UP_NEEDED: "border-sky-300/35 bg-sky-500/16 text-sky-100"
};

function formatDate(value: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
}

function assessmentLabel(row: ClinicalAssessmentQueueRow) {
  if (row.kind === "MDS") return "Section F";
  return row.assessmentType === "QUARTERLY" ? "Quarterly" : "Annual";
}

function defaultAssessmentFilter(kind: ClinicalAssessmentKind): AssessmentTypeFilter {
  return kind === "UDA" ? "all" : "SECTION_F";
}

function isActionable(row: ClinicalAssessmentQueueRow) {
  return (
    row.complianceStatus === "OVERDUE" ||
    row.complianceStatus === "MISSING" ||
    row.complianceStatus === "DUE_SOON" ||
    row.complianceStatus === "DUE_THIS_MONTH" ||
    row.complianceStatus === "FOLLOW_UP_NEEDED"
  );
}

function resolveOpenHref(row: ClinicalAssessmentQueueRow, kind: ClinicalAssessmentKind, newEntryHref: string) {
  if (row.entryId) {
    return `/app/documentation/${kind === "UDA" ? "uda" : "mds"}/${encodeURIComponent(row.entryId)}`;
  }

  if (kind === "UDA") {
    return `/app/documentation/uda/new?residentId=${encodeURIComponent(row.residentId)}&assessmentType=${encodeURIComponent(row.assessmentType)}`;
  }

  return `${newEntryHref}?residentId=${encodeURIComponent(row.residentId)}`;
}

type MetricCard = {
  label: string;
  value: number;
  tone: "blue" | "amber" | "rose" | "emerald" | "violet";
};

function metricToneClass(tone: MetricCard["tone"]) {
  if (tone === "amber") return "border-amber-300/30 bg-amber-500/15 text-amber-100";
  if (tone === "rose") return "border-rose-300/35 bg-rose-500/15 text-rose-100";
  if (tone === "emerald") return "border-emerald-300/35 bg-emerald-500/15 text-emerald-100";
  if (tone === "violet") return "border-violet-300/35 bg-violet-500/15 text-violet-100";
  return "border-sky-300/35 bg-sky-500/15 text-sky-100";
}

export function ClinicalAssessmentQueue({
  kind,
  rows,
  unitOptions,
  staffOptions,
  newEntryHref,
  newAnnualHref,
  newQuarterlyHref
}: {
  kind: ClinicalAssessmentKind;
  rows: ClinicalAssessmentQueueRow[];
  unitOptions: string[];
  staffOptions: string[];
  newEntryHref: string;
  newAnnualHref?: string;
  newQuarterlyHref?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ViewFilterStatus>("all");
  const [assessmentType, setAssessmentType] = useState<AssessmentTypeFilter>(defaultAssessmentFilter(kind));
  const [unit, setUnit] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [staff, setStaff] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>(rows[0]?.id ?? "");

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (assessmentType !== "all" && row.assessmentType !== assessmentType) return false;
      if (unit !== "all" && row.residentUnit !== unit) return false;
      if (staff !== "all" && (row.assignedStaff || row.authorName) !== staff) return false;
      if (dueFilter === "overdue" && !row.isOverdue) return false;
      if (dueFilter === "due_soon" && !row.isDueSoon) return false;
      if (dueFilter === "no_due" && row.dueDateIso) return false;

      if (!deferredQuery) return true;
      const haystack = [
        row.residentName,
        row.residentRoom,
        row.residentUnit ?? "",
        row.summary,
        row.title,
        row.authorName,
        row.assignedStaff ?? "",
        assessmentLabel(row)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [assessmentType, deferredQuery, dueFilter, rows, staff, status, unit]);

  const selectedRow = useMemo(() => {
    const candidate = filteredRows.find((row) => row.id === selectedId) ?? filteredRows[0] ?? null;
    return candidate;
  }, [filteredRows, selectedId]);

  const metrics = useMemo<MetricCard[]>(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const inCurrentMonth = (iso: string | null) => {
      if (!iso) return false;
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getMonth() === currentMonth && parsed.getFullYear() === currentYear;
    };

    if (kind === "UDA") {
      const annualDue = rows.filter((row) => row.assessmentType === "ANNUAL" && isActionable(row)).length;
      const quarterlyDue = rows.filter((row) => row.assessmentType === "QUARTERLY" && isActionable(row)).length;
      const overdue = rows.filter((row) => row.complianceStatus === "OVERDUE" || row.complianceStatus === "MISSING").length;
      const drafts = rows.filter((row) => row.status === "DRAFT" || row.status === "IN_PROGRESS").length;
      const completedMonth = rows.filter((row) => inCurrentMonth(row.lastCompletedDateIso)).length;
      return [
        { label: "Annual Due This Month", value: annualDue, tone: "amber" },
        { label: "Quarterly Due This Month", value: quarterlyDue, tone: "blue" },
        { label: "Overdue Assessments", value: overdue, tone: "rose" },
        { label: "Drafts", value: drafts, tone: "violet" },
        { label: "Completed This Month", value: completedMonth, tone: "emerald" }
      ];
    }

    const dueSoon = rows.filter((row) => isActionable(row)).length;
    const overdue = rows.filter((row) => row.complianceStatus === "OVERDUE" || row.complianceStatus === "MISSING").length;
    const drafts = rows.filter((row) => row.status === "DRAFT" || row.status === "IN_PROGRESS").length;
    const completedMonth = rows.filter((row) => inCurrentMonth(row.lastCompletedDateIso)).length;
    const reviewDue = rows.filter((row) => inCurrentMonth(row.reviewDateIso) && row.complianceStatus !== "CURRENT").length;

    return [
      { label: "Due Soon", value: dueSoon, tone: "blue" },
      { label: "Overdue", value: overdue, tone: "rose" },
      { label: "Drafts", value: drafts, tone: "violet" },
      { label: "Completed This Month", value: completedMonth, tone: "emerald" },
      { label: "Review Dates This Month", value: reviewDue, tone: "amber" }
    ];
  }, [kind, rows]);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className={cn(
              "rounded-2xl border px-4 py-3",
              "bg-[linear-gradient(180deg,rgba(10,25,48,0.9)_0%,rgba(8,19,36,0.9)_100%)]",
              metricToneClass(metric.tone)
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-85">{metric.label}</p>
            <p className="mt-2 text-3xl font-black leading-none">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.6rem] border border-[#203559] bg-[linear-gradient(180deg,#091426_0%,#0a1629_100%)] p-3 md:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8da7d1]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={kind === "UDA" ? "Search resident, room, annual/quarterly" : "Search resident, room, Section F"}
              className="h-10 w-full rounded-full border border-[#2d436c] bg-[#0d1b31] pl-9 pr-3 text-sm text-[#dce9ff] placeholder:text-[#7f98c0]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-[#2d436c] bg-[#0e1d35] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#acc3e7]">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </label>

            {kind === "UDA" ? (
              <select
                value={assessmentType}
                onChange={(event) => setAssessmentType(event.target.value as AssessmentTypeFilter)}
                className="h-10 rounded-full border border-[#2d436c] bg-[#0d1b31] px-3 text-xs font-semibold text-[#dbe8ff]"
              >
                <option value="all">All Types</option>
                <option value="ANNUAL">Annual</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            ) : null}

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ViewFilterStatus)}
              className="h-10 rounded-full border border-[#2d436c] bg-[#0d1b31] px-3 text-xs font-semibold text-[#dbe8ff]"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="READY_REVIEW">Ready to Review</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="h-10 rounded-full border border-[#2d436c] bg-[#0d1b31] px-3 text-xs font-semibold text-[#dbe8ff]"
            >
              <option value="all">All Units</option>
              {unitOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={dueFilter}
              onChange={(event) => setDueFilter(event.target.value as DueFilter)}
              className="h-10 rounded-full border border-[#2d436c] bg-[#0d1b31] px-3 text-xs font-semibold text-[#dbe8ff]"
            >
              <option value="all">All Due Dates</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon</option>
              <option value="no_due">No Due Date</option>
            </select>

            <select
              value={staff}
              onChange={(event) => setStaff(event.target.value)}
              className="h-10 rounded-full border border-[#2d436c] bg-[#0d1b31] px-3 text-xs font-semibold text-[#dbe8ff]"
            >
              <option value="all">All Staff</option>
              {staffOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <Link
              href={newEntryHref}
              className="inline-flex h-10 items-center rounded-full border border-blue-300/45 bg-[linear-gradient(180deg,#234172_0%,#1a3259_100%)] px-4 text-xs font-semibold text-white"
            >
              {kind === "UDA" ? "New Assessment" : "New Section F Entry"}
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-2xl border border-[#27406a] bg-[#0a1629]">
            <table className="w-full text-sm">
              <thead className="bg-[#10203b] text-left text-[11px] uppercase tracking-[0.12em] text-[#9db4da]">
                <tr>
                  <th className="px-3 py-2">Resident</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Last Completed</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Staff</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-t border-[#1d3357] transition",
                      selectedRow?.id === row.id ? "bg-sky-500/10" : "bg-[#0a1629] hover:bg-[#10203b]"
                    )}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="px-3 py-3 align-top">
                      <p className="font-semibold text-white">{row.residentName}</p>
                      <p className="text-xs text-[#9bb2d8]">
                        Room {row.residentRoom}
                        {row.residentUnit ? ` · ${row.residentUnit}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-[#d5e4ff]">
                      <p className="font-semibold">{assessmentLabel(row)}</p>
                      <p className="mt-1 text-[#8ea6cc]">{row.sectionProgress ?? 0}% complete</p>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-[#b8ccec]">{formatDate(row.lastCompletedDateIso)}</td>
                    <td className="px-3 py-3 align-top text-xs">
                      <p className="text-[#d6e5ff]">{formatDate(row.dueDateIso)}</p>
                      {row.isOverdue ? <p className="mt-1 text-rose-200">Overdue</p> : null}
                      {row.isDueSoon ? <p className="mt-1 text-amber-200">Due soon</p> : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]", COMPLIANCE_BADGE[row.complianceStatus])}>
                          {COMPLIANCE_LABEL[row.complianceStatus]}
                        </span>
                        <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]", STATUS_BADGE[row.status])}>
                          {STATUS_LABEL[row.status]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-[#b7cbe9]">{row.assignedStaff || row.authorName}</td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={resolveOpenHref(row, kind, newEntryHref)}
                          className="inline-flex h-8 items-center rounded-full border border-[#3f5d8d] bg-[#17305a] px-3 text-[11px] font-semibold text-[#d6e6ff]"
                        >
                          {row.entryId ? "Open" : kind === "UDA" ? "Start" : "Start"}
                        </Link>
                        {kind === "UDA" ? (
                          <Link
                            href={`${newQuarterlyHref || "/app/documentation/uda/new"}?residentId=${encodeURIComponent(row.residentId)}&assessmentType=QUARTERLY`}
                            className="inline-flex h-8 items-center rounded-full border border-amber-300/35 bg-amber-500/15 px-3 text-[11px] font-semibold text-amber-100"
                          >
                            Quarterly
                          </Link>
                        ) : (
                          <Link
                            href={`${newEntryHref}?residentId=${encodeURIComponent(row.residentId)}`}
                            className="inline-flex h-8 items-center rounded-full border border-emerald-300/35 bg-emerald-500/15 px-3 text-[11px] font-semibold text-emerald-100"
                          >
                            New
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-[#96aed4]">
                      No assessments match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <aside className="space-y-3 rounded-2xl border border-[#27406a] bg-[linear-gradient(180deg,#0c1a31_0%,#091425_100%)] p-3">
            <header>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94acd3]">Resident Snapshot</p>
              {selectedRow ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedRow.residentName}</p>
                  <p className="text-xs text-[#9cb4da]">
                    Room {selectedRow.residentRoom}
                    {selectedRow.residentUnit ? ` · ${selectedRow.residentUnit}` : ""}
                    {selectedRow.residentAge ? ` · Age ${selectedRow.residentAge}` : ""}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#93a9cf]">Select a resident row to review due status and actions.</p>
              )}
            </header>

            {selectedRow ? (
              <>
                <section className="rounded-xl border border-[#2c456f] bg-[#0d1f3a] p-3 text-xs">
                  <div className="flex items-center gap-2 text-[#cfe0ff]">
                    <ClipboardCheck className="h-4 w-4 text-sky-300" />
                    <span className="font-semibold">{assessmentLabel(selectedRow)} Workflow</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[#9eb5db]">
                    <p>Compliance: {COMPLIANCE_LABEL[selectedRow.complianceStatus]}</p>
                    <p>Status: {STATUS_LABEL[selectedRow.status]}</p>
                    <p>Due: {formatDate(selectedRow.dueDateIso)}</p>
                    {selectedRow.reviewDateIso ? <p>Review: {formatDate(selectedRow.reviewDateIso)}</p> : null}
                    <p>Last completed: {formatDate(selectedRow.lastCompletedDateIso)}</p>
                    <p>Staff: {selectedRow.assignedStaff || selectedRow.authorName}</p>
                  </div>
                </section>

                <section className="rounded-xl border border-[#2c456f] bg-[#0d1f3a] p-3 text-xs text-[#cfe0ff]">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-amber-300" />
                    <p className="font-semibold">Due Status</p>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-[#9eb5db]">{selectedRow.summary || "No summary provided yet."}</p>
                    {selectedRow.isOverdue ? (
                      <p className="inline-flex items-center gap-1 text-rose-200">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Overdue and needs review
                      </p>
                    ) : null}
                    {selectedRow.isDueSoon ? (
                      <p className="inline-flex items-center gap-1 text-amber-100">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Due within 7 days
                      </p>
                    ) : null}
                    {selectedRow.status === "COMPLETED" ? (
                      <p className="inline-flex items-center gap-1 text-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed entry
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="grid gap-2">
                  <Link
                    href={resolveOpenHref(selectedRow, kind, newEntryHref)}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-[#3f5d8d] bg-[#183361] text-xs font-semibold text-[#d6e6ff]"
                  >
                    {selectedRow.entryId ? "Open Assessment" : "Start Assessment"}
                  </Link>

                  {kind === "UDA" ? (
                    <>
                      <Link
                        href={`${newAnnualHref || "/app/documentation/uda/new"}?residentId=${encodeURIComponent(selectedRow.residentId)}&assessmentType=ANNUAL`}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-amber-300/35 bg-amber-500/15 text-xs font-semibold text-amber-100"
                      >
                        Start New Annual
                      </Link>
                      <Link
                        href={`${newQuarterlyHref || "/app/documentation/uda/new"}?residentId=${encodeURIComponent(selectedRow.residentId)}&assessmentType=QUARTERLY`}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/10 text-xs font-semibold text-amber-50"
                      >
                        Start New Quarterly
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={`${newEntryHref}?residentId=${encodeURIComponent(selectedRow.residentId)}`}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-500/15 text-xs font-semibold text-emerald-100"
                    >
                      Start New Section F Entry
                    </Link>
                  )}

                  <Link
                    href={`/app/residents?residentId=${encodeURIComponent(selectedRow.residentId)}`}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-[#35527f] bg-[#132848] text-xs font-semibold text-[#d7e6ff]"
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    View Resident Profile
                  </Link>
                </section>
              </>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
