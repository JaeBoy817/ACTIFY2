"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CalendarDays, FileText, Filter, Search, UserRoundPen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NotesListRow } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type ResidentFilterOption = {
  id: string;
  name: string;
  room: string;
};

type AuthorFilterOption = {
  id: string;
  name: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function NotesListWorkspace({
  initialNotes,
  residents,
  authors
}: {
  initialNotes: NotesListRow[];
  residents: ResidentFilterOption[];
  authors: AuthorFilterOption[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "general" | "1on1">("all");
  const [residentFilter, setResidentFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "signed" | "draft">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftRows, setDraftRows] = useState<NotesListRow[]>([]);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    const residentMap = new Map(residents.map((resident) => [resident.id, resident]));
    const rows: NotesListRow[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("actify:note:draft:")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          noteType?: string;
          title?: string;
          occurredAt?: string;
          residentId?: string;
          tags?: string[];
          narrative?: string;
          updatedAt?: number;
        };
        const resident = parsed.residentId ? residentMap.get(parsed.residentId) : undefined;
        const createdAt = parsed.occurredAt || (parsed.updatedAt ? new Date(parsed.updatedAt).toISOString() : new Date().toISOString());
        rows.push({
          id: `draft:${key}`,
          createdAt,
          noteType: parsed.noteType === "1on1" ? "1on1" : "general",
          residentId: (parsed.residentId ?? resident?.id ?? "").trim(),
          residentName: resident?.name ?? "Unlinked",
          residentRoom: resident?.room ?? "-",
          createdByName: "Draft",
          title: parsed.title?.trim() || "Unsaved draft",
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          status: "Draft",
          narrativeBody: parsed.narrative?.trim() || "Draft note"
        });
      } catch {
        // ignore malformed local drafts
      }
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setDraftRows(rows);
  }, [residents]);

  const rowsForFiltering = useMemo(() => [...draftRows, ...initialNotes], [draftRows, initialNotes]);

  const allTags = useMemo(() => {
    return Array.from(new Set(rowsForFiltering.flatMap((note) => note.tags))).sort((a, b) => a.localeCompare(b));
  }, [rowsForFiltering]);

  const filteredNotes = useMemo(() => {
    return rowsForFiltering.filter((note) => {
      if (typeFilter !== "all" && note.noteType !== typeFilter) return false;
      if (residentFilter !== "all" && note.residentId !== residentFilter) return false;
      if (authorFilter !== "all" && note.createdByName !== authorFilter) return false;
      if (tagFilter !== "all" && !note.tags.includes(tagFilter)) return false;
      if (statusFilter === "signed" && note.status !== "Signed") return false;
      if (statusFilter === "draft" && note.status !== "Draft") return false;

      if (from || to) {
        const createdAt = new Date(note.createdAt).getTime();
        if (from) {
          const min = new Date(`${from}T00:00:00`).getTime();
          if (!Number.isNaN(min) && createdAt < min) return false;
        }
        if (to) {
          const max = new Date(`${to}T23:59:59`).getTime();
          if (!Number.isNaN(max) && createdAt > max) return false;
        }
      }

      if (!deferredSearch) return true;
      const text = `${note.title} ${note.narrativeBody} ${note.residentName} ${note.residentRoom} ${note.createdByName} ${note.tags.join(" ")}`.toLowerCase();
      return text.includes(deferredSearch);
    });
  }, [authorFilter, deferredSearch, from, residentFilter, rowsForFiltering, statusFilter, tagFilter, to, typeFilter]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 8
  });

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl border-white/20 p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_220px_220px_180px_160px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes, residents, tags"
              className="pl-9"
            />
          </label>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | "general" | "1on1")}
            className="h-10 rounded-md border border-white/35 bg-white/80 px-3 text-sm shadow-sm"
          >
            <option value="all">All note types</option>
            <option value="general">General</option>
            <option value="1on1">1:1</option>
          </select>

          <select
            value={residentFilter}
            onChange={(event) => setResidentFilter(event.target.value)}
            className="h-10 rounded-md border border-white/35 bg-white/80 px-3 text-sm shadow-sm"
          >
            <option value="all">All residents</option>
            {residents.map((resident) => (
              <option key={resident.id} value={resident.id}>
                {resident.name} · Room {resident.room}
              </option>
            ))}
          </select>

          <select
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            className="h-10 rounded-md border border-white/35 bg-white/80 px-3 text-sm shadow-sm"
          >
            <option value="all">All authors</option>
            {authors.map((author) => (
              <option key={author.id} value={author.name}>
                {author.name}
              </option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="h-10 rounded-md border border-white/35 bg-white/80 px-3 text-sm shadow-sm"
          >
            <option value="all">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "signed" | "draft")}
            className="h-10 rounded-md border border-white/35 bg-white/80 px-3 text-sm shadow-sm"
          >
            <option value="all">All statuses</option>
            <option value="signed">Signed</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-foreground/70">
            From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="ml-1.5 h-8 rounded-md border border-white/35 bg-white/80 px-2 text-xs" />
          </label>
          <label className="text-xs font-medium text-foreground/70">
            To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="ml-1.5 h-8 rounded-md border border-white/35 bg-white/80 px-2 text-xs" />
          </label>
          <Button type="button" variant="outline" size="sm" className="bg-white/80" onClick={() => {
            setTypeFilter("all");
            setResidentFilter("all");
            setAuthorFilter("all");
            setTagFilter("all");
            setStatusFilter("all");
            setFrom("");
            setTo("");
            setSearch("");
          }}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
          <Badge variant="outline" className="border-white/35 bg-white/70">
            {filteredNotes.length} notes
          </Badge>
        </div>
      </section>

      <section className="glass-panel rounded-2xl border-white/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-[var(--font-display)] text-2xl text-foreground">Notes</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="bg-white/80">
              <Link href="/app/notes/new?type=general">
                <FileText className="mr-1.5 h-4 w-4" />
                General Note
              </Link>
            </Button>
            <Button asChild>
              <Link href="/app/notes/new?type=1on1">
                <UserRoundPen className="mr-1.5 h-4 w-4" />
                1:1 Note
              </Link>
            </Button>
          </div>
        </div>

        <div ref={parentRef} className="h-[68vh] min-h-[420px] overflow-auto rounded-xl border border-white/20 bg-white/45 p-2">
          {filteredNotes.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/35 bg-white/70 text-sm text-muted-foreground">
              No notes match this filter.
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative"
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const note = filteredNotes[virtualRow.index];
                if (!note) return null;
                const href = note.status === "Draft"
                  ? `/app/notes/new?type=${note.noteType}${note.noteType === "1on1" && note.residentId ? `&residentId=${encodeURIComponent(note.residentId)}` : ""}`
                  : `/app/notes/new?noteId=${note.id}&type=${note.noteType}`;

                return (
                  <div
                    key={note.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                    className="px-1 py-1"
                  >
                    <Link href={href} className="block rounded-xl border border-white/30 bg-white/80 px-3 py-2.5 transition hover:bg-white">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{note.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{note.narrativeBody}</p>
                        </div>
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          note.status === "Draft"
                            ? "border-amber-300 bg-amber-100 text-amber-700"
                            : "border-emerald-300 bg-emerald-100 text-emerald-700"
                        )}>
                          {note.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(note.createdAt)}
                        </span>
                        <span>· {note.noteType === "1on1" ? "1:1" : "General"}</span>
                        <span>· {note.residentName} (Room {note.residentRoom})</span>
                        <span>· {note.createdByName}</span>
                      </div>

                      {note.tags.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {note.tags.slice(0, 6).map((tag) => (
                            <span key={`${note.id}-${tag}`} className="rounded-full border border-pink-300 bg-pink-100 px-2 py-0.5 text-[11px] text-pink-700">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
