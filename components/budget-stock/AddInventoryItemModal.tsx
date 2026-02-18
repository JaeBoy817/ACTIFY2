"use client";

import { useState, useTransition } from "react";
import { Boxes, Plus } from "lucide-react";

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
import { BUDGET_STOCK_CATEGORY_OPTIONS, normalizeBudgetStockCategory } from "@/lib/budget-stock/category-options";
import { useToast } from "@/lib/use-toast";

type CreateInventoryPayload = {
  name: string;
  category: string;
  unit?: string | null;
  onHand: number;
  parLevel: number;
  reorderPoint?: number | null;
  costPerUnit?: number | null;
  vendor?: string | null;
};

export function AddInventoryItemModal({
  disabled,
  onCreate
}: {
  disabled?: boolean;
  onCreate: (payload: CreateInventoryPayload) => Promise<void>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const categoryOptions = BUDGET_STOCK_CATEGORY_OPTIONS;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(categoryOptions[0] ?? "Activity Supplies");
  const [unit, setUnit] = useState("each");
  const [onHand, setOnHand] = useState("0");
  const [parLevel, setParLevel] = useState("10");
  const [reorderPoint, setReorderPoint] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [vendor, setVendor] = useState("");

  const resetForm = () => {
    setName("");
    setCategory(categoryOptions[0] ?? "Activity Supplies");
    setUnit("each");
    setOnHand("0");
    setParLevel("10");
    setReorderPoint("");
    setCostPerUnit("");
    setVendor("");
  };

  const submit = () => {
    const trimmedName = name.trim();
    const trimmedCategory = normalizeBudgetStockCategory(category);
    const parsedOnHand = Math.max(Math.round(Number(onHand)), 0);
    const parsedParLevel = Math.max(Math.round(Number(parLevel)), 0);
    const parsedReorderPoint =
      reorderPoint.trim().length > 0 ? Math.max(Math.round(Number(reorderPoint)), 0) : null;
    const parsedCostPerUnit =
      costPerUnit.trim().length > 0 ? Math.max(Number(costPerUnit), 0) : null;

    if (!trimmedName) {
      toast({ title: "Item name is required", variant: "destructive" });
      return;
    }
    if (!trimmedCategory) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(parsedOnHand) || !Number.isFinite(parsedParLevel)) {
      toast({ title: "On hand and par level must be valid numbers", variant: "destructive" });
      return;
    }
    if (parsedReorderPoint !== null && !Number.isFinite(parsedReorderPoint)) {
      toast({ title: "Reorder point must be a valid number", variant: "destructive" });
      return;
    }
    if (parsedCostPerUnit !== null && !Number.isFinite(parsedCostPerUnit)) {
      toast({ title: "Cost per unit must be a valid number", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        await onCreate({
          name: trimmedName,
          category: trimmedCategory,
          unit: unit.trim() || null,
          onHand: parsedOnHand,
          parLevel: parsedParLevel,
          reorderPoint: parsedReorderPoint,
          costPerUnit: parsedCostPerUnit,
          vendor: vendor.trim() || null
        });
        toast({ title: "Inventory item added" });
        setOpen(false);
        resetForm();
      } catch (error) {
        toast({
          title: "Could not add inventory item",
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
          <Plus className="mr-1 h-4 w-4" />
          Add Inventory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-actifyBlue" />
            Add Inventory Item
          </DialogTitle>
          <DialogDescription>
            Add prizes, supplies, snacks, or any stock item in one step.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="text-sm">
            <span className="font-medium text-foreground">Item name *</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 bg-white/70" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-foreground">Category *</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-white/25 bg-white/70 px-3 text-sm"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Unit</span>
              <Input value={unit} onChange={(event) => setUnit(event.target.value)} className="mt-1 bg-white/70" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="font-medium text-foreground">On hand *</span>
              <Input
                type="number"
                min={0}
                step="1"
                value={onHand}
                onChange={(event) => setOnHand(event.target.value)}
                className="mt-1 bg-white/70"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Par level *</span>
              <Input
                type="number"
                min={0}
                step="1"
                value={parLevel}
                onChange={(event) => setParLevel(event.target.value)}
                className="mt-1 bg-white/70"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Reorder point</span>
              <Input
                type="number"
                min={0}
                step="1"
                value={reorderPoint}
                onChange={(event) => setReorderPoint(event.target.value)}
                className="mt-1 bg-white/70"
                placeholder="Auto if blank"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-foreground">Cost per unit</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={costPerUnit}
                onChange={(event) => setCostPerUnit(event.target.value)}
                className="mt-1 bg-white/70"
                placeholder="Optional"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Vendor</span>
              <Input value={vendor} onChange={(event) => setVendor(event.target.value)} className="mt-1 bg-white/70" />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="bg-white/70" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            Save item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
