"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BudgetStockItemDTO } from "@/lib/budget-stock/types";
import { cn } from "@/lib/utils";

function currency(value: number | null) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function InventoryListRow({
  item,
  disabled,
  onAdjust,
  onClearStock,
  onDeleteItem
}: {
  item: BudgetStockItemDTO;
  disabled?: boolean;
  onAdjust: (itemId: string, delta: number) => void;
  onClearStock?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const low = item.status === "low";

  return (
    <div className="glass-panel rounded-2xl border-white/20 p-3 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[210px]">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{item.name}</p>
            <Badge variant="outline" className="bg-white/60 text-[11px]">
              {item.category}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Par level: {item.parLevel}
            {item.unit ? ` ${item.unit}` : ""} · Threshold: {item.threshold}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">On hand</p>
            <p className="text-xl font-bold leading-none text-foreground">{item.onHand}</p>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "min-w-[56px] justify-center border text-[11px] uppercase tracking-wide",
              low ? "border-rose-200 bg-rose-100 text-rose-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"
            )}
          >
            {low ? "Low" : "Ok"}
          </Badge>

          <div className="flex items-center gap-1 rounded-xl border border-white/30 bg-white/60 p-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-white"
              disabled={disabled}
              onClick={() => onAdjust(item.id, -1)}
              aria-label={`Decrease ${item.name}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-white"
              disabled={disabled}
              onClick={() => onAdjust(item.id, 1)}
              aria-label={`Increase ${item.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((current) => !current)}
            className="h-8 px-2 text-xs"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Details
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 grid gap-2 rounded-xl border border-white/20 bg-white/50 p-3 text-xs text-foreground/80 sm:grid-cols-4">
          <div>
            <p className="uppercase tracking-wide text-foreground/60">Unit</p>
            <p className="font-medium text-foreground">{item.unit ?? "—"}</p>
          </div>
          <div>
            <p className="uppercase tracking-wide text-foreground/60">Cost / unit</p>
            <p className="font-medium text-foreground">{currency(item.costPerUnit)}</p>
          </div>
          <div>
            <p className="uppercase tracking-wide text-foreground/60">Vendor</p>
            <p className="font-medium text-foreground">{item.vendor ?? "—"}</p>
          </div>
          <div>
            <p className="uppercase tracking-wide text-foreground/60">Suggested reorder</p>
            <p className="font-medium text-foreground">{item.suggestedReorderQty}</p>
          </div>
          <div className="sm:col-span-4 mt-1 flex flex-wrap justify-end gap-2 border-t border-white/25 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-white/70"
              disabled={disabled || item.onHand <= 0 || !onClearStock}
              onClick={() => {
                if (!onClearStock) return;
                if (!window.confirm(`Clear all stock for "${item.name}"?`)) return;
                onClearStock(item.id);
              }}
            >
              Clear Stock
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={disabled || !onDeleteItem}
              onClick={() => {
                if (!onDeleteItem) return;
                if (!window.confirm(`Delete "${item.name}" from active inventory?`)) return;
                onDeleteItem(item.id);
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete Item
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
