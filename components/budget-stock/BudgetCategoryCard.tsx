import { PiggyBank } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { BudgetStockCategoryDTO } from "@/lib/budget-stock/types";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function BudgetCategoryCard({
  category,
  editable,
  onLimitChange
}: {
  category: BudgetStockCategoryDTO;
  editable: boolean;
  onLimitChange?: (categoryId: string, monthlyLimit: number) => void;
}) {
  const over = category.remaining < 0;
  return (
    <div className="glass-panel rounded-2xl border-white/20 p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{category.name}</p>
          <p className="text-xs text-muted-foreground">Spent this month: {currency(category.spent)}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 ring-1 ring-indigo-200">
          <PiggyBank className="h-4 w-4 text-indigo-700" />
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <p className="uppercase tracking-wide text-foreground/60">Monthly limit</p>
          {editable && onLimitChange ? (
            <Input
              type="number"
              step="0.01"
              min={0}
              defaultValue={category.monthlyLimit.toFixed(2)}
              className="mt-1 h-8 text-xs"
              onBlur={(event) => {
                const parsed = Number(event.target.value);
                if (!Number.isFinite(parsed)) return;
                onLimitChange(category.id, Math.max(parsed, 0));
              }}
            />
          ) : (
            <p className="font-semibold text-foreground">{currency(category.monthlyLimit)}</p>
          )}
        </div>
        <div>
          <p className="uppercase tracking-wide text-foreground/60">Remaining</p>
          <p className={`font-semibold ${over ? "text-rose-700" : "text-emerald-700"}`}>{currency(category.remaining)}</p>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-white/60">
        <div className={`h-2 rounded-full ${over ? "bg-rose-500" : "bg-actifyBlue"}`} style={{ width: `${category.progressPercent}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{category.progressPercent.toFixed(1)}% used</p>
    </div>
  );
}
