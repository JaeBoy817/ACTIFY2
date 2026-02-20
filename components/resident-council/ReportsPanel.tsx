"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, Download, ExternalLink, FileJson, FileText } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import type { ResidentCouncilMeetingDTO } from "@/lib/resident-council/types";

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toCsvRows(meetings: ResidentCouncilMeetingDTO[]) {
  const lines = [
    ["meetingDate", "attendance", "status", "openItems", "resolvedItems", "summary"].join(",")
  ];

  for (const meeting of meetings) {
    const openCount = meeting.actionItems.filter((item) => item.status === "UNRESOLVED").length;
    const resolvedCount = meeting.actionItems.length - openCount;
    const summary = (meeting.parsed?.summary ?? "").replaceAll("\"", "\"\"");
    lines.push(
      [
        JSON.stringify(new Date(meeting.heldAt).toISOString()),
        String(meeting.attendanceCount),
        meeting.status,
        String(openCount),
        String(resolvedCount),
        JSON.stringify(summary)
      ].join(",")
    );
  }

  return lines.join("\n");
}

export function ReportsPanel({
  meetings,
  selectedMeetingId,
  basePdfPath = "/app/resident-council/pdf"
}: {
  meetings: ResidentCouncilMeetingDTO[];
  selectedMeetingId: string | null;
  basePdfPath?: string;
}) {
  const monthOptions = useMemo(() => {
    return Array.from(new Set(meetings.map((meeting) => meeting.heldAt.slice(0, 7)))).sort((a, b) =>
      b.localeCompare(a)
    );
  }, [meetings]);

  const [monthFilter, setMonthFilter] = useState<string>(monthOptions[0] ?? "ALL");
  const [activeMeetingId, setActiveMeetingId] = useState<string>(selectedMeetingId ?? meetings[0]?.id ?? "");

  const filteredMeetings = useMemo(() => {
    if (monthFilter === "ALL") return meetings;
    return meetings.filter((meeting) => meeting.heldAt.startsWith(monthFilter));
  }, [meetings, monthFilter]);

  const totals = useMemo(() => {
    const meetingsCount = filteredMeetings.length;
    const attendanceTotal = filteredMeetings.reduce((sum, meeting) => sum + meeting.attendanceCount, 0);
    const actionItems = filteredMeetings.flatMap((meeting) => meeting.actionItems);
    const openItems = actionItems.filter((item) => item.status === "UNRESOLVED").length;
    const resolvedItems = actionItems.length - openItems;

    return {
      meetingsCount,
      openItems,
      resolvedItems,
      averageAttendance: meetingsCount === 0 ? 0 : Number((attendanceTotal / meetingsCount).toFixed(1))
    };
  }, [filteredMeetings]);

  const activePdfDownloadHref = activeMeetingId
    ? `${basePdfPath}?meetingId=${encodeURIComponent(activeMeetingId)}`
    : "";
  const activePdfPreviewHref = activeMeetingId
    ? `${basePdfPath}?meetingId=${encodeURIComponent(activeMeetingId)}&preview=1&t=${Date.now()}`
    : "";

  return (
    <section className="space-y-4 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
            <BarChart3 className="h-4 w-4 text-actifyBlue" />
            Reports & Export
          </p>
          <p className="text-xs text-foreground/65">Monthly summary plus PDF minutes, CSV, and JSON exports.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="h-9 rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
          >
            <option value="ALL">All months</option>
            {monthOptions.map((monthKey) => (
              <option key={monthKey} value={monthKey}>{monthKey}</option>
            ))}
          </select>

          <GlassButton
            type="button"
            size="sm"
            variant="dense"
            onClick={() =>
              downloadBlob(
                toCsvRows(filteredMeetings),
                `resident-council-${monthFilter === "ALL" ? "all" : monthFilter}.csv`,
                "text/csv;charset=utf-8"
              )
            }
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            CSV
          </GlassButton>

          <GlassButton
            type="button"
            size="sm"
            variant="dense"
            onClick={() =>
              downloadBlob(
                JSON.stringify(filteredMeetings, null, 2),
                `resident-council-${monthFilter === "ALL" ? "all" : monthFilter}.json`,
                "application/json"
              )
            }
          >
            <FileJson className="mr-1 h-3.5 w-3.5" />
            JSON
          </GlassButton>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/35 bg-white/75 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/65">Meetings</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{totals.meetingsCount}</p>
        </div>
        <div className="rounded-xl border border-white/35 bg-white/75 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/65">Avg Attendance</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{totals.averageAttendance.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-white/35 bg-white/75 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/65">Open Items</p>
          <p className="mt-1 text-2xl font-semibold text-rose-700">{totals.openItems}</p>
        </div>
        <div className="rounded-xl border border-white/35 bg-white/75 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/65">Resolved Items</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{totals.resolvedItems}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2 rounded-xl border border-white/35 bg-white/75 p-3">
          <p className="text-sm font-semibold text-foreground">Printable Minutes PDF</p>
          <select
            value={activeMeetingId}
            onChange={(event) => setActiveMeetingId(event.target.value)}
            className="h-10 w-full rounded-lg border border-white/35 bg-white/90 px-2.5 text-sm"
          >
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {new Date(meeting.heldAt).toLocaleString()}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            {activeMeetingId ? (
              <GlassButton asChild size="sm">
                <Link href={activePdfDownloadHref}>
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Download PDF
                </Link>
              </GlassButton>
            ) : (
              <GlassButton size="sm" disabled>
                <FileText className="mr-1 h-3.5 w-3.5" />
                Download PDF
              </GlassButton>
            )}

            {activeMeetingId ? (
              <GlassButton asChild size="sm" variant="dense">
                <Link href={activePdfPreviewHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Preview
                </Link>
              </GlassButton>
            ) : (
              <GlassButton size="sm" variant="dense" disabled>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Preview
              </GlassButton>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-white/35 bg-white/75 p-3">
          <p className="text-sm font-semibold text-foreground">Meeting Summary Rows</p>
          {filteredMeetings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/40 bg-white/70 px-3 py-6 text-center text-sm text-foreground/70">
              No meetings in this date range.
            </div>
          ) : (
            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {filteredMeetings.map((meeting) => {
                const openCount = meeting.actionItems.filter((item) => item.status === "UNRESOLVED").length;
                return (
                  <div key={meeting.id} className="rounded-lg border border-white/35 bg-white/85 px-3 py-2 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{new Date(meeting.heldAt).toLocaleString()}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-white/80">Attendance {meeting.attendanceCount}</Badge>
                        <Badge variant={openCount > 0 ? "destructive" : "secondary"}>Open {openCount}</Badge>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/70">{meeting.parsed?.summary ?? "No summary"}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
