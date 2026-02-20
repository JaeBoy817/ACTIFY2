"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { CalendarPlus2, Clock3, Eye, Search, UserRound } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { VolunteerDirectoryStatus, VolunteerSummary } from "@/lib/volunteers/types";

function statusBadgeClass(status: VolunteerDirectoryStatus) {
  if (status === "ON_SHIFT") return "border-cyan-200 bg-cyan-100/85 text-cyan-800";
  if (status === "INACTIVE") return "border-slate-200 bg-slate-100/85 text-slate-700";
  return "border-emerald-200 bg-emerald-100/85 text-emerald-700";
}

export function DirectoryTab({
  volunteers,
  onView,
  onSchedule,
  onLogHours
}: {
  volunteers: VolunteerSummary[];
  onView: (volunteerId: string) => void;
  onSchedule: (volunteerId: string) => void;
  onLogHours: (volunteerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | VolunteerDirectoryStatus>("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const allTags = useMemo(
    () => Array.from(new Set(volunteers.flatMap((volunteer) => volunteer.tags))).sort((a, b) => a.localeCompare(b)),
    [volunteers]
  );
  const allAvailability = useMemo(
    () =>
      Array.from(
        new Set(volunteers.map((volunteer) => volunteer.availability).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b)),
    [volunteers]
  );

  const filtered = useMemo(() => {
    return volunteers.filter((volunteer) => {
      if (statusFilter !== "ALL" && volunteer.status !== statusFilter) return false;
      if (tagFilter !== "ALL" && !volunteer.tags.includes(tagFilter)) return false;
      if (availabilityFilter !== "ALL" && volunteer.availability !== availabilityFilter) return false;
      if (!deferredSearch) return true;

      return (
        volunteer.name.toLowerCase().includes(deferredSearch) ||
        (volunteer.phone ?? "").toLowerCase().includes(deferredSearch) ||
        volunteer.tags.join(" ").toLowerCase().includes(deferredSearch) ||
        volunteer.status.toLowerCase().includes(deferredSearch)
      );
    });
  }, [availabilityFilter, deferredSearch, statusFilter, tagFilter, volunteers]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 84,
    overscan: 8
  });

  return (
    <section className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_200px_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/55" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search volunteer name, phone, tag"
            className="bg-white/85 pl-9"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "ALL" | VolunteerDirectoryStatus)}
          className="h-10 rounded-md border border-white/40 bg-white/80 px-3 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_SHIFT">On Shift</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          className="h-10 rounded-md border border-white/40 bg-white/80 px-3 text-sm"
        >
          <option value="ALL">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value)}
          className="h-10 rounded-md border border-white/40 bg-white/80 px-3 text-sm"
        >
          <option value="ALL">Any availability</option>
          {allAvailability.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/50 bg-white/70 p-6 text-center text-sm text-foreground/70">
          No volunteers match current filters.
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-[62vh] overflow-y-auto rounded-xl border border-white/45 bg-white/65">
          <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const volunteer = filtered[virtualRow.index];
              if (!volunteer) return null;

              return (
                <div
                  key={volunteer.id}
                  className="absolute left-0 top-0 w-full px-2 py-1"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/55 bg-white/84 px-3 py-2.5">
                    <button type="button" className="min-w-0 text-left" onClick={() => onView(volunteer.id)}>
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-200 bg-gradient-to-br from-violet-200/70 to-sky-100/60 text-violet-700">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <span className="truncate">{volunteer.name}</span>
                      </p>
                      <p className="text-xs text-foreground/65">{volunteer.phone ?? "No phone on file"}</p>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={cn("border text-[11px]", statusBadgeClass(volunteer.status))}>
                        {volunteer.status === "ON_SHIFT" ? "On Shift" : volunteer.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                      {volunteer.tags.slice(0, 2).map((tag) => (
                        <Badge key={`${volunteer.id}:${tag}`} variant="outline" className="bg-white/75 text-[11px]">
                          {tag}
                        </Badge>
                      ))}
                      {volunteer.tags.length > 2 ? (
                        <Badge variant="outline" className="bg-white/75 text-[11px]">
                          +{volunteer.tags.length - 2}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button type="button" size="sm" variant="outline" onClick={() => onView(volunteer.id)}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => onSchedule(volunteer.id)}>
                        <CalendarPlus2 className="mr-1.5 h-3.5 w-3.5" />
                        Schedule
                      </Button>
                      <Button type="button" size="sm" onClick={() => onLogHours(volunteer.id)}>
                        <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                        Log Hours
                      </Button>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
