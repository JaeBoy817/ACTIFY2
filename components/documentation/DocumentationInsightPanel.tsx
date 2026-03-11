import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import type { ComponentType } from "react";

import type { DocumentationListRow } from "@/lib/documentation/types";

type InsightListProps = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: DocumentationListRow[];
  emptyLabel: string;
};

function entryHref(row: DocumentationListRow) {
  if (row.kind === "PROGRESS") return `/app/documentation/progress-notes/${encodeURIComponent(row.id)}`;
  if (row.kind === "ONE_TO_ONE") return `/app/documentation/one-to-one/${encodeURIComponent(row.id)}`;
  if (row.kind === "UDA") return `/app/documentation/uda/${encodeURIComponent(row.id)}`;
  return `/app/documentation/mds/${encodeURIComponent(row.id)}`;
}

function InsightList({ title, icon: Icon, items, emptyLabel }: InsightListProps) {
  return (
    <section className="rounded-2xl border border-[#233a60] bg-[#091426] p-3">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#9cb4da]">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="mt-2 space-y-1.5">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#314c78] bg-[#10203a] px-2 py-2 text-xs text-[#90a8cf]">{emptyLabel}</p>
        ) : (
          items.slice(0, 6).map((row) => (
            <Link
              key={row.id}
              href={entryHref(row)}
              className="block rounded-lg border border-[#2d466f] bg-[#10213d] px-2.5 py-2 text-xs text-[#d3e3ff] transition hover:border-[#496aa2]"
            >
              <p className="truncate font-semibold text-white">{row.residentName}</p>
              <p className="mt-0.5 truncate text-[#9bb2d7]">{row.summary || "No narrative summary."}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

export function DocumentationInsightPanel({
  completionPercentage,
  oneToOneDue,
  recentProgress,
  udaDue,
  mdsDue
}: {
  completionPercentage: number;
  oneToOneDue: DocumentationListRow[];
  recentProgress: DocumentationListRow[];
  udaDue: DocumentationListRow[];
  mdsDue: DocumentationListRow[];
}) {
  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border border-[#24406b] bg-[#0a1529] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93abd2]">Compliance Snapshot</p>
        <p className="mt-2 text-3xl font-black text-white">{completionPercentage}%</p>
        <p className="text-xs text-[#9db4d9]">Completed documentation this month</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full border border-[#2f4a76] bg-[#10223f]">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#34d399_0%,#22d3ee_55%,#60a5fa_100%)]" style={{ width: `${completionPercentage}%` }} />
        </div>
      </section>

      <InsightList title="Residents Due for 1:1" icon={AlertTriangle} items={oneToOneDue} emptyLabel="All residents are on track." />
      <InsightList title="Recent Progress Notes" icon={ClipboardList} items={recentProgress} emptyLabel="No recent progress notes." />
      <InsightList title="UDA Reviews Due" icon={Clock3} items={udaDue} emptyLabel="No UDA due items." />
      <InsightList title="MDS Deadlines" icon={CheckCircle2} items={mdsDue} emptyLabel="No MDS deadlines queued." />
    </aside>
  );
}
