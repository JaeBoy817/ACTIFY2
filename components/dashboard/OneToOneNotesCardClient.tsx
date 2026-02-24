"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, ClipboardPenLine, History, Minus, Plus, PlusCircle, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/lib/use-toast";

type QueueItem = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  statusLabel: string;
  reason: string;
  lastOneOnOneAt: string | null;
  daysSinceLastOneOnOne: number | null;
  href: string;
};

type OneToOneCardState = {
  queueDateKey: string;
  queueSize: number;
  dueTodayCount: number;
  missingThisMonthCount: number;
  residentsWithNoteThisMonth: number;
  totalEligibleResidents: number;
  items: QueueItem[];
  viewAllHref: string;
};

type QuickNoteOptionsResponse = {
  residents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    room: string;
  }>;
  templates: Array<{
    id: string;
    title: string;
  }>;
};

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
  monthlyResidents: Array<{
    hasOneOnOneThisMonth: boolean;
  }>;
};

function getLocalDateKey(date = new Date()) {
  const partMap: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
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

function formatLastOneOnOne(value: string | null) {
  if (!value) return "No prior 1:1";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No prior 1:1";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toCardState(snapshot: OneOnOneQueueSnapshotDTO): OneToOneCardState {
  return {
    queueDateKey: snapshot.dateKey,
    queueSize: snapshot.queueSize,
    dueTodayCount: snapshot.queue.filter((item) => !item.completedAt && !item.skippedAt).length,
    missingThisMonthCount: snapshot.monthlyResidents.filter((item) => !item.hasOneOnOneThisMonth).length,
    residentsWithNoteThisMonth: snapshot.coverage.residentsWithOneOnOneThisMonth,
    totalEligibleResidents: snapshot.coverage.totalEligibleResidents,
    items: snapshot.queue
      .filter((item) => !item.completedAt && !item.skippedAt)
      .slice(0, 8)
      .map((item) => ({
      id: item.id,
      residentId: item.residentId,
      residentName: item.residentName,
      room: item.room,
      statusLabel: item.statusLabel,
      reason: item.reason,
      lastOneOnOneAt: item.lastOneOnOneAt,
      daysSinceLastOneOnOne: item.daysSinceLastOneOnOne,
      href: `/app/notes/new?type=1on1&residentId=${encodeURIComponent(item.residentId)}`
    })),
    viewAllHref: "/app/notes/new?type=1on1"
  };
}

async function refreshQueue(payload: {
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

export function OneToOneNotesCardClient({
  initialState,
  recentNotes
}: {
  initialState: OneToOneCardState;
  recentNotes: Array<{
    id: string;
    residentId: string;
    residentName: string;
    room: string;
    createdAt: string;
    createdBy: string;
    continueHref: string;
    duplicateHref: string;
  }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<OneToOneCardState>(initialState);
  const [isPending, startTransition] = useTransition();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [options, setOptions] = useState<QuickNoteOptionsResponse | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(4);

  const coveragePercent = useMemo(() => {
    if (state.totalEligibleResidents === 0) return 0;
    return Math.round((state.residentsWithNoteThisMonth / state.totalEligibleResidents) * 100);
  }, [state.residentsWithNoteThisMonth, state.totalEligibleResidents]);
  const visibleQueueItems = useMemo(() => {
    const cap = Math.max(1, Math.min(12, visibleCount));
    return state.items.slice(0, cap);
  }, [state.items, visibleCount]);
  const visibleRecentNotes = useMemo(() => recentNotes.slice(0, 3), [recentNotes]);

  const requestRefresh = useCallback((missingThisMonthOnly: boolean, successMessage: string) => {
    startTransition(async () => {
      try {
        const snapshot = await refreshQueue({
          queueSize: state.queueSize,
          missingThisMonthOnly
        });
        setState(toCardState(snapshot));
        toast({
          title: "1:1 queue updated",
          description: successMessage
        });
      } catch (error) {
        toast({
          title: "Could not refresh queue",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }, [state.queueSize, toast]);

  useEffect(() => {
    const liveMonthKey = getLocalDateKey().slice(0, 7);
    const queueMonthKey = state.queueDateKey.slice(0, 7);
    if (liveMonthKey === queueMonthKey) return;

    requestRefresh(false, "New month detected. Queue reset to this month.");
  }, [requestRefresh, state.queueDateKey]);

  useEffect(() => {
    if (!quickAddOpen || options || loadingOptions) return;

    setLoadingOptions(true);
    fetch("/api/dashboard/quick-note-options")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(typeof body?.error === "string" ? body.error : "Could not load quick-add options.");
        }
        setOptions(body as QuickNoteOptionsResponse);
      })
      .catch((error) => {
        toast({
          title: "Could not load quick add",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      })
      .finally(() => setLoadingOptions(false));
  }, [loadingOptions, options, quickAddOpen, toast]);

  useEffect(() => {
    if (!options || selectedResidentId) return;
    const first = options.residents[0];
    if (first) {
      setSelectedResidentId(first.id);
    }
  }, [options, selectedResidentId]);

  const startQuickAdd = () => {
    if (!selectedResidentId) {
      toast({
        title: "Resident required",
        description: "Choose a resident to start a 1:1 note.",
        variant: "destructive"
      });
      return;
    }

    const params = new URLSearchParams({
      type: "1on1",
      residentId: selectedResidentId
    });
    if (selectedTemplateId) {
      params.set("templateId", selectedTemplateId);
    }

    router.push(`/app/notes/new?${params.toString()}`);
    setQuickAddOpen(false);
  };

  return (
    <div className="rounded-3xl border border-white/45 bg-gradient-to-br from-white/86 via-amber-100/40 to-rose-100/38 p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-foreground">1:1 Notes</p>
          <p className="text-sm text-foreground/70">Today’s queue plus recent 1:1s from this month.</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setQuickAddOpen(true)}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:brightness-110"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Quick Add
        </Button>
      </div>

      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-500/16 via-orange-500/12 to-rose-500/14 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-foreground/65">
          <span>Monthly coverage</span>
          <span>{state.residentsWithNoteThisMonth}/{state.totalEligibleResidents}</span>
        </div>
        <div className="h-2 rounded-full bg-white/70">
          <div className="h-2 rounded-full bg-actify-brand" style={{ width: `${coveragePercent}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className="bg-white/90">Due Today {state.dueTodayCount}</Badge>
          <Badge variant="outline" className="bg-white/90">Missing This Month {state.missingThisMonthCount}</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-200/60 bg-gradient-to-r from-amber-500/18 to-orange-400/14"
          disabled={isPending}
          onClick={() => requestRefresh(true, "Showing residents still missing a 1:1 this month.")}
        >
          <RotateCcw className={`mr-1 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
          Refresh Missing
        </Button>
        <Link href={state.viewAllHref} className="inline-flex items-center gap-1 text-sm font-medium text-actifyBlue hover:underline">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <div className="ml-auto inline-flex items-center gap-1 rounded-xl border border-rose-200/60 bg-gradient-to-r from-rose-500/12 to-fuchsia-500/10 px-1.5 py-1 text-xs">
          <span className="px-1 text-foreground/70">Residents</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 rounded-md p-0"
            onClick={() => setVisibleCount((value) => Math.max(1, value - 1))}
            disabled={visibleCount <= 1}
            aria-label="Show fewer residents"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-7 text-center font-semibold text-foreground">{Math.min(visibleCount, state.items.length)}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 rounded-md p-0"
            onClick={() => setVisibleCount((value) => Math.min(12, value + 1))}
            disabled={visibleCount >= 12 || visibleCount >= state.items.length}
            aria-label="Show more residents"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {visibleQueueItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/45 bg-white/70 px-3 py-4 text-sm text-foreground/70">
            No residents in today&apos;s queue.
          </div>
        ) : (
          visibleQueueItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/45 bg-white/70 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.residentName}</p>
                  <p className="truncate text-xs text-foreground/70">
                    Room {item.room} · {item.reason}
                  </p>
                  <p className="mt-1 text-[11px] text-foreground/60">
                    Last 1:1 {formatLastOneOnOne(item.lastOneOnOneAt)} · {item.daysSinceLastOneOnOne ?? "-"} day(s)
                  </p>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200/60 bg-gradient-to-r from-blue-500/16 to-cyan-500/12 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:brightness-105"
                >
                  <ClipboardPenLine className="h-3.5 w-3.5 text-blue-700" />
                  Start Note
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/65">
          <History className="h-3.5 w-3.5 text-violet-700" />
          Recent 1:1 Notes (3)
        </div>
        <div className="space-y-2">
          {visibleRecentNotes.length === 0 ? (
            <div className="rounded-xl border border-white/45 bg-white/70 px-3 py-3 text-xs text-foreground/65">
              No recent 1:1 notes yet.
            </div>
          ) : (
            visibleRecentNotes.map((note) => (
              <div key={note.id} className="rounded-xl border border-violet-200/55 bg-gradient-to-r from-violet-500/8 to-fuchsia-500/8 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{note.residentName}</p>
                    <p className="truncate text-xs text-foreground/65">
                      Room {note.room} · {note.createdAt} · {note.createdBy}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link href={note.continueHref} className="rounded-md border border-white/45 bg-white/90 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-white">
                      Continue
                    </Link>
                    <Link href={note.duplicateHref} className="rounded-md border border-white/45 bg-white/90 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-white">
                      Duplicate
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {recentNotes.length > visibleRecentNotes.length ? (
          <div className="mt-2">
            <Link href="/app/notes?type=1on1" className="inline-flex items-center gap-1 text-xs font-medium text-actifyBlue hover:underline">
              View more recent 1:1 notes
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : null}
      </div>

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="rounded-2xl border-white/40 bg-white/90">
          <DialogHeader>
            <DialogTitle>Quick Add 1:1 Note</DialogTitle>
            <DialogDescription>Select resident and optional template, then jump straight into note entry.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/65">Resident</span>
              <select
                value={selectedResidentId}
                onChange={(event) => setSelectedResidentId(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/45 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                disabled={loadingOptions || !options}
              >
                {(options?.residents ?? []).map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.lastName}, {resident.firstName} · Room {resident.room}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/65">Template (optional)</span>
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/45 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                disabled={loadingOptions || !options}
              >
                <option value="">No template</option>
                {(options?.templates ?? []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>

            {loadingOptions ? (
              <p className="text-xs text-foreground/65">Loading resident and template options…</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={startQuickAdd} disabled={!selectedResidentId || loadingOptions}>
              <Sparkles className="h-3.5 w-3.5" />
              Start Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
