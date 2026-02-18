"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BudgetStockExpenseDTO } from "@/lib/budget-stock/types";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

export function ExpenseTable({
  expenses,
  categories,
  onRowClick
}: {
  expenses: BudgetStockExpenseDTO[];
  categories: string[];
  onRowClick: (expense: BudgetStockExpenseDTO) => void;
}) {
  const [searchVendor, setSearchVendor] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");

  const rows = useMemo(() => {
    let next = [...expenses];
    if (categoryFilter !== "ALL") {
      next = next.filter((expense) => expense.category === categoryFilter);
    }
    if (searchVendor.trim().length > 0) {
      const token = searchVendor.trim().toLowerCase();
      next = next.filter((expense) => (expense.vendor ?? "").toLowerCase().includes(token));
    }

    next.sort((a, b) => {
      if (sortKey === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortKey === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortKey === "amount-asc") return a.amount - b.amount;
      return b.amount - a.amount;
    });
    return next;
  }, [categoryFilter, expenses, searchVendor, sortKey]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={searchVendor}
          onChange={(event) => setSearchVendor(event.target.value)}
          placeholder="Filter by vendor"
          className="w-full bg-white/70 sm:w-60"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-md border border-white/25 bg-white/70 px-3 text-sm"
          aria-label="Filter expenses by category"
        >
          <option value="ALL">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="h-10 rounded-md border border-white/25 bg-white/70 px-3 text-sm"
          aria-label="Sort expenses"
        >
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Amount high to low</option>
          <option value="amount-asc">Amount low to high</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/45">
        <div className="hidden grid-cols-[120px_1fr_120px_160px_1fr_80px] gap-3 border-b border-white/20 px-4 py-2 text-xs uppercase tracking-wide text-foreground/60 md:grid">
          <span>Date</span>
          <span>Category</span>
          <span>Amount</span>
          <span>Vendor</span>
          <span>Note</span>
          <span className="text-right">Edit</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No expenses found for these filters.</div>
        ) : (
          <div className="divide-y divide-white/20">
            {rows.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => onRowClick(expense)}
                className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-white/55 md:grid md:grid-cols-[120px_1fr_120px_160px_1fr_80px] md:items-center md:gap-3"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/60 md:hidden">Date</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(expense.date)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/60 md:hidden">Category</p>
                  <p className="text-sm text-foreground">{expense.category}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/60 md:hidden">Amount</p>
                  <p className="text-sm font-semibold text-foreground">{currency(expense.amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/60 md:hidden">Vendor</p>
                  <p className="text-sm text-foreground">{expense.vendor ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-foreground/60 md:hidden">Note</p>
                  <p className="line-clamp-2 text-sm text-foreground/80">{expense.note ?? "—"}</p>
                </div>
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" className="bg-white/70">
                    <ArrowDownUp className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
