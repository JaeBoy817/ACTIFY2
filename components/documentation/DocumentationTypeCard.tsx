import { ArrowRight, ClipboardPen, FileChartColumnIncreasing, FileText, UserRound } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import type { DocumentationKind, DocumentationOverviewCounts } from "@/lib/documentation/types";

const KIND_META: Record<
  DocumentationKind,
  {
    label: string;
    description: string;
    href: string;
    accentClass: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  PROGRESS: {
    label: "Progress Notes",
    description: "Daily and activity-based resident documentation.",
    href: "/app/documentation/progress-notes",
    accentClass: "from-blue-500/26 via-indigo-500/14 to-transparent",
    icon: ClipboardPen
  },
  ONE_TO_ONE: {
    label: "1:1 Notes",
    description: "Resident-specific visit charting and monthly coverage.",
    href: "/app/documentation/one-to-one",
    accentClass: "from-violet-500/26 via-fuchsia-500/14 to-transparent",
    icon: UserRound
  },
  UDA: {
    label: "UDA's",
    description: "Structured assessment documentation and updates.",
    href: "/app/documentation/uda",
    accentClass: "from-amber-500/26 via-orange-500/14 to-transparent",
    icon: FileText
  },
  MDS: {
    label: "MDS",
    description: "Deadline-aware MDS support and preference narratives.",
    href: "/app/documentation/mds",
    accentClass: "from-emerald-500/26 via-teal-500/14 to-transparent",
    icon: FileChartColumnIncreasing
  }
};

export function DocumentationTypeCard({
  kind,
  counts
}: {
  kind: DocumentationKind;
  counts: DocumentationOverviewCounts;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#1f3152] bg-[linear-gradient(180deg,#0a1224_0%,#0a1528_100%)] p-4 shadow-[0_20px_40px_-30px_rgba(56,189,248,0.6)]">
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b", meta.accentClass)} />
      <div className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/10" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-[#112038] text-[#d5e4ff]">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <Link href={meta.href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#c6d8f8] hover:text-white">
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <h3 className="mt-3 text-lg font-bold text-white">{meta.label}</h3>
        <p className="mt-1 text-xs text-[#9eb3d8]">{meta.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Metric label="This Month" value={String(counts.totalThisMonth)} />
          <Metric label="Draft" value={String(counts.draftCount)} />
          <Metric label="Completed" value={String(counts.completedCount)} />
          <Metric label="Due Soon" value={String(counts.dueSoonCount)} />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2b4066] bg-[#0f1e36] px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#8fa6cd]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
