"use client";

import { format } from "date-fns";
import { CheckCircle2, Clock3, Download, FileWarning, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VolunteerHourEntry } from "@/lib/volunteers/types";
import { cn } from "@/lib/utils";

function approvalClass(value: VolunteerHourEntry["approval"]) {
  if (value === "APPROVED") return "border-emerald-200 bg-emerald-100/90 text-emerald-800";
  if (value === "DENIED") return "border-rose-200 bg-rose-100/90 text-rose-800";
  return "border-amber-200 bg-amber-100/90 text-amber-900";
}

export function HoursTab({
  entries,
  hasMore,
  canEdit,
  loadingMore,
  onLoadMore,
  onApprove,
  onDeny,
  onOpenLogHours,
  onExport
}: {
  entries: VolunteerHourEntry[];
  hasMore: boolean;
  canEdit: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
  onApprove: (visitId: string) => void;
  onDeny: (visitId: string) => void;
  onOpenLogHours: () => void;
  onExport: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-xl border border-white/45 bg-white/72 px-3 py-2">
          <Clock3 className="h-4 w-4 text-teal-700" />
          <span className="text-sm text-foreground/80">Timesheet log</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button type="button" size="sm" onClick={onOpenLogHours}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Hours
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/50 bg-white/72 p-6 text-center text-sm text-foreground/70">
            No hours logged yet.
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-white/55 bg-white/84 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{entry.volunteerName}</p>
                  <p className="text-xs text-foreground/70">
                    {format(new Date(entry.startAt), "EEE, MMM d · p")}
                    {entry.endAt ? ` - ${format(new Date(entry.endAt), "p")}` : " - Open"}
                  </p>
                  <p className="text-xs text-foreground/65">{entry.assignedLocation}</p>
                  {entry.notes ? <p className="mt-1 text-xs text-foreground/65">{entry.notes}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge className={cn("border text-[11px]", approvalClass(entry.approval))}>{entry.approval}</Badge>
                  <Badge variant="outline" className="bg-white/75 text-[11px]">
                    {entry.durationHours.toFixed(2)}h
                  </Badge>
                </div>
              </div>

              {canEdit ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(entry.id)}
                    disabled={entry.approval === "APPROVED"}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDeny(entry.id)}
                    disabled={entry.approval === "DENIED"}
                  >
                    <FileWarning className="mr-1.5 h-3.5 w-3.5" />
                    Deny
                  </Button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
