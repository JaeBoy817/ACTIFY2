import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export type DashboardModuleKey = DashboardCommandCenterSummary["quickActions"][number]["module"];

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
    dot: "bg-blue-400",
    pill: "bg-blue-500/20",
    text: "text-blue-100",
    ring: "ring-blue-400/30"
  },
  attendance: {
    dot: "bg-sky-400",
    pill: "bg-sky-500/20",
    text: "text-sky-100",
    ring: "ring-sky-400/30"
  },
  notes: {
    dot: "bg-violet-400",
    pill: "bg-violet-500/20",
    text: "text-violet-100",
    ring: "ring-violet-400/30"
  },
  oneToOne: {
    dot: "bg-orange-400",
    pill: "bg-orange-500/20",
    text: "text-orange-100",
    ring: "ring-orange-400/30"
  },
  carePlan: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/20",
    text: "text-emerald-100",
    ring: "ring-emerald-400/30"
  },
  budgetStock: {
    dot: "bg-rose-400",
    pill: "bg-rose-500/20",
    text: "text-rose-100",
    ring: "ring-rose-400/30"
  },
  volunteers: {
    dot: "bg-fuchsia-400",
    pill: "bg-fuchsia-500/20",
    text: "text-fuchsia-100",
    ring: "ring-fuchsia-400/30"
  },
  residentCouncil: {
    dot: "bg-amber-400",
    pill: "bg-amber-500/20",
    text: "text-amber-100",
    ring: "ring-amber-400/30"
  },
  reports: {
    dot: "bg-zinc-300",
    pill: "bg-zinc-500/20",
    text: "text-zinc-100",
    ring: "ring-zinc-400/30"
  },
  residents: {
    dot: "bg-cyan-400",
    pill: "bg-cyan-500/20",
    text: "text-cyan-100",
    ring: "ring-cyan-400/30"
  }
};

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
