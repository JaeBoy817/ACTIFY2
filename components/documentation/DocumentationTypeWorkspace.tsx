"use client";

import { CalendarDays, LayoutGrid, List, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { DocumentationBoard } from "@/components/documentation/DocumentationBoard";
import { cn } from "@/lib/utils";
import type {
  DocumentationComplianceStatus,
  DocumentationKind,
  DocumentationListRow,
  DocumentationStatus
} from "@/lib/documentation/types";

type ViewMode = "board" | "list" | "due";

function entryHref(row: DocumentationListRow) {
  if (row.openHref) return row.openHref;
  if (row.kind === "PROGRESS") return `/app/documentation/progress-notes/${encodeURIComponent(row.id)}`;
  if (row.kind === "ONE_TO_ONE") return `/app/documentation/one-to-one/${encodeURIComponent(row.id)}`;
  if (row.kind === "UDA") return `/app/documentation/uda/${encodeURIComponent(row.id)}`;
  return `/app/documentation/mds/${encodeURIComponent(row.id)}`;
}

const COMPLIANCE_LABEL: Record<DocumentationComplianceStatus, string> = {
  CURRENT: "Current",
  DUE_SOON: "Due Soon",
  DUE_THIS_MONTH: "Due This Month",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
  MISSING: "Missing",
  FOLLOW_UP_NEEDED: "Follow-Up Needed"
};

function defaultColumns(): Record<DocumentationStatus, DocumentationListRow[]> {
  return {
    DRAFT: [],
    IN_PROGRESS: [],
    READY_REVIEW: [],
    COMPLETED: []
  };
}

export function DocumentationTypeWorkspace({
  rows,
  newHref
}: {
  kind?: DocumentationKind | "ALL";
  rows: DocumentationListRow[];
  newHref: string;
}) {
  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | DocumentationStatus>("all");
  const [compliance, setCompliance] = useState<"all" | DocumentationComplianceStatus>("all");

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (compliance !== "all" && row.complianceStatus !== compliance) return false;
      if (!deferredQuery) return true;
      const haystack = `${row.title} ${row.summary} ${row.residentName} ${row.residentRoom} ${row.authorName} ${row.complianceStatus ?? ""}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [compliance, deferredQuery, rows, status]);

  const columns = useMemo(() => {
    const data = defaultColumns();
    for (const row of filtered) {
      data[row.status].push(row);
    }
    return data;
  }, [filtered]);

  const dueRows = useMemo(() => {
    return filtered.filter((row) => row.dueDateIso).sort((a, b) => {
      const aTime = new Date(a.dueDateIso as string).getTime();
      const bTime = new Date(b.dueDateIso as string).getTime();
      return aTime - bTime;
    });
  }, [filtered]);

  return (
    <section className="rounded-2xl border border-[#1f3152] bg-[linear-gradient(180deg,#091224_0%,#0a1427_100%)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa6cd]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search resident, author, narrative"
            className="h-10 w-full rounded-full border border-[#2f4269] bg-[#0f1d35] pl-9 pr-3 text-sm text-[#dceaff] placeholder:text-[#7f97bf]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | DocumentationStatus)}
            className="h-10 rounded-full border border-[#2f4269] bg-[#0f1d35] px-3 text-xs font-semibold text-[#dceaff]"
          >
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY_REVIEW">Ready to Review</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            value={compliance}
            onChange={(event) => setCompliance(event.target.value as "all" | DocumentationComplianceStatus)}
            className="h-10 rounded-full border border-[#2f4269] bg-[#0f1d35] px-3 text-xs font-semibold text-[#dceaff]"
          >
            <option value="all">All Due Status</option>
            <option value="CURRENT">Current</option>
            <option value="DUE_SOON">Due Soon</option>
            <option value="DUE_THIS_MONTH">Due This Month</option>
            <option value="OVERDUE">Overdue</option>
            <option value="MISSING">Missing</option>
            <option value="FOLLOW_UP_NEEDED">Follow-Up Needed</option>
          </select>
          <div className="inline-flex rounded-full border border-[#2f4269] bg-[#0f1d35] p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition",
                view === "board" ? "bg-blue-500/30 text-white" : "text-[#a9bde0] hover:text-white"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition",
                view === "list" ? "bg-blue-500/30 text-white" : "text-[#a9bde0] hover:text-white"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView("due")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition",
                view === "due" ? "bg-blue-500/30 text-white" : "text-[#a9bde0] hover:text-white"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Due
            </button>
          </div>
          <Link
            href={newHref}
            className="inline-flex h-10 items-center rounded-full border border-blue-300/45 bg-[linear-gradient(180deg,#244170_0%,#1c3258_100%)] px-4 text-xs font-semibold text-white transition hover:-translate-y-px"
          >
            New Entry
          </Link>
        </div>
      </div>

      <div className="mt-4">
        {view === "board" ? <DocumentationBoard columns={columns} /> : null}

        {view === "list" ? (
          <div className="overflow-hidden rounded-xl border border-[#263b62]">
            <table className="w-full text-sm">
              <thead className="bg-[#0f1d35] text-left text-[11px] uppercase tracking-[0.12em] text-[#9cb2d8]">
                <tr>
                  <th className="px-3 py-2">Resident</th>
                  <th className="px-3 py-2">Summary</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Due Status</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Author</th>
                </tr>
              </thead>
              <tbody className="bg-[#091426]">
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-[#1d3255]">
                    <td className="px-3 py-2">
                      <Link href={entryHref(row)} className="font-semibold text-white hover:text-blue-100">
                        {row.residentName}
                      </Link>
                      <p className="text-xs text-[#9fb4d9]">Room {row.residentRoom}</p>
                    </td>
                    <td className="px-3 py-2 text-[#c8d9f6]">{row.summary || "-"}</td>
                    <td className="px-3 py-2 text-[#c8d9f6]">{row.status.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2 text-[#c8d9f6]">{row.complianceStatus ? COMPLIANCE_LABEL[row.complianceStatus] : "-"}</td>
                    <td className="px-3 py-2 text-[#9fb4d9]">{new Date(row.createdAtIso).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-[#9fb4d9]">{row.authorName}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-[#93a8cf]" colSpan={6}>
                      No entries found for the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {view === "due" ? (
          <div className="space-y-2">
            {dueRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2e446c] bg-[#0a172d] p-4 text-sm text-[#93a8cf]">
                No due-date entries in current filter.
              </div>
            ) : (
              dueRows.map((row) => (
                <Link
                  key={row.id}
                  href={entryHref(row)}
                  className="block rounded-xl border border-[#284068] bg-[#0d1b33] p-3 text-sm text-[#d0dff9] transition hover:border-[#4c6ca6]"
                >
                  <p className="font-semibold text-white">{row.residentName} · {row.title}</p>
                  <p className="mt-1 text-xs text-[#9eb4d8]">{row.summary}</p>
                  {row.complianceStatus ? (
                    <p className="mt-1 text-xs text-[#c7d7f4]">{COMPLIANCE_LABEL[row.complianceStatus]}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-amber-100">
                    Due {row.dueDateIso ? new Date(row.dueDateIso).toLocaleDateString() : "Not set"}
                  </p>
                </Link>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
