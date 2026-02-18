"use client";

import { useMemo, useState, useTransition } from "react";
import { Boxes } from "lucide-react";

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
import { useToast } from "@/lib/use-toast";

export function AdjustStockModal({
  items,
  disabled,
  onAdjust
}: {
  items: BudgetStockItemDTO[];
  disabled?: boolean;
  onAdjust: (itemId: string, delta: number) => Promise<void>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [deltaRaw, setDeltaRaw] = useState("1");
  const [isPending, startTransition] = useTransition();

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const submit = () => {
    if (!selectedId) {
      toast({ title: "Select an item first", variant: "destructive" });
      return;
    }
    const delta = Math.round(Number(deltaRaw));
    if (!Number.isFinite(delta) || delta === 0) {
      toast({ title: "Adjustment must be a non-zero number", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        await onAdjust(selectedId, delta);
        setOpen(false);
        setDeltaRaw("1");
        toast({ title: "Stock adjusted" });
      } catch (error) {
        toast({
          title: "Could not adjust stock",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled}>
          <Boxes className="mr-1 h-4 w-4" />
          + Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>Choose an item and apply a positive or negative quantity adjustment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-foreground">Item</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-white/25 bg-white/70 px-3 text-sm"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category}) · on hand {item.onHand}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-foreground">Delta</span>
            <Input
              value={deltaRaw}
              onChange={(event) => setDeltaRaw(event.target.value)}
              type="number"
              step="1"
              className="mt-1 bg-white/70"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use positive numbers to add stock and negative numbers to reduce stock.
            </p>
          </label>

          {selectedItem ? (
            <div className="rounded-xl border border-white/25 bg-white/50 p-3 text-xs text-foreground/75">
              Current on hand: <span className="font-semibold text-foreground">{selectedItem.onHand}</span> · Par level:{" "}
              <span className="font-semibold text-foreground">{selectedItem.parLevel}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="bg-white/70" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
