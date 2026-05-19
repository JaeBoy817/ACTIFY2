"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  Loader2,
  Printer,
  Search,
  Sparkles,
  UserCheck,
  UserRoundCheck,
  Users,
  UserX
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";
import type {
  AttendanceEntriesMap,
  AttendanceQuickResident,
  AttendanceQuickTakePayload,
  AttendanceTrackerSummary
} from "@/lib/attendance-tracker/types";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type AttendanceTrackerPageShellProps = {
  initialData: AttendanceQuickTakePayload;
  summary: AttendanceTrackerSummary;
  facilityName: string;
  canEdit: boolean;
  timeZone: string;
};

type MetricCardProps = {
  label: string;
  value: string;
  helpText?: string;
  secondaryValue?: string;
  valueClassName?: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  progressValue?: number;
  onClick?: () => void;
};

type AttendanceSection = "overview" | "take" | "oneToOne" | "reports";
type SimpleAttendanceStatus = "Attended" | "Declined" | "Unavailable" | "Not Recorded";
type StatusFilter = "all" | SimpleAttendanceStatus;
type ReportType = "daily" | "weekly" | "monthly" | "oneToOneMonthly";

const ATTENDANCE_SECTIONS: Array<{
  id: AttendanceSection;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Overview", description: "Stats and follow-up list", icon: BarChart3 },
  { id: "take", label: "Take Attendance", description: "Group activity sheet", icon: ClipboardCheck },
  { id: "oneToOne", label: "1:1 Visits", description: "Quick room visits", icon: UserRoundCheck },
  { id: "reports", label: "Reports", description: "Print and export", icon: FileText }
];

function cloneEntries(entries: AttendanceEntriesMap): AttendanceEntriesMap {
  return JSON.parse(JSON.stringify(entries)) as AttendanceEntriesMap;
}

function residentName(resident: AttendanceQuickResident) {
  return `${resident.firstName} ${resident.lastName}`.trim();
}

function statusFromEntries(entriesByResidentId: AttendanceEntriesMap, residentId: string): QuickAttendanceStatus {
  return entriesByResidentId[residentId]?.status ?? "CLEAR";
}

