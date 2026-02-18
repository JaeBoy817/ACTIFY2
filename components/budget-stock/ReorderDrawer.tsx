"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, Download, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BudgetStockItemDTO } from "@/lib/budget-stock/types";

type DraftMap = Record<string, number>;

function toCsv(items: Array<{ name: string; category: string; onHand: number; parLevel: number; reorderQty: number }>) {
  const rows = [
    ["Item", "Category", "On Hand", "Par Level", "Suggested Reorder Qty"],
    ...items.map((item) => [item.name, item.category, String(item.onHand), String(item.parLevel), String(item.reorderQty)])
  ];
  return rows
    .map((columns) =>
      columns
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

export function ReorderDrawer({ lowItems }: { lowItems: BudgetStockItemDTO[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftMap>({});

  const rows = useMemo(
    () =>
      lowItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        onHand: item.onHand,
        parLevel: item.parLevel,
        reorderQty: Math.max(draft[item.id] ?? item.suggestedReorderQty, 0)
      })),
    [draft, lowItems]
  );

  const totalUnits = rows.reduce((sum, row) => sum + row.reorderQty, 0);

  const copyAsText = async () => {
    const lines = rows.map((row) => `- ${row.name} (${row.category}): reorder ${row.reorderQty}`);
    const text = `Reorder List (${rows.length} items)\n${lines.join("\n")}`;
    await navigator.clipboard.writeText(text);
  };

  const exportCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reorder-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="bg-white/70">
          <ListChecks className="mr-1 h-4 w-4" />
          Reorder List ({lowItems.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Low Stock Reorder List</DialogTitle>
          <DialogDescription>
            Suggested quantity defaults to <code>par level - on hand</code>. Edit any value before copying/exporting.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto rounded-xl border border-white/20 bg-white/40 p-2">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/40 bg-white/60 p-4 text-sm text-muted-foreground">
              No low stock items right now.
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="glass-panel rounded-xl border-white/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.category} · On hand {row.onHand} · Par {row.parLevel}
                    </p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min={0}
                      value={row.reorderQty}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setDraft((current) => ({
                          ...current,
                          [row.id]: Number.isFinite(next) ? Math.max(Math.round(next), 0) : 0
                        }));
                      }}
                      aria-label={`Reorder quantity for ${row.name}`}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="items-center justify-between">
          <p className="text-xs text-muted-foreground">Total reorder units: {totalUnits}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="bg-white/70" onClick={copyAsText} disabled={rows.length === 0}>
              <ClipboardCopy className="mr-1 h-4 w-4" />
              Copy as text
            </Button>
            <Button type="button" variant="outline" className="bg-white/70" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
