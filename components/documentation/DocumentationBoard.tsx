import { Clock3, FileWarning, UserRound } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { DocumentationListRow, DocumentationStatus } from "@/lib/documentation/types";

const COLUMN_ORDER: DocumentationStatus[] = ["DRAFT", "IN_PROGRESS", "READY_REVIEW", "COMPLETED"];

const COLUMN_LABELS: Record<DocumentationStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  READY_REVIEW: "Ready to Review",
  COMPLETED: "Completed"
};

const STATUS_TONE: Record<DocumentationStatus, string> = {
  DRAFT: "border-amber-400/45 bg-amber-500/16 text-amber-100",
  IN_PROGRESS: "border-sky-400/45 bg-sky-500/16 text-sky-100",
  READY_REVIEW: "border-violet-400/45 bg-violet-500/16 text-violet-100",
  COMPLETED: "border-emerald-400/45 bg-emerald-500/16 text-emerald-100"
};

function resolveEntryHref(row: DocumentationListRow) {
  if (row.kind === "PROGRESS") return `/app/documentation/progress-notes/${encodeURIComponent(row.id)}`;
  if (row.kind === "ONE_TO_ONE") return `/app/documentation/one-to-one/${encodeURIComponent(row.id)}`;
  if (row.kind === "UDA") return `/app/documentation/uda/${encodeURIComponent(row.id)}`;
  return `/app/documentation/mds/${encodeURIComponent(row.id)}`;
}

function typeLabel(row: DocumentationListRow) {
  if (row.kind === "PROGRESS") return "Progress";
  if (row.kind === "ONE_TO_ONE") return "1:1";
  if (row.kind === "UDA") return "UDA";
  return "MDS";
}

export function DocumentationBoard({
  columns
}: {
  columns: Record<DocumentationStatus, DocumentationListRow[]>;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {COLUMN_ORDER.map((status) => (
        <section key={status} className="rounded-2xl border border-[#21365b] bg-[#091325] p-3">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">{COLUMN_LABELS[status]}</h3>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[status])}>
              {columns[status]?.length ?? 0}
            </span>
          </header>
          <div className="space-y-2">
            {(columns[status] ?? []).slice(0, 8).map((row) => (
              <Link
                key={row.id}
                href={resolveEntryHref(row)}
                className="block rounded-xl border border-[#2a426b] bg-[#0f1d35] p-3 transition hover:-translate-y-px hover:border-[#4f71ab]"
              >
                <p className="truncate text-sm font-semibold text-white">{row.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[#9eb4d8]">{row.summary || "No summary provided."}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[#b9ceef]">
                  <span className="rounded-full border border-[#324f7b] bg-[#11233f] px-2 py-0.5">{typeLabel(row)}</span>
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-3 w-3" />
                    {row.residentName}
                  </span>
                  <span>Rm {row.residentRoom}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#9db2d6]">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {new Date(row.createdAtIso).toLocaleDateString()}
                  </span>
                  {row.dueDateIso ? (
                    <span className="inline-flex items-center gap-1 text-amber-100">
                      <FileWarning className="h-3 w-3" />
                      Due {new Date(row.dueDateIso).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
            {(columns[status] ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2a426b] bg-[#0b172d] p-3 text-xs text-[#8da3cb]">
                No items in this column.
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

