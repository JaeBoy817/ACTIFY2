"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Loader2,
  Printer,
  Search,
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
  AttendanceTrackerRangeSummary,
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
};

type AttendanceSection = "overview" | "take" | "oneToOne" | "reports";

const ATTENDANCE_SECTIONS: Array<{ id: AttendanceSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "take", label: "Take Attendance" },
  { id: "oneToOne", label: "1:1 Visits" },
  { id: "reports", label: "Reports" }
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

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

function formatRangeSummary(range: AttendanceTrackerRangeSummary) {
  return `${formatPercent(range.participationPercent)} (${range.participatedResidentCount}/${range.activeResidentCount} residents)`;
}

function matchesResidentSearch(resident: AttendanceQuickResident, query: string) {
  if (!query) return true;
  const haystack = `${resident.firstName} ${resident.lastName} ${resident.room} ${resident.unitName ?? ""}`.toLowerCase();
  return haystack.includes(query);
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
}) {
  const { summary, facilityName } = params;
  const notSeenRows = summary.residentsNotSeenThisWeek.length
    ? summary.residentsNotSeenThisWeek
        .map(
          (resident) =>
            `<tr><td>${escapeHtml(resident.name)}</td><td>${escapeHtml(resident.room)}</td><td>${escapeHtml(
              resident.unitName ?? ""
            )}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="3">Every active resident has a participation mark this week.</td></tr>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Attendance Tracker Summary</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
      h1 { margin: 0; font-size: 30px; }
      h2 { margin-top: 28px; font-size: 18px; }
      .muted { color: #6b7280; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
      .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; }
      .value { font-size: 28px; font-weight: 800; margin-top: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 9px; text-align: left; font-size: 13px; }
      th { background: #f3f4f6; }
      @page { margin: 0.55in; }
    </style>
  </head>
  <body>
    <p class="muted">Actify Attendance Tracker</p>
    <h1>${escapeHtml(facilityName)} Attendance Summary</h1>
    <p>${escapeHtml(summary.dayLabel)} · Week of ${escapeHtml(summary.weekLabel)} · ${escapeHtml(summary.monthLabel)}</p>
    <div class="grid">
      <div class="card"><div class="muted">Daily Participation</div><div class="value">${escapeHtml(formatRangeSummary(summary.daily))}</div></div>
      <div class="card"><div class="muted">Weekly Participation</div><div class="value">${escapeHtml(formatRangeSummary(summary.weekly))}</div></div>
      <div class="card"><div class="muted">Monthly Participation</div><div class="value">${escapeHtml(formatRangeSummary(summary.monthly))}</div></div>
    </div>
    <h2>State-ready counts</h2>
    <table>
      <thead><tr><th>Range</th><th>Group attendance</th><th>1:1 visits</th><th>Total participation marks</th></tr></thead>
      <tbody>
        <tr><td>Daily</td><td>${summary.daily.groupAttendanceCount}</td><td>${summary.daily.oneToOneVisitCount}</td><td>${summary.daily.totalParticipationMarks}</td></tr>
        <tr><td>Weekly</td><td>${summary.weekly.groupAttendanceCount}</td><td>${summary.weekly.oneToOneVisitCount}</td><td>${summary.weekly.totalParticipationMarks}</td></tr>
        <tr><td>Monthly</td><td>${summary.monthly.groupAttendanceCount}</td><td>${summary.monthly.oneToOneVisitCount}</td><td>${summary.monthly.totalParticipationMarks}</td></tr>
      </tbody>
    </table>
    <h2>Residents not participated this week</h2>
    <table>
      <thead><tr><th>Name</th><th>Room</th><th>Unit</th></tr></thead>
      <tbody>${notSeenRows}</tbody>
    </table>
  </body>
</html>`;
}

function MetricCard({ label, value, helpText, secondaryValue, valueClassName, icon: Icon, tone }: MetricCardProps) {
  return (
    <Card className="overflow-hidden border-white/70 bg-white/85 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={cn("mt-2 text-3xl font-bold tracking-tight text-slate-950", valueClassName)}>{value}</p>
            {secondaryValue ? <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{secondaryValue}</p> : null}
            {helpText ? <p className="mt-2 text-sm leading-5 text-slate-500">{helpText}</p> : null}
          </div>
          <div className={cn("rounded-2xl p-3 text-white shadow-sm", tone)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
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
  const [oneToOneSearch, setOneToOneSearch] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [loggingResidentId, setLoggingResidentId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AttendanceSection>("overview");
  const groupSearchInputRef = useRef<HTMLInputElement>(null);
  const oneToOneSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDateKey(initialData.dateKey);
    setSessions(initialData.sessions);
    setSelectedSessionId(initialData.selectedSessionId);
    setEntriesByResidentId(cloneEntries(initialData.entriesByResidentId));
    setBaselineEntriesByResidentId(cloneEntries(initialData.entriesByResidentId));
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

  const selectedSession = useMemo(() => {
    return groupSessions.find((session) => session.id === selectedSessionId) ?? groupSessions[0] ?? null;
  }, [groupSessions, selectedSessionId]);

  const groupSearchQuery = residentSearch.trim().toLowerCase();
  const oneToOneSearchQuery = oneToOneSearch.trim().toLowerCase();

  const visibleGroupResidents = useMemo(() => {
    return initialData.residents.filter((resident) => matchesResidentSearch(resident, groupSearchQuery));
  }, [groupSearchQuery, initialData.residents]);

  const visibleOneToOneResidents = useMemo(() => {
    return initialData.residents.filter((resident) => matchesResidentSearch(resident, oneToOneSearchQuery)).slice(0, 10);
  }, [oneToOneSearchQuery, initialData.residents]);

  const presentCount = useMemo(() => {
    return initialData.residents.reduce((count, resident) => {
      return statusFromEntries(entriesByResidentId, resident.id) === "PRESENT" ? count + 1 : count;
    }, 0);
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

  async function saveGroupAttendance() {
    if (!selectedSession) {
      toast({
        title: "Select a group activity",
        description: "Choose a scheduled activity before saving attendance.",
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
      const response = await authorizedFetch("/api/attendance/quick-take", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          entries: initialData.residents.flatMap((resident) => {
            const currentStatus = statusFromEntries(entriesByResidentId, resident.id);
            const baselineStatus = statusFromEntries(baselineEntriesByResidentId, resident.id);
            const shouldPersist = currentStatus === "PRESENT" || currentStatus !== baselineStatus;

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
          })
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save attendance.");
      }

      toast({
        title: "Attendance saved",
        description: "Group participation was saved for this activity."
      });
      setBaselineEntriesByResidentId(cloneEntries(entriesByResidentId));
      router.refresh();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSavingGroup(false);
    }
  }

  async function logOneToOne(residentId: string) {
    if (!canEdit) {
      toast({
        title: "Read-only access",
        description: "You do not have permission to log visits.",
        variant: "destructive"
      });
      return;
    }

    setLoggingResidentId(residentId);
    try {
      const response = await authorizedFetch("/api/attendance/one-to-one", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          residentId,
          dateKey
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not log 1:1 visit.");
      }

      toast({
        title: "1:1 visit logged",
        description: `${body?.result?.resident?.name ?? "Resident"} now counts toward participation for ${summary.dayLabel}.`
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not log 1:1",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoggingResidentId(null);
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

    printWindow.document.write(buildPrintHtml({ summary, facilityName }));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(77,208,225,0.14),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute right-8 top-6 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-300 via-indigo-300 to-fuchsia-300 opacity-25 blur-2xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <Badge variant="outline" className="border-cyan-200 bg-cyan-50/80 text-cyan-800">
                  Attendance
                </Badge>
                <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">Attendance Tracker</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Track daily group and 1:1 participation with simple state-ready statistics.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_auto] lg:min-w-[580px]">
                <label className="text-sm font-semibold text-slate-600">
                  Selected date
                  <Input
                    type="date"
                    value={dateKey}
                    onChange={(event) => updateDate(event.target.value)}
                    className="mt-2 bg-white"
                  />
                </label>
                <div className="grid gap-2 self-end sm:grid-cols-3">
                  <Button type="button" className="bg-blue-600 text-white hover:bg-blue-500" onClick={() => openSection("take")}>
                    <ClipboardCheck className="h-4 w-4" />
                    Take Attendance
                  </Button>
                  <Button type="button" variant="outline" className="bg-white/90" onClick={() => openSection("oneToOne")}>
                    <UserRoundCheck className="h-4 w-4" />
                    Log 1:1 Visit
                  </Button>
                  <Button type="button" variant="outline" className="bg-white/90" onClick={() => openSection("reports")}>
                    <Download className="h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </div>
            </div>
            <nav className="relative mt-7 rounded-2xl border border-slate-200 bg-slate-100/70 p-1" aria-label="Attendance sections" role="tablist">
              <div className="grid gap-1 sm:grid-cols-4">
                {ATTENDANCE_SECTIONS.map((section) => {
                  const selected = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={cn(
                        "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                        selected
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-600 hover:bg-white/60 hover:text-slate-950"
                      )}
                      onClick={() => setActiveSection(section.id)}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </section>

        {activeSection === "overview" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" aria-label="Participation statistics">
              <MetricCard
                label="Today’s Participation"
                value={`${summary.daily.participatedResidentCount} / ${summary.activeResidentCount} residents`}
                secondaryValue={formatPercent(summary.daily.participationPercent)}
                valueClassName="text-2xl"
                icon={CalendarCheck2}
                tone="bg-gradient-to-br from-cyan-500 to-blue-500"
              />
              <MetricCard
                label="This Week"
                value={`${summary.weekly.participatedResidentCount} / ${summary.activeResidentCount} residents`}
                secondaryValue={formatPercent(summary.weekly.participationPercent)}
                valueClassName="text-2xl"
                icon={BarChart3}
                tone="bg-gradient-to-br from-indigo-500 to-violet-500"
              />
              <MetricCard
                label="This Month"
                value={`${summary.monthly.participatedResidentCount} / ${summary.activeResidentCount} residents`}
                secondaryValue={formatPercent(summary.monthly.participationPercent)}
                valueClassName="text-2xl"
                icon={FileText}
                tone="bg-gradient-to-br from-fuchsia-500 to-rose-500"
              />
              <MetricCard
                label="Group Attendance"
                value={`${summary.monthly.groupAttendanceCount} group check-ins this month`}
                valueClassName="text-2xl"
                icon={Users}
                tone="bg-gradient-to-br from-emerald-500 to-teal-500"
              />
              <MetricCard
                label="1:1 Visits"
                value={String(summary.daily.oneToOneVisitCount)}
                helpText="Simple 1:1 participation records today"
                icon={UserRoundCheck}
                tone="bg-gradient-to-br from-orange-400 to-pink-500"
              />
              <MetricCard
                label="Not Seen This Week"
                value={String(summary.residentsNotSeenThisWeek.length)}
                helpText="Active residents without participation this week"
                icon={UserX}
                tone="bg-gradient-to-br from-slate-600 to-slate-900"
              />
            </section>

            <Card className="border-white/80 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <UserX className="h-6 w-6 text-slate-700" />
                  Not participated this week
                </CardTitle>
                <CardDescription>{summary.weekLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.residentsNotSeenThisWeek.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {summary.residentsNotSeenThisWeek.slice(0, 12).map((resident) => (
                      <div key={resident.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{resident.name}</p>
                          <p className="text-xs text-slate-500">
                            Room {resident.room}
                            {resident.unitName ? ` · ${resident.unitName}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          Not seen
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
                    Every active resident has a participation mark this week.
                  </div>
                )}
                {summary.residentsNotSeenThisWeek.length > 12 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Showing 12 of {summary.residentsNotSeenThisWeek.length}. Open Reports to export the full list.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : null}

        {activeSection === "take" ? (
          <Card className="border-white/80 bg-white/90 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ClipboardCheck className="h-6 w-6 text-cyan-600" />
                    Group attendance
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Select a calendar activity, mark residents present, then save. Only present marks are shown here.
                  </CardDescription>
                </div>
                <div className="min-w-[260px]">
                  <Select value={selectedSession?.id ?? ""} onValueChange={updateSelectedSession} disabled={groupSessions.length === 0}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {formatTime(session.startAt, timeZone)} · {session.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSession ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {selectedSession.location || "Activity room"} · {presentCount} present
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No group activities are scheduled for this date.</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={groupSearchInputRef}
                  value={residentSearch}
                  onChange={(event) => setResidentSearch(event.target.value)}
                  placeholder="Search resident by name, room, or unit..."
                  className="bg-white pl-9"
                />
              </div>

              <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-100 bg-slate-50/70">
                {selectedSession ? (
                  <div className="divide-y divide-slate-100">
                    {visibleGroupResidents.map((resident) => {
                      const status = statusFromEntries(entriesByResidentId, resident.id);
                      const checked = status === "PRESENT";
                      const hasOtherStatus = status !== "CLEAR" && status !== "PRESENT";
                      return (
                        <label
                          key={resident.id}
                          className="flex cursor-pointer items-center gap-4 bg-white/75 px-4 py-3 transition hover:bg-white"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => setResidentPresent(resident.id, nextChecked === true)}
                            disabled={!canEdit || savingGroup}
                            aria-label={`Mark ${residentName(resident)} present`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-950">{residentName(resident)}</span>
                            <span className="block text-xs text-slate-500">
                              Room {resident.room}
                              {resident.unitName ? ` · ${resident.unitName}` : ""}
                            </span>
                          </span>
                          {checked ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
                              Present
                            </Badge>
                          ) : hasOtherStatus ? (
                            <Badge className="border-slate-200 bg-slate-100 text-slate-600" variant="outline">
                              Already marked
                            </Badge>
                          ) : null}
                        </label>
                      );
                    })}
                    {visibleGroupResidents.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">No residents match that search.</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <CalendarCheck2 className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">No group activity selected</p>
                    <p className="mt-1 text-sm text-slate-500">Add an activity to the calendar for this date, then attendance can be saved here.</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  {presentCount} marked present · {initialData.residents.length} active residents in roster
                </p>
                <Button type="button" onClick={saveGroupAttendance} disabled={!selectedSession || savingGroup || !canEdit}>
                  {savingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "oneToOne" ? (
          <Card className="border-white/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UserCheck className="h-6 w-6 text-fuchsia-600" />
                Log simple 1:1 visits
              </CardTitle>
              <CardDescription>Search a resident and click Log 1:1. This saves an ACTIVE participation record for the selected date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={oneToOneSearchInputRef}
                  value={oneToOneSearch}
                  onChange={(event) => setOneToOneSearch(event.target.value)}
                  placeholder="Search resident..."
                  className="bg-white pl-9"
                />
              </div>
              <div className="space-y-2">
                {visibleOneToOneResidents.map((resident) => (
                  <div key={resident.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">{residentName(resident)}</p>
                      <p className="text-xs text-slate-500">
                        Room {resident.room}
                        {resident.unitName ? ` · ${resident.unitName}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-white"
                      disabled={!canEdit || loggingResidentId === resident.id}
                      onClick={() => logOneToOne(resident.id)}
                    >
                      {loggingResidentId === resident.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}
                      Log 1:1
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "reports" ? (
          <Card className="border-white/80 bg-white/90 shadow-sm">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl">State-ready summary</CardTitle>
                <CardDescription>
                  Basic statistics only: date range, counts, percentages, and residents without participation. No clinical detail.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="bg-white" onClick={printSummary}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button type="button" variant="outline" className="bg-white" onClick={exportCsv}>
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">Today</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{formatRangeSummary(summary.daily)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.daily.groupAttendanceCount} group · {summary.daily.oneToOneVisitCount} 1:1
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">This week</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{formatRangeSummary(summary.weekly)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.weekly.groupAttendanceCount} group · {summary.weekly.oneToOneVisitCount} 1:1
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">This month</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{formatRangeSummary(summary.monthly)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.monthly.groupAttendanceCount} group · {summary.monthly.oneToOneVisitCount} 1:1
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
