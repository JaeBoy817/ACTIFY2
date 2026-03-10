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
    dot: "bg-emerald-300",
    pill: "bg-emerald-500/20",
    text: "text-emerald-100",
    ring: "ring-emerald-400/30"
  },
  attendance: {
    dot: "bg-teal-300",
    pill: "bg-teal-500/20",
    text: "text-teal-100",
    ring: "ring-teal-400/30"
  },
  notes: {
    dot: "bg-emerald-300",
    pill: "bg-emerald-500/20",
    text: "text-emerald-100",
    ring: "ring-emerald-400/30"
  },
  oneToOne: {
    dot: "bg-lime-300",
    pill: "bg-lime-500/20",
    text: "text-lime-100",
    ring: "ring-lime-400/30"
  },
  carePlan: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/20",
    text: "text-emerald-100",
    ring: "ring-emerald-400/30"
  },
  budgetStock: {
    dot: "bg-emerald-300",
    pill: "bg-emerald-500/20",
    text: "text-emerald-100",
    ring: "ring-emerald-400/30"
  },
  volunteers: {
    dot: "bg-teal-300",
    pill: "bg-teal-500/20",
    text: "text-teal-100",
    ring: "ring-teal-400/30"
  },
  residentCouncil: {
    dot: "bg-lime-300",
    pill: "bg-lime-500/20",
    text: "text-lime-100",
    ring: "ring-lime-400/30"
  },
  reports: {
    dot: "bg-emerald-200",
    pill: "bg-emerald-500/20",
    text: "text-emerald-100",
    ring: "ring-emerald-400/30"
  },
  residents: {
    dot: "bg-teal-300",
    pill: "bg-teal-500/20",
    text: "text-teal-100",
    ring: "ring-teal-400/30"
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
