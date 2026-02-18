"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BUDGET_STOCK_CATEGORY_OPTIONS, normalizeBudgetStockCategory } from "@/lib/budget-stock/category-options";
import type { BudgetStockExpenseDTO, BudgetStockItemDTO } from "@/lib/budget-stock/types";
import { useToast } from "@/lib/use-toast";

type ExpenseSubmitPayload = {
  date: string;
  category: string;
  amount: number;
  vendor?: string | null;
  note?: string | null;
  linkedItemId?: string | null;
};

function toDateInputValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

export function ExpenseModal({
  open,
  mode,
  items,
  initialExpense,
  onOpenChange,
  onSubmit,
  onDelete
}: {
  open: boolean;
  mode: "create" | "edit";
  items: BudgetStockItemDTO[];
  initialExpense?: BudgetStockExpenseDTO | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ExpenseSubmitPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>(BUDGET_STOCK_CATEGORY_OPTIONS[0] ?? "Activity Supplies");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [linkedItemId, setLinkedItemId] = useState("");

  const dialogTitle = mode === "create" ? "Add Expense" : "Edit Expense";

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialExpense) {
      setDate(toDateInputValue(initialExpense.date));
      setCategory(normalizeBudgetStockCategory(initialExpense.category));
      setAmount(initialExpense.amount.toFixed(2));
      setVendor(initialExpense.vendor ?? "");
      setNote(initialExpense.note ?? "");
      setLinkedItemId(initialExpense.linkedItemId ?? "");
      return;
    }

    setDate(new Date().toISOString().slice(0, 10));
    setCategory(BUDGET_STOCK_CATEGORY_OPTIONS[0] ?? "Activity Supplies");
    setAmount("");
    setVendor("");
    setNote("");
    setLinkedItemId("");
  }, [initialExpense, mode, open]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [items]
  );

  const submit = () => {
    if (!category.trim()) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      toast({ title: "Amount must be 0 or greater", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        await onSubmit({
          date,
          category: normalizeBudgetStockCategory(category),
          amount: amountValue,
          vendor: vendor.trim() || null,
          note: note.trim() || null,
          linkedItemId: linkedItemId || null
        });
        onOpenChange(false);
        toast({ title: mode === "create" ? "Expense added" : "Expense updated" });
      } catch (error) {
        toast({
          title: mode === "create" ? "Could not add expense" : "Could not update expense",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  };

  const submitDelete = () => {
    if (!onDelete) return;
    startTransition(async () => {
      try {
        await onDelete();
        onOpenChange(false);
        toast({ title: "Expense deleted" });
      } catch (error) {
        toast({
          title: "Could not delete expense",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>Required fields: amount, category, date.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-foreground">Amount *</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-1 bg-white/70"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Date *</span>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 bg-white/70" />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-foreground">Category *</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-white/25 bg-white/70 px-3 text-sm"
            >
              {BUDGET_STOCK_CATEGORY_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium text-foreground">Vendor</span>
              <Input value={vendor} onChange={(event) => setVendor(event.target.value)} className="mt-1 bg-white/70" />
            </label>
            <label className="text-sm">
              <span className="font-medium text-foreground">Link to inventory item</span>
              <select
                value={linkedItemId}
                onChange={(event) => setLinkedItemId(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-white/25 bg-white/70 px-3 text-sm"
              >
                <option value="">None</option>
                {sortedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-foreground">Note</span>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-[90px] bg-white/70" />
          </label>
        </div>

        <DialogFooter className="justify-between">
          <div>
            {mode === "edit" && onDelete ? (
              <Button type="button" variant="destructive" onClick={submitDelete} disabled={isPending}>
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="bg-white/70" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {mode === "create" ? "Add expense" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
