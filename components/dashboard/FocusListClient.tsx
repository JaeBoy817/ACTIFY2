"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowRight, CalendarClock, Pin, RotateCcw, Sparkles } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardSummary } from "@/lib/dashboard/getDashboardSummary";
import { useToast } from "@/lib/use-toast";

type FocusState = DashboardSummary["focus"];

type OneOnOneQueueSnapshotDTO = {
  dateKey: string;
  queueSize: number;
  coverage: {
    residentsWithOneOnOneThisMonth: number;
    totalEligibleResidents: number;
  };
  queue: Array<{
    id: string;
    residentId: string;
    residentName: string;
    room: string;
    statusLabel: string;
    reason: string;
    completedAt: string | null;
    skippedAt: string | null;
    lastOneOnOneAt: string | null;
    daysSinceLastOneOnOne: number | null;
  }>;
};

function formatLastOneOnOne(value: string | null) {
  if (!value) return "No prior 1:1";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No prior 1:1";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getChicagoDateKey(date = new Date()) {
  const partMap: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date)) {
    if (part.type !== "literal") {
      partMap[part.type] = part.value;
    }
  }

  const year = partMap.year ?? "0000";
  const month = partMap.month ?? "01";
  const day = partMap.day ?? "01";
  return `${year}-${month}-${day}`;
}

function toFocusState(snapshot: OneOnOneQueueSnapshotDTO): FocusState {
  return {
    queueDateKey: snapshot.dateKey,
    queueSize: snapshot.queueSize,
    dueTodayCount: snapshot.queue.filter((item) => !item.completedAt && !item.skippedAt).length,
    residentsWithNoteThisMonth: snapshot.coverage.residentsWithOneOnOneThisMonth,
    totalEligibleResidents: snapshot.coverage.totalEligibleResidents,
    items: snapshot.queue.slice(0, 10).map((item) => ({
      id: item.id,
      residentId: item.residentId,
      residentName: item.residentName,
      room: item.room,
      statusLabel: item.statusLabel,
      reason: item.reason,
      lastOneOnOneAt: item.lastOneOnOneAt,
      daysSinceLastOneOnOne: item.daysSinceLastOneOnOne,
      href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(item.residentId)}`
    }))
  };
}

async function requestQueueRefresh(payload: {
  queueSize: number;
  missingThisMonthOnly?: boolean;
}) {
  const response = await fetch("/api/oneonone/queue/regenerate", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.error === "string" ? body.error : "Could not refresh 1:1 queue.");
  }
  return body as OneOnOneQueueSnapshotDTO;
}

export function FocusListClient({
  initialFocus,
  viewAllHref
}: {
  initialFocus: FocusState;
  viewAllHref: string;
}) {
  const { toast } = useToast();
  const [focus, setFocus] = useState<FocusState>(initialFocus);
  const [isPending, startTransition] = useTransition();
  const [didInitialMonthCheck, setDidInitialMonthCheck] = useState(false);
  const coveragePercent = focus.totalEligibleResidents === 0
    ? 0
    : Math.round((focus.residentsWithNoteThisMonth / focus.totalEligibleResidents) * 100);

  const runRefresh = useCallback((missingThisMonthOnly: boolean, successTitle: string, successDescription: string) => {
    startTransition(async () => {
      try {
        const snapshot = await requestQueueRefresh({
          queueSize: focus.queueSize,
          missingThisMonthOnly
        });
        setFocus(toFocusState(snapshot));
        toast({
          title: successTitle,
          description: successDescription
        });
      } catch (error) {
        toast({
          title: "Could not refresh 1:1 list",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }, [focus.queueSize, toast]);

  useEffect(() => {
    if (didInitialMonthCheck) return;
    setDidInitialMonthCheck(true);

    const liveMonthKey = getChicagoDateKey().slice(0, 7);
    const queueMonthKey = focus.queueDateKey.slice(0, 7);
    if (liveMonthKey === queueMonthKey) return;

    runRefresh(false, "1:1 queue reset", "A new month started, so the 1:1 to-do list was reset.");
  }, [didInitialMonthCheck, focus.queueDateKey, runRefresh]);

  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">1:1 To-Do</h2>
          <p className="text-sm text-foreground/70">Stable for today. Prioritized by monthly coverage and recent follow-up needs.</p>
        </div>
        <div className="flex min-w-[220px] items-start gap-2">
          <div className="flex-1 rounded-xl border border-white/40 bg-white/70 px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-xs text-foreground/70">
              <span>Monthly coverage</span>
              <span>{focus.residentsWithNoteThisMonth}/{focus.totalEligibleResidents}</span>
            </div>
            <div className="h-2 rounded-full bg-white/60">
              <div className="h-2 rounded-full bg-actify-brand" style={{ width: `${coveragePercent}%` }} />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() =>
              runRefresh(
                true,
                "Missing-month queue refreshed",
                "Showing residents who still need a 1:1 note this month."
              )
            }
            className="inline-flex items-center gap-1.5"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            Refresh Missing
          </Button>
        </div>
      </div>

      {focus.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/45 bg-white/60 px-4 py-6 text-sm text-foreground/70">
          No residents in today&apos;s queue yet.
        </div>
      ) : (
        <div className="space-y-2">
          {focus.items.slice(0, 8).map((item, index) => (
            <div key={item.id} className="rounded-xl border border-white/45 bg-white/70 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-actifyBlue/15 px-1.5 text-[11px] font-semibold text-actifyBlue">
                      {index + 1}
                    </span>
                    <p className="font-medium text-foreground">{item.residentName}</p>
                    <Badge variant="outline" className="bg-white/80">Room {item.room}</Badge>
                    <Badge variant="outline" className={item.statusLabel.toLowerCase().includes("bed bound") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                      {item.statusLabel}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/70">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Last 1:1 {formatLastOneOnOne(item.lastOneOnOneAt)}
                    </span>
                    <span>{item.daysSinceLastOneOnOne ?? "-"} day(s) since</span>
                    <span className="inline-flex items-center gap-1">
                      <Pin className="h-3 w-3" />
                      {item.reason}
                    </span>
                  </div>
                </div>

                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/40 bg-white/85 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-white"
                >
                  Log 1:1
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-foreground/70">
          <Sparkles className="h-3.5 w-3.5" />
          Queue date {focus.queueDateKey}
        </span>
        <Link href={viewAllHref} className="text-sm font-medium text-actifyBlue hover:underline">
          View all 1:1 actions
        </Link>
      </div>
    </GlassCard>
  );
}
