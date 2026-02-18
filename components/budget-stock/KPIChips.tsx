import type { ReactNode } from "react";
import { AlertTriangle, PiggyBank, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { BudgetStockMonthSummary } from "@/lib/budget-stock/types";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function Chip({
  label,
  value,
  icon,
  tone
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="glass-panel flex min-w-[150px] items-center gap-2 rounded-full border-white/20 px-3 py-2 shadow-lg shadow-black/10">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 ${tone}`}>{icon}</span>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-foreground/70">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function KPIChips({ summary }: { summary: BudgetStockMonthSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        label="Spent"
        value={currency(summary.spent)}
        icon={<Wallet className="h-4 w-4 text-rose-700" />}
        tone="bg-rose-100 ring-rose-200"
      />
      <Chip
        label="Remaining"
        value={currency(summary.remaining)}
        icon={<PiggyBank className="h-4 w-4 text-emerald-700" />}
        tone="bg-emerald-100 ring-emerald-200"
      />
      <Chip
        label="Low Stock"
        value={String(summary.lowStockCount)}
        icon={<AlertTriangle className="h-4 w-4 text-amber-700" />}
        tone="bg-amber-100 ring-amber-200"
      />
      <Badge variant="outline" className="ml-1 bg-white/70 text-xs">
        Month: {summary.monthKey}
      </Badge>
    </div>
  );
}
