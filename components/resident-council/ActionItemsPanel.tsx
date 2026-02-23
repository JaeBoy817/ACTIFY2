"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle2, ChevronLeft, ChevronRight, ListTodo, Search } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ResidentCouncilActionListResult, ResidentCouncilActionSort } from "@/lib/resident-council/queries";
import { cn } from "@/lib/utils";

type ActionFn = (formData: FormData) => Promise<void>;

type ActionFilters = {
  search: string;
  status: "ALL" | "OPEN" | "DONE";
  department: string;
  owner: string;
  sort: ResidentCouncilActionSort;
  meetingId: string;
};

const SORT_OPTIONS: Array<{ value: ResidentCouncilActionSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "due_soon", label: "Due soon" }
];

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function ActionItemsPanel({
  result,
  filters,
  owners,
  canEdit,
  onUpdateActionItem,
  onDeleteActionItem
}: {
  result: ResidentCouncilActionListResult;
  filters: ActionFilters;
  owners: string[];
  canEdit: boolean;
  onUpdateActionItem: ActionFn;
  onDeleteActionItem: ActionFn;
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
      next.set("view", "actions");
      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          next.delete(key);
          continue;
        }
        next.set(key, value);
      }
      if (resetPage) next.delete("actionPage");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalized = searchDraft.trim();
      if (normalized === filters.search) return;
      updateParams({ actionQ: normalized || undefined }, true);
    }, 340);
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
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
            <ListTodo className="h-4 w-4 text-actifyBlue" />
            Action Items
          </p>
          <p className="text-xs text-foreground/65">Open and resolved follow-up tasks across council meetings.</p>
        </div>
        <Badge variant="outline" className="bg-white/70">
          {result.total} total
        </Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_180px_180px_140px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search concern, category, follow-up, owner"
            className="bg-white/80 pl-8 shadow-md shadow-black/10"
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) => updateParams({ actionStatus: event.target.value }, true)}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
        >
          <option value="ALL">All</option>
          <option value="OPEN">Open</option>
          <option value="DONE">Done</option>
        </select>

        <select
          value={filters.department}
          onChange={(event) =>
            updateParams({ actionDepartment: event.target.value === "ALL" ? undefined : event.target.value }, true)
          }
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

        <select
          value={filters.owner}
          onChange={(event) => updateParams({ actionOwner: event.target.value === "ALL" ? undefined : event.target.value }, true)}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
        >
          <option value="ALL">All owners</option>
          {owners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>

        <select
          value={filters.sort}
          onChange={(event) => updateParams({ actionSort: event.target.value }, true)}
          className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/30 bg-white/55 p-2">
        {result.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/35 bg-white/65 px-3 py-9 text-center text-sm text-foreground/70">
            No action items for this filter.
          </div>
        ) : (
          <div ref={scrollRef} className="max-h-[66vh] overflow-y-auto pr-1">
            <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = result.rows[virtualRow.index];
                if (!item) return null;
                const nextStatus = item.status === "DONE" ? "UNRESOLVED" : "RESOLVED";
                return (
                  <article
                    key={item.id}
                    className="absolute left-0 top-0 w-full pb-2"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div className="rounded-xl border border-white/35 bg-white/75 px-3 py-3 shadow-md shadow-black/10">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{item.concern}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="bg-white/80 text-[10px]">
                              {item.category}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.section === "OLD" ? "Old Business" : "New Business"}
                            </Badge>
                            <span className="text-xs text-foreground/65">Due {formatDate(item.dueDate)}</span>
                            {item.owner ? <span className="text-xs text-foreground/65">Owner {item.owner}</span> : null}
                            <Link
                              href={`/app/resident-council/meetings/${item.meetingId}`}
                              className="text-xs text-actifyBlue underline-offset-2 hover:underline"
                            >
                              Open meeting
                            </Link>
                          </div>
                          {item.followUp ? <p className="mt-1 text-xs text-foreground/72">{item.followUp}</p> : null}
                        </div>

                        <div className="flex items-start gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              item.status === "DONE"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                            )}
                          >
                            {item.status}
                          </Badge>
                          {canEdit ? (
                            <div className="flex flex-wrap gap-1.5">
                              <form action={onUpdateActionItem}>
                                <input type="hidden" name="itemId" value={item.id} />
                                <input type="hidden" name="section" value={item.section} />
                                <input type="hidden" name="status" value={nextStatus} />
                                <input type="hidden" name="owner" value={item.owner ?? ""} />
                                <input type="hidden" name="dueDate" value={item.dueDate ?? ""} />
                                <input type="hidden" name="followUp" value={item.followUp ?? ""} />
                                <GlassButton size="sm" variant="dense" className="h-8 px-3 text-xs">
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  {item.status === "DONE" ? "Reopen" : "Done"}
                                </GlassButton>
                              </form>
                              <form action={onDeleteActionItem}>
                                <input type="hidden" name="itemId" value={item.id} />
                                <GlassButton
                                  size="sm"
                                  className="h-8 border-rose-200 bg-rose-50 px-3 text-xs text-rose-700 hover:bg-rose-100"
                                >
                                  Delete
                                </GlassButton>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
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
            onClick={() => updateParams({ actionPage: String(result.page - 1) })}
            className="inline-flex h-8 items-center rounded-lg border border-white/35 bg-white/70 px-2.5 text-xs disabled:opacity-50"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Prev
          </button>
          <button
            type="button"
            disabled={result.page >= result.pageCount}
            onClick={() => updateParams({ actionPage: String(result.page + 1) })}
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
