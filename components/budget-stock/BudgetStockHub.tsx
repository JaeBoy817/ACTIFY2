"use client";

import { useMemo, useState, useTransition } from "react";
import { Landmark, Plus, Search } from "lucide-react";

import { AdjustStockModal } from "@/components/budget-stock/AdjustStockModal";
import { AddInventoryItemModal } from "@/components/budget-stock/AddInventoryItemModal";
import { BudgetCategoryCard } from "@/components/budget-stock/BudgetCategoryCard";
import { ExpenseModal } from "@/components/budget-stock/ExpenseModal";
import { ExpenseTable } from "@/components/budget-stock/ExpenseTable";
import { InventoryListRow } from "@/components/budget-stock/InventoryListRow";
import { KPIChips } from "@/components/budget-stock/KPIChips";
import { ReorderDrawer } from "@/components/budget-stock/ReorderDrawer";
import { SellItemModal } from "@/components/budget-stock/SellItemModal";
import { TabSwitcher } from "@/components/budget-stock/TabSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { BudgetStockExpenseDTO, BudgetStockHubSnapshot, BudgetStockItemDTO, BudgetStockSaleDTO } from "@/lib/budget-stock/types";
import { useToast } from "@/lib/use-toast";

function rebuildSnapshotWithItems(snapshot: BudgetStockHubSnapshot, items: BudgetStockItemDTO[]): BudgetStockHubSnapshot {
  return {
    ...snapshot,
    items,
    summary: {
      ...snapshot.summary,
      lowStockCount: items.filter((item) => item.status === "low").length
    }
  };
}

