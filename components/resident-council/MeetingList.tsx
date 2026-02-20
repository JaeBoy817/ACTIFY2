"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CalendarDays, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResidentCouncilMeetingDTO } from "@/lib/resident-council/types";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | "OPEN" | "CLOSED";

function meetingMonthKey(value: string) {
  return value.slice(0, 7);
}

function formatMeetingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
}

export function MeetingList({
  meetings,
  selectedMeetingId
}: {
  meetings: ResidentCouncilMeetingDTO[];
  selectedMeetingId: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [monthFilter, setMonthFilter] = useState<"ALL" | string>("ALL");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(meetings.map((meeting) => meetingMonthKey(meeting.heldAt)))
    ).sort((a, b) => b.localeCompare(a));
  }, [meetings]);

  const filtered = useMemo(() => {
    const token = search.trim().toLowerCase();
    return meetings.filter((meeting) => {
      if (statusFilter !== "ALL" && meeting.status !== statusFilter) return false;
      if (monthFilter !== "ALL" && meetingMonthKey(meeting.heldAt) !== monthFilter) return false;
      if (!token) return true;

      const haystack = [
        meeting.parsed?.summary ?? "",
        meeting.parsed?.oldBusiness ?? "",
        meeting.parsed?.newBusiness ?? "",
        meeting.actionItems.map((item) => item.concern).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(token);
    });
  }, [meetings, monthFilter, search, statusFilter]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 98,
    overscan: 8
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  function selectMeeting(meetingId: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "meetings");
      params.set("meetingId", meetingId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <section className="rounded-2xl border border-white/30 bg-white/60 p-4 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Meetings</p>
        <Badge variant="outline" className="bg-white/80">{filtered.length}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search meetings or notes"
            className="bg-white/80 pl-8 shadow-lg shadow-black/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            className={statusFilter === "ALL" ? "shadow-lg shadow-actifyBlue/30" : "bg-white/75"}
            onClick={() => setStatusFilter("ALL")}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "OPEN" ? "default" : "outline"}
            className={statusFilter === "OPEN" ? "shadow-lg shadow-actifyBlue/30" : "bg-white/75"}
            onClick={() => setStatusFilter("OPEN")}
          >
            Open
          </Button>
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "CLOSED" ? "default" : "outline"}
            className={statusFilter === "CLOSED" ? "shadow-lg shadow-actifyBlue/30" : "bg-white/75"}
            onClick={() => setStatusFilter("CLOSED")}
          >
            Closed
          </Button>
        </div>

        <select
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
          className="h-9 w-full rounded-lg border border-white/40 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
        >
          <option value="ALL">All months</option>
          {monthOptions.map((monthKey) => (
            <option key={monthKey} value={monthKey}>{monthKey}</option>
          ))}
        </select>
      </div>

      <div ref={scrollRef} className="mt-3 max-h-[65vh] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/40 bg-white/60 px-3 py-6 text-center text-sm text-foreground/70">
            No meetings match this filter.
          </div>
        ) : (
          <div
            className="relative"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`
            }}
          >
            {virtualRows.map((row) => {
              const meeting = filtered[row.index];
              if (!meeting) return null;
              const active = selectedMeetingId === meeting.id;
              return (
                <div
                  key={meeting.id}
                  className="absolute left-0 top-0 w-full pb-2"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <button
                    type="button"
                    onClick={() => selectMeeting(meeting.id)}
                    onMouseEnter={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("view", "meetings");
                      params.set("meetingId", meeting.id);
                      router.prefetch(`${pathname}?${params.toString()}`);
                    }}
                    onTouchStart={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("view", "meetings");
                      params.set("meetingId", meeting.id);
                      router.prefetch(`${pathname}?${params.toString()}`);
                    }}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left shadow-lg transition",
                      active
                        ? "border-actifyBlue/40 bg-actifyBlue/10 shadow-actifyBlue/20"
                        : "border-white/40 bg-white/75 hover:bg-white/90"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <CalendarDays className="h-4 w-4 text-actifyBlue" />
                        {formatMeetingDate(meeting.heldAt)}
                      </span>
                      <Badge variant={meeting.status === "OPEN" ? "destructive" : "secondary"}>
                        {meeting.status === "OPEN" ? `Open ${meeting.unresolvedCount}` : "Closed"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/70">
                      {meeting.parsed?.summary ?? "No summary provided."}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isPending ? (
        <p className="mt-2 text-xs text-foreground/60">Updating selection…</p>
      ) : null}
    </section>
  );
}
