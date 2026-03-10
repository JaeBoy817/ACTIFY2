import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export type DashboardModuleKey = DashboardCommandCenterSummary["quickActions"][number]["module"];

export const DEFAULT_MODULE_TONE = {
  dot: "bg-zinc-300",
  pill: "bg-zinc-400/20",
  text: "text-zinc-100",
  ring: "ring-zinc-300/35"
} as const;

export const MODULE_TONE: Record<
  DashboardModuleKey,
  {
    dot: string;
    pill: string;
    text: string;
    ring: string;
  }
> = {
  calendar: {
    dot: "bg-blue-300",
    pill: "bg-blue-500/18",
    text: "text-blue-100",
    ring: "ring-blue-400/35"
  },
  attendance: {
    dot: "bg-sky-300",
    pill: "bg-sky-500/20",
    text: "text-sky-100",
    ring: "ring-sky-400/35"
  },
  notes: {
    dot: "bg-violet-300",
    pill: "bg-violet-500/20",
    text: "text-violet-100",
    ring: "ring-violet-400/35"
  },
  oneToOne: {
    dot: "bg-orange-300",
    pill: "bg-orange-500/20",
    text: "text-orange-100",
    ring: "ring-orange-400/35"
  },
  carePlan: {
    dot: "bg-emerald-300",
    pill: "bg-emerald-500/20",
    text: "text-emerald-100",
    ring: "ring-emerald-400/35"
  },
  budgetStock: {
    dot: "bg-rose-300",
    pill: "bg-rose-500/18",
    text: "text-rose-100",
    ring: "ring-rose-400/35"
  },
  volunteers: {
    dot: "bg-fuchsia-300",
    pill: "bg-fuchsia-500/18",
    text: "text-fuchsia-100",
    ring: "ring-fuchsia-400/35"
  },
  residentCouncil: {
    dot: "bg-amber-300",
    pill: "bg-amber-500/18",
    text: "text-amber-100",
    ring: "ring-amber-400/35"
  },
  reports: {
    dot: "bg-zinc-300",
    pill: "bg-zinc-400/20",
    text: "text-zinc-100",
    ring: "ring-zinc-300/35"
  },
  residents: {
    dot: "bg-cyan-300",
    pill: "bg-cyan-500/18",
    text: "text-cyan-100",
    ring: "ring-cyan-400/35"
  }
};

export function moduleToneFor(moduleKey: string | undefined | null) {
  if (!moduleKey) return DEFAULT_MODULE_TONE;
  return (MODULE_TONE as Record<string, typeof DEFAULT_MODULE_TONE>)[moduleKey] ?? DEFAULT_MODULE_TONE;
}

export function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
