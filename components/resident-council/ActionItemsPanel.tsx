"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CalendarClock, CheckCircle2, ListTodo, Search } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ResidentCouncilActionItemDTO, ResidentCouncilMeetingDTO } from "@/lib/resident-council/types";

type DueFilter = "ALL" | "OVERDUE" | "DUE_SOON" | "NO_DUE";

type ActionFn = (formData: FormData) => Promise<void>;

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function dueBucket(value: string | null): DueFilter {
  if (!value) return "NO_DUE";
  const due = new Date(`${value}T23:59:59`);
  if (Number.isNaN(due.getTime())) return "ALL";
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const delta = Math.ceil((due.getTime() - now.getTime()) / dayMs);
  if (delta < 0) return "OVERDUE";
  if (delta <= 7) return "DUE_SOON";
  return "ALL";
}

export function ActionItemsPanel({
  items,
  meetings,
  canEdit,
  onUpdateActionItem,
  onDeleteActionItem,
  onBulkUpdateActionItems
}: {
  items: ResidentCouncilActionItemDTO[];
  meetings: Array<Pick<ResidentCouncilMeetingDTO, "id" | "heldAt">>;
  canEdit: boolean;
  onUpdateActionItem: ActionFn;
  onDeleteActionItem: ActionFn;
  onBulkUpdateActionItems: ActionFn;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNRESOLVED" | "RESOLVED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [ownerFilter, setOwnerFilter] = useState<string>("ALL");
  const [dueFilter, setDueFilter] = useState<DueFilter>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [items]);

  const owners = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.owner).filter((value): value is string => Boolean(value)))).sort(
      (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [items]);

  const meetingMap = useMemo(() => {
    const next = new Map<string, string>();
    for (const meeting of meetings) {
      next.set(meeting.id, new Date(meeting.heldAt).toLocaleDateString());
    }
    return next;
  }, [meetings]);

  const filtered = useMemo(() => {
    const token = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (ownerFilter !== "ALL" && (item.owner ?? "") !== ownerFilter) return false;
      if (dueFilter !== "ALL") {
        const bucket = dueBucket(item.dueDate);
        if (dueFilter === "NO_DUE") {
          if (bucket !== "NO_DUE") return false;
        } else if (bucket !== dueFilter) {
          return false;
        }
      }
      if (!token) return true;
      const haystack = [item.concern, item.followUp ?? "", item.category, item.owner ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(token);
    });
  }, [items, statusFilter, categoryFilter, ownerFilter, dueFilter, search]);

  const selectedCount = selectedIds.length;
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 134,
    overscan: 8
  });

  const unresolvedCount = filtered.filter((item) => item.status === "UNRESOLVED").length;
  const resolvedCount = filtered.length - unresolvedCount;

  function toggleSelect(itemId: string) {
    setSelectedIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filtered.map((item) => item.id));
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
            <ListTodo className="h-4 w-4 text-actifyBlue" />
            Action Items
          </p>
          <p className="text-xs text-foreground/65">Filter by owner, due date, status, and category.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="destructive">Open {unresolvedCount}</Badge>
          <Badge variant="secondary">Done {resolvedCount}</Badge>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search concern, owner, or follow-up"
            className="bg-white/80 pl-8 shadow-lg shadow-black/10"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "ALL" | "UNRESOLVED" | "RESOLVED")}
          className="h-10 rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
        >
          <option value="ALL">All statuses</option>
          <option value="UNRESOLVED">Unresolved</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
        >
          <option value="ALL">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          className="h-10 rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
        >
          <option value="ALL">All owners</option>
          {owners.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 md:grid-cols-[220px_1fr]">
        <select
          value={dueFilter}
          onChange={(event) => setDueFilter(event.target.value as DueFilter)}
          className="h-10 rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
        >
          <option value="ALL">All due dates</option>
          <option value="OVERDUE">Overdue</option>
          <option value="DUE_SOON">Due in 7 days</option>
          <option value="NO_DUE">No due date</option>
        </select>

        {canEdit ? (
          <form action={onBulkUpdateActionItems} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/35 bg-white/75 p-2.5">
            {selectedIds.map((itemId) => (
              <input key={itemId} type="hidden" name="itemIds" value={itemId} />
            ))}
            <Badge variant="outline" className="bg-white/80">Selected {selectedCount}</Badge>
            <select
              name="status"
              defaultValue=""
              className="h-8 rounded-md border border-white/35 bg-white/95 px-2 text-xs"
              disabled={selectedCount === 0}
            >
              <option value="">Status unchanged</option>
              <option value="UNRESOLVED">Set unresolved</option>
              <option value="RESOLVED">Set resolved</option>
            </select>
            <Input
              name="owner"
              placeholder="Owner"
              className="h-8 w-[140px] bg-white/95 text-xs"
              disabled={selectedCount === 0}
            />
            <Input
              type="date"
              name="dueDate"
              className="h-8 w-[150px] bg-white/95 text-xs"
              disabled={selectedCount === 0}
            />
            <GlassButton type="submit" size="sm" disabled={selectedCount === 0}>Apply bulk update</GlassButton>
          </form>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/40 bg-white/60 px-3 py-8 text-center text-sm text-foreground/70">
          No action items found for this filter.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-white/35 bg-white/70 px-3 py-2 text-xs text-foreground/75">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={selectedCount > 0 && selectedCount === filtered.length}
                onChange={(event) => toggleSelectAll(event.currentTarget.checked)}
                disabled={!canEdit}
              />
              Select all visible
            </label>
            <span>{filtered.length} item(s)</span>
          </div>

          <div ref={scrollRef} className="max-h-[72vh] overflow-y-auto pr-1">
            <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              {rowVirtualizer.getVirtualItems().map((row) => {
                const item = filtered[row.index];
                if (!item) return null;
                const selected = selectedIds.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className="absolute left-0 top-0 w-full pb-2"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    <div className="rounded-xl border border-white/40 bg-white/80 p-3 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {canEdit ? (
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSelect(item.id)}
                                className="h-4 w-4"
                              />
                            ) : null}
                            <p className="text-sm font-medium text-foreground">{item.concern}</p>
                            <Badge variant={item.status === "RESOLVED" ? "secondary" : "destructive"}>{item.status}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
                            <Badge variant="outline" className="bg-white/85">{item.category}</Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.section === "OLD" ? "Old" : "New"}
                            </Badge>
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {formatDate(item.dueDate)}
                            </span>
                            {item.owner ? <span>Owner: {item.owner}</span> : null}
                            <Link
                              href={`/app/resident-council?view=meetings&meetingId=${encodeURIComponent(item.meetingId)}`}
                              className="text-actifyBlue underline-offset-2 hover:underline"
                            >
                              Meeting {meetingMap.get(item.meetingId) ?? "View"}
                            </Link>
                          </div>
                          {item.followUp ? <p className="mt-1 text-xs text-foreground/70">{item.followUp}</p> : null}
                        </div>
                        {canEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <form action={onUpdateActionItem}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <input type="hidden" name="section" value={item.section} />
                              <input type="hidden" name="status" value={item.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED"} />
                              <input type="hidden" name="owner" value={item.owner ?? ""} />
                              <input type="hidden" name="dueDate" value={item.dueDate ?? ""} />
                              <input type="hidden" name="followUp" value={item.followUp ?? ""} />
                              <GlassButton type="submit" size="sm" variant="dense" className="h-8 px-3 text-xs">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                {item.status === "RESOLVED" ? "Reopen" : "Resolve"}
                              </GlassButton>
                            </form>
                            <form action={onDeleteActionItem}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <GlassButton
                                type="submit"
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
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
