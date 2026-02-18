"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, CircleOff, Pin, RotateCcw, Sparkles } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OneOnOneSpotlightSnapshotDTO } from "@/lib/one-on-one-queue/service";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "@/lib/timezone";

type Props = {
  initialSnapshot: OneOnOneSpotlightSnapshotDTO;
  canEdit: boolean;
  timeZone: string;
};

type MonthlyFilter = "HAS_THIS_MONTH" | "NO_THIS_MONTH" | "BED_BOUND_ONLY";

type SkipDialogState = {
  open: boolean;
  queueItemId: string | null;
  residentName: string;
  reason: "RESIDENT_DECLINED" | "ASLEEP" | "IN_APPOINTMENT" | "CLINICAL_HOLD" | "STAFFING_CONSTRAINT" | "OTHER";
};

const queueSizeOptions = [4, 6, 8, 10, 12, 15];

const skipReasonOptions: Array<{
  value: "RESIDENT_DECLINED" | "ASLEEP" | "IN_APPOINTMENT" | "CLINICAL_HOLD" | "STAFFING_CONSTRAINT" | "OTHER";
  label: string;
}> = [
  { value: "RESIDENT_DECLINED", label: "Resident declined" },
  { value: "ASLEEP", label: "Asleep" },
  { value: "IN_APPOINTMENT", label: "In appointment" },
  { value: "CLINICAL_HOLD", label: "Clinical hold" },
  { value: "STAFFING_CONSTRAINT", label: "Staffing constraint" },
  { value: "OTHER", label: "Other" }
];

function statusTone(statusLabel: string) {
  if (statusLabel.toLowerCase().includes("bed bound")) {
    return "bg-amber-100 text-amber-800 border-amber-200/80";
  }
  return "bg-emerald-100 text-emerald-800 border-emerald-200/80";
}

function formatOptionalDate(value: string | null, timeZone: string) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never";
  return formatInTimeZone(parsed, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function coveragePercent(has: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (has / total) * 100));
}