function rebuildSnapshotWithExpenses(snapshot: BudgetStockHubSnapshot, expenses: BudgetStockExpenseDTO[]): BudgetStockHubSnapshot {
  const spent = Number(expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
  const categoryLimitTotal = Number(snapshot.categories.reduce((sum, category) => sum + category.monthlyLimit, 0).toFixed(2));
  const categories = snapshot.categories.map((category) => {
    const categorySpent = Number(
      expenses
        .filter((expense) => expense.category === category.name)
        .reduce((sum, expense) => sum + expense.amount, 0)
        .toFixed(2)
    );
    const remaining = Number((category.monthlyLimit - categorySpent).toFixed(2));
    const progressPercent =
      category.monthlyLimit > 0 ? Math.min(100, Math.max(0, (categorySpent / category.monthlyLimit) * 100)) : 0;

    return {
      ...category,
      spent: categorySpent,
      remaining,
      progressPercent: Number(progressPercent.toFixed(1))
    };
  });

  return {
    ...snapshot,
    expenses,
    categories,
    summary: {
      ...snapshot.summary,
      spent,
      remaining: Number((categoryLimitTotal - spent).toFixed(2)),
      categoryLimitTotal
    }
  };
}

function rebuildSnapshotWithSales(snapshot: BudgetStockHubSnapshot, sales: BudgetStockSaleDTO[]): BudgetStockHubSnapshot {
  const salesRevenue = Number(sales.reduce((sum, sale) => sum + sale.revenue, 0).toFixed(2));
  const salesCostBasis = Number(sales.reduce((sum, sale) => sum + sale.costBasis, 0).toFixed(2));
  const salesProfit = Number((salesRevenue - salesCostBasis).toFixed(2));

  return {
    ...snapshot,
    sales,
    summary: {
      ...snapshot.summary,
      salesRevenue,
      salesCostBasis,
      salesProfit
    }
  };
}

export function BudgetStockHub({
  initialSnapshot,
  initialMonthKey,
  monthOptions,
  canEdit
}: {
  initialSnapshot: BudgetStockHubSnapshot;
  initialMonthKey: string;
  monthOptions: Array<{ key: string; label: string }>;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [activeTab, setActiveTab] = useState<"stock" | "budget">("stock");
  const [stockSearch, setStockSearch] = useState("");
  const [stockMode, setStockMode] = useState<"ALL" | "LOW">("ALL");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("ALL");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BudgetStockExpenseDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(
    () => Array.from(new Set(snapshot.items.map((item) => item.category))).sort((a, b) => a.localeCompare(b)),
    [snapshot.items]
  );

  const filteredItems = useMemo(() => {
    const token = stockSearch.trim().toLowerCase();
    return snapshot.items.filter((item) => {
      if (stockMode === "LOW" && item.status !== "low") return false;
      if (stockCategoryFilter !== "ALL" && item.category !== stockCategoryFilter) return false;
      if (!token) return true;
      return item.name.toLowerCase().includes(token) || item.category.toLowerCase().includes(token);
    });
  }, [snapshot.items, stockCategoryFilter, stockMode, stockSearch]);

  const lowItems = useMemo(() => snapshot.items.filter((item) => item.status === "low"), [snapshot.items]);

  const refreshSnapshot = (nextMonthKey: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/budget-stock/hub?month=${encodeURIComponent(nextMonthKey)}`, {
          method: "GET",
          cache: "no-store"
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? "Could not refresh budget/stock data.");
        }
        setSnapshot(payload as BudgetStockHubSnapshot);
      } catch (error) {
        toast({
          title: "Could not refresh data",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  };

  const adjustItem = async (itemId: string, delta: number) => {
    if (!canEdit) return;

    const previous = snapshot.items;
    const optimistic = previous.map((item) => {
      if (item.id !== itemId) return item;
      const nextOnHand = Math.max(item.onHand + delta, 0);
      const nextStatus: BudgetStockItemDTO["status"] = nextOnHand <= item.threshold ? "low" : "ok";
      return {
        ...item,
        onHand: nextOnHand,
        status: nextStatus
      };
    });
    setSnapshot((current) => rebuildSnapshotWithItems(current, optimistic));

    const response = await fetch(`/api/budget-stock/items/${encodeURIComponent(itemId)}/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delta })
    });
    const payload = await response.json();
    if (!response.ok) {
      setSnapshot((current) => rebuildSnapshotWithItems(current, previous));
      throw new Error(payload?.error ?? "Could not adjust stock.");
    }

    const updated = payload.item as BudgetStockItemDTO;
    setSnapshot((current) => {
      const nextItems = current.items.map((item) => (item.id === updated.id ? updated : item));
      return rebuildSnapshotWithItems(current, nextItems);
    });
  };

  const clearItemStock = async (itemId: string) => {
    const target = snapshot.items.find((item) => item.id === itemId);
    if (!target || target.onHand <= 0) return;
    try {
      await adjustItem(itemId, -target.onHand);
      toast({
        title: "Stock cleared",
        description: `${target.name} is now at 0 on hand.`
      });
    } catch (error) {
      toast({
        title: "Could not clear stock",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    }
  };

  const deleteInventoryItem = async (itemId: string) => {
    if (!canEdit) return;
    const previousItems = snapshot.items;
    const target = previousItems.find((item) => item.id === itemId);
    const optimistic = previousItems.filter((item) => item.id !== itemId);
    setSnapshot((current) => rebuildSnapshotWithItems(current, optimistic));
    try {
      const response = await fetch(`/api/budget-stock/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not delete item.");
      }

      toast({
        title: "Item deleted",
        description: target ? `${target.name} removed from active inventory.` : "Inventory item removed."
      });
    } catch (error) {
      setSnapshot((current) => rebuildSnapshotWithItems(current, previousItems));
      toast({
        title: "Could not delete item",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    }
  };

  const createInventoryItem = async (payload: {
    name: string;
    category: string;
    unit?: string | null;
    onHand: number;
    parLevel: number;
    reorderPoint?: number | null;
    costPerUnit?: number | null;
    vendor?: string | null;
  }) => {
    const response = await fetch("/api/budget-stock/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not create inventory item.");
    }

    const created = body.item as BudgetStockItemDTO;
    setSnapshot((current) => {
      const nextItems = [...current.items, created].sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category, undefined, {
          sensitivity: "base",
          numeric: true
        });
        if (categoryCompare !== 0) return categoryCompare;
        return a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
          numeric: true
        });
      });
      return rebuildSnapshotWithItems(current, nextItems);
    });
  };

  const sellInventoryItem = async (payload: {
    itemId: string;
    qty: number;
    sellPricePerUnit: number;
    residentName?: string | null;
    note?: string | null;
    date?: string;
  }) => {
    const response = await fetch("/api/budget-stock/sales", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not record sale.");
    }

    const updatedItem = body.item as BudgetStockItemDTO;
    const sale = body.sale as BudgetStockSaleDTO;
    setSnapshot((current) => {
      const items = current.items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      const withItems = rebuildSnapshotWithItems(current, items);
      return rebuildSnapshotWithSales(withItems, [sale, ...withItems.sales]);
    });
  };

  const createExpense = async (payload: {
    date: string;
    category: string;
    amount: number;
    vendor?: string | null;
    note?: string | null;
    linkedItemId?: string | null;
  }) => {
    const response = await fetch("/api/budget-stock/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not add expense.");
    }

    const expense = body.expense as BudgetStockExpenseDTO;
    setSnapshot((current) => rebuildSnapshotWithExpenses(current, [expense, ...current.expenses]));
  };

  const updateExpense = async (payload: {
    date: string;
    category: string;
    amount: number;
    vendor?: string | null;
    note?: string | null;
    linkedItemId?: string | null;
  }) => {
    if (!editingExpense) return;

    const response = await fetch(`/api/budget-stock/expenses/${encodeURIComponent(editingExpense.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not update expense.");
    }

    const updated = body.expense as BudgetStockExpenseDTO;
    setSnapshot((current) => {
      const expenses = current.expenses.map((expense) => (expense.id === updated.id ? updated : expense));
      return rebuildSnapshotWithExpenses(current, expenses);
    });
    setEditingExpense(null);
  };

  const deleteExpense = async () => {
    if (!editingExpense) return;
    const targetId = editingExpense.id;
    const response = await fetch(`/api/budget-stock/expenses/${encodeURIComponent(targetId)}`, {
      method: "DELETE"
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not delete expense.");
    }
    setSnapshot((current) => {
      const expenses = current.expenses.filter((expense) => expense.id !== targetId);
      return rebuildSnapshotWithExpenses(current, expenses);
    });
    setEditingExpense(null);
  };

  const updateCategoryLimit = async (categoryId: string, monthlyLimit: number) => {
    if (!canEdit) return;
    const previous = snapshot.categories;
    const optimistic = previous.map((category) =>
      category.id === categoryId ? { ...category, monthlyLimit: Number(monthlyLimit.toFixed(2)) } : category
    );
    setSnapshot((current) => rebuildSnapshotWithExpenses({ ...current, categories: optimistic }, current.expenses));

    const response = await fetch(`/api/budget-stock/categories/${encodeURIComponent(categoryId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ monthlyLimit })
    });
    const body = await response.json();
    if (!response.ok) {
      setSnapshot((current) => rebuildSnapshotWithExpenses({ ...current, categories: previous }, current.expenses));
      toast({
        title: "Could not update monthly limit",
        description: body?.error ?? "Try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/15">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Landmark className="h-6 w-6 text-actifyBlue" />
                Budget &amp; Stock Hub
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep inventory fast to update and budget decisions simple.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-foreground/70">
                Month
                <select
                  className="ml-2 h-10 rounded-md border border-white/25 bg-white/70 px-3 text-sm"
                  value={monthKey}
                  onChange={(event) => {
                    const next = event.target.value;
                    setMonthKey(next);
                    refreshSnapshot(next);
                  }}
                >
                  {monthOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <AdjustStockModal items={snapshot.items} disabled={!canEdit} onAdjust={adjustItem} />
              <AddInventoryItemModal disabled={!canEdit} onCreate={createInventoryItem} />
              <SellItemModal items={snapshot.items} disabled={!canEdit} onSell={sellInventoryItem} />
              <Button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseModalOpen(true);
                }}
                disabled={!canEdit}
              >
                <Plus className="mr-1 h-4 w-4" />
                + Add Expense
              </Button>
            </div>
          </div>

          <KPIChips summary={snapshot.summary} />
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "stock" | "budget")} className="space-y-4">
        <TabSwitcher />

        <TabsContent value="stock" className="space-y-4">
          <Card className="glass-panel rounded-2xl border-white/15">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                  <Input
                    value={stockSearch}
                    onChange={(event) => setStockSearch(event.target.value)}
                    placeholder="Search stock items"
                    className="bg-white/70 pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={stockMode === "ALL" ? "default" : "outline"}
                    className={stockMode === "ALL" ? "" : "bg-white/70"}
                    onClick={() => setStockMode("ALL")}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={stockMode === "LOW" ? "default" : "outline"}
                    className={stockMode === "LOW" ? "" : "bg-white/70"}
                    onClick={() => setStockMode("LOW")}
                  >
                    Low Only
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      size="sm"
                      variant={stockCategoryFilter === category ? "default" : "outline"}
                      className={stockCategoryFilter === category ? "" : "bg-white/70"}
                      onClick={() =>
                        setStockCategoryFilter((current) => (current === category ? "ALL" : category))
                      }
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                <div className="ml-auto">
                  <ReorderDrawer lowItems={lowItems} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <Card className="glass-panel rounded-2xl border-white/15">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No inventory items match this filter.
                </CardContent>
              </Card>
            ) : (
              filteredItems.map((item) => (
                <InventoryListRow
                  key={item.id}
                  item={item}
                  disabled={!canEdit || isPending}
                  onAdjust={adjustItem}
                  onClearStock={clearItemStock}
                  onDeleteItem={deleteInventoryItem}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.categories.map((category) => (
              <BudgetCategoryCard
                key={category.id}
                category={category}
                editable={canEdit}
                onLimitChange={updateCategoryLimit}
              />
            ))}
          </div>

          <Card className="glass-panel rounded-2xl border-white/15">
            <CardHeader>
              <CardTitle className="text-lg">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseTable
                expenses={snapshot.expenses}
                categories={snapshot.categories.map((category) => category.name)}
                onRowClick={(expense) => {
                  if (!canEdit) return;
                  setEditingExpense(expense);
                  setExpenseModalOpen(true);
                }}
              />
            </CardContent>
          </Card>

          <Card className="glass-panel rounded-2xl border-white/15">
            <CardHeader>
              <CardTitle className="text-lg">Sales & Profit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/20 bg-white/55 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
                  <p className="text-xl font-semibold text-foreground">${snapshot.summary.salesRevenue.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/55 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost Basis</p>
                  <p className="text-xl font-semibold text-foreground">${snapshot.summary.salesCostBasis.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/55 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Profit</p>
                  <p className={`text-xl font-semibold ${snapshot.summary.salesProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    ${snapshot.summary.salesProfit.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/20 bg-white/45">
                <div className="grid grid-cols-[120px_1fr_80px_110px_110px_110px_1fr] gap-3 border-b border-white/20 px-3 py-2 text-[11px] uppercase tracking-wide text-foreground/60">
                  <span>Date</span>
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Sell Price</span>
                  <span>Revenue</span>
                  <span>Profit</span>
                  <span>Resident</span>
                </div>
                {snapshot.sales.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">No sales recorded this month.</div>
                ) : (
                  <div className="divide-y divide-white/20">
                    {snapshot.sales.slice(0, 20).map((sale) => (
                      <div key={sale.id} className="grid grid-cols-[120px_1fr_80px_110px_110px_110px_1fr] gap-3 px-3 py-2.5 text-sm">
                        <span className="text-foreground/75">{new Date(sale.date).toLocaleDateString()}</span>
                        <span className="font-medium text-foreground">{sale.itemName}</span>
                        <span>{sale.qty}</span>
                        <span>${sale.sellPricePerUnit.toFixed(2)}</span>
                        <span>${sale.revenue.toFixed(2)}</span>
                        <span className={sale.profit >= 0 ? "text-emerald-700" : "text-rose-700"}>${sale.profit.toFixed(2)}</span>
                        <span className="truncate text-foreground/75">{sale.residentName ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExpenseModal
        open={expenseModalOpen}
        mode={editingExpense ? "edit" : "create"}
        items={snapshot.items}
        initialExpense={editingExpense}
        onOpenChange={(open) => {
          setExpenseModalOpen(open);
          if (!open) {
            setEditingExpense(null);
          }
        }}
        onSubmit={editingExpense ? updateExpense : createExpense}
        onDelete={editingExpense ? deleteExpense : undefined}
      />
    </div>
  );
}
