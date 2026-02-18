"use client";

import { useMemo, useState, useTransition } from "react";
import { BadgeDollarSign } from "lucide-react";

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

type SellPayload = {
  itemId: string;
  qty: number;
  sellPricePerUnit: number;
  residentName?: string | null;
  note?: string | null;
  date?: string;
};

export function SellItemModal({
  items,
  disabled,
  onSell
}: {
  items: BudgetStockItemDTO[];
  disabled?: boolean;
  onSell: (payload: SellPayload) => Promise<void>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sellableItems = useMemo(
    () =>
      [...items]
        .filter((item) => item.onHand > 0)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [items]
  );
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [sellPricePerUnit, setSellPricePerUnit] = useState("");
  const [residentName, setResidentName] = useState("");
  const [note, setNote] = useState("");

  const selected = useMemo(() => sellableItems.find((item) => item.id === itemId) ?? null, [itemId, sellableItems]);

  const resetForm = () => {
    setItemId("");
    setQty("1");
    setSellPricePerUnit("");
    setResidentName("");
    setNote("");
  };

  const submit = () => {
    if (!itemId) {
      toast({ title: "Select an item to sell", variant: "destructive" });
      return;
    }
    const parsedQty = Math.max(Math.round(Number(qty)), 0);
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      toast({ title: "Quantity must be at least 1", variant: "destructive" });
      return;
    }
    const parsedPrice = Number(sellPricePerUnit);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast({ title: "Sell price must be 0 or greater", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        await onSell({
          itemId,
          qty: parsedQty,
          sellPricePerUnit: parsedPrice,
          residentName: residentName.trim() || null,
          note: note.trim() || null
        });
        toast({ title: "Sale recorded" });
        setOpen(false);
        resetForm();
      } catch (error) {
        toast({
          title: "Could not record sale",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="bg-white/70" disabled={disabled}>
          <BadgeDollarSign className="mr-1 h-4 w-4" />
          + Sell Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-emerald-700" />
            Sell Item
          </DialogTitle>
          <DialogDescription>
            Enter sell price and quantity to track revenue and profit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-foreground">Item *</span>
            <select
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-white/25 bg-white/70 px-3 text-sm"
            >
              <option value="">Select item</option>
              {sellableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category}) · on hand {item.onHand}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-foreground">Quantity *</span>
              <Input type="number" min={1} step="1" value={qty} onChange={(event) => setQty(event.target.value)} className="mt-1 bg-white/70" />
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Sell price per unit *</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={sellPricePerUnit}
                onChange={(event) => setSellPricePerUnit(event.target.value)}
                className="mt-1 bg-white/70"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-foreground">Resident name (optional)</span>
              <Input value={residentName} onChange={(event) => setResidentName(event.target.value)} className="mt-1 bg-white/70" />
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Note (optional)</span>
              <Input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 bg-white/70" />
            </label>
          </div>

          {selected ? (
            <div className="rounded-xl border border-white/25 bg-white/55 p-3 text-xs text-foreground/75">
              On hand: <span className="font-semibold text-foreground">{selected.onHand}</span>
              {" · "}
              Cost per unit:{" "}
              <span className="font-semibold text-foreground">
                {selected.costPerUnit !== null ? `$${selected.costPerUnit.toFixed(2)}` : "Not set"}
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="bg-white/70" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            Record sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
