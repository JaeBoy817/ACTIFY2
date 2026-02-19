"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";

import { AttendanceFilters, type AttendanceSessionFiltersState } from "@/components/attendance/AttendanceFilters";
import { AttendanceResidentListVirtual } from "@/components/attendance/AttendanceResidentListVirtual";
import { AttendanceSessionList } from "@/components/attendance/AttendanceSessionList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  AttendanceEntriesMap,
  AttendanceSessionDetail,
  AttendanceSessionSummary
} from "@/lib/attendance-tracker/types";
import { useToast } from "@/lib/use-toast";

function cloneEntries(entries: AttendanceEntriesMap): AttendanceEntriesMap {
  return JSON.parse(JSON.stringify(entries)) as AttendanceEntriesMap;
}

export function AttendanceSessionsWorkspace({
  initialSessions,
  initialLocations,
  initialFilters,
  canEdit
}: {
  initialSessions: AttendanceSessionSummary[];
  initialLocations: string[];
  initialFilters: AttendanceSessionFiltersState;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AttendanceSessionFiltersState>(initialFilters);
  const [sessions, setSessions] = useState<AttendanceSessionSummary[]>(initialSessions);
  const [locations, setLocations] = useState<string[]>(initialLocations);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessions[0]?.id ?? null);
  const [selectedDetail, setSelectedDetail] = useState<AttendanceSessionDetail | null>(null);
  const [entriesByResidentId, setEntriesByResidentId] = useState<AttendanceEntriesMap>({});
  const [focusedResidentId, setFocusedResidentId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const residentCount = selectedDetail?.residents.length ?? 0;
  const markedCount = useMemo(
    () => Object.values(entriesByResidentId).filter((entry) => entry.status !== "CLEAR").length,
    [entriesByResidentId]
  );

  async function loadFilters() {
    setLoadingList(true);
    try {
      const url = new URL("/api/attendance/sessions", window.location.origin);
      if (filters.from) url.searchParams.set("from", filters.from);
      if (filters.to) url.searchParams.set("to", filters.to);
      if (filters.activity.trim()) url.searchParams.set("activity", filters.activity.trim());
      if (filters.location !== "all") url.searchParams.set("location", filters.location);
      if (filters.hasNotes !== "all") url.searchParams.set("hasNotes", filters.hasNotes);

      const response = await fetch(url.toString(), { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not load sessions.");
      setSessions(body.sessions as AttendanceSessionSummary[]);
      setLocations(body.locations as string[]);
      const nextSessionId = (body.sessions as AttendanceSessionSummary[])[0]?.id ?? null;
      setSelectedSessionId(nextSessionId);
      setSelectedDetail(null);
      setEntriesByResidentId({});
      if (nextSessionId) {
        await loadSessionDetail(nextSessionId);
      }
    } catch (error) {
      toast({
        title: "Filter failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingList(false);
    }
  }

  async function loadSessionDetail(sessionId: string) {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/attendance/sessions/${encodeURIComponent(sessionId)}`, {
        cache: "no-store"
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not load session.");
      const detail = body as AttendanceSessionDetail;
      setSelectedDetail(detail);
      setEntriesByResidentId(cloneEntries(detail.entriesByResidentId));
      setFocusedResidentId(detail.residents[0]?.id ?? null);
    } catch (error) {
      toast({
        title: "Could not load session",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function saveSession() {
    if (!selectedSessionId || !selectedDetail || !canEdit) return;
    setSaving(true);
    try {
      const response = await fetch("/api/attendance/quick-take", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          entries: selectedDetail.residents.map((resident) => ({
            residentId: resident.id,
            status: entriesByResidentId[resident.id]?.status ?? "CLEAR",
            notes: entriesByResidentId[resident.id]?.notes ?? null
          }))
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not save session.");

      toast({
        title: "Session saved",
        description: "Attendance updates were applied."
      });
      await loadSessionDetail(selectedSessionId);
      await loadFilters();
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

  return (
    <div className="space-y-4">
      <AttendanceFilters
        value={filters}
        onChange={setFilters}
        locations={locations}
        onApply={loadFilters}
        loading={loadingList}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AttendanceSessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={(sessionId) => {
            setSelectedSessionId(sessionId);
            void loadSessionDetail(sessionId);
          }}
        />

        <Card className="glass-panel rounded-2xl border-white/15">
          <CardContent className="space-y-3 p-4">
            {!selectedSessionId ? (
              <p className="text-sm text-muted-foreground">Select a session to edit attendance.</p>
            ) : loadingDetail ? (
              <p className="text-sm text-muted-foreground">Loading session details...</p>
            ) : selectedDetail ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-[var(--font-display)] text-xl">{selectedDetail.session.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedDetail.session.startAt).toLocaleString()} · {selectedDetail.session.location}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-white/35 bg-white/70">
                      {markedCount} / {residentCount} marked
                    </Badge>
                    <Button type="button" onClick={saveSession} disabled={!canEdit || saving}>
                      <Save className="mr-1.5 h-4 w-4" />
                      {saving ? "Saving..." : "Save Session"}
                    </Button>
                  </div>
                </div>

                <AttendanceResidentListVirtual
                  residents={selectedDetail.residents}
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
                  disabled={!canEdit || saving}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Session data unavailable.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

