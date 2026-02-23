"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CalendarDays, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ResidentCouncilMeetingListResult, ResidentCouncilMeetingSort } from "@/lib/resident-council/queries";
import { cn } from "@/lib/utils";

type MeetingListFilters = {
  search: string;
  status: "ALL" | "DRAFT" | "FINAL";
  hasOpenActionItems: boolean;
  department: string;
  from: string;
  to: string;
  sort: ResidentCouncilMeetingSort;
};

const SORT_OPTIONS: Array<{ value: ResidentCouncilMeetingSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_action_items", label: "Most action items" },
  { value: "most_departments", label: "Most departments" }
];

function formatMeetingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function MeetingList({
  result,
  filters
}: {
  result: ResidentCouncilMeetingListResult;
  filters: MeetingListFilters;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  const updateParams = useMemo(() => {
    return (updates: Record<string, string | undefined>, resetPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", "meetings");
      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          next.delete(key);
          continue;
        }
        next.set(key, value);
      }
      if (resetPage) next.delete("page");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalized = searchDraft.trim();
      if (normalized === filters.search) return;
      updateParams({ q: normalized || undefined }, true);
    }, 320);
    return () => window.clearTimeout(handle);
  }, [filters.search, searchDraft, updateParams]);

  const rowVirtualizer = useVirtualizer({
    count: result.rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 124,
    overscan: 10
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">Meetings</p>
          <p className="text-xs text-foreground/65">
            Search minutes, departments, and action-heavy meetings with server pagination.
          </p>
        </div>
        <Badge variant="outline" className="bg-white/70">
          {result.total} total
        </Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_155px_155px_190px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search date, summary, department, keyword"
            className="bg-white/80 pl-8 shadow-md shadow-black/10"
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) => updateParams({ status: event.target.value }, true)}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="FINAL">Final</option>
        </select>

        <select
          value={filters.sort}
          onChange={(event) => updateParams({ sort: event.target.value }, true)}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.department}
          onChange={(event) => updateParams({ department: event.target.value === "ALL" ? undefined : event.target.value }, true)}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
        >
          <option value="ALL">All departments</option>
          <option value="Administration">Administration</option>
          <option value="Nursing">Nursing</option>
          <option value="Therapy">Therapy</option>
          <option value="Dietary">Dietary</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Laundry">Laundry</option>
          <option value="Activities">Activities</option>
          <option value="Social Services">Social Services</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="grid gap-2 md:grid-cols-[180px_180px_auto_1fr]">
        <label className="text-xs text-foreground/65">
          From
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => updateParams({ from: event.target.value || undefined }, true)}
            className="mt-1 bg-white/80 shadow-md shadow-black/10"
          />
        </label>
        <label className="text-xs text-foreground/65">
          To
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => updateParams({ to: event.target.value || undefined }, true)}
            className="mt-1 bg-white/80 shadow-md shadow-black/10"
          />
        </label>
        <label className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/75 px-3 py-2 text-sm text-foreground/75">
          <input
            type="checkbox"
            checked={filters.hasOpenActionItems}
            onChange={(event) => updateParams({ hasOpen: event.currentTarget.checked ? "1" : undefined }, true)}
            className="h-4 w-4"
          />
          Has open action items
        </label>
      </div>

      <div className="rounded-xl border border-white/30 bg-white/55 p-2">
        {result.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/35 bg-white/65 px-3 py-9 text-center text-sm text-foreground/70">
            No meetings match these filters.
          </div>
        ) : (
          <div ref={scrollRef} className="max-h-[64vh] overflow-y-auto pr-1">
            <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = result.rows[virtualRow.index];
                if (!row) return null;
                return (
                  <article
                    key={row.id}
                    className="absolute left-0 top-0 w-full pb-2"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <Link
                      href={`/app/resident-council/meetings/${row.id}`}
                      prefetch
                      className="block rounded-xl border border-white/35 bg-white/75 px-3 py-3 shadow-md shadow-black/10 transition hover:bg-white/90"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <CalendarDays className="h-4 w-4 text-actifyBlue" />
                            {row.title}
                          </p>
                          <p className="mt-0.5 text-xs text-foreground/70">{formatMeetingDate(row.heldAt)}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-foreground/75">{row.snippet}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {row.departments.slice(0, 4).map((department) => (
                              <Badge key={department} variant="outline" className="bg-white/80 text-[10px]">
                                {department}
                              </Badge>
                            ))}
                            {row.departments.length > 4 ? (
                              <Badge variant="outline" className="bg-white/80 text-[10px]">
                                +{row.departments.length - 4}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="space-y-1.5 text-right">
                          <Badge
                            className={cn(
                              row.status === "DRAFT"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            )}
                            variant="outline"
                          >
                            {row.status}
                          </Badge>
                          <p className="text-[11px] text-foreground/70">{row.unresolvedCount} open</p>
                          <p className="text-[11px] text-foreground/70">{row.actionItemsCount} items</p>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/30 bg-white/55 px-3 py-2">
        <p className="text-xs text-foreground/65">
          Page {result.page} of {result.pageCount}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={result.page <= 1}
            onClick={() => updateParams({ page: String(result.page - 1) })}
            className="inline-flex h-8 items-center rounded-lg border border-white/35 bg-white/70 px-2.5 text-xs disabled:opacity-50"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Prev
          </button>
          <button
            type="button"
            disabled={result.page >= result.pageCount}
            onClick={() => updateParams({ page: String(result.page + 1) })}
            className="inline-flex h-8 items-center rounded-lg border border-white/35 bg-white/70 px-2.5 text-xs disabled:opacity-50"
          >
            Next
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
