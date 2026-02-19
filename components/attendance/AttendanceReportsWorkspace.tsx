"use client";

import dynamic from "next/dynamic";
import { Download, FileBarChart2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MonthlyAttendanceReportPayload } from "@/lib/attendance-tracker/types";
import { useToast } from "@/lib/use-toast";

const LazyAttendanceReportsChart = dynamic(
  () => import("@/components/attendance/AttendanceReportsChart").then((mod) => mod.AttendanceReportsChart),
  {
    ssr: false,
    loading: () => <div className="h-[260px] animate-pulse rounded-xl border border-white/25 bg-white/45" />
  }
);

export function AttendanceReportsWorkspace({
  initialMonth,
  initialData
}: {
  initialMonth: string;
  initialData: MonthlyAttendanceReportPayload;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [generatingCsv, setGeneratingCsv] = useState(false);

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

  async function loadMonth(nextMonth: string) {
    setLoading(true);
    try {
      const response = await authorizedFetch(`/api/attendance/reports/monthly?month=${encodeURIComponent(nextMonth)}`, {
        cache: "no-store"
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not load monthly attendance report.");
      setData(body as MonthlyAttendanceReportPayload);
      setMonth(nextMonth);
    } catch (error) {
      toast({
        title: "Could not load month",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    setGeneratingCsv(true);
    try {
      const response = await authorizedFetch(`/api/attendance/reports/monthly?month=${encodeURIComponent(month)}&format=csv`, {
        cache: "no-store"
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Could not export CSV.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `attendance-summary-${month}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      toast({
        title: "CSV export failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingCsv(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/15">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="text-sm">
              Month
              <input
                type="month"
                value={month}
                onChange={(event) => void loadMonth(event.target.value)}
                className="mt-1 h-10 w-[180px] rounded-md border border-white/35 bg-white/80 px-3 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={downloadCsv} disabled={generatingCsv}>
                <Download className="mr-1.5 h-4 w-4" />
                {generatingCsv ? "Generating CSV..." : "Generate CSV"}
              </Button>
              <Button type="button" variant="outline" className="bg-white/75" asChild>
                <a href={`/app/reports/pdf?month=${encodeURIComponent(month)}&preview=1`} target="_blank" rel="noreferrer">
                  <FileBarChart2 className="mr-1.5 h-4 w-4" />
                  Generate PDF
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Entries" value={data.totalEntries} />
            <Metric label="Present" value={data.totals.present} />
            <Metric label="Refused" value={data.totals.refused} />
            <Metric label="1:1 Completed" value={data.totals.oneToOne} />
          </div>

          <div className="rounded-xl border border-white/25 bg-white/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Daily Attendance Trend</h3>
              {loading ? <Badge variant="outline">Loading...</Badge> : <Badge variant="outline">{data.monthKey}</Badge>}
            </div>
            <LazyAttendanceReportsChart data={data.daily} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/25 bg-white/65 p-3">
      <p className="text-xs uppercase tracking-wide text-foreground/65">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
