"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, TrendingUp, UserRound } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  AttendanceQuickResident,
  ResidentAttendanceSummaryPayload
} from "@/lib/attendance-tracker/types";
import { quickStatusLabel } from "@/lib/attendance-tracker/status";
import { useToast } from "@/lib/use-toast";

function TotalsCard({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/25 bg-white/65 p-3">
      <p className="text-xs uppercase tracking-wide text-foreground/65">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function AttendanceResidentsWorkspace({
  residents,
  initialResidentId,
  initialSummary
}: {
  residents: AttendanceQuickResident[];
  initialResidentId: string | null;
  initialSummary: ResidentAttendanceSummaryPayload | null;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [selectedResidentId, setSelectedResidentId] = useState<string>(initialResidentId ?? residents[0]?.id ?? "");
  const [summary, setSummary] = useState<ResidentAttendanceSummaryPayload | null>(initialSummary);
  const [loading, setLoading] = useState(false);

  const selectedResident = useMemo(
    () => residents.find((resident) => resident.id === selectedResidentId) ?? null,
    [residents, selectedResidentId]
  );

  const authorizedFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
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
    },
    [getToken]
  );

  useEffect(() => {
    if (!selectedResidentId) return;
    if (initialSummary && initialSummary.resident.id === selectedResidentId) return;

    let canceled = false;
    setLoading(true);
    authorizedFetch(`/api/attendance/residents/${encodeURIComponent(selectedResidentId)}/summary`, {
      cache: "no-store"
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Could not load resident attendance summary.");
        return body as ResidentAttendanceSummaryPayload;
      })
      .then((payload) => {
        if (canceled) return;
        setSummary(payload);
      })
      .catch((error) => {
        if (canceled) return;
        toast({
          title: "Could not load resident",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [authorizedFetch, initialSummary, selectedResidentId, toast]);

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/15">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label className="text-sm">
              Resident
              <select
                value={selectedResidentId}
                onChange={(event) => setSelectedResidentId(event.target.value)}
                className="mt-1 h-10 min-w-[280px] rounded-md border border-white/35 bg-white/80 px-3 text-sm"
              >
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.lastName}, {resident.firstName} · Room {resident.room}
                  </option>
                ))}
              </select>
            </label>
            {selectedResident ? (
              <Button asChild>
                <a href={`/api/attendance/residents/${encodeURIComponent(selectedResident.id)}/export`}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Export CSV
                </a>
              </Button>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading resident attendance...</p>
          ) : null}
          {summary ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-white/35 bg-white/70">
                  <UserRound className="mr-1 h-3.5 w-3.5" />
                  {summary.resident.name} · Room {summary.resident.room}
                </Badge>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700">
                  <TrendingUp className="mr-1 h-3.5 w-3.5" />
                  Last 30 entries: {summary.summary30.totalEntries}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TotalsCard label="Present (7d)" value={summary.summary7.present} />
                <TotalsCard label="1:1 (7d)" value={summary.summary7.oneToOne} />
                <TotalsCard label="Present (30d)" value={summary.summary30.present} />
                <TotalsCard label="Refused (30d)" value={summary.summary30.refused} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-xl border border-white/25 bg-white/55 p-3">
                  <h3 className="font-semibold text-foreground">Recent Session Statuses</h3>
                  <div className="mt-2 max-h-[360px] overflow-auto rounded-lg border border-white/20 bg-white/50">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white/80">
                        <tr className="text-left text-xs uppercase tracking-wide text-foreground/60">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Activity</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.sessions.map((row) => (
                          <tr key={row.id} className="border-t border-white/20">
                            <td className="px-3 py-2 text-xs text-muted-foreground">{row.dateLabel}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{row.title}</p>
                              <p className="text-xs text-muted-foreground">{row.location}</p>
                            </td>
                            <td className="px-3 py-2 text-xs">{quickStatusLabel(row.status)}</td>
                          </tr>
                        ))}
                        {summary.sessions.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={3}>
                              No sessions on record.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-white/25 bg-white/55 p-3">
                  <h3 className="font-semibold text-foreground">Most Attended Activities</h3>
                  <div className="mt-2 space-y-2">
                    {summary.topActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No attendance patterns yet.</p>
                    ) : (
                      summary.topActivities.map((activity) => (
                        <div key={activity.title} className="rounded-lg border border-white/20 bg-white/65 px-3 py-2">
                          <p className="font-medium text-foreground">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.count} attendance marks</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a resident to see attendance trends.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
