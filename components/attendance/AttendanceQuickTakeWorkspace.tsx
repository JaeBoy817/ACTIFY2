"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, MoonStar, UserRoundX, UsersRound } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AttendanceResidentListVirtual } from "@/components/attendance/AttendanceResidentListVirtual";
import { AttendanceTopBar } from "@/components/attendance/AttendanceTopBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDevRenderTrace } from "@/lib/perf/devRenderTrace";
import type { AttendanceEntriesMap, AttendanceQuickTakePayload } from "@/lib/attendance-tracker/types";
import { useToast } from "@/lib/use-toast";

function cloneEntries(entries: AttendanceEntriesMap): AttendanceEntriesMap {
  return JSON.parse(JSON.stringify(entries)) as AttendanceEntriesMap;
}

function countStatuses(entriesByResidentId: AttendanceEntriesMap, residentIds: string[]) {
  const counts = {
    present: 0,
    refused: 0,
    asleep: 0,
    outOfRoom: 0,
    oneToOne: 0,
    notApplicable: 0
  };

  for (const residentId of residentIds) {
    const status = entriesByResidentId[residentId]?.status ?? "CLEAR";
    if (status === "PRESENT") counts.present += 1;
    if (status === "REFUSED") counts.refused += 1;
    if (status === "ASLEEP") counts.asleep += 1;
    if (status === "OUT_OF_ROOM") counts.outOfRoom += 1;
    if (status === "ONE_TO_ONE") counts.oneToOne += 1;
    if (status === "NOT_APPLICABLE") counts.notApplicable += 1;
  }

  return counts;
}

export function AttendanceQuickTakeWorkspace({
  initialData,
  canEdit
}: {
  initialData: AttendanceQuickTakePayload;
  canEdit: boolean;
}) {
  useDevRenderTrace("AttendanceQuickTakeWorkspace", {
    every: 10,
    details: { residents: initialData.residents.length, sessions: initialData.sessions.length }
  });

  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [dateKey, setDateKey] = useState(initialData.dateKey);
  const [sessions, setSessions] = useState(initialData.sessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialData.selectedSessionId);
  const [residents, setResidents] = useState(initialData.residents);
  const [entriesByResidentId, setEntriesByResidentId] = useState<AttendanceEntriesMap>(cloneEntries(initialData.entriesByResidentId));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityQuery, setActivityQuery] = useState("");
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [focusedResidentId, setFocusedResidentId] = useState<string | null>(initialData.residents[0]?.id ?? null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (locationFilter !== "all" && session.location !== locationFilter) return false;
      if (!activityQuery.trim()) return true;
      return session.title.toLowerCase().includes(activityQuery.trim().toLowerCase());
    });
  }, [activityQuery, locationFilter, sessions]);

  useEffect(() => {
    if (filteredSessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    if (!selectedSessionId || !filteredSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(filteredSessions[0].id);
    }
  }, [filteredSessions, selectedSessionId]);

  const visibleResidents = useMemo(() => {
    return residents.filter((resident) => {
      if (unitFilter !== "all" && resident.unitName !== unitFilter) return false;
      if (!deferredSearch) return true;
      const haystack = `${resident.firstName} ${resident.lastName} ${resident.room} ${resident.residentStatus}`.toLowerCase();
      return haystack.includes(deferredSearch);
    });
  }, [deferredSearch, residents, unitFilter]);

  const counts = useMemo(
    () => countStatuses(entriesByResidentId, visibleResidents.map((resident) => resident.id)),
    [entriesByResidentId, visibleResidents]
  );

  const unitOptions = useMemo(() => {
    return Array.from(new Set(residents.map((resident) => resident.unitName).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  }, [residents]);

  const locationOptions = useMemo(() => {
    return Array.from(new Set(sessions.map((session) => session.location).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

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
    setLoading(true);
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
        throw new Error(body?.error ?? "Could not load attendance workspace.");
      }
      const payload = body as AttendanceQuickTakePayload;
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
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedSessionId || !canEdit) return;
    setSaving(true);
    try {
      const payload = {
        sessionId: selectedSessionId,
        entries: residents.map((resident) => ({
          residentId: resident.id,
          status: entriesByResidentId[resident.id]?.status ?? "CLEAR",
          notes: entriesByResidentId[resident.id]?.notes ?? null
        }))
      };
      const response = await authorizedFetch("/api/attendance/quick-take", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
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
        description: "Entries were updated."
      });
      router.prefetch("/app/attendance/sessions");
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

  function handleClear() {
    setEntriesByResidentId((previous) => {
      const next = { ...previous };
      for (const resident of visibleResidents) {
        next[resident.id] = {
          status: "CLEAR",
          notes: next[resident.id]?.notes ?? null
        };
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <AttendanceTopBar
        dateKey={dateKey}
        onDateChange={(nextDate) => {
          setDateKey(nextDate);
          void loadQuickTake(nextDate);
        }}
        activityQuery={activityQuery}
        onActivityQueryChange={setActivityQuery}
        sessions={filteredSessions}
        selectedSessionId={selectedSessionId}
        onSessionChange={(sessionId) => {
          setSelectedSessionId(sessionId);
          void loadQuickTake(dateKey, sessionId);
        }}
        unitFilter={unitFilter}
        onUnitFilterChange={setUnitFilter}
        unitOptions={unitOptions}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        locationOptions={locationOptions}
        disabled={loading || saving || !canEdit}
        onSave={handleSave}
        onClear={handleClear}
      />

      <Card className="glass-panel rounded-2xl border-white/15">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[var(--font-display)] text-xl">Quick Take</h2>
              {loading ? (
                <Badge variant="outline" className="border-white/40 bg-white/70">
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Loading
                </Badge>
              ) : null}
              {saving ? (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700">
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Saving
                </Badge>
              ) : null}
              {lastSavedAt ? (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700">
                  Saved {lastSavedAt}
                </Badge>
              ) : null}
            </div>

            <label className="text-sm">
              <span className="sr-only">Search residents</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search residents"
                className="h-10 w-64 rounded-md border border-white/35 bg-white/80 px-3 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <StatChip icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" />} label="Present" value={counts.present} />
            <StatChip icon={<UserRoundX className="h-4 w-4 text-rose-700" />} label="Refused" value={counts.refused} />
            <StatChip icon={<MoonStar className="h-4 w-4 text-indigo-700" />} label="Asleep" value={counts.asleep} />
            <StatChip icon={<Clock3 className="h-4 w-4 text-amber-700" />} label="Out of Room" value={counts.outOfRoom} />
            <StatChip icon={<UsersRound className="h-4 w-4 text-sky-700" />} label="1:1" value={counts.oneToOne} />
            <StatChip icon={<Clock3 className="h-4 w-4 text-slate-700" />} label="N/A" value={counts.notApplicable} />
          </div>

          <AttendanceResidentListVirtual
            residents={visibleResidents}
            entriesByResidentId={entriesByResidentId}
            focusedResidentId={focusedResidentId}
            onFocusResident={setFocusedResidentId}
            onSetResidentStatus={({ residentId, status }) => {
              setEntriesByResidentId((previous) => ({
                ...previous,
                [residentId]: {
                  status,
                  notes: previous[residentId]?.notes ?? null
                }
              }));
            }}
            disabled={loading || saving || !canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/25 bg-white/65 p-2.5">
      <p className="inline-flex items-center gap-1 text-xs font-medium text-foreground/75">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