function toCsvCell(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replaceAll("\"", "\"\"")}"`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlWithBreaks(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTimeInput(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(new Date(value));

  const hour = parts.find((part) => part.type === "hour")?.value ?? "10";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function defaultLocalTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function matchesResidentSearch(resident: AttendanceQuickResident, query: string) {
  if (!query) return true;
  const haystack = `${resident.firstName} ${resident.lastName} ${resident.room} ${resident.unitName ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

function simpleStatusFromQuick(status: QuickAttendanceStatus): SimpleAttendanceStatus {
  if (status === "PRESENT" || status === "ONE_TO_ONE") return "Attended";
  if (status === "REFUSED") return "Declined";
  if (status === "ASLEEP" || status === "OUT_OF_ROOM" || status === "NOT_APPLICABLE") return "Unavailable";
  return "Not Recorded";
}

function quickStatusFromSimple(status: SimpleAttendanceStatus): QuickAttendanceStatus {
  if (status === "Attended") return "PRESENT";
  if (status === "Declined") return "REFUSED";
  if (status === "Unavailable") return "OUT_OF_ROOM";
  return "CLEAR";
}

function statusLabelFromEntries(entriesByResidentId: AttendanceEntriesMap, residentId: string): SimpleAttendanceStatus {
  return simpleStatusFromQuick(statusFromEntries(entriesByResidentId, residentId));
}

function statusBadgeClass(status: SimpleAttendanceStatus) {
  if (status === "Attended") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Declined") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "Unavailable") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-white text-slate-500";
}

function buildTrackerCsv(params: {
  summary: AttendanceTrackerSummary;
  facilityName: string;
}) {
  const { summary, facilityName } = params;
  const rows = [
    ["Actify Attendance Tracker Summary"],
    ["Facility", facilityName],
    ["Selected Date", summary.dayLabel],
    ["Week", summary.weekLabel],
    ["Month", summary.monthLabel],
    ["Generated", summary.generatedAt],
    [],
    ["Range", "Participation", "Participated Residents", "Active Residents", "Group Attendance", "1:1 Visits", "Total Participation Marks"],
    [
      "Daily",
      formatPercent(summary.daily.participationPercent),
      summary.daily.participatedResidentCount,
      summary.daily.activeResidentCount,
      summary.daily.groupAttendanceCount,
      summary.daily.oneToOneVisitCount,
      summary.daily.totalParticipationMarks
    ],
    [
      "Weekly",
      formatPercent(summary.weekly.participationPercent),
      summary.weekly.participatedResidentCount,
      summary.weekly.activeResidentCount,
      summary.weekly.groupAttendanceCount,
      summary.weekly.oneToOneVisitCount,
      summary.weekly.totalParticipationMarks
    ],
    [
      "Monthly",
      formatPercent(summary.monthly.participationPercent),
      summary.monthly.participatedResidentCount,
      summary.monthly.activeResidentCount,
      summary.monthly.groupAttendanceCount,
      summary.monthly.oneToOneVisitCount,
      summary.monthly.totalParticipationMarks
    ],
    [],
    ["Residents Not Participated This Week"],
    ["Name", "Room", "Unit"],
    ...summary.residentsNotSeenThisWeek.map((resident) => [resident.name, resident.room, resident.unitName ?? ""])
  ];

  return rows.map((row) => row.map(toCsvCell).join(",")).join("\n");
}

function buildPrintHtml(params: {
  summary: AttendanceTrackerSummary;
  facilityName: string;
  reportType: ReportType;
}) {
  const { summary, facilityName } = params;
  const isOneToOneReport = params.reportType === "oneToOneMonthly";
  const reportSummary =
    params.reportType === "oneToOneMonthly" ? summary.reports.oneToOneMonthly.summary : summary.reports[params.reportType].summary;
  const reportTitle = reportSummary.title;
  const dateRangeLabel = reportSummary.dateRangeLabel;
  const generatedLabel = reportSummary.generatedLabel;

  const residentRows = (residents: Array<{ name: string; room: string; recommendedAction?: string | null }>, emptyText: string) =>
    residents.length
      ? residents
          .map(
            (resident) =>
              `<tr><td>${escapeHtml(resident.name)}</td><td>${escapeHtml(resident.room || "Not entered")}</td><td>${escapeHtml(
                resident.recommendedAction ?? "Follow up"
              )}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="3">${escapeHtml(emptyText)}</td></tr>`;

  const activityBreakdowns = summary.reports.daily.activityBreakdowns.length
    ? summary.reports.daily.activityBreakdowns
        .map((activity) => {
          const residents = activity.residents.length
            ? `<ul>${activity.residents
                .map((resident) => `<li>${escapeHtml(resident.residentName)}${resident.room ? ` <span class="muted">(Room ${escapeHtml(resident.room)})</span>` : ""}</li>`)
                .join("")}</ul>`
            : `<p class="muted">No residents attended this activity.</p>`;

          return `<div class="entry"><h3>${escapeHtml(activity.activityName)}</h3><p class="muted">Time: ${escapeHtml(
            activity.timeLabel
          )} · Location: ${escapeHtml(activity.location || "Location not entered")}</p><p><strong>Attendance:</strong> ${activity.attendanceCount} ${
            activity.attendanceCount === 1 ? "resident" : "residents"
          }</p><p class="label">Residents:</p>${residents}</div>`;
        })
        .join("")
    : `<p class="empty">No group activity attendance was recorded for this date.</p>`;

  const dailyRows = summary.reports.daily.rows.length
    ? summary.reports.daily.rows
        .map(
          (row) =>
            `<tr><td>${escapeHtml(row.residentName)}</td><td>${escapeHtml(row.room)}</td><td>${escapeHtml(row.activityName)}</td><td>${escapeHtml(row.status)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="4">No group activity attendance was recorded for this date.</td></tr>`;

  const weeklySnapshots = summary.reports.weekly.daySnapshots
    .map(
      (day) =>
        `<tr><td>${escapeHtml(day.dateLabel)}</td><td>${day.groupActivityCount}</td><td>${day.groupCheckIns}</td><td>${day.uniqueParticipants}</td><td>${escapeHtml(
          formatPercent(day.participationPercent)
        )}</td></tr>`
    )
    .join("");

  const topWeeklyActivities = summary.reports.weekly.topActivities.length
    ? summary.reports.weekly.topActivities
        .map(
          (activity) =>
            `<tr><td>${escapeHtml(activity.activityName)}</td><td>${escapeHtml(activity.dateLabel ?? "Date not entered")}</td><td>${escapeHtml(
              activity.timeLabel ?? "Time not entered"
            )}</td><td>${activity.count}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="4">No group activity attendance was recorded for this week.</td></tr>`;

  const monthlyAnalytics = !isOneToOneReport
    ? [
        ["Active Residents", summary.reports.monthly.summary.totalActiveResidents],
        ["Residents Participated This Month", summary.reports.monthly.summary.participatedResidentCount],
        ["Monthly Participation Rate", formatPercent(summary.reports.monthly.summary.participationPercent)],
        ["Group Activity Check-Ins", summary.reports.monthly.summary.groupCheckIns],
        ["Completed 1:1 Visits", summary.reports.monthly.summary.oneToOneVisits],
        ["Group Activities Held", summary.reports.monthly.summary.groupSessionCount],
        ["Residents With No Group Participation", summary.reports.monthly.summary.notSeenResidentCount]
      ]
        .map(([metric, value]) => `<tr><td>${escapeHtml(String(metric))}</td><td>${escapeHtml(String(value))}</td></tr>`)
        .join("")
    : "";

  const monthlyWeekRows = summary.reports.monthly.weekBreakdowns.length
    ? summary.reports.monthly.weekBreakdowns
        .map(
          (week) =>
            `<tr><td>${escapeHtml(week.weekLabel)}</td><td>${week.groupActivityCount}</td><td>${week.groupCheckIns}</td><td>${week.uniqueParticipants}</td><td>${escapeHtml(
              formatPercent(week.participationPercent)
            )}</td><td>${week.oneToOneVisits}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="6">No group activity attendance was recorded for this month.</td></tr>`;

  const monthlyTopActivities = summary.reports.monthly.mostAttendedActivities.length
    ? summary.reports.monthly.mostAttendedActivities
        .map(
          (activity) =>
            `<tr><td>${escapeHtml(activity.activityName)}</td><td>${escapeHtml(activity.dateLabel ?? "Date not entered")}</td><td>${escapeHtml(
              activity.timeLabel ?? "Time not entered"
            )}</td><td>${activity.count}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="4">No group activity attendance was recorded for this month.</td></tr>`;

  const oneToOneEntries = summary.reports.oneToOneMonthly.entries.length
    ? summary.reports.oneToOneMonthly.entries
        .map(
          (entry) =>
            `<div class="entry note-entry"><h3>${escapeHtml(entry.residentName || "Unknown Resident")}</h3><p><strong>Date:</strong> ${escapeHtml(
              entry.dateLabel || "Date Not Entered"
            )}</p><p><strong>Time:</strong> ${escapeHtml(entry.timeLabel || "Time Not Entered")}</p><p class="label">Progress Note:</p><p>${escapeHtmlWithBreaks(
              entry.progressNote || "No progress note entered."
            )}</p></div>`
        )
        .join("")
    : `<p class="empty">No completed 1:1 visits were documented for this month.</p>`;

  const missingOneToOneEntries = summary.reports.oneToOneMonthly.missingDateOrTimeEntries.length
    ? `<section class="section"><h2>Entries Missing Date or Time</h2>${summary.reports.oneToOneMonthly.missingDateOrTimeEntries
        .map(
          (entry) =>
            `<div class="entry note-entry"><h3>${escapeHtml(entry.residentName || "Unknown Resident")}</h3><p><strong>Date:</strong> ${escapeHtml(
              entry.dateLabel || "Date Not Entered"
            )}</p><p><strong>Time:</strong> ${escapeHtml(entry.timeLabel || "Time Not Entered")}</p><p class="label">Progress Note:</p><p>${escapeHtmlWithBreaks(
              entry.progressNote || "No progress note entered."
            )}</p></div>`
        )
        .join("")}</section>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(reportTitle)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 32px; line-height: 1.45; }
      h1 { margin: 0; font-size: 30px; }
      h2 { margin: 0 0 12px; font-size: 18px; }
      h3 { margin: 0 0 4px; font-size: 16px; }
      p { margin: 6px 0; }
      ul { margin: 8px 0 0 20px; padding: 0; columns: 2; }
      li { margin: 3px 0; break-inside: avoid; }
      .muted { color: #6b7280; }
      .brand { color: #4338ca; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      .summary { border: 1px solid #d1d5db; border-left: 5px solid #4f46e5; border-radius: 14px; margin-top: 20px; padding: 16px; background: #f8fafc; }
      .section { margin-top: 26px; page-break-inside: avoid; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
      .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; }
      .value { font-size: 28px; font-weight: 800; margin-top: 8px; }
      .label { font-weight: 800; color: #374151; margin-top: 10px; }
      .entry { border: 1px solid #d1d5db; border-radius: 14px; padding: 14px; margin-top: 12px; page-break-inside: avoid; }
      .note-entry { padding: 16px; }
      .empty { border: 1px solid #d1d5db; border-radius: 12px; padding: 14px; color: #6b7280; background: #f9fafb; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 9px; text-align: left; font-size: 13px; }
      th { background: #f3f4f6; }
      footer { margin-top: 32px; color: #6b7280; font-size: 12px; }
      @page { margin: 0.55in; }
      @media print {
        body { margin: 0; }
        .summary, .card, .entry, .empty { box-shadow: none; }
        ul { columns: 2; }
      }
    </style>
  </head>
  <body>
    <p class="brand">Actify Attendance Tracker</p>
    <h1>${escapeHtml(reportTitle)}</h1>
    <p><strong>Facility:</strong> ${escapeHtml(facilityName)}</p>
    <p><strong>Report Period:</strong> ${escapeHtml(dateRangeLabel)}</p>
    <p><strong>Printed:</strong> ${escapeHtml(generatedLabel)}</p>
    <p class="muted">Generated by Actify</p>
    <div class="summary">${escapeHtml(reportSummary.summaryText)}</div>
    ${
      params.reportType === "daily"
        ? `<div class="grid">
            <div class="card"><div class="muted">Active Residents</div><div class="value">${summary.reports.daily.summary.totalActiveResidents}</div></div>
            <div class="card"><div class="muted">Group Participants</div><div class="value">${summary.reports.daily.summary.participatedResidentCount}</div></div>
            <div class="card"><div class="muted">Daily Rate</div><div class="value">${escapeHtml(formatPercent(summary.reports.daily.summary.participationPercent))}</div></div>
          </div>
          <section class="section"><h2>Daily Summary</h2><table><thead><tr><th>Group check-ins</th><th>Group activities held</th><th>Completed 1:1 visits</th><th>Declined</th><th>Unavailable</th><th>No group participation</th></tr></thead><tbody><tr><td>${summary.reports.daily.summary.groupCheckIns}</td><td>${summary.reports.daily.summary.groupSessionCount}</td><td>${summary.reports.daily.summary.oneToOneVisits}</td><td>${summary.reports.daily.summary.declined}</td><td>${summary.reports.daily.summary.unavailable}</td><td>${summary.reports.daily.summary.notSeenResidentCount}</td></tr></tbody></table></section>
          <section class="section"><h2>Activity Breakdown</h2>${activityBreakdowns}</section>
          <section class="section"><h2>Resident Attendance List</h2><table><thead><tr><th>Resident</th><th>Room</th><th>Activity</th><th>Status</th></tr></thead><tbody>${dailyRows}</tbody></table></section>
          <section class="section"><h2>Residents With No Recorded Group Participation Today</h2><table><thead><tr><th>Resident</th><th>Room</th><th>Recommended Action</th></tr></thead><tbody>${residentRows(summary.reports.daily.residentsNotSeen, "All active residents had recorded group participation today.")}</tbody></table></section>`
        : ""
    }
    ${
      params.reportType === "weekly"
        ? `<div class="grid">
            <div class="card"><div class="muted">Active Residents</div><div class="value">${summary.reports.weekly.summary.totalActiveResidents}</div></div>
            <div class="card"><div class="muted">Group Participants</div><div class="value">${summary.reports.weekly.summary.participatedResidentCount}</div></div>
            <div class="card"><div class="muted">Weekly Rate</div><div class="value">${escapeHtml(formatPercent(summary.reports.weekly.summary.participationPercent))}</div></div>
          </div>
          <section class="section"><h2>Weekly Summary</h2><table><thead><tr><th>Group check-ins</th><th>Group activities held</th><th>Completed 1:1 visits</th><th>Declined</th><th>Unavailable</th><th>No group participation</th></tr></thead><tbody><tr><td>${summary.reports.weekly.summary.groupCheckIns}</td><td>${summary.reports.weekly.summary.groupSessionCount}</td><td>${summary.reports.weekly.summary.oneToOneVisits}</td><td>${summary.reports.weekly.summary.declined}</td><td>${summary.reports.weekly.summary.unavailable}</td><td>${summary.reports.weekly.summary.notSeenResidentCount}</td></tr></tbody></table></section>
          <section class="section"><h2>Day-by-Day Attendance Snapshot</h2><table><thead><tr><th>Date</th><th>Group Activities</th><th>Total Check-Ins</th><th>Unique Residents Participated</th><th>Participation %</th></tr></thead><tbody>${weeklySnapshots}</tbody></table></section>
          <section class="section"><h2>Top Participated Activities This Week</h2><table><thead><tr><th>Activity</th><th>Date</th><th>Time</th><th>Attendance Count</th></tr></thead><tbody>${topWeeklyActivities}</tbody></table></section>
          <section class="section"><h2>Residents With No Weekly Group Participation</h2><table><thead><tr><th>Resident</th><th>Room</th><th>Recommended Action</th></tr></thead><tbody>${residentRows(summary.reports.weekly.residentsNotSeen, "All active residents had recorded group participation this week.")}</tbody></table></section>`
        : ""
    }
    ${
      params.reportType === "monthly"
        ? `<div class="grid">
            <div class="card"><div class="muted">Active Residents</div><div class="value">${summary.reports.monthly.summary.totalActiveResidents}</div></div>
            <div class="card"><div class="muted">Group Participants</div><div class="value">${summary.reports.monthly.summary.participatedResidentCount}</div></div>
            <div class="card"><div class="muted">Monthly Rate</div><div class="value">${escapeHtml(formatPercent(summary.reports.monthly.summary.participationPercent))}</div></div>
          </div>
          <section class="section"><h2>Monthly Analytics</h2><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${monthlyAnalytics}</tbody></table></section>
          <section class="section"><h2>Week-by-Week Breakdown</h2><table><thead><tr><th>Week</th><th>Group Activities</th><th>Total Check-Ins</th><th>Unique Residents Participated</th><th>Participation %</th><th>1:1 Visits</th></tr></thead><tbody>${monthlyWeekRows}</tbody></table></section>
          <section class="section"><h2>Most Attended Activities This Month</h2><table><thead><tr><th>Activity</th><th>Date</th><th>Time</th><th>Attendance Count</th></tr></thead><tbody>${monthlyTopActivities}</tbody></table></section>
          <section class="section"><h2>Residents With No Monthly Group Participation</h2><table><thead><tr><th>Resident</th><th>Room</th><th>Recommended Action</th></tr></thead><tbody>${residentRows(summary.reports.monthly.residentsNotSeen, "All active residents had recorded group participation this month.")}</tbody></table></section>`
        : ""
    }
    ${
      params.reportType === "oneToOneMonthly"
        ? `<div class="grid">
            <div class="card"><div class="muted">Completed 1:1 Visits</div><div class="value">${summary.reports.oneToOneMonthly.summary.totalCompletedVisits}</div></div>
            <div class="card"><div class="muted">Residents Served</div><div class="value">${summary.reports.oneToOneMonthly.summary.residentsServedCount}</div></div>
            <div class="card"><div class="muted">Average / Week</div><div class="value">${summary.reports.oneToOneMonthly.summary.averageVisitsPerWeek.toFixed(1)}</div></div>
          </div>
          <section class="section"><h2>Monthly 1:1 Summary</h2><table><thead><tr><th>Total completed visits</th><th>Residents served</th><th>Residents without completed 1:1</th><th>Average visits per week</th><th>Most recent 1:1 date</th></tr></thead><tbody><tr><td>${summary.reports.oneToOneMonthly.summary.totalCompletedVisits}</td><td>${summary.reports.oneToOneMonthly.summary.residentsServedCount}</td><td>${summary.reports.oneToOneMonthly.summary.residentsWithoutOneToOneCount}</td><td>${summary.reports.oneToOneMonthly.summary.averageVisitsPerWeek.toFixed(1)}</td><td>${escapeHtml(summary.reports.oneToOneMonthly.summary.mostRecentVisitDate ?? "No recent visit")}</td></tr></tbody></table></section>
          <section class="section"><h2>Completed 1:1 Session List</h2>${oneToOneEntries}</section>
          ${missingOneToOneEntries}`
        : ""
    }
    <footer>Actify supports activity workflow and state-ready reporting. This report is not an EHR or clinical record system.</footer>
  </body>
</html>`;
}

function MetricCard({ label, value, helpText, secondaryValue, valueClassName, icon: Icon, tone, progressValue, onClick }: MetricCardProps) {
  const normalizedProgress = Math.max(0, Math.min(100, progressValue ?? 0));
  const content = (
    <CardContent className="relative p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className={cn("mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950", valueClassName)}>{value}</p>
          {secondaryValue ? <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{secondaryValue}</p> : null}
          {helpText ? <p className="mt-3 text-sm leading-5 text-slate-500">{helpText}</p> : null}
        </div>
        <div className={cn("shrink-0 rounded-2xl p-3 text-white shadow-lg shadow-slate-200/70", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {typeof progressValue === "number" ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={cn("h-full rounded-full", tone)} style={{ width: `${normalizedProgress}%` }} />
        </div>
      ) : null}
    </CardContent>
  );

  return (
    <Card
      className={cn(
        "group overflow-hidden border-white/80 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur",
        onClick ? "cursor-pointer transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.1)]" : ""
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {content}
    </Card>
  );
}

export function AttendanceTrackerPageShell({
  initialData,
  summary,
  facilityName,
  canEdit,
  timeZone
}: AttendanceTrackerPageShellProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [dateKey, setDateKey] = useState(initialData.dateKey);
  const [sessions, setSessions] = useState(initialData.sessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialData.selectedSessionId);
  const [entriesByResidentId, setEntriesByResidentId] = useState<AttendanceEntriesMap>(cloneEntries(initialData.entriesByResidentId));
  const [baselineEntriesByResidentId, setBaselineEntriesByResidentId] = useState<AttendanceEntriesMap>(cloneEntries(initialData.entriesByResidentId));
  const [residentSearch, setResidentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedResidentIds, setSelectedResidentIds] = useState<Set<string>>(new Set());
  const [activityName, setActivityName] = useState("");
  const [activityDate, setActivityDate] = useState(initialData.dateKey);
  const [activityTime, setActivityTime] = useState(defaultLocalTime());
  const [activityType, setActivityType] = useState<"Group" | "1:1">("Group");
  const [activityLocation, setActivityLocation] = useState("");
  const [savedGroupSummary, setSavedGroupSummary] = useState<string | null>(null);
  const [oneToOneSearch, setOneToOneSearch] = useState("");
  const [oneToOneResidentId, setOneToOneResidentId] = useState("");
  const [oneToOneDate, setOneToOneDate] = useState(initialData.dateKey);
  const [oneToOneTime, setOneToOneTime] = useState(defaultLocalTime());
  const [oneToOneDuration, setOneToOneDuration] = useState("15");
  const [oneToOneCustomDuration, setOneToOneCustomDuration] = useState("");
  const [oneToOneActivity, setOneToOneActivity] = useState("Conversation");
  const [oneToOneCompleted, setOneToOneCompleted] = useState("Yes");
  const [oneToOneIncompleteStatus, setOneToOneIncompleteStatus] = useState<"Declined" | "Unavailable">("Declined");
  const [oneToOneShortNote, setOneToOneShortNote] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [loggingOneToOne, setLoggingOneToOne] = useState(false);
  const [activeSection, setActiveSection] = useState<AttendanceSection>("overview");
  const [reportType, setReportType] = useState<ReportType>("daily");
  const groupSearchInputRef = useRef<HTMLInputElement>(null);
  const oneToOneSearchInputRef = useRef<HTMLInputElement>(null);
  const notSeenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDateKey(initialData.dateKey);
    setSessions(initialData.sessions);
    setSelectedSessionId(initialData.selectedSessionId);
    setEntriesByResidentId(cloneEntries(initialData.entriesByResidentId));
    setBaselineEntriesByResidentId(cloneEntries(initialData.entriesByResidentId));
    setActivityDate(initialData.dateKey);
    setOneToOneDate(initialData.dateKey);
    setSelectedResidentIds(new Set());
  }, [initialData.dateKey, initialData.entriesByResidentId, initialData.selectedSessionId, initialData.sessions]);

  useEffect(() => {
    if (activeSection !== "take" && activeSection !== "oneToOne") return undefined;

    const focusTimer = window.setTimeout(() => {
      if (activeSection === "take") {
        groupSearchInputRef.current?.focus();
      }
      if (activeSection === "oneToOne") {
        oneToOneSearchInputRef.current?.focus();
      }
    }, 120);

    return () => window.clearTimeout(focusTimer);
  }, [activeSection]);

  const groupSessions = useMemo(() => {
    return sessions.filter((session) => session.title !== "1:1 Visits");
  }, [sessions]);
  const selectedReportSummary =
    reportType === "oneToOneMonthly" ? summary.reports.oneToOneMonthly.summary : summary.reports[reportType].summary;
  const selectedAttendanceReportSummary =
    reportType === "oneToOneMonthly" ? null : summary.reports[reportType].summary;
  const isOneToOneReport = reportType === "oneToOneMonthly";

  const selectedSession = useMemo(() => {
    return selectedSessionId ? groupSessions.find((session) => session.id === selectedSessionId) ?? null : null;
  }, [groupSessions, selectedSessionId]);

  useEffect(() => {
    if (!selectedSession) {
      setActivityName("");
      setActivityLocation("");
      setActivityTime(defaultLocalTime());
      return;
    }

    setActivityName(selectedSession.title);
    setActivityDate(selectedSession.dateKey);
    setActivityTime(formatTimeInput(selectedSession.startAt, timeZone));
    setActivityLocation(selectedSession.location || "");
    setActivityType("Group");
  }, [selectedSession, timeZone]);

  const groupSearchQuery = residentSearch.trim().toLowerCase();
  const oneToOneSearchQuery = oneToOneSearch.trim().toLowerCase();

  const visibleGroupResidents = useMemo(() => {
    return initialData.residents.filter((resident) => {
      if (!matchesResidentSearch(resident, groupSearchQuery)) return false;
      if (statusFilter === "all") return true;
      return statusLabelFromEntries(entriesByResidentId, resident.id) === statusFilter;
    });
  }, [entriesByResidentId, groupSearchQuery, initialData.residents, statusFilter]);

  const statusCounts = useMemo(() => {
    return initialData.residents.reduce(
      (counts, resident) => {
        const status = statusLabelFromEntries(entriesByResidentId, resident.id);
        counts[status] += 1;
        return counts;
      },
      {
        Attended: 0,
        Declined: 0,
        Unavailable: 0,
        "Not Recorded": 0
      } as Record<SimpleAttendanceStatus, number>
    );
  }, [entriesByResidentId, initialData.residents]);

  async function authorizedFetch(input: string, init: RequestInit = {}) {
    const token = await getToken().catch(() => null);
    const headers = new Headers(init.headers ?? {});
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: "include"
    });
  }

  function updateDate(nextDateKey: string) {
    setDateKey(nextDateKey);
    router.push(`/app/attendance?date=${encodeURIComponent(nextDateKey)}`);
  }

  function updateSelectedSession(nextSessionId: string) {
    if (nextSessionId === "manual") {
      setSelectedSessionId(null);
      setActivityName("");
      setActivityLocation("");
      setActivityTime(defaultLocalTime());
      setEntriesByResidentId({});
      setBaselineEntriesByResidentId({});
      router.push(`/app/attendance?date=${encodeURIComponent(dateKey)}`);
      return;
    }

    setSelectedSessionId(nextSessionId);
    router.push(`/app/attendance?date=${encodeURIComponent(dateKey)}&sessionId=${encodeURIComponent(nextSessionId)}`);
  }

  function openSection(section: Exclude<AttendanceSection, "overview">) {
    setActiveSection(section);
  }

  function setResidentPresent(residentId: string, checked: boolean) {
    setEntriesByResidentId((previous) => ({
      ...previous,
      [residentId]: {
        status: checked ? "PRESENT" : "CLEAR",
        notes: previous[residentId]?.notes ?? null
      }
    }));
  }

  function setResidentStatus(residentId: string, status: SimpleAttendanceStatus) {
    const quickStatus = quickStatusFromSimple(status);
    setEntriesByResidentId((previous) => ({
      ...previous,
      [residentId]: {
        status: quickStatus,
        notes: previous[residentId]?.notes ?? null
      }
    }));
  }

  function toggleResidentSelection(residentId: string, checked: boolean) {
    setSelectedResidentIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(residentId);
      } else {
        next.delete(residentId);
      }
      return next;
    });
  }

  function setSelectedStatus(status: SimpleAttendanceStatus) {
    setEntriesByResidentId((previous) => {
      const next = { ...previous };
      for (const residentId of selectedResidentIds) {
        next[residentId] = {
          status: quickStatusFromSimple(status),
          notes: next[residentId]?.notes ?? null
        };
      }
      return next;
    });
  }

  function clearAllStatuses() {
    setEntriesByResidentId({});
    setSelectedResidentIds(new Set());
  }

  function selectAllVisibleResidents() {
    setSelectedResidentIds(new Set(visibleGroupResidents.map((resident) => resident.id)));
  }

  async function saveGroupAttendance() {
    if (!activityName.trim()) {
      toast({
        title: "Please enter an activity name.",
        variant: "destructive"
      });
      return;
    }

    if (!activityDate) {
      toast({
        title: "Please choose a date.",
        variant: "destructive"
      });
      return;
    }

    if (!canEdit) {
      toast({
        title: "Read-only access",
        description: "You do not have permission to save attendance.",
        variant: "destructive"
      });
      return;
    }

    setSavingGroup(true);
    try {
      const changedEntries = initialData.residents.flatMap((resident) => {
        const currentStatus = statusFromEntries(entriesByResidentId, resident.id);
        const baselineStatus = statusFromEntries(baselineEntriesByResidentId, resident.id);
        const shouldPersist = currentStatus !== "CLEAR" || currentStatus !== baselineStatus;

        if (!shouldPersist) {
          return [];
        }

        return [
          {
            residentId: resident.id,
            status: currentStatus,
            notes: entriesByResidentId[resident.id]?.notes ?? null
          }
        ];
      });

      if (changedEntries.length === 0) {
        toast({
          title: "Please mark at least one resident before saving attendance.",
          variant: "destructive"
        });
        return;
      }

      const response = await authorizedFetch("/api/attendance/quick-take", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sessionId: selectedSession?.id ?? null,
          activityName: activityName.trim(),
          dateKey: activityDate,
          time: activityTime,
          activityType,
          location: activityLocation.trim() || null,
          entries: changedEntries
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save attendance.");
      }

      toast({
        title: "Attendance saved",
        description: "Attendance saved."
      });
      setSavedGroupSummary(
        `${activityName.trim()} saved for ${summary.dayLabel}.\n${statusCounts.Attended} attended.\n${statusCounts.Declined} declined.\n${statusCounts.Unavailable} unavailable.`
      );
      setBaselineEntriesByResidentId(cloneEntries(entriesByResidentId));
      router.refresh();
    } catch (error) {
      toast({
        title: "Something didn’t save correctly. Please try again.",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive"
      });
    } finally {
      setSavingGroup(false);
    }
  }

  async function saveOneToOneVisit() {
    if (!oneToOneResidentId) {
      toast({
        title: "Please select a resident.",
        variant: "destructive"
      });
      return;
    }

    if (!canEdit) {
      toast({
        title: "Read-only access",
        description: "You do not have permission to log visits.",
        variant: "destructive"
      });
      return;
    }

    const durationMinutes = oneToOneDuration === "custom" ? Number(oneToOneCustomDuration) : Number(oneToOneDuration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      toast({
        title: "Please choose a duration.",
        variant: "destructive"
      });
      return;
    }

    setLoggingOneToOne(true);
    try {
      const response = await authorizedFetch("/api/attendance/one-to-one", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          residentId: oneToOneResidentId,
          dateKey: oneToOneDate,
          time: oneToOneTime,
          durationMinutes,
          activityProvided: oneToOneActivity,
          completed: oneToOneCompleted === "Yes",
          incompleteStatus: oneToOneIncompleteStatus,
          shortNote: oneToOneShortNote
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not log 1:1 visit.");
      }

      toast({
        title: "1:1 visit saved."
      });
      setOneToOneShortNote("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Something didn’t save correctly. Please try again.",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive"
      });
    } finally {
      setLoggingOneToOne(false);
    }
  }

  function exportCsv() {
    const csv = buildTrackerCsv({ summary, facilityName });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `actify-attendance-${summary.dateKey}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast({
      title: "Report exported."
    });
  }

  function printSummary() {
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) {
      toast({
        title: "Could not open print window",
        description: "Allow pop-ups for Actify, then try again.",
        variant: "destructive"
      });
      return;
    }

    printWindow.document.write(buildPrintHtml({ summary, facilityName, reportType }));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function copyStateReadySummary() {
    try {
      await navigator.clipboard.writeText(summary.stateReadySummary);
      toast({
        title: "Summary copied."
      });
    } catch {
      toast({
        title: "Unable to copy summary.",
        description: "Select the text and copy it manually.",
        variant: "destructive"
      });
    }
  }

  function scrollToNotSeenList() {
    setActiveSection("overview");
    window.setTimeout(() => {
      notSeenRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-fuchsia-200/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/80 shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_390px] lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_78%_20%,rgba(217,70,239,0.16),transparent_28%)]" />
            <div className="relative flex flex-col justify-between gap-8">
              <div className="max-w-3xl">
                <Badge variant="outline" className="border-cyan-200 bg-white/70 text-cyan-800 shadow-sm">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  State-ready participation
                </Badge>
                <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-6xl">
                  Attendance Tracker
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Track daily group and 1:1 participation with simple state-ready statistics.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  type="button"
                  className="h-12 rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/70 hover:bg-slate-800"
                  onClick={() => openSection("take")}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Take Attendance
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-white/80 bg-white/80 shadow-sm"
                  onClick={() => openSection("oneToOne")}
                >
                  <UserRoundCheck className="h-4 w-4" />
                  Log 1:1 Visit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-white/80 bg-white/80 shadow-sm"
                  onClick={() => openSection("reports")}
                >
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </div>

            <div className="relative rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Selected day</p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{summary.dayLabel}</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 p-3 text-white shadow-lg shadow-indigo-200">
                  <CalendarCheck2 className="h-5 w-5" />
                </div>
              </div>
              <label className="mt-5 block text-sm font-semibold text-slate-600">
                Change date
                <Input
                  type="date"
                  value={dateKey}
                  onChange={(event) => updateDate(event.target.value)}
                  className="mt-2 h-11 rounded-2xl border-slate-200 bg-white"
                />
              </label>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Today</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{formatPercent(summary.daily.participationPercent)}</p>
                  <p className="mt-1 text-xs text-white/65">
                    {summary.daily.participatedResidentCount} of {summary.activeResidentCount} residents
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">This week</p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{formatPercent(summary.weekly.participationPercent)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {summary.residentsNotSeenThisWeek.length} not seen
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="relative border-t border-white/80 bg-white/55 p-3" aria-label="Attendance sections" role="tablist">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {ATTENDANCE_SECTIONS.map((section) => {
                const selected = activeSection === section.id;
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition duration-200",
                      selected
                        ? "border-white bg-white text-slate-950 shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                        : "border-transparent text-slate-600 hover:border-white/80 hover:bg-white/70 hover:text-slate-950"
                    )}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                        selected ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{section.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{section.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </section>

        {activeSection === "overview" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Participation statistics">
              <MetricCard
                label="Today’s Participation"
                value={`${summary.daily.participatedResidentCount} / ${summary.activeResidentCount} residents`}
                secondaryValue={formatPercent(summary.daily.participationPercent)}
                valueClassName="text-2xl"
                icon={CalendarCheck2}
                tone="bg-gradient-to-br from-cyan-500 to-blue-500"
                progressValue={summary.daily.participationPercent}
              />
              <MetricCard
                label="This Week"
                value={`${summary.weekly.participatedResidentCount} / ${summary.activeResidentCount} residents`}
                secondaryValue={formatPercent(summary.weekly.participationPercent)}
                valueClassName="text-2xl"
                icon={BarChart3}
                tone="bg-gradient-to-br from-indigo-500 to-violet-500"
                progressValue={summary.weekly.participationPercent}
              />
              <MetricCard
                label="This Month"
                value={`${summary.monthly.participatedResidentCount} / ${summary.activeResidentCount} residents`}
                secondaryValue={formatPercent(summary.monthly.participationPercent)}
                valueClassName="text-2xl"
                icon={FileText}
                tone="bg-gradient-to-br from-fuchsia-500 to-rose-500"
                progressValue={summary.monthly.participationPercent}
              />
              <MetricCard
                label="Group Attendance"
                value={`${summary.monthly.groupAttendanceCount}`}
                secondaryValue="group check-ins"
                helpText="Total resident check-ins for group activities this month."
                valueClassName="text-4xl"
                icon={Users}
                tone="bg-gradient-to-br from-emerald-500 to-teal-500"
              />
              <MetricCard
                label="1:1 Visits"
                value={`${summary.monthly.oneToOneVisitCount}`}
                secondaryValue="completed this month"
                valueClassName="text-4xl"
                icon={UserRoundCheck}
                tone="bg-gradient-to-br from-orange-400 to-pink-500"
              />
              <MetricCard
                label="Not Seen This Week"
                value={`${summary.residentsNotSeenThisWeek.length} ${
                  summary.residentsNotSeenThisWeek.length === 1 ? "resident" : "residents"
                }`}
                valueClassName="text-2xl"
                helpText="Click to review the follow-up list"
                icon={UserX}
                tone="bg-gradient-to-br from-slate-600 to-slate-900"
                onClick={scrollToNotSeenList}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
              <div className="space-y-5">
            <Card className="overflow-hidden border-white/80 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    State-Ready Summary
                  </CardTitle>
                  <CardDescription>Auto-generated from saved attendance statistics. No AI involved.</CardDescription>
                </div>
                <Button type="button" variant="outline" className="rounded-2xl bg-white" onClick={copyStateReadySummary}>
                  <Copy className="h-4 w-4" />
                  Copy Summary
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 text-base leading-8 text-slate-700">
                  {summary.stateReadySummary}
                </div>
              </CardContent>
            </Card>

            {summary.activeResidentCount > 0 && summary.daily.totalParticipationMarks === 0 ? (
              <Card className="border-white/80 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-950">No attendance recorded today yet.</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Start by taking attendance for a group activity or logging a 1:1 visit.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => openSection("take")}>
                      Take Attendance
                    </Button>
                    <Button type="button" variant="outline" className="bg-white" onClick={() => openSection("oneToOne")}>
                      Log 1:1 Visit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
              </div>

            <Card ref={notSeenRef} className="overflow-hidden border-white/80 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <UserX className="h-6 w-6 text-slate-700" />
                  Residents Not Seen This Week
                </CardTitle>
                <CardDescription>{summary.weekLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.activeResidentCount === 0 ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
                    <p className="font-semibold">No active residents found.</p>
                    <p className="mt-1">Add residents in the Residents tab before taking attendance.</p>
                  </div>
                ) : summary.residentsNotSeenThisWeek.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <div className="hidden grid-cols-[1.3fr_0.5fr_0.8fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 md:grid">
                      <span>Resident Name</span>
                      <span>Room</span>
                      <span>Last Participated</span>
                      <span>Recommended Action</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {summary.residentsNotSeenThisWeek.map((resident) => (
                        <div key={resident.id} className="grid gap-2 bg-white px-4 py-4 text-sm md:grid-cols-[1.3fr_0.5fr_0.8fr_1fr] md:items-center">
                          <div>
                            <p className="font-semibold text-slate-950">{resident.name}</p>
                            <p className="text-xs text-slate-500 md:hidden">Room {resident.room}</p>
                          </div>
                          <p className="hidden text-slate-600 md:block">{resident.room}</p>
                          <p className="text-slate-600">{resident.lastParticipatedLabel ?? "No recent record"}</p>
                          <p className="font-medium text-slate-700">{resident.recommendedAction ?? "Follow up this week"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                    All active residents have participated this week.
                  </div>
                )}
              </CardContent>
            </Card>
            </section>
          </>
        ) : null}

        {activeSection === "take" ? (
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            <CardHeader className="border-b border-white/80 bg-gradient-to-br from-white via-cyan-50/50 to-indigo-50/60">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge variant="outline" className="mb-3 border-cyan-200 bg-white/70 text-cyan-800">
                    Step 1
                  </Badge>
                  <CardTitle className="flex items-center gap-3 text-3xl tracking-[-0.04em]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-200">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    Take Attendance
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Select or create a group activity, mark residents, then save simple state-ready attendance.
                  </CardDescription>
                </div>
                <div className="min-w-[260px]">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Select Calendar Activity
                  </p>
                  <Select value={selectedSession?.id ?? "manual"} onValueChange={updateSelectedSession}>
                    <SelectTrigger className="h-11 rounded-2xl bg-white" aria-label="Select Calendar Activity">
                      <SelectValue placeholder="Choose a scheduled calendar activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual quick group activity</SelectItem>
                      {groupSessions.length === 0 ? (
                        <SelectItem value="no-calendar-activities" disabled>
                          No calendar activities scheduled for today
                        </SelectItem>
                      ) : null}
                      {groupSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {formatTime(session.startAt, timeZone)} {session.title}
                          {session.location ? ` - ${session.location}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-slate-500">
                    {groupSessions.length > 0
                      ? "Choose a scheduled calendar activity or create a quick group activity manually."
                      : "No calendar activities scheduled for today. You can still create a quick group activity manually."}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-4 rounded-[1.75rem] border border-white bg-slate-50/80 p-5 shadow-inner shadow-white md:grid-cols-5">
                <label className="text-sm font-semibold text-slate-600 md:col-span-2">
                  Activity Name
                  <Input
                    value={activityName}
                    onChange={(event) => setActivityName(event.target.value)}
                    placeholder="Bingo"
                    className="mt-2 h-11 rounded-2xl bg-white"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-600">
                  Date
                  <Input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} className="mt-2 h-11 rounded-2xl bg-white" />
                </label>
                <label className="text-sm font-semibold text-slate-600">
                  Time
                  <Input type="time" value={activityTime} onChange={(event) => setActivityTime(event.target.value)} className="mt-2 h-11 rounded-2xl bg-white" />
                </label>
                <label className="text-sm font-semibold text-slate-600">
                  Activity Type
                  <Select value={activityType} onValueChange={(value) => setActivityType(value as "Group" | "1:1")}>
                    <SelectTrigger className="mt-2 h-11 rounded-2xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Group">Group</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="text-sm font-semibold text-slate-600 md:col-span-5">
                  Location <span className="font-normal text-slate-400">(optional)</span>
                  <Input
                    value={activityLocation}
                    onChange={(event) => setActivityLocation(event.target.value)}
                    placeholder="Activity room"
                    className="mt-2 h-11 rounded-2xl bg-white"
                  />
                </label>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className="w-fit border-indigo-200 bg-indigo-50 text-indigo-700">
                    Step 2
                  </Badge>
                  <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Mark residents</h3>
                </div>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative max-w-xl flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      ref={groupSearchInputRef}
                      value={residentSearch}
                      onChange={(event) => setResidentSearch(event.target.value)}
                      placeholder="Search resident by name, room, or unit..."
                      className="h-11 rounded-2xl bg-white pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "Not Recorded", "Attended", "Declined", "Unavailable"] as StatusFilter[]).map((filter) => (
                      <Button
                        key={filter}
                        type="button"
                        size="sm"
                        variant={statusFilter === filter ? "default" : "outline"}
                        className={cn("rounded-full", statusFilter === filter ? "" : "bg-white")}
                        onClick={() => setStatusFilter(filter)}
                      >
                        {filter === "all" ? "All" : filter}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="rounded-full bg-white" onClick={selectAllVisibleResidents}>
                    Select visible
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full bg-white" onClick={() => setSelectedStatus("Attended")} disabled={selectedResidentIds.size === 0}>
                    Mark Selected as Attended
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full bg-white" onClick={() => setSelectedStatus("Declined")} disabled={selectedResidentIds.size === 0}>
                    Mark Selected as Declined
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full bg-white" onClick={() => setSelectedStatus("Unavailable")} disabled={selectedResidentIds.size === 0}>
                    Mark Selected as Unavailable
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full bg-white" onClick={() => setSelectedStatus("Not Recorded")} disabled={selectedResidentIds.size === 0}>
                    Clear Selected
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full bg-white" onClick={clearAllStatuses}>
                    Clear All
                  </Button>
                </div>
              </div>

              {initialData.residents.length === 0 ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
                  <p className="font-semibold">No active residents found.</p>
                  <p className="mt-1">Add residents in the Residents tab before taking attendance.</p>
                </div>
              ) : (
                <div className="max-h-[560px] overflow-auto rounded-[1.75rem] border border-white bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                  <div className="sticky top-0 z-10 hidden grid-cols-[44px_1.2fr_0.4fr_1fr] gap-3 border-b border-slate-100 bg-slate-50/95 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 backdrop-blur md:grid">
                    <span />
                    <span>Resident Name</span>
                    <span>Room</span>
                    <span>Attendance Status</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {visibleGroupResidents.map((resident) => {
                      const status = statusLabelFromEntries(entriesByResidentId, resident.id);
                      const selected = selectedResidentIds.has(resident.id);
                      return (
                        <div key={resident.id} className="grid gap-3 bg-white px-4 py-4 transition hover:bg-cyan-50/35 md:grid-cols-[44px_1.2fr_0.4fr_1fr] md:items-center">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => toggleResidentSelection(resident.id, checked === true)}
                            aria-label={`Select ${residentName(resident)}`}
                            disabled={savingGroup}
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{residentName(resident)}</p>
                            <p className="text-xs text-slate-500 md:hidden">Room {resident.room}</p>
                          </div>
                          <p className="hidden text-sm text-slate-600 md:block">{resident.room}</p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button
                              type="button"
                              size="sm"
                              variant={status === "Attended" ? "default" : "outline"}
                              className={cn("rounded-full", status === "Attended" ? "" : "bg-white")}
                              onClick={() => setResidentPresent(resident.id, status !== "Attended")}
                              disabled={!canEdit || savingGroup}
                            >
                              Attended
                            </Button>
                            <Select
                              value={status}
                              onValueChange={(value) => setResidentStatus(resident.id, value as SimpleAttendanceStatus)}
                              disabled={!canEdit || savingGroup}
                            >
                              <SelectTrigger className="h-9 rounded-full bg-white sm:w-[170px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Not Recorded">Not Recorded</SelectItem>
                                <SelectItem value="Attended">Attended</SelectItem>
                                <SelectItem value="Declined">Declined</SelectItem>
                                <SelectItem value="Unavailable">Unavailable</SelectItem>
                              </SelectContent>
                            </Select>
                            <Badge variant="outline" className={statusBadgeClass(status)}>
                              {status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    {visibleGroupResidents.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">No residents match that search or filter.</div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  {statusCounts.Attended} attended · {statusCounts.Declined} declined · {statusCounts.Unavailable} unavailable · {statusCounts["Not Recorded"]} not recorded
                </p>
                <Button type="button" className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={saveGroupAttendance} disabled={savingGroup || !canEdit || initialData.residents.length === 0}>
                  {savingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Attendance
                </Button>
              </div>
              {savedGroupSummary ? (
                <div className="whitespace-pre-line rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  {savedGroupSummary}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "oneToOne" ? (
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            <CardHeader className="border-b border-white/80 bg-gradient-to-br from-white via-fuchsia-50/45 to-orange-50/60">
              <Badge variant="outline" className="mb-3 w-fit border-fuchsia-200 bg-white/70 text-fuchsia-800">
                Quick log
              </Badge>
              <CardTitle className="flex items-center gap-3 text-3xl tracking-[-0.04em]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-200">
                  <UserCheck className="h-5 w-5" />
                </span>
                1:1 Visits
              </CardTitle>
              <CardDescription>Quickly log a simple resident room visit. No clinical note required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-7">
              <div className="rounded-[2rem] border border-white bg-gradient-to-br from-slate-50 via-white to-fuchsia-50/35 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_55px_rgba(15,23,42,0.06)] sm:p-7">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5">
                  <Badge variant="outline" className="w-fit border-fuchsia-200 bg-white/80 text-fuchsia-800">
                    Visit details
                  </Badge>
                  <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Log a 1:1 activity visit</h3>
                  <p className="max-w-2xl text-sm leading-6 text-slate-500">
                    Keep it quick: choose the resident, add the visit details, and optionally leave a short note.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-12">
                <label className="text-sm font-semibold text-slate-600 lg:col-span-5">
                  Resident
                  <Select value={oneToOneResidentId} onValueChange={setOneToOneResidentId}>
                    <SelectTrigger className="mt-2 h-12 rounded-2xl bg-white shadow-sm">
                      <SelectValue placeholder="Select resident" />
                    </SelectTrigger>
                    <SelectContent>
                      {initialData.residents.map((resident) => (
                        <SelectItem key={resident.id} value={resident.id}>
                          {residentName(resident)} · Room {resident.room}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="text-sm font-semibold text-slate-600 lg:col-span-3">
                  Date
                  <Input type="date" value={oneToOneDate} onChange={(event) => setOneToOneDate(event.target.value)} className="mt-2 h-12 rounded-2xl bg-white shadow-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-600 lg:col-span-2">
                  Time
                  <Input type="time" value={oneToOneTime} onChange={(event) => setOneToOneTime(event.target.value)} className="mt-2 h-12 rounded-2xl bg-white shadow-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-600 lg:col-span-2">
                  Duration
                  <Select value={oneToOneDuration} onValueChange={setOneToOneDuration}>
                    <SelectTrigger className="mt-2 h-12 rounded-2xl bg-white shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {oneToOneDuration === "custom" ? (
                  <label className="text-sm font-semibold text-slate-600 lg:col-span-2">
                    Custom Minutes
                    <Input
                      type="number"
                      min={1}
                      max={240}
                      value={oneToOneCustomDuration}
                      onChange={(event) => setOneToOneCustomDuration(event.target.value)}
                      className="mt-2 h-12 rounded-2xl bg-white shadow-sm"
                    />
                  </label>
                ) : null}
                <label className="text-sm font-semibold text-slate-600 lg:col-span-5">
                  Activity Provided
                  <Select value={oneToOneActivity} onValueChange={setOneToOneActivity}>
                    <SelectTrigger className="mt-2 h-12 rounded-2xl bg-white shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Conversation", "Music", "Crossword", "Reading", "Sensory", "TV discussion", "Spiritual", "Cards", "Other"].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="text-sm font-semibold text-slate-600 lg:col-span-3">
                  Completed
                  <Select value={oneToOneCompleted} onValueChange={setOneToOneCompleted}>
                    <SelectTrigger className="mt-2 h-12 rounded-2xl bg-white shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {oneToOneCompleted === "No" ? (
                  <label className="text-sm font-semibold text-slate-600 lg:col-span-4">
                    Status
                    <Select value={oneToOneIncompleteStatus} onValueChange={(value) => setOneToOneIncompleteStatus(value as "Declined" | "Unavailable")}>
                      <SelectTrigger className="mt-2 h-12 rounded-2xl bg-white shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Declined">Declined</SelectItem>
                        <SelectItem value="Unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}
                <label className="text-sm font-semibold text-slate-600 lg:col-span-12">
                  Short Note <span className="font-normal text-slate-400">(optional)</span>
                  <textarea
                    value={oneToOneShortNote}
                    onChange={(event) => setOneToOneShortNote(event.target.value)}
                    placeholder="Visited resident in room for crossword puzzle."
                    className="mt-2 min-h-[140px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-6 shadow-sm outline-none transition focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100"
                  />
                </label>
                <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:col-span-12">
                  <p className="text-sm text-slate-500">
                    Completed visits count toward daily, weekly, and monthly participation.
                  </p>
                  <Button type="button" className="h-12 rounded-2xl bg-slate-950 px-6 text-white hover:bg-slate-800" onClick={saveOneToOneVisit} disabled={!canEdit || loggingOneToOne || initialData.residents.length === 0}>
                    {loggingOneToOne ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}
                    Save 1:1 Visit
                  </Button>
                </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-slate-950">
                      <Clock3 className="h-5 w-5 text-fuchsia-500" />
                      Recent 1:1 Visits
                    </h3>
                    <p className="text-sm text-slate-500">Simple completed and attempted 1:1 records for this month.</p>
                  </div>
                  <div className="relative md:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      ref={oneToOneSearchInputRef}
                      value={oneToOneSearch}
                      onChange={(event) => setOneToOneSearch(event.target.value)}
                      placeholder="Search resident..."
                      className="h-11 rounded-2xl bg-white pl-9"
                    />
                  </div>
                </div>
                {summary.recentOneToOneVisits.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <div className="hidden grid-cols-[0.8fr_1fr_0.4fr_1fr_0.6fr_0.6fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:grid">
                      <span>Date</span>
                      <span>Resident</span>
                      <span>Room</span>
                      <span>Activity Provided</span>
                      <span>Duration</span>
                      <span>Completed</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {summary.recentOneToOneVisits
                        .filter((visit) => visit.residentName.toLowerCase().includes(oneToOneSearchQuery) || visit.room.toLowerCase().includes(oneToOneSearchQuery))
                        .map((visit) => (
                          <div key={visit.id} className="grid gap-2 bg-white px-4 py-4 text-sm lg:grid-cols-[0.8fr_1fr_0.4fr_1fr_0.6fr_0.6fr] lg:items-center">
                            <p className="text-slate-600">{visit.dateLabel}</p>
                            <p className="font-semibold text-slate-950">{visit.residentName}</p>
                            <p className="text-slate-600">Room {visit.room}</p>
                            <p className="text-slate-700">{visit.activityProvided}</p>
                            <p className="text-slate-600">{visit.durationLabel}</p>
                            <Badge variant="outline" className={visit.completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                              {visit.completed ? "Yes" : "No"}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">No 1:1 visits recorded yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "reports" ? (
          <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            <CardHeader className="flex flex-col gap-4 border-b border-white/80 bg-gradient-to-br from-white via-indigo-50/50 to-cyan-50/60 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge variant="outline" className="mb-3 w-fit border-indigo-200 bg-white/70 text-indigo-800">
                  State-ready output
                </Badge>
                <CardTitle className="flex items-center gap-3 text-3xl tracking-[-0.04em]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-200">
                    <FileText className="h-5 w-5" />
                  </span>
                  Reports
                </CardTitle>
                <CardDescription>
                  View, print, or export daily, weekly, monthly, and monthly 1:1 reports.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-11 rounded-2xl bg-white" onClick={printSummary}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button type="button" className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={exportCsv}>
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-4 rounded-[1.75rem] border border-white bg-slate-50/80 p-5 shadow-inner shadow-white md:grid-cols-[260px_1fr] md:items-end">
                <label className="text-sm font-semibold text-slate-600">
                  Report Type
                  <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                    <SelectTrigger className="mt-2 h-11 rounded-2xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Attendance Report</SelectItem>
                      <SelectItem value="weekly">Weekly Participation Report</SelectItem>
                      <SelectItem value="monthly">Monthly Participation Report</SelectItem>
                      <SelectItem value="oneToOneMonthly">Monthly 1:1 Report List</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <div className="text-sm text-slate-500">
                  Date range: <span className="font-semibold text-slate-700">{selectedReportSummary.dateRangeLabel}</span>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                  <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{selectedReportSummary.title}</h3>
                  <p className="text-sm text-slate-500">
                    {facilityName} · {selectedReportSummary.dateRangeLabel} · Generated {selectedReportSummary.generatedLabel}
                  </p>
                  <p className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-950">
                    {selectedReportSummary.summaryText}
                  </p>
                </div>
                {isOneToOneReport ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner shadow-white">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Completed 1:1 Visits</p>
                      <p className="mt-2 text-2xl font-bold">{summary.reports.oneToOneMonthly.summary.totalCompletedVisits}</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-white p-4 shadow-inner shadow-white">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Residents Served</p>
                      <p className="mt-2 text-2xl font-bold">{summary.reports.oneToOneMonthly.summary.residentsServedCount}</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-4 shadow-inner shadow-white">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Average / Week</p>
                      <p className="mt-2 text-2xl font-bold">{summary.reports.oneToOneMonthly.summary.averageVisitsPerWeek.toFixed(1)}</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-white p-4 shadow-inner shadow-white">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Without 1:1</p>
                      <p className="mt-2 text-2xl font-bold">{summary.reports.oneToOneMonthly.summary.residentsWithoutOneToOneCount}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner shadow-white">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Active Residents</p>
                        <p className="mt-2 text-2xl font-bold">{selectedAttendanceReportSummary?.totalActiveResidents ?? 0}</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-white p-4 shadow-inner shadow-white">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Group Participants</p>
                        <p className="mt-2 text-2xl font-bold">{selectedAttendanceReportSummary?.participatedResidentCount ?? 0}</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-4 shadow-inner shadow-white">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Participation Rate</p>
                        <p className="mt-2 text-2xl font-bold">{formatPercent(selectedAttendanceReportSummary?.participationPercent ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-white p-4 shadow-inner shadow-white">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">No Group Participation</p>
                        <p className="mt-2 text-2xl font-bold">{selectedAttendanceReportSummary?.notSeenResidentCount ?? 0}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="text-sm text-slate-500">Group check-ins</p>
                        <p className="mt-1 text-xl font-bold">{selectedAttendanceReportSummary?.groupCheckIns ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="text-sm text-slate-500">Completed 1:1 visits</p>
                        <p className="mt-1 text-xl font-bold">{selectedAttendanceReportSummary?.oneToOneVisits ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="text-sm text-slate-500">Declined</p>
                        <p className="mt-1 text-xl font-bold">{selectedAttendanceReportSummary?.declined ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-4">
                        <p className="text-sm text-slate-500">Unavailable</p>
                        <p className="mt-1 text-xl font-bold">{selectedAttendanceReportSummary?.unavailable ?? 0}</p>
                      </div>
                    </div>
                  </>
                )}

                {reportType === "daily" ? (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Activity Breakdown</h4>
                      {summary.reports.daily.activityBreakdowns.length > 0 ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {summary.reports.daily.activityBreakdowns.map((activity) => (
                            <div key={activity.activityId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                              <p className="font-semibold text-slate-950">{activity.activityName}</p>
                              <p className="mt-1 text-slate-500">
                                {activity.timeLabel} · {activity.location}
                              </p>
                              <p className="mt-2 font-medium text-slate-700">{activity.attendanceCount} residents attended</p>
                              <p className="mt-2 text-xs text-slate-500">
                                {activity.residents.slice(0, 5).map((resident) => resident.residentName).join(", ")}
                                {activity.residents.length > 5 ? ` +${activity.residents.length - 5} more` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
                          No group activity attendance was recorded for this date.
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Resident Attendance List</h4>
                    {summary.reports.daily.rows.length > 0 ? (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                        {summary.reports.daily.rows.map((row) => (
                          <div key={row.id} className="grid gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0 md:grid-cols-[1fr_0.4fr_1fr_0.5fr_0.6fr]">
                            <span className="font-semibold">{row.residentName}</span>
                            <span>Room {row.room}</span>
                            <span>{row.activityName}</span>
                            <span>{row.activityType}</span>
                            <Badge variant="outline" className={statusBadgeClass(row.status)}>
                              {row.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
                        No group activity attendance was recorded for this date.
                      </div>
                    )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Residents With No Recorded Group Participation Today</h4>
                      {summary.reports.daily.residentsNotSeen.length > 0 ? (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {summary.reports.daily.residentsNotSeen.map((resident) => (
                            <div key={resident.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                              <p className="font-semibold text-slate-950">{resident.name}</p>
                              <p className="text-slate-500">Room {resident.room}</p>
                              <p className="mt-2 font-medium text-slate-700">{resident.recommendedAction ?? "Offer group activity"}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                          All active residents had recorded group participation today.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {reportType === "weekly" ? (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Day-by-Day Attendance Snapshot</h4>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                        {summary.reports.weekly.daySnapshots.map((day) => (
                          <div key={day.dateLabel} className="grid gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0 md:grid-cols-[1fr_0.7fr_0.7fr_0.9fr_0.6fr]">
                            <span className="font-semibold">{day.dateLabel}</span>
                            <span>{day.groupActivityCount} activities</span>
                            <span>{day.groupCheckIns} check-ins</span>
                            <span>{day.uniqueParticipants} residents</span>
                            <span>{formatPercent(day.participationPercent)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Top Participated Activities This Week</h4>
                      {summary.reports.weekly.topActivities.length > 0 ? (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {summary.reports.weekly.topActivities.map((activity) => (
                            <div key={`${activity.activityId ?? activity.activityName}-${activity.dateLabel ?? ""}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                              <p className="font-semibold text-slate-950">{activity.activityName}</p>
                              <p className="text-slate-500">
                                {activity.dateLabel ?? "Date not entered"} · {activity.timeLabel ?? "Time not entered"}
                              </p>
                              <p className="mt-2 font-medium text-slate-700">{activity.count} group check-ins</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">No group activity attendance was recorded for this week.</p>
                      )}
                    </div>
                    <div>
                    <h4 className="text-lg font-bold text-slate-950">Residents With No Weekly Group Participation</h4>
                    {summary.reports.weekly.residentsNotSeen.length > 0 ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {summary.reports.weekly.residentsNotSeen.map((resident) => (
                          <div key={resident.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                            <p className="font-semibold text-slate-950">{resident.name}</p>
                            <p className="text-slate-500">Room {resident.room} · {resident.lastParticipatedLabel ?? "No recent record"}</p>
                            <p className="mt-2 font-medium text-slate-700">{resident.recommendedAction ?? "Follow up this week"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                        All active residents had recorded group participation this week.
                      </div>
                    )}
                    </div>
                  </div>
                ) : null}

                {reportType === "monthly" ? (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Week-by-Week Breakdown</h4>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                        {summary.reports.monthly.weekBreakdowns.map((week) => (
                          <div key={week.weekLabel} className="grid gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.9fr_0.7fr_0.6fr]">
                            <span className="font-semibold">{week.weekLabel}</span>
                            <span>{week.groupActivityCount} activities</span>
                            <span>{week.groupCheckIns} check-ins</span>
                            <span>{week.uniqueParticipants} residents</span>
                            <span>{formatPercent(week.participationPercent)}</span>
                            <span>{week.oneToOneVisits} 1:1</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Most Attended Activities</h4>
                      {summary.reports.monthly.mostAttendedActivities.length > 0 ? (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {summary.reports.monthly.mostAttendedActivities.map((activity) => (
                            <div key={`${activity.activityId ?? activity.activityName}-${activity.dateLabel ?? ""}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                              <p className="font-semibold text-slate-950">{activity.activityName}</p>
                              <p className="text-slate-500">
                                {activity.dateLabel ?? "Date not entered"} · {activity.timeLabel ?? "Time not entered"}
                              </p>
                              <p className="mt-2 font-medium text-slate-700">{activity.count} group check-ins</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">No group activity attendance was recorded for this month.</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Resident Participation</h4>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                        {summary.reports.monthly.residentParticipation.map((resident) => (
                          <div key={resident.residentId} className="grid gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0 md:grid-cols-[1fr_0.4fr_0.7fr_0.6fr_0.6fr_0.8fr]">
                            <span className="font-semibold">{resident.residentName}</span>
                            <span>Room {resident.room}</span>
                            <span>{resident.participatedThisMonth ? "Yes" : "No"}</span>
                            <span>{resident.groupCheckIns} group</span>
                            <span>{resident.oneToOneVisits} 1:1</span>
                            <span>{resident.lastParticipatedLabel ?? "No recent record"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Residents With No Monthly Group Participation</h4>
                      {summary.reports.monthly.residentsNotSeen.length > 0 ? (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {summary.reports.monthly.residentsNotSeen.map((resident) => (
                            <div key={resident.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                              <p className="font-semibold text-slate-950">{resident.name}</p>
                              <p className="text-slate-500">Room {resident.room}</p>
                              <p className="mt-2 font-medium text-slate-700">{resident.recommendedAction ?? "Follow up this month"}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                          All active residents had recorded group participation this month.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {reportType === "oneToOneMonthly" ? (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h4 className="text-lg font-bold text-slate-950">Completed 1:1 Session List</h4>
                      {summary.reports.oneToOneMonthly.entries.length > 0 ? (
                        <div className="mt-3 grid gap-3">
                          {summary.reports.oneToOneMonthly.entries.slice(0, 12).map((entry) => (
                            <div key={`${entry.sessionId}-${entry.residentId}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="font-semibold text-slate-950">{entry.residentName}</p>
                                <p className="text-slate-500">
                                  {entry.dateLabel} · {entry.timeLabel}
                                </p>
                              </div>
                              <p className="mt-3 whitespace-pre-wrap leading-6 text-slate-700">{entry.progressNote}</p>
                            </div>
                          ))}
                          {summary.reports.oneToOneMonthly.entries.length > 12 ? (
                            <p className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
                              Print the report to view all {summary.reports.oneToOneMonthly.entries.length} completed 1:1 visits.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
                          No completed 1:1 visits were documented for this month.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
