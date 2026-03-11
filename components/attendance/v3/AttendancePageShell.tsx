"use client";

import { useAuth } from "@clerk/nextjs";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { CalendarCheck2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";

import { AttendanceActivityRow } from "@/components/attendance/v3/AttendanceActivityRow";
import { AttendanceDetailPanel } from "@/components/attendance/v3/AttendanceDetailPanel";
import { AttendanceDarkSkeleton } from "@/components/attendance/v3/AttendanceDarkSkeleton";
import { AttendanceEmptyState } from "@/components/attendance/v3/AttendanceEmptyState";
import { AttendanceFilterBar } from "@/components/attendance/v3/AttendanceFilterBar";
import { AttendanceHeader } from "@/components/attendance/v3/AttendanceHeader";
import { AttendanceListShell } from "@/components/attendance/v3/AttendanceListShell";
import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";
import { AttendanceResidentRow } from "@/components/attendance/v3/AttendanceResidentRow";
import { AttendanceSummaryCards } from "@/components/attendance/v3/AttendanceSummaryCards";
import { AttendanceTabs } from "@/components/attendance/v3/AttendanceTabs";
import type {
  AttendanceMode,
  AttendancePageBootstrapData,
  AttendanceStatusFilter,
  AttendanceSummaryMetric
} from "@/components/attendance/v3/types";
import { toStatusFilterValue } from "@/components/attendance/v3/types";
import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";
import type { AttendanceEntriesMap, AttendanceSessionSummary } from "@/lib/attendance-tracker/types";
import { useToast } from "@/lib/use-toast";

function cloneEntries(entries: AttendanceEntriesMap): AttendanceEntriesMap {
  return JSON.parse(JSON.stringify(entries)) as AttendanceEntriesMap;
}

function statusFromEntry(entriesByResidentId: AttendanceEntriesMap, residentId: string): QuickAttendanceStatus {
  return entriesByResidentId[residentId]?.status ?? "CLEAR";
}

function matchesSessionStatusFilter(session: AttendanceSessionSummary, filter: AttendanceStatusFilter) {
  if (filter === "all") return true;
  if (filter === "not_started") return session.counts.totalEntries === 0;
  if (filter === "in_progress") return session.counts.totalEntries > 0 && session.completionPercent < 100;
  if (filter === "complete") return session.completionPercent >= 100;
  if (filter === "present") return session.counts.present + session.counts.oneToOne > 0;
  if (filter === "refused") return session.counts.refused > 0;
  if (filter === "asleep") return session.counts.asleep > 0;
  if (filter === "out_of_room") return session.counts.outOfRoom > 0;
  if (filter === "one_to_one") return session.counts.oneToOne > 0;
  if (filter === "not_applicable") return session.counts.notApplicable > 0;
  if (filter === "clear") return session.counts.totalEntries === 0;
  return true;
}

function sumSessionEntries(sessions: AttendanceSessionSummary[]) {
  return sessions.reduce(
    (acc, session) => {
      acc.total += session.counts.totalEntries;
      acc.supportive += session.counts.present + session.counts.oneToOne;
      acc.followUp += session.counts.refused + session.counts.asleep + session.counts.outOfRoom + session.counts.notApplicable;
      return acc;
    },
    { total: 0, supportive: 0, followUp: 0 }
  );
}

export function AttendancePageShell({
  initialData,
  canEdit
}: {
  initialData: AttendancePageBootstrapData;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<AttendanceMode>("today");
  const [dateKey, setDateKey] = useState(initialData.dateKey);
  const [sessions, setSessions] = useState(initialData.sessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialData.selectedSessionId ?? initialData.sessions[0]?.id ?? null
  );
  const [residents, setResidents] = useState(initialData.residents);
  const [entriesByResidentId, setEntriesByResidentId] = useState<AttendanceEntriesMap>(cloneEntries(initialData.entriesByResidentId));
  const [historySessions, setHistorySessions] = useState(initialData.historySessions);
  const [historyLocations, setHistoryLocations] = useState(initialData.historyLocations);
  const [historyFrom, setHistoryFrom] = useState(initialData.historyFrom);
  const [historyTo, setHistoryTo] = useState(initialData.historyTo);

  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>("all");
  const [loadingQuickTake, setLoadingQuickTake] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [focusedResidentId, setFocusedResidentId] = useState<string | null>(initialData.residents[0]?.id ?? null);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const residentScrollRef = useRef<HTMLDivElement>(null);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? historySessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [historySessions, selectedSessionId, sessions]);

  const unitOptions = useMemo(() => {
    return Array.from(new Set(residents.map((resident) => resident.unitName).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  }, [residents]);

  const locationOptions = useMemo(() => {
    return Array.from(new Set([...sessions, ...historySessions].map((session) => session.location).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [historySessions, sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (locationFilter !== "all" && session.location !== locationFilter) return false;
      if (!matchesSessionStatusFilter(session, statusFilter)) return false;
      if (!deferredQuery) return true;
      const haystack = `${session.title} ${session.location}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [deferredQuery, locationFilter, sessions, statusFilter]);

  const filteredHistorySessions = useMemo(() => {
    return historySessions.filter((session) => {
      if (locationFilter !== "all" && session.location !== locationFilter) return false;
      if (!matchesSessionStatusFilter(session, statusFilter)) return false;
      if (!deferredQuery) return true;
      const haystack = `${session.title} ${session.location} ${session.dateKey}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [deferredQuery, historySessions, locationFilter, statusFilter]);

  const visibleResidents = useMemo(() => {
    return residents.filter((resident) => {
      if (unitFilter !== "all" && resident.unitName !== unitFilter) return false;
      const status = statusFromEntry(entriesByResidentId, resident.id);
      if (statusFilter !== "all" && statusFilter !== toStatusFilterValue(status)) return false;
      if (!deferredQuery) return true;
      const haystack = `${resident.firstName} ${resident.lastName} ${resident.room} ${resident.unitName ?? ""}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [deferredQuery, entriesByResidentId, residents, statusFilter, unitFilter]);

  const residentVirtualizer = useVirtualizer({
    count: visibleResidents.length,
    getScrollElement: () => residentScrollRef.current,
    estimateSize: () => 112,
    overscan: 8
  });

  const todayCountSummary = useMemo(() => sumSessionEntries(sessions), [sessions]);
  const openSessions = useMemo(() => sessions.filter((session) => session.completionPercent < 100).length, [sessions]);
  const missingEntries = useMemo(() => {
    const totalPossible = sessions.length * residents.length;
    return Math.max(0, totalPossible - todayCountSummary.total);
  }, [residents.length, sessions.length, todayCountSummary.total]);
  const participationPercent = useMemo(() => {
    if (todayCountSummary.total <= 0) return 0;
    return (todayCountSummary.supportive / todayCountSummary.total) * 100;
  }, [todayCountSummary.supportive, todayCountSummary.total]);
  const markedCount = useMemo(() => {
    return visibleResidents.reduce((sum, resident) => sum + (statusFromEntry(entriesByResidentId, resident.id) === "CLEAR" ? 0 : 1), 0);
  }, [entriesByResidentId, visibleResidents]);
  const pendingCount = Math.max(0, visibleResidents.length - markedCount);

  const summaryMetrics: AttendanceSummaryMetric[] = useMemo(
    () => [
      {
        label: "Open Attendance Sessions",
        value: String(openSessions),
        helpText: `${sessions.length} scheduled session${sessions.length === 1 ? "" : "s"} today`,
        tone: "blue"
      },
      {
        label: "Residents Marked Today",
        value: String(todayCountSummary.total),
        helpText: "Across all sessions for selected day",
        tone: "sky"
      },
      {
        label: "Missing Entries",
        value: String(missingEntries),
        helpText: "Still incomplete and needing action",
        tone: "amber"
      },
      {
        label: "Participation Rate Today",
        value: `${participationPercent.toFixed(1)}%`,
        helpText: `${todayCountSummary.supportive} supportive marks`,
        tone: "emerald"
      }
    ],
    [missingEntries, openSessions, participationPercent, sessions.length, todayCountSummary.supportive, todayCountSummary.total]
  );

  const statusPreview = useMemo(() => {
    const unique = Array.from(
      new Set(
        visibleResidents
          .map((resident) => statusFromEntry(entriesByResidentId, resident.id))
          .filter((status) => status !== "CLEAR")
      )
    );
    return unique.slice(0, 6);
  }, [entriesByResidentId, visibleResidents]);

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

  async function loadQuickTake(nextDate: string, nextSessionId?: string | null) {
    setLoadingQuickTake(true);
    try {
      const url = new URL("/api/attendance/quick-take", window.location.origin);
      url.searchParams.set("date", nextDate);
      if (nextSessionId) {
        url.searchParams.set("sessionId", nextSessionId);
      }
      const response = await authorizedFetch(url.toString(), {
        method: "GET",
        cache: "no-store"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not load attendance sessions.");
      }

      const payload = body as AttendancePageBootstrapData;
      setDateKey(payload.dateKey);
      setSessions(payload.sessions);
      setSelectedSessionId(payload.selectedSessionId);
      setResidents(payload.residents);
      setEntriesByResidentId(cloneEntries(payload.entriesByResidentId));
      setFocusedResidentId(payload.residents[0]?.id ?? null);
    } catch (error) {
      toast({
        title: "Could not load attendance",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingQuickTake(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const url = new URL("/api/attendance/sessions", window.location.origin);
      if (historyFrom) url.searchParams.set("from", historyFrom);
      if (historyTo) url.searchParams.set("to", historyTo);
      if (deferredQuery) url.searchParams.set("activity", deferredQuery);
      if (locationFilter !== "all") url.searchParams.set("location", locationFilter);

      const response = await authorizedFetch(url.toString(), {
        method: "GET",
        cache: "no-store"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not load attendance history.");
      }
      setHistorySessions((body.sessions as AttendanceSessionSummary[]) ?? []);
      setHistoryLocations((body.locations as string[]) ?? []);
    } catch (error) {
      toast({
        title: "Could not load history",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  }

  async function openHistorySession(session: AttendanceSessionSummary) {
    setSelectedSessionId(session.id);
    setMode("resident");
    await loadQuickTake(session.dateKey, session.id);
  }

  async function handleSave() {
    if (!selectedSessionId || !canEdit) return;
    setSaving(true);
    try {
      const payload = {
        sessionId: selectedSessionId,
        entries: residents.map((resident) => ({
          residentId: resident.id,
          status: statusFromEntry(entriesByResidentId, resident.id),
          notes: entriesByResidentId[resident.id]?.notes ?? null
        }))
      };
      const response = await authorizedFetch("/api/attendance/quick-take", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          const redirectUrl = `${window.location.pathname}${window.location.search}`;
          window.location.href = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
          return;
        }
        throw new Error(body?.error ?? "Could not save attendance.");
      }

      setLastSavedAt(new Date().toLocaleTimeString());
      toast({
        title: "Attendance saved",
        description: "Session entries were updated."
      });
      router.prefetch("/app/attendance/reports");
      router.prefetch("/app/attendance/sessions");
      void loadQuickTake(dateKey, selectedSessionId);
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const monthKey = dateKey.slice(0, 7);
      const response = await authorizedFetch(`/api/attendance/reports/monthly?month=${encodeURIComponent(monthKey)}&format=csv`, {
        cache: "no-store"
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Could not export attendance.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `attendance-summary-${monthKey}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  }

  function markAllPresent() {
    setEntriesByResidentId((previous) => {
      const next = { ...previous };
      for (const resident of visibleResidents) {
        next[resident.id] = {
          status: "PRESENT",
          notes: previous[resident.id]?.notes ?? null
        };
      }
      return next;
    });
  }

  function clearVisible() {
    setEntriesByResidentId((previous) => {
      const next = { ...previous };
      for (const resident of visibleResidents) {
        next[resident.id] = {
          status: "CLEAR",
          notes: previous[resident.id]?.notes ?? null
        };
      }
      return next;
    });
  }

  const listTitle =
    mode === "resident"
      ? "Resident Attendance Roster"
      : mode === "history"
        ? "Attendance History"
        : mode === "activity"
          ? "Activity Sessions"
          : "Today's Sessions";

  const listSubtitle =
    mode === "resident"
      ? "Mark resident status quickly and keep documentation moving."
      : mode === "history"
        ? "Review and reopen attendance sessions from prior days."
        : "Review scheduled sessions, completion state, and follow-up actions.";

  return (
    <div className="-mx-2 -mt-4 min-h-[calc(100vh-5.5rem)] bg-transparent px-2 pb-6 pt-4 md:-mx-3 md:px-3">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1180px_520px_at_-8%_0%,rgba(56,189,248,0.16),transparent_62%),radial-gradient(860px_420px_at_95%_0%,rgba(139,92,246,0.22),transparent_62%),radial-gradient(740px_360px_at_40%_100%,rgba(59,130,246,0.14),transparent_72%)]" />

        <div className="relative z-10 space-y-4">
          <AttendanceHeader searchValue={query} onSearchChange={setQuery} />
          <AttendanceTabs mode={mode} onChange={setMode} />

          <AttendanceSummaryCards metrics={summaryMetrics} />

          <AttendanceFilterBar
            searchValue={query}
            onSearchChange={setQuery}
            dateKey={dateKey}
            onDateChange={(nextDate) => {
              setDateKey(nextDate);
              void loadQuickTake(nextDate);
            }}
            unitFilter={unitFilter}
            onUnitFilterChange={setUnitFilter}
            unitOptions={unitOptions}
            locationFilter={locationFilter}
            onLocationFilterChange={setLocationFilter}
            locationOptions={Array.from(new Set([...locationOptions, ...historyLocations]))}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            loading={loadingQuickTake || loadingHistory}
            exporting={exporting}
            onReload={() => {
              if (mode === "history") {
                void loadHistory();
                return;
              }
              void loadQuickTake(dateKey, selectedSessionId);
            }}
            onExport={handleExportCsv}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <AttendanceListShell
              title={listTitle}
              subtitle={listSubtitle}
              actions={
                <>
                  <AttendanceQuickActionButton
                    label={loadingQuickTake ? "Refreshing..." : "Refresh Sessions"}
                    icon={Loader2}
                    tone="neutral"
                    onClick={() => void loadQuickTake(dateKey, selectedSessionId)}
                    disabled={loadingQuickTake}
                  />
                  <AttendanceQuickActionButton
                    label={mode === "resident" ? "Back to Activity" : "Resident Mode"}
                    icon={CalendarCheck2}
                    tone="sky"
                    onClick={() => setMode(mode === "resident" ? "activity" : "resident")}
                  />
                </>
              }
            >
              {loadingQuickTake && mode !== "history" ? (
                <div className="space-y-3">
                  <AttendanceDarkSkeleton className="h-28" />
                  <AttendanceDarkSkeleton className="h-28" />
                  <AttendanceDarkSkeleton className="h-28" />
                </div>
              ) : null}

              {!loadingQuickTake && mode !== "resident" && mode !== "history" ? (
                filteredSessions.length === 0 ? (
                  <AttendanceEmptyState
                    title="No sessions for this view"
                    description="Try another date or loosen filters. Attendance sessions from Calendar will appear here."
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredSessions.map((session) => (
                      <AttendanceActivityRow
                        key={session.id}
                        session={session}
                        selected={selectedSessionId === session.id}
                        onOpen={() => {
                          setSelectedSessionId(session.id);
                          void loadQuickTake(dateKey, session.id);
                        }}
                        onContinue={() => {
                          setMode("resident");
                          setSelectedSessionId(session.id);
                          void loadQuickTake(dateKey, session.id);
                        }}
                      />
                    ))}
                  </div>
                )
              ) : null}

              {!loadingQuickTake && mode === "resident" ? (
                visibleResidents.length === 0 ? (
                  <AttendanceEmptyState
                    title="No residents match these filters"
                    description="Try clearing filters or switching sessions."
                  />
                ) : (
                  <div
                    ref={residentScrollRef}
                    className="h-[66vh] min-h-[420px] overflow-auto rounded-2xl border border-[#22375c] bg-[#091224] p-2"
                  >
                    <div
                      style={{
                        height: `${residentVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative"
                      }}
                    >
                      {residentVirtualizer.getVirtualItems().map((virtualRow) => {
                        const resident = visibleResidents[virtualRow.index];
                        if (!resident) return null;
                        return (
                          <div
                            key={resident.id}
                            className="px-1 py-1"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              transform: `translateY(${virtualRow.start}px)`
                            }}
                          >
                            <AttendanceResidentRow
                              resident={resident}
                              status={statusFromEntry(entriesByResidentId, resident.id)}
                              selected={focusedResidentId === resident.id}
                              disabled={!canEdit || saving}
                              onFocus={() => setFocusedResidentId(resident.id)}
                              onStatusChange={(nextStatus) => {
                                setEntriesByResidentId((previous) => ({
                                  ...previous,
                                  [resident.id]: {
                                    status: nextStatus,
                                    notes: previous[resident.id]?.notes ?? null
                                  }
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : null}

              {mode === "history" ? (
                loadingHistory ? (
                  <div className="space-y-3">
                    <AttendanceDarkSkeleton className="h-24" />
                    <AttendanceDarkSkeleton className="h-24" />
                    <AttendanceDarkSkeleton className="h-24" />
                  </div>
                ) : filteredHistorySessions.length === 0 ? (
                  <AttendanceEmptyState
                    title="No history sessions found"
                    description="Try updating date range filters or search terms."
                    actionLabel="Reload History"
                    onAction={() => void loadHistory()}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#21365a] bg-[#0d1a31] p-3">
                      <label className="text-xs text-[#9eb4d8]">
                        From
                        <input
                          type="date"
                          value={historyFrom}
                          onChange={(event) => setHistoryFrom(event.target.value)}
                          className="mt-1 h-9 rounded-lg border border-[#2f4269] bg-[#0f1d35] px-2 text-sm text-[#e0edff]"
                        />
                      </label>
                      <label className="text-xs text-[#9eb4d8]">
                        To
                        <input
                          type="date"
                          value={historyTo}
                          onChange={(event) => setHistoryTo(event.target.value)}
                          className="mt-1 h-9 rounded-lg border border-[#2f4269] bg-[#0f1d35] px-2 text-sm text-[#e0edff]"
                        />
                      </label>
                      <AttendanceQuickActionButton label="Apply Range" tone="blue" onClick={() => void loadHistory()} />
                    </div>
                    {filteredHistorySessions.map((session) => (
                      <AttendanceActivityRow
                        key={session.id}
                        session={session}
                        selected={selectedSessionId === session.id}
                        onOpen={() => {
                          void openHistorySession(session);
                        }}
                        onContinue={() => {
                          void openHistorySession(session);
                        }}
                      />
                    ))}
                  </div>
                )
              ) : null}
            </AttendanceListShell>

            <AttendanceDetailPanel
              mode={mode}
              selectedSession={selectedSession}
              residentsTotal={visibleResidents.length}
              markedCount={markedCount}
              pendingCount={pendingCount}
              saving={saving}
              canEdit={canEdit}
              onSave={handleSave}
              onMarkAllPresent={markAllPresent}
              onClearVisible={clearVisible}
              lastSavedAt={lastSavedAt}
              statusPreview={statusPreview}
            />
          </div>
          {todayCountSummary.followUp > 0 ? (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/12 px-4 py-3 text-sm text-amber-100">
              <span className="font-semibold">Needs review:</span> {todayCountSummary.followUp} attendance mark
              {todayCountSummary.followUp === 1 ? "" : "s"} indicate follow-up or documentation.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