export function OneOnOneSpotlight({
  initialSnapshot,
  canEdit,
  timeZone
}: Props) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [queueSize, setQueueSize] = useState<number>(initialSnapshot.queueSize || 6);
  const [monthlyFilter, setMonthlyFilter] = useState<MonthlyFilter>("HAS_THIS_MONTH");
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [skipDialog, setSkipDialog] = useState<SkipDialogState>({
    open: false,
    queueItemId: null,
    residentName: "",
    reason: "RESIDENT_DECLINED"
  });

  const coverage = snapshot.coverage;
  const percent = coveragePercent(coverage.residentsWithOneOnOneThisMonth, coverage.totalEligibleResidents);

  const filteredMonthlyResidents = useMemo(() => {
    if (monthlyFilter === "HAS_THIS_MONTH") {
      return snapshot.monthlyResidents.filter((resident) => resident.hasOneOnOneThisMonth);
    }
    if (monthlyFilter === "NO_THIS_MONTH") {
      return snapshot.monthlyResidents.filter((resident) => !resident.hasOneOnOneThisMonth);
    }
    return snapshot.monthlyResidents.filter((resident) => resident.status === "BED_BOUND");
  }, [snapshot.monthlyResidents, monthlyFilter]);

  const refreshQueue = async () => {
    const response = await fetch(`/api/oneonone/queue?date=${encodeURIComponent(snapshot.dateKey)}&queueSize=${encodeURIComponent(String(queueSize))}`, {
      method: "GET",
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error ?? "Unable to refresh 1:1 queue.");
    }
    setSnapshot(payload);
  };

  const runSnapshotMutation = async (endpoint: string, body: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error ?? "Request failed.");
    }
    setSnapshot(payload);
  };

  const handleRegenerate = () => {
    if (!canEdit) return;
    startTransition(async () => {
      try {
        await runSnapshotMutation("/api/oneonone/queue/regenerate", {
          date: snapshot.dateKey,
          queueSize
        });
        toast({
          title: "1:1 queue regenerated",
          description: "Today’s queue has been rebuilt with pinned residents kept at the top."
        });
      } catch (error) {
        toast({
          title: "Could not regenerate queue",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleMarkDone = (queueItemId: string) => {
    if (!canEdit) return;
    setActionPendingId(queueItemId);
    startTransition(async () => {
      try {
        await runSnapshotMutation("/api/oneonone/queue/complete", { queueItemId });
        toast({
          title: "Marked complete",
          description: "Resident marked complete for today’s 1:1 queue."
        });
      } catch (error) {
        toast({
          title: "Could not mark complete",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      } finally {
        setActionPendingId(null);
      }
    });
  };

  const handlePin = (queueItemId: string) => {
    if (!canEdit) return;
    setActionPendingId(queueItemId);
    startTransition(async () => {
      try {
        await runSnapshotMutation("/api/oneonone/queue/pin", { queueItemId });
        toast({
          title: "Pinned to tomorrow",
          description: "Resident will be prioritized in tomorrow’s queue."
        });
      } catch (error) {
        toast({
          title: "Could not pin resident",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      } finally {
        setActionPendingId(null);
      }
    });
  };

  const openSkipDialog = (queueItemId: string, residentName: string) => {
    if (!canEdit) return;
    setSkipDialog({
      open: true,
      queueItemId,
      residentName,
      reason: "RESIDENT_DECLINED"
    });
  };

  const submitSkip = () => {
    if (!skipDialog.queueItemId || !canEdit) return;
    const queueItemId = skipDialog.queueItemId;
    const reason = skipDialog.reason;

    setActionPendingId(queueItemId);
    startTransition(async () => {
      try {
        await runSnapshotMutation("/api/oneonone/queue/skip", {
          queueItemId,
          skipReason: reason
        });
        setSkipDialog({
          open: false,
          queueItemId: null,
          residentName: "",
          reason: "RESIDENT_DECLINED"
        });
        toast({
          title: "Resident skipped",
          description: "Skip reason recorded for this queue item."
        });
      } catch (error) {
        toast({
          title: "Could not skip resident",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      } finally {
        setActionPendingId(null);
      }
    });
  };

  return (
    <GlassCard variant="dense" className="overflow-hidden">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">1:1 Spotlight</h2>
          <p className="text-xs text-foreground/70">Plan daily 1:1 coverage and quickly log follow-through.</p>
        </div>
        <Badge variant="outline">Today: {snapshot.dateKey}</Badge>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="queue">Today&apos;s 1:1 Queue</TabsTrigger>
          <TabsTrigger value="month">This Month&apos;s 1:1 Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <div className="rounded-xl border border-white/70 bg-white/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">Queue size</span>
                <Select
                  value={String(queueSize)}
                  onValueChange={(value) => {
                    const parsed = Number(value);
                    if (!Number.isFinite(parsed)) return;
                    setQueueSize(parsed);
                  }}
                >
                  <SelectTrigger className="h-8 w-24 bg-white/80 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {queueSizeOptions.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 bg-white/80"
                  onClick={handleRegenerate}
                  disabled={!canEdit || isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await refreshQueue();
                      } catch (error) {
                        toast({
                          title: "Could not refresh queue",
                          description: error instanceof Error ? error.message : "Try again.",
                          variant: "destructive"
                        });
                      }
                    });
                  }}
                  disabled={isPending}
                >
                  Refresh
                </Button>
              </div>

              <div className="min-w-[220px]">
                <div className="mb-1 flex items-center justify-between text-xs text-foreground/70">
                  <span className="font-medium">Coverage meter</span>
                  <span>{coverage.residentsWithOneOnOneThisMonth} / {coverage.totalEligibleResidents}</span>
                </div>
                <div className="h-2 rounded-full bg-white/70">
                  <div
                    className="h-2 rounded-full bg-actify-brand transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-foreground/65">Residents with at least one 1:1 note this month</p>
              </div>
            </div>
          </div>

          {snapshot.monthlyResidents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-white/40 p-5 text-sm text-foreground/70">
              No residents yet.
            </div>
          ) : snapshot.queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-white/40 p-5 text-sm text-foreground/70">
              No queue items for today. Use regenerate to build today&apos;s queue.
            </div>
          ) : (
            <div className="space-y-2">
              {snapshot.queue.map((item) => {
                const busy = isPending && actionPendingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border border-white/70 bg-white/70 p-3 transition-colors",
                      item.isPinned ? "ring-1 ring-actifyBlue/35" : ""
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[220px] space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{item.residentName}</p>
                          <Badge variant="outline" className="bg-white/80">Room {item.room}</Badge>
                          <Badge variant="outline" className={statusTone(item.statusLabel)}>{item.statusLabel}</Badge>
                          {item.isPinned ? (
                            <Badge variant="outline" className="bg-actifyBlue/15 text-actifyBlue">
                              <Pin className="mr-1 h-3 w-3" />
                              Pinned
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/70">
                          <span>Last 1:1: {formatOptionalDate(item.lastOneOnOneAt, timeZone)}</span>
                          <span>Days since: {item.daysSinceLastOneOnOne ?? "—"}</span>
                          <span>This month: {item.monthNoteCount}</span>
                        </div>
                        <Badge variant="secondary" className="mt-1 bg-white/80 text-foreground/80">
                          Reason: {item.reason}
                        </Badge>
                        {item.completedAt ? (
                          <p className="text-xs text-emerald-700">Completed {formatOptionalDate(item.completedAt, timeZone)}</p>
                        ) : null}
                        {item.skippedAt ? (
                          <p className="text-xs text-amber-700">
                            Skipped {formatOptionalDate(item.skippedAt, timeZone)}
                            {item.skipReasonLabel ? ` · ${item.skipReasonLabel}` : ""}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline" className="bg-white/80">
                          <Link href={`/app/notes/one-to-one?residentId=${encodeURIComponent(item.residentId)}`}>
                            <CalendarClock className="mr-1 h-3.5 w-3.5" />
                            Log 1:1 Note
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkDone(item.id)}
                          disabled={!canEdit || busy}
                          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Mark Done
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => openSkipDialog(item.id, item.residentName)}
                          disabled={!canEdit || busy}
                          className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          <CircleOff className="mr-1 h-3.5 w-3.5" />
                          Skip
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handlePin(item.id)}
                          disabled={!canEdit || busy}
                          className="bg-white/80"
                        >
                          <Pin className="mr-1 h-3.5 w-3.5" />
                          Pin to Tomorrow
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/60 p-3.5">
            <div>
              <p className="text-sm font-medium">Monthly 1:1 coverage</p>
              <p className="text-xs text-foreground/70">Track residents with and without a note this month.</p>
            </div>
            <Select value={monthlyFilter} onValueChange={(value) => setMonthlyFilter(value as MonthlyFilter)}>
              <SelectTrigger className="h-8 w-[220px] bg-white/80 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HAS_THIS_MONTH">Has 1:1 this month</SelectItem>
                <SelectItem value="NO_THIS_MONTH">No 1:1 this month</SelectItem>
                <SelectItem value="BED_BOUND_ONLY">Bed-bound only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {snapshot.monthlyResidents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-white/40 p-5 text-sm text-foreground/70">
              No residents yet.
            </div>
          ) : filteredMonthlyResidents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-white/40 p-5 text-sm text-foreground/70">
              {monthlyFilter === "HAS_THIS_MONTH" ? "No 1:1 notes this month." : "No residents match this filter."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMonthlyResidents.map((resident) => (
                <div key={resident.residentId} className="rounded-xl border border-white/70 bg-white/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{resident.residentName}</p>
                        <Badge variant="outline" className="bg-white/80">Room {resident.room}</Badge>
                        <Badge variant="outline" className={statusTone(resident.statusLabel)}>{resident.statusLabel}</Badge>
                        {resident.inTodayQueue ? (
                          <Badge variant="outline" className="bg-actifyBlue/15 text-actifyBlue">
                            <Sparkles className="mr-1 h-3 w-3" />
                            In today&apos;s queue
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/70">
                        <span>1:1 notes this month: {resident.monthNoteCount}</span>
                        <span>Last note: {formatOptionalDate(resident.monthLastNoteAt, timeZone)}</span>
                        <span>Days since last: {resident.daysSinceLastOneOnOne ?? "—"}</span>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="bg-white/80">
                      <Link href={`/app/notes/one-to-one?residentId=${encodeURIComponent(resident.residentId)}`}>
                        Log 1:1 Note
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={skipDialog.open} onOpenChange={(open) => setSkipDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skip 1:1 for {skipDialog.residentName}</DialogTitle>
            <DialogDescription>Select a skip reason to continue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Skip reason</label>
            <Select
              value={skipDialog.reason}
              onValueChange={(value) =>
                setSkipDialog((prev) => ({
                  ...prev,
                  reason: value as SkipDialogState["reason"]
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {skipReasonOptions.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSkipDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitSkip}
              disabled={!skipDialog.queueItemId || isPending}
            >
              Save skip reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
