"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  CalendarRange,
  CircleDollarSign,
  Download,
  FolderKanban,
  HandCoins,
  Layers3,
  ListChecks,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBasket,
  Sparkles,
  Store,
  Wallet
} from "lucide-react";

import { TopContentHeader } from "@/components/app/TopContentHeader";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { AnalyticsLineChartLazy } from "@/components/analytics/charts/AnalyticsLineChartLazy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  BudgetStockExpenseDTO,
  BudgetStockHubSnapshot,
  BudgetStockItemDTO,
  BudgetStockSaleDTO
} from "@/lib/budget-stock/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

type RangeMode = "full-month" | "month-to-date";
type TypeFilter = "all" | "purchases" | "stock" | "prize" | "planned";
type PlannedStatus = "PLANNED" | "APPROVED" | "PURCHASED" | "DELAYED";
type PlannedPriority = "Low" | "Medium" | "High";
type BudgetDistribution = "proportional" | "primary";

type PlannedPurchase = {
  id: string;
  title: string;
  category: string;
  estimatedCost: number;
  priority: PlannedPriority;
  dueDate: string | null;
  status: PlannedStatus;
  notes: string | null;
};

const PANEL =
  "rounded-[1.35rem] border border-[#3a4b67]/85 bg-[linear-gradient(180deg,#101826_0%,#0d1421_54%,#0a101b_100%)] shadow-[0_30px_50px_-36px_rgba(117,132,177,0.65)]";
const PANEL_SOFT =
  "rounded-2xl border border-[#465878]/85 bg-[linear-gradient(180deg,rgba(24,35,55,0.82)_0%,rgba(15,24,39,0.9)_100%)]";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a5b3cf]";
const EMPTY_TEXT = "text-sm text-[#a8b7d4]";

function previousMonthKey(monthKey: string) {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const pivot = new Date(Date.UTC(year, month - 1, 1));
  pivot.setUTCMonth(pivot.getUTCMonth() - 1);
  const nextYear = pivot.getUTCFullYear();
  const nextMonth = String(pivot.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDateOnly(value: string | null, timeZone: string) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function dayOfMonthInZone(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "2-digit"
  }).format(parsed);
  const day = Number(parts);
  return Number.isFinite(day) ? day : null;
}

function formatMonthLabel(monthKey: string, monthOptions: Array<{ key: string; label: string }>) {
  return monthOptions.find((option) => option.key === monthKey)?.label ?? monthKey;
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
        return `"${text.replaceAll("\"", "\"\"")}"`;
      }
      return text;
    })
    .join(",");
}

function exportCsv(filename: string, rows: string[]) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function prizeCategory(category: string) {
  const token = category.toLowerCase();
  return (
    token.includes("prize") ||
    token.includes("snack") ||
    token.includes("candy") ||
    token.includes("drink") ||
    token.includes("toiletr") ||
    token.includes("reward")
  );
}

function filteredByRange<T extends { date: string }>(
  rows: T[],
  mode: RangeMode,
  timeZone: string,
  monthToDateDay: number
) {
  if (mode === "full-month") return rows;
  return rows.filter((row) => {
    const day = dayOfMonthInZone(row.date, timeZone);
    if (day == null) return false;
    return day <= monthToDateDay;
  });
}

function buildTrendRows(expenses: BudgetStockExpenseDTO[], timeZone: string) {
  const buckets = [0, 0, 0, 0, 0];
  for (const row of expenses) {
    const day = dayOfMonthInZone(row.date, timeZone);
    if (!day) continue;
    const index = Math.min(4, Math.floor((day - 1) / 7));
    buckets[index] += row.amount;
  }

  return buckets.map((value, index) => ({
    label: `W${index + 1}`,
    value: Number(value.toFixed(2))
  }));
}

function plannedSeedFromLowStock(items: BudgetStockItemDTO[]): PlannedPurchase[] {
  const seeded = items
    .filter((item) => item.status === "low")
    .sort((a, b) => a.onHand - b.onHand)
    .slice(0, 4)
    .map((item, index) => ({
      id: `seed-${item.id}-${index}`,
      title: `Restock ${item.name}`,
      category: item.category,
      estimatedCost: Number((Math.max(item.suggestedReorderQty, 1) * (item.costPerUnit ?? 3)).toFixed(2)),
      priority: (item.onHand === 0 ? "High" : "Medium") as PlannedPriority,
      dueDate: null,
      status: "PLANNED" as const,
      notes: `Current qty ${item.onHand}, threshold ${item.threshold}.`
    }));

  return seeded;
}

function stockStatusLabel(item: BudgetStockItemDTO) {
  if (item.onHand <= 0) return "Out";
  if (item.status === "low") return "Low";
  if (item.onHand <= item.threshold + 2) return "Reorder Soon";
  return "Healthy";
}

function stockStatusClass(item: BudgetStockItemDTO) {
  const label = stockStatusLabel(item);
  if (label === "Out") return "border-rose-300/45 bg-rose-500/16 text-rose-100";
  if (label === "Low") return "border-amber-300/45 bg-amber-500/16 text-amber-100";
  if (label === "Reorder Soon") return "border-blue-300/45 bg-blue-500/16 text-blue-100";
  return "border-emerald-300/45 bg-emerald-500/16 text-emerald-100";
}

function plannedStatusClass(status: PlannedStatus) {
  if (status === "PURCHASED") return "border-emerald-300/45 bg-emerald-500/16 text-emerald-100";
  if (status === "APPROVED") return "border-blue-300/45 bg-blue-500/16 text-blue-100";
  if (status === "DELAYED") return "border-rose-300/45 bg-rose-500/16 text-rose-100";
  return "border-amber-300/45 bg-amber-500/16 text-amber-100";
}

function plannedPriorityClass(priority: PlannedPriority) {
  if (priority === "High") return "border-rose-300/45 bg-rose-500/16 text-rose-100";
  if (priority === "Medium") return "border-amber-300/45 bg-amber-500/16 text-amber-100";
  return "border-blue-300/45 bg-blue-500/16 text-blue-100";
}

type PurchaseFormState = {
  date: string;
  category: string;
  amount: string;
  vendor: string;
  title: string;
  note: string;
  linkedItemId: string;
};

type ItemFormState = {
  name: string;
  category: string;
  unit: string;
  onHand: string;
  parLevel: string;
  reorderPoint: string;
  costPerUnit: string;
  vendor: string;
};

type SaleFormState = {
  itemId: string;
  qty: string;
  sellPricePerUnit: string;
  residentName: string;
  note: string;
  date: string;
};

type PlannedFormState = {
  title: string;
  category: string;
  estimatedCost: string;
  priority: PlannedPriority;
  dueDate: string;
  status: PlannedStatus;
  notes: string;
};

function emptyPurchaseForm(todayDateKey: string): PurchaseFormState {
  return {
    date: todayDateKey,
    category: "",
    amount: "",
    vendor: "",
    title: "",
    note: "",
    linkedItemId: ""
  };
}

function emptyItemForm(defaultCategory: string): ItemFormState {
  return {
    name: "",
    category: defaultCategory,
    unit: "unit",
    onHand: "0",
    parLevel: "10",
    reorderPoint: "",
    costPerUnit: "",
    vendor: ""
  };
}

function emptySaleForm(todayDateKey: string): SaleFormState {
  return {
    itemId: "",
    qty: "1",
    sellPricePerUnit: "0",
    residentName: "",
    note: "",
    date: todayDateKey
  };
}

function emptyPlannedForm(defaultCategory: string): PlannedFormState {
  return {
    title: "",
    category: defaultCategory,
    estimatedCost: "",
    priority: "Medium",
    dueDate: "",
    status: "PLANNED",
    notes: ""
  };
}

export function BudgetStockHub({
  initialSnapshot,
  initialMonthKey,
  monthOptions,
  canEdit,
  timeZone
}: {
  initialSnapshot: BudgetStockHubSnapshot;
  initialMonthKey: string;
  monthOptions: Array<{ key: string; label: string }>;
  canEdit: boolean;
  timeZone: string;
}) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [rangeMode, setRangeMode] = useState<RangeMode>("full-month");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState<BudgetStockHubSnapshot | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const todayDateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(new Date())
    .replaceAll("/", "-");

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BudgetStockExpenseDTO | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(emptyPurchaseForm(todayDateKey));

  const [stockOpen, setStockOpen] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState<ItemFormState>(emptyItemForm(initialSnapshot.categories[0]?.name ?? "Crafts"));

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustItemId, setAdjustItemId] = useState<string>("");
  const [adjustDelta, setAdjustDelta] = useState<string>("1");

  const [saleOpen, setSaleOpen] = useState(false);
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleForm, setSaleForm] = useState<SaleFormState>(emptySaleForm(todayDateKey));

  const [plannedOpen, setPlannedOpen] = useState(false);
  const [plannedForm, setPlannedForm] = useState<PlannedFormState>(
    emptyPlannedForm(initialSnapshot.categories[0]?.name ?? "Crafts")
  );
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetTotalInput, setBudgetTotalInput] = useState("0");
  const [budgetDistribution, setBudgetDistribution] = useState<BudgetDistribution>("proportional");

  const [plannedPurchases, setPlannedPurchases] = useState<PlannedPurchase[]>(
    plannedSeedFromLowStock(initialSnapshot.items)
  );
  const previousMonthRef = useRef(initialMonthKey);

  const monthLabel = formatMonthLabel(monthKey, monthOptions);
  const monthToDateDay = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      day: "numeric"
    }).format(new Date())
  );

  const allCategories = useMemo(
    () => uniqueStrings([...snapshot.categories.map((category) => category.name), ...snapshot.items.map((item) => item.category)]),
    [snapshot.categories, snapshot.items]
  );
  const allVendors = useMemo(
    () =>
      uniqueStrings([
        ...snapshot.expenses.map((expense) => expense.vendor ?? ""),
        ...snapshot.items.map((item) => item.vendor ?? "")
      ]),
    [snapshot.expenses, snapshot.items]
  );

  const scopedExpenses = useMemo(
    () => filteredByRange(snapshot.expenses, rangeMode, timeZone, monthToDateDay),
    [monthToDateDay, rangeMode, snapshot.expenses, timeZone]
  );
  const scopedSales = useMemo(
    () =>
      filteredByRange(
        snapshot.sales.map((row) => ({ ...row, date: row.date })),
        rangeMode,
        timeZone,
        monthToDateDay
      ) as BudgetStockSaleDTO[],
    [monthToDateDay, rangeMode, snapshot.sales, timeZone]
  );

  const scopedCategoryBreakdown = useMemo(() => {
    const spendByCategory = new Map<string, number>();
    for (const expense of scopedExpenses) {
      spendByCategory.set(expense.category, (spendByCategory.get(expense.category) ?? 0) + expense.amount);
    }

    return snapshot.categories
      .map((category) => {
        const spent = Number((spendByCategory.get(category.name) ?? 0).toFixed(2));
        const remaining = Number((category.monthlyLimit - spent).toFixed(2));
        const percent = category.monthlyLimit > 0 ? Math.min(100, Math.max(0, (spent / category.monthlyLimit) * 100)) : 0;
        return {
          ...category,
          spent,
          remaining,
          progressPercent: Number(percent.toFixed(1))
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [scopedExpenses, snapshot.categories]);

  const spendingTrend = useMemo(() => buildTrendRows(scopedExpenses, timeZone), [scopedExpenses, timeZone]);

  const monthlyBudget = Number(scopedCategoryBreakdown.reduce((sum, category) => sum + category.monthlyLimit, 0).toFixed(2));
  const spentThisPeriod = Number(scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
  const remainingBudget = Number((monthlyBudget - spentThisPeriod).toFixed(2));
  const usedPercent = monthlyBudget > 0 ? Math.min(100, Math.max(0, (spentThisPeriod / monthlyBudget) * 100)) : 0;

  const lowStockItems = useMemo(() => snapshot.items.filter((item) => item.status === "low"), [snapshot.items]);

  const prizeItems = useMemo(() => snapshot.items.filter((item) => prizeCategory(item.category)), [snapshot.items]);
  const prizeCartValue = useMemo(
    () =>
      Number(
        prizeItems
          .reduce((sum, item) => sum + item.onHand * (item.costPerUnit ?? 0), 0)
          .toFixed(2)
      ),
    [prizeItems]
  );

  const searchToken = search.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    return scopedExpenses
      .filter((expense) => (categoryFilter === "ALL" ? true : expense.category === categoryFilter))
      .filter((expense) => (vendorFilter === "ALL" ? true : (expense.vendor ?? "Unspecified") === vendorFilter))
      .filter((expense) => {
        if (!searchToken) return true;
        return (
          expense.category.toLowerCase().includes(searchToken) ||
          (expense.vendor ?? "").toLowerCase().includes(searchToken) ||
          (expense.note ?? "").toLowerCase().includes(searchToken) ||
          (expense.linkedItemName ?? "").toLowerCase().includes(searchToken)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [categoryFilter, scopedExpenses, searchToken, vendorFilter]);

  const filteredItems = useMemo(() => {
    return snapshot.items
      .filter((item) => (lowStockOnly ? item.status === "low" : true))
      .filter((item) => (categoryFilter === "ALL" ? true : item.category === categoryFilter))
      .filter((item) => (vendorFilter === "ALL" ? true : (item.vendor ?? "Unspecified") === vendorFilter))
      .filter((item) => {
        if (!searchToken) return true;
        return (
          item.name.toLowerCase().includes(searchToken) ||
          item.category.toLowerCase().includes(searchToken) ||
          (item.vendor ?? "").toLowerCase().includes(searchToken)
        );
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "low" ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  }, [categoryFilter, lowStockOnly, searchToken, snapshot.items, vendorFilter]);

  const filteredPrizeItems = useMemo(() => {
    return prizeItems
      .filter((item) => (lowStockOnly ? item.status === "low" : true))
      .filter((item) => {
        if (!searchToken) return true;
        return (
          item.name.toLowerCase().includes(searchToken) ||
          item.category.toLowerCase().includes(searchToken) ||
          (item.vendor ?? "").toLowerCase().includes(searchToken)
        );
      })
      .sort((a, b) => b.onHand - a.onHand);
  }, [lowStockOnly, prizeItems, searchToken]);

  const filteredPlanned = useMemo(() => {
    return plannedPurchases
      .filter((row) => (categoryFilter === "ALL" ? true : row.category === categoryFilter))
      .filter((row) => {
        if (!searchToken) return true;
        return (
          row.title.toLowerCase().includes(searchToken) ||
          row.category.toLowerCase().includes(searchToken) ||
          (row.notes ?? "").toLowerCase().includes(searchToken)
        );
      })
      .sort((a, b) => {
        const priorityRank = (priority: PlannedPriority) => (priority === "High" ? 0 : priority === "Medium" ? 1 : 2);
        const statusRank = (status: PlannedStatus) =>
          status === "PLANNED" ? 0 : status === "APPROVED" ? 1 : status === "DELAYED" ? 2 : 3;
        const rankDelta = priorityRank(a.priority) - priorityRank(b.priority);
        if (rankDelta !== 0) return rankDelta;
        const statusDelta = statusRank(a.status) - statusRank(b.status);
        if (statusDelta !== 0) return statusDelta;
        return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      });
  }, [categoryFilter, plannedPurchases, searchToken]);

  const vendorRows = useMemo(() => {
    const totals = new Map<string, { total: number; count: number; lastDate: string | null }>();
    for (const expense of scopedExpenses) {
      const key = expense.vendor ?? "Unspecified";
      const bucket = totals.get(key) ?? { total: 0, count: 0, lastDate: null };
      bucket.total += expense.amount;
      bucket.count += 1;
      if (!bucket.lastDate || new Date(expense.date).getTime() > new Date(bucket.lastDate).getTime()) {
        bucket.lastDate = expense.date;
      }
      totals.set(key, bucket);
    }

    return [...totals.entries()]
      .map(([vendor, value]) => ({
        vendor,
        total: Number(value.total.toFixed(2)),
        count: value.count,
        lastDate: value.lastDate
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [scopedExpenses]);

  const lowStockNeeds = useMemo(() => {
    return lowStockItems
      .map((item) => ({
        ...item,
        estimatedCost: Number((Math.max(item.suggestedReorderQty, 1) * (item.costPerUnit ?? 0)).toFixed(2))
      }))
      .sort((a, b) => {
        if (a.onHand !== b.onHand) return a.onHand - b.onHand;
        return a.threshold - b.threshold;
      });
  }, [lowStockItems]);

  const previousSpent = useMemo(() => {
    if (!compareSnapshot) return null;
    const previousScoped = filteredByRange(compareSnapshot.expenses, rangeMode, timeZone, monthToDateDay);
    return Number(previousScoped.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
  }, [compareSnapshot, monthToDateDay, rangeMode, timeZone]);

  const spentDelta = useMemo(() => {
    if (previousSpent == null) return null;
    return Number((spentThisPeriod - previousSpent).toFixed(2));
  }, [previousSpent, spentThisPeriod]);

  const insights = useMemo(() => {
    const entries: string[] = [];
    const topCategory = scopedCategoryBreakdown.find((category) => category.spent > 0);
    if (topCategory) {
      entries.push(`${topCategory.name} is currently the largest spend category at ${formatCurrency(topCategory.spent)}.`);
    }
    if (lowStockNeeds.length > 0) {
      entries.push(`${lowStockNeeds.length} stock items are low; prioritize ${lowStockNeeds[0].name} next.`);
    } else {
      entries.push("All stock items are above threshold right now.");
    }
    if (spentDelta != null) {
      if (spentDelta > 0) {
        entries.push(`Spending is ${formatCurrency(spentDelta)} higher than the previous month window.`);
      } else if (spentDelta < 0) {
        entries.push(`Spending is ${formatCurrency(Math.abs(spentDelta))} lower than the previous month window.`);
      } else {
        entries.push("Spending is pacing at the same level as the previous month window.");
      }
    } else {
      entries.push("Enable compare mode to view month-over-month pacing.");
    }
    if (prizeCartValue > 0) {
      entries.push(`Prize cart inventory value is estimated at ${formatCurrency(prizeCartValue)}.`);
    }
    return entries.slice(0, 4);
  }, [lowStockNeeds, prizeCartValue, scopedCategoryBreakdown, spentDelta]);

  const chartHasData =
    spendingTrend.some((row) => row.value > 0) || scopedCategoryBreakdown.some((category) => category.spent > 0);

  async function fetchSnapshot(month: string) {
    const response = await fetch(`/api/budget-stock/hub?month=${encodeURIComponent(month)}`, {
      cache: "no-store"
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not refresh budget data.");
    return body as BudgetStockHubSnapshot;
  }

  function refreshMonth(nextMonthKey: string) {
    startTransition(async () => {
      try {
        const nextSnapshot = await fetchSnapshot(nextMonthKey);
        setSnapshot(nextSnapshot);
      } catch (error) {
        toast({
          title: "Could not refresh budget month",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  useEffect(() => {
    if (previousMonthRef.current !== monthKey) {
      setPlannedPurchases(plannedSeedFromLowStock(snapshot.items));
      previousMonthRef.current = monthKey;
    }
  }, [monthKey, snapshot.items]);

  useEffect(() => {
    if (!compareEnabled) {
      setCompareSnapshot(null);
      return;
    }
    const priorKey = previousMonthKey(monthKey);
    let canceled = false;
    setCompareLoading(true);
    void fetchSnapshot(priorKey)
      .then((data) => {
        if (!canceled) setCompareSnapshot(data);
      })
      .catch((error) => {
        if (canceled) return;
        toast({
          title: "Comparison unavailable",
          description: error instanceof Error ? error.message : "Could not load previous month.",
          variant: "destructive"
        });
      })
      .finally(() => {
        if (!canceled) setCompareLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [compareEnabled, monthKey, toast]);

  function resetFilters() {
    setSearch("");
    setCategoryFilter("ALL");
    setTypeFilter("all");
    setVendorFilter("ALL");
    setLowStockOnly(false);
    setRangeMode("full-month");
  }

  function openCreateExpense() {
    setEditingExpense(null);
    setPurchaseForm(emptyPurchaseForm(todayDateKey));
    setPurchaseOpen(true);
  }

  function openBudgetEditor() {
    setBudgetTotalInput(monthlyBudget.toFixed(2));
    setBudgetDistribution(monthlyBudget > 0 ? "proportional" : "primary");
    setBudgetOpen(true);
  }

  function openEditExpense(expense: BudgetStockExpenseDTO) {
    setEditingExpense(expense);
    setPurchaseForm({
      date: expense.date.slice(0, 10),
      category: expense.category,
      amount: String(expense.amount),
      vendor: expense.vendor ?? "",
      title: "",
      note: expense.note ?? "",
      linkedItemId: expense.linkedItemId ?? ""
    });
    setPurchaseOpen(true);
  }

  async function submitExpense() {
    setPurchaseSaving(true);
    try {
      const payload = {
        date: purchaseForm.date,
        category: purchaseForm.category,
        amount: Number(purchaseForm.amount),
        vendor: purchaseForm.vendor.trim() || null,
        note: [purchaseForm.title.trim() ? `Purchase: ${purchaseForm.title.trim()}` : null, purchaseForm.note.trim() || null]
          .filter(Boolean)
          .join(" | ") || null,
        linkedItemId: purchaseForm.linkedItemId || null
      };

      const endpoint = editingExpense
        ? `/api/budget-stock/expenses/${encodeURIComponent(editingExpense.id)}`
        : "/api/budget-stock/expenses";
      const method = editingExpense ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not save purchase.");

      setPurchaseOpen(false);
      setEditingExpense(null);
      setPurchaseForm(emptyPurchaseForm(todayDateKey));
      refreshMonth(monthKey);
      toast({ title: editingExpense ? "Purchase updated" : "Purchase added" });
    } catch (error) {
      toast({
        title: "Purchase save failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setPurchaseSaving(false);
    }
  }

  async function removeExpense() {
    if (!editingExpense) return;
    setPurchaseSaving(true);
    try {
      const response = await fetch(`/api/budget-stock/expenses/${encodeURIComponent(editingExpense.id)}`, {
        method: "DELETE"
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not delete purchase.");
      setPurchaseOpen(false);
      setEditingExpense(null);
      refreshMonth(monthKey);
      toast({ title: "Purchase deleted" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setPurchaseSaving(false);
    }
  }

  async function submitStockItem() {
    setStockSaving(true);
    try {
      const response = await fetch("/api/budget-stock/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: stockForm.name,
          category: stockForm.category,
          unit: stockForm.unit.trim() || null,
          onHand: Number(stockForm.onHand),
          parLevel: Number(stockForm.parLevel),
          reorderPoint: stockForm.reorderPoint.trim() ? Number(stockForm.reorderPoint) : null,
          costPerUnit: stockForm.costPerUnit.trim() ? Number(stockForm.costPerUnit) : null,
          vendor: stockForm.vendor.trim() || null
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not create stock item.");
      setStockOpen(false);
      setStockForm(emptyItemForm(allCategories[0] ?? "Crafts"));
      refreshMonth(monthKey);
      toast({ title: "Stock item added" });
    } catch (error) {
      toast({
        title: "Could not add stock item",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setStockSaving(false);
    }
  }

  function openAdjust(itemId?: string) {
    setAdjustItemId(itemId ?? snapshot.items[0]?.id ?? "");
    setAdjustDelta("1");
    setAdjustOpen(true);
  }

  async function submitAdjust() {
    setAdjustSaving(true);
    try {
      const response = await fetch(`/api/budget-stock/items/${encodeURIComponent(adjustItemId)}/adjust`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          delta: Number(adjustDelta)
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not adjust stock.");
      setAdjustOpen(false);
      refreshMonth(monthKey);
      toast({ title: "Stock adjusted" });
    } catch (error) {
      toast({
        title: "Stock adjustment failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setAdjustSaving(false);
    }
  }

  async function restockFromLowItem(item: BudgetStockItemDTO) {
    if (!canEdit) return;
    const delta = Math.max(item.suggestedReorderQty, 1);
    try {
      const response = await fetch(`/api/budget-stock/items/${encodeURIComponent(item.id)}/adjust`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delta })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not restock item.");
      refreshMonth(monthKey);
      toast({
        title: "Restock recorded",
        description: `${item.name} increased by ${delta}.`
      });
    } catch (error) {
      toast({
        title: "Restock failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    }
  }

  async function submitSale() {
    setSaleSaving(true);
    try {
      const response = await fetch("/api/budget-stock/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: saleForm.itemId,
          qty: Number(saleForm.qty),
          sellPricePerUnit: Number(saleForm.sellPricePerUnit),
          residentName: saleForm.residentName.trim() || null,
          note: saleForm.note.trim() || null,
          date: saleForm.date
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not log prize cart change.");
      setSaleOpen(false);
      setSaleForm(emptySaleForm(todayDateKey));
      refreshMonth(monthKey);
      toast({ title: "Prize cart transaction logged" });
    } catch (error) {
      toast({
        title: "Could not log prize cart change",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaleSaving(false);
    }
  }

  async function submitBudgetTotal() {
    if (!canEdit) return;
    setBudgetSaving(true);
    try {
      const total = Number(budgetTotalInput);
      if (!Number.isFinite(total) || total < 0) {
        throw new Error("Monthly budget must be a number greater than or equal to 0.");
      }
      const response = await fetch("/api/budget-stock/monthly-budget", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          total,
          distribution: budgetDistribution
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not update monthly budget.");
      setBudgetOpen(false);
      refreshMonth(monthKey);
      toast({ title: "Monthly budget updated" });
    } catch (error) {
      toast({
        title: "Could not update monthly budget",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setBudgetSaving(false);
    }
  }

  function addPlannedPurchase() {
    const next: PlannedPurchase = {
      id: `planned-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      title: plannedForm.title.trim(),
      category: plannedForm.category,
      estimatedCost: Number(plannedForm.estimatedCost),
      priority: plannedForm.priority,
      dueDate: plannedForm.dueDate || null,
      status: plannedForm.status,
      notes: plannedForm.notes.trim() || null
    };
    setPlannedPurchases((current) => [next, ...current]);
    setPlannedOpen(false);
    setPlannedForm(emptyPlannedForm(allCategories[0] ?? "Crafts"));
    toast({ title: "Planned purchase added" });
  }

  function updatePlannedStatus(id: string, status: PlannedStatus) {
    setPlannedPurchases((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  function removePlanned(id: string) {
    setPlannedPurchases((current) => current.filter((row) => row.id !== id));
  }

  function exportSummary() {
    const rows = [
      csvRow(["Month", monthLabel]),
      csvRow(["Range", rangeMode === "full-month" ? "Full month" : "Month to date"]),
      csvRow(["Monthly Budget", monthlyBudget]),
      csvRow(["Spent", spentThisPeriod]),
      csvRow(["Remaining", remainingBudget]),
      csvRow(["Low Stock Items", lowStockItems.length]),
      csvRow(["Prize Cart Value", prizeCartValue]),
      csvRow(["Sales Revenue", scopedSales.reduce((sum, row) => sum + row.revenue, 0)]),
      "",
      csvRow(["Category", "Limit", "Spent", "Remaining"]),
      ...scopedCategoryBreakdown.map((row) => csvRow([row.name, row.monthlyLimit, row.spent, row.remaining]))
    ];
    exportCsv(`actify-budget-summary-${monthKey}.csv`, rows);
  }

  function exportPurchases() {
    const rows = [
      csvRow(["Date", "Category", "Amount", "Vendor", "Linked Item", "Notes"]),
      ...filteredExpenses.map((row) =>
        csvRow([row.date, row.category, row.amount, row.vendor ?? "", row.linkedItemName ?? "", row.note ?? ""])
      )
    ];
    exportCsv(`actify-budget-purchases-${monthKey}.csv`, rows);
  }

  function exportLowStock() {
    const rows = [
      csvRow(["Item", "Category", "On Hand", "Threshold", "Suggested Reorder", "Estimated Cost", "Vendor"]),
      ...lowStockNeeds.map((row) =>
        csvRow([
          row.name,
          row.category,
          row.onHand,
          row.threshold,
          row.suggestedReorderQty,
          row.estimatedCost,
          row.vendor ?? ""
        ])
      )
    ];
    exportCsv(`actify-low-stock-${monthKey}.csv`, rows);
  }

  function exportPlanned() {
    const rows = [
      csvRow(["Title", "Category", "Estimated Cost", "Priority", "Status", "Due Date", "Notes"]),
      ...filteredPlanned.map((row) =>
        csvRow([row.title, row.category, row.estimatedCost, row.priority, row.status, row.dueDate ?? "", row.notes ?? ""])
      )
    ];
    exportCsv(`actify-planned-purchases-${monthKey}.csv`, rows);
  }

  const ringAngle = (Math.min(Math.max(usedPercent, 0), 100) / 100) * 360;
  const ringStyle = {
    background: `conic-gradient(#fbbf24 0deg ${ringAngle}deg,#334155 ${ringAngle}deg 360deg)`
  };

  const trendDeltaText =
    spentDelta == null
      ? "Compare off"
      : spentDelta > 0
        ? `+${formatCurrency(spentDelta)} vs previous month`
        : spentDelta < 0
          ? `-${formatCurrency(Math.abs(spentDelta))} vs previous month`
          : "No change vs previous month";

  const trendDeltaTone =
    spentDelta == null ? "text-[#b0bed9]" : spentDelta > 0 ? "text-rose-100" : spentDelta < 0 ? "text-emerald-100" : "text-[#b0bed9]";

  const showPurchases = typeFilter === "all" || typeFilter === "purchases";
  const showStock = typeFilter === "all" || typeFilter === "stock";
  const showPrize = typeFilter === "all" || typeFilter === "prize";
  const showPlanned = typeFilter === "all" || typeFilter === "planned";

  return (
    <div className="space-y-4">
      <TopContentHeader
        eyebrow="Department Budget Command Center"
        title="Budget"
        subtitle="Track spending, remaining budget, stock levels, and purchase needs without juggling separate systems."
        icon={CircleDollarSign}
        accentGradientClasses="from-amber-300 via-violet-300 to-cyan-300"
        actions={
          <>
            <Button type="button" className="h-9 rounded-full bg-[#7a5ea8] px-3 text-xs text-white hover:bg-[#8f6fc2]" onClick={openCreateExpense} disabled={!canEdit}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Purchase
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]"
              onClick={openBudgetEditor}
              disabled={!canEdit}
            >
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Edit Monthly Budget
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={() => setStockOpen(true)} disabled={!canEdit}>
              <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
              Add Stock Item
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={exportSummary}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Budget
            </Button>
          </>
        }
      >
        <div className={cn(PANEL_SOFT, "grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5")}>
          <SummaryCard
            label="Monthly Budget"
            value={formatCurrency(monthlyBudget)}
            detail={monthLabel}
            icon={<Wallet className="h-4 w-4 text-amber-100" />}
            accent="from-amber-300/28 to-orange-300/20"
          />
          <SummaryCard
            label="Spent This Month"
            value={formatCurrency(spentThisPeriod)}
            detail={rangeMode === "full-month" ? "Full month total" : "Month-to-date window"}
            icon={<BadgeDollarSign className="h-4 w-4 text-rose-100" />}
            accent="from-rose-300/28 to-orange-300/20"
          />
          <SummaryCard
            label="Remaining Budget"
            value={formatCurrency(remainingBudget)}
            detail={`${usedPercent.toFixed(1)}% used`}
            icon={<HandCoins className="h-4 w-4 text-emerald-100" />}
            accent="from-emerald-300/28 to-teal-300/20"
          />
          <SummaryCard
            label="Low Stock Items"
            value={String(lowStockItems.length)}
            detail="Needs restock attention"
            icon={<AlertTriangle className="h-4 w-4 text-amber-100" />}
            accent="from-amber-300/28 to-yellow-300/20"
          />
          <SummaryCard
            label="Prize Cart Value"
            value={formatCurrency(prizeCartValue)}
            detail={`${prizeItems.length} tracked prize items`}
            icon={<ShoppingBasket className="h-4 w-4 text-violet-100" />}
            accent="from-violet-300/28 to-fuchsia-300/20"
          />
        </div>
      </TopContentHeader>

      <section className={cn(PANEL, "p-4")}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={META_LABEL}>Filters & Controls</p>
            <h2 className="mt-1 text-base font-bold text-white">Selected month and operational filters</h2>
          </div>
          <div className="flex items-center gap-2">
            {isPending ? (
              <span className="inline-flex h-8 items-center rounded-full border border-[#4f6284] bg-[#1b2a42] px-3 text-[11px] font-semibold text-[#dbe7ff]">
                Refreshing month...
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]"
              onClick={resetFilters}
            >
              Clear filters
            </Button>
          </div>
        </div>

        <div className="grid gap-2 xl:grid-cols-[170px_170px_160px_180px_180px_1fr_auto]">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b6d0]">
            Month
            <select
              value={monthKey}
              onChange={(event) => {
                const next = event.target.value;
                setMonthKey(next);
                refreshMonth(next);
              }}
              className="mt-1 h-10 w-full rounded-full border border-[#4a5d80] bg-[#162339] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              {monthOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b6d0]">
            Date Range
            <select
              value={rangeMode}
              onChange={(event) => setRangeMode(event.target.value as RangeMode)}
              className="mt-1 h-10 w-full rounded-full border border-[#4a5d80] bg-[#162339] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="full-month">Full Month</option>
              <option value="month-to-date">Month to Date</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b6d0]">
            Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="mt-1 h-10 w-full rounded-full border border-[#4a5d80] bg-[#162339] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="all">All</option>
              <option value="purchases">Purchases</option>
              <option value="stock">Stock</option>
              <option value="prize">Prize Cart</option>
              <option value="planned">Planned</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b6d0]">
            Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="mt-1 h-10 w-full rounded-full border border-[#4a5d80] bg-[#162339] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="ALL">All categories</option>
              {allCategories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b6d0]">
            Vendor
            <select
              value={vendorFilter}
              onChange={(event) => setVendorFilter(event.target.value)}
              className="mt-1 h-10 w-full rounded-full border border-[#4a5d80] bg-[#162339] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="ALL">All vendors</option>
              {allVendors.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="relative flex h-10 items-center rounded-full border border-[#4a5d80] bg-[#162339] px-3 text-sm text-[#dbe8ff]">
            <Search className="h-4 w-4 text-[#99acd0]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search purchase, stock, vendor..."
              className="h-full w-full bg-transparent px-2 placeholder:text-[#8498be] focus:outline-none"
            />
          </label>

          <label className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#4a5d80] bg-[#1a2a42] px-3 text-xs font-semibold text-[#dbe8ff]">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => setLowStockOnly(event.target.checked)}
              className="h-4 w-4"
            />
            Low stock only
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-8 rounded-full border px-3 text-xs",
              compareEnabled
                ? "border-violet-300/55 bg-violet-500/14 text-violet-100"
                : "border-[#4e6082] bg-[#1b2a42] text-[#dbe7ff]"
            )}
            onClick={() => setCompareEnabled((current) => !current)}
          >
            <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
            Compare Previous Month
          </Button>
          <Button type="button" variant="outline" className="h-8 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={openCreateExpense} disabled={!canEdit}>
            <ReceiptText className="mr-1.5 h-3.5 w-3.5" />
            Add Purchase
          </Button>
          <Button type="button" variant="outline" className="h-8 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={() => openAdjust()} disabled={!canEdit}>
            <Layers3 className="mr-1.5 h-3.5 w-3.5" />
            Adjust Stock
          </Button>
          <Button type="button" variant="outline" className="h-8 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={() => setSaleOpen(true)} disabled={!canEdit}>
            <ShoppingBasket className="mr-1.5 h-3.5 w-3.5" />
            Log Prize Cart Item
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
        <article className={cn(PANEL, "p-4")}>
          <p className={META_LABEL}>Budget Overview</p>
          <h3 className="mt-1 text-base font-bold text-white">Monthly budget usage snapshot</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-[auto_1fr] md:items-center">
            <div className="relative mx-auto h-44 w-44">
              <div className="h-full w-full rounded-full p-3" style={ringStyle}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-[#4a5d80] bg-[#13223b]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a5b7d5]">Used</p>
                  <p className="mt-1 text-3xl font-black text-white">{usedPercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <MetricRow label="Budget" value={formatCurrency(monthlyBudget)} />
              <MetricRow label="Spent" value={formatCurrency(spentThisPeriod)} />
              <MetricRow label="Remaining" value={formatCurrency(remainingBudget)} />
              <div className={cn(PANEL_SOFT, "px-3 py-2")}>
                <p className={cn("text-xs font-semibold", trendDeltaTone)}>
                  {compareLoading ? "Loading comparison..." : trendDeltaText}
                </p>
                {compareEnabled && compareSnapshot ? (
                  <p className="mt-1 text-[11px] text-[#9eb2d7]">
                    Previous: {formatMonthLabel(compareSnapshot.summary.monthKey, monthOptions)} ·{" "}
                    {formatCurrency(previousSpent ?? compareSnapshot.summary.spent)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </article>

        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Spending Trend</p>
              <h3 className="mt-1 text-base font-bold text-white">Weekly pacing for selected month</h3>
            </div>
            <span className="inline-flex rounded-full border border-[#4e6082] bg-[#1b2a42] px-2.5 py-1 text-[11px] text-[#dbe7ff]">
              {rangeMode === "full-month" ? "Full month view" : "Month-to-date view"}
            </span>
          </div>
          <div className="mt-3">
            <AnalyticsLineChartLazy data={spendingTrend.map((row) => ({ label: row.label, value: Number(row.value.toFixed(2)) }))} lineColor="#f59e0b" />
          </div>
          {!chartHasData ? (
            <p className={cn("mt-2", EMPTY_TEXT)}>No budget activity is available for this month yet.</p>
          ) : null}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className={cn(PANEL, "p-4")}>
          <p className={META_LABEL}>Category Breakdown</p>
          <h3 className="mt-1 text-base font-bold text-white">Where spending is going</h3>
          <div className="mt-3">
            <AnalyticsBarChartLazy
              data={
                scopedCategoryBreakdown.some((row) => row.spent > 0)
                  ? scopedCategoryBreakdown.slice(0, 8).map((row) => ({ label: row.name, value: row.spent }))
                  : [{ label: "No spend yet", value: 0 }]
              }
              horizontal
              barColor="#60a5fa"
            />
          </div>
          <div className="mt-3 space-y-2">
            {scopedCategoryBreakdown.slice(0, 6).map((category) => (
              <div key={category.id} className={cn(PANEL_SOFT, "px-3 py-2")}>
                <div className="flex items-center justify-between text-sm text-[#dce8ff]">
                  <span>{category.name}</span>
                  <span className="font-semibold">{formatCurrency(category.spent)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1e2f4c]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-300 to-amber-300"
                    style={{ width: `${Math.min(100, category.progressPercent)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#9eb2d6]">
                  Limit {formatCurrency(category.monthlyLimit)} · Remaining {formatCurrency(category.remaining)}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className={cn(PANEL, "p-4")}>
          <p className={META_LABEL}>This Month at a Glance</p>
          <h3 className="mt-1 text-base font-bold text-white">Smart takeaways</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#d2deff]">
            {insights.map((insight) => (
              <li key={insight} className={cn(PANEL_SOFT, "px-3 py-2")}>
                <span className="inline-flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-amber-300" />
                  <span>{insight}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <MetricTile label="Purchases" value={String(scopedExpenses.length)} helper="selected month" />
            <MetricTile label="Low Stock Alerts" value={String(lowStockItems.length)} helper="needs action" />
            <MetricTile label="Prize Cart Sales" value={String(scopedSales.length)} helper="transactions" />
            <MetricTile
              label="Sales Profit"
              value={formatCurrency(Number(scopedSales.reduce((sum, sale) => sum + sale.profit, 0).toFixed(2)))}
              helper="selected period"
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Purchase Activity</p>
              <h3 className="mt-1 text-base font-bold text-white">Recent purchases and expense records</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={exportPurchases}>
                Export Purchases
              </Button>
              <Button type="button" size="sm" className="h-8 rounded-full bg-[#7a5ea8] px-3 text-xs text-white hover:bg-[#8f6fc2]" onClick={openCreateExpense} disabled={!canEdit}>
                Add Purchase
              </Button>
            </div>
          </div>
          {showPurchases ? (
            filteredExpenses.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
                <p className={EMPTY_TEXT}>No purchases have been logged for this period yet.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {filteredExpenses.slice(0, 40).map((expense) => (
                  <article key={expense.id} className="rounded-xl border border-[#4a607f] bg-[#17263f] px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {expense.note && expense.note.startsWith("Purchase:")
                            ? expense.note.split("|")[0]?.replace("Purchase:", "").trim()
                            : expense.linkedItemName ?? expense.category}
                        </p>
                        <p className="mt-1 text-xs text-[#b7c7e6]">
                          {formatDateOnly(expense.date, timeZone)} · {expense.category}
                          {expense.vendor ? ` · ${expense.vendor}` : ""}
                        </p>
                        {expense.note ? <p className="mt-1 text-xs text-[#9eb2d8]">{expense.note}</p> : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm font-semibold text-white">{formatCurrency(expense.amount)}</p>
                        {expense.linkedItemName ? (
                          <Badge className="border-[#527299] bg-[#1d3558] text-[11px] text-[#dce8ff]">{expense.linkedItemName}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-[#4e6082] bg-[#1b2a42] px-2 text-[11px] text-[#dbe7ff] hover:bg-[#243858]"
                        onClick={() => openEditExpense(expense)}
                        disabled={!canEdit}
                      >
                        Edit
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
              <p className={EMPTY_TEXT}>Set type filter to Purchases or All to view purchase activity.</p>
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <article className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Vendor Snapshot</p>
            <h3 className="mt-1 text-base font-bold text-white">Top spending sources</h3>
            {vendorRows.length === 0 ? (
              <p className={cn("mt-3", EMPTY_TEXT)}>No vendor activity recorded this month.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {vendorRows.map((row) => (
                  <div key={row.vendor} className={cn(PANEL_SOFT, "px-3 py-2")}>
                    <div className="flex items-center justify-between text-sm text-[#dbe8ff]">
                      <span>{row.vendor}</span>
                      <span className="font-semibold">{formatCurrency(row.total)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#9eb2d6]">
                      {row.count} purchase{row.count === 1 ? "" : "s"} · Last {formatDateOnly(row.lastDate, timeZone)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Monthly Scorecard</p>
            <h3 className="mt-1 text-base font-bold text-white">Budget and stock summary</h3>
            <div className="mt-3 space-y-2">
              <MetricRow label="Selected Month" value={monthLabel} />
              <MetricRow label="Budget Total" value={formatCurrency(monthlyBudget)} />
              <MetricRow label="Spent" value={formatCurrency(spentThisPeriod)} />
              <MetricRow label="Remaining" value={formatCurrency(remainingBudget)} />
              <MetricRow label="Purchase Records" value={String(scopedExpenses.length)} />
              <MetricRow label="Low Stock Alerts" value={String(lowStockItems.length)} />
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Stock & Inventory Status</p>
              <h3 className="mt-1 text-base font-bold text-white">Supplies on hand and reorder state</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={exportLowStock}>
                Export Low Stock
              </Button>
              <Button type="button" size="sm" className="h-8 rounded-full bg-[#2e769f] px-3 text-xs text-white hover:bg-[#3887b5]" onClick={() => setStockOpen(true)} disabled={!canEdit}>
                Add Stock Item
              </Button>
            </div>
          </div>

          {showStock ? (
            filteredItems.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
                <p className={EMPTY_TEXT}>No stock items matched your filters.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {filteredItems.slice(0, 30).map((item) => (
                  <article key={item.id} className="rounded-xl border border-[#4a607f] bg-[#17263f] px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-[#b6c7e5]">
                          {item.category}
                          {item.vendor ? ` · ${item.vendor}` : ""}
                          {item.unit ? ` · ${item.unit}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-[#99afd5]">
                          On hand {item.onHand} · Threshold {item.threshold} · Reorder {item.suggestedReorderQty}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={cn("border text-[11px]", stockStatusClass(item))}>{stockStatusLabel(item)}</Badge>
                        <p className="text-xs text-[#b6c7e5]">
                          {item.costPerUnit != null ? `${formatCurrency(item.costPerUnit)}/unit` : "No unit cost"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-[#4e6082] bg-[#1b2a42] px-2 text-[11px] text-[#dbe7ff] hover:bg-[#243858]"
                        onClick={() => {
                          setAdjustItemId(item.id);
                          setAdjustDelta("1");
                          setAdjustOpen(true);
                        }}
                        disabled={!canEdit}
                      >
                        Adjust
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-[#4e6082] bg-[#1b2a42] px-2 text-[11px] text-[#dbe7ff] hover:bg-[#243858]"
                        onClick={() => void restockFromLowItem(item)}
                        disabled={!canEdit}
                      >
                        Restock Suggested
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
              <p className={EMPTY_TEXT}>Set type filter to Stock or All to view inventory.</p>
            </div>
          )}
        </article>

        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Prize Cart</p>
              <h3 className="mt-1 text-base font-bold text-white">Prize inventory and cart activity</h3>
            </div>
            <Button type="button" size="sm" className="h-8 rounded-full bg-[#8a64c7] px-3 text-xs text-white hover:bg-[#9f79dd]" onClick={() => setSaleOpen(true)} disabled={!canEdit}>
              Log Prize Cart Change
            </Button>
          </div>

          {showPrize ? (
            <>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <MetricTile label="Prize Value" value={formatCurrency(prizeCartValue)} helper="estimated on hand" />
                <MetricTile
                  label="Sales Revenue"
                  value={formatCurrency(Number(scopedSales.reduce((sum, row) => sum + row.revenue, 0).toFixed(2)))}
                  helper="selected period"
                />
                <MetricTile
                  label="Sales Profit"
                  value={formatCurrency(Number(scopedSales.reduce((sum, row) => sum + row.profit, 0).toFixed(2)))}
                  helper="selected period"
                />
              </div>

              {filteredPrizeItems.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
                  <p className={EMPTY_TEXT}>No prize cart items found for current filters.</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {filteredPrizeItems.slice(0, 8).map((item) => (
                    <div key={item.id} className={cn(PANEL_SOFT, "px-3 py-2")}>
                      <div className="flex items-center justify-between gap-2 text-sm text-[#dbe8ff]">
                        <span>{item.name}</span>
                        <span>{item.onHand} on hand</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#9eb2d6]">
                        {item.category} · {item.costPerUnit != null ? formatCurrency(item.costPerUnit) : "No cost set"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-xl border border-[#4a607f] bg-[#17263f]">
                <div className="grid grid-cols-[120px_1fr_80px_110px_100px] gap-3 border-b border-[#4a607f] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[#9fb3d8]">
                  <span>Date</span>
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Revenue</span>
                  <span>Profit</span>
                </div>
                {scopedSales.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-[#a8b8d4]">No prize cart transactions this month.</div>
                ) : (
                  <div className="divide-y divide-[#445976]">
                    {scopedSales.slice(0, 12).map((sale) => (
                      <div key={sale.id} className="grid grid-cols-[120px_1fr_80px_110px_100px] gap-3 px-3 py-2 text-sm text-[#e2ecff]">
                        <span className="text-[#b1c1dd]">{formatDateOnly(sale.date, timeZone)}</span>
                        <span>{sale.itemName}</span>
                        <span>{sale.qty}</span>
                        <span>{formatCurrency(sale.revenue)}</span>
                        <span className={sale.profit >= 0 ? "text-emerald-100" : "text-rose-100"}>
                          {formatCurrency(sale.profit)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
              <p className={EMPTY_TEXT}>Set type filter to Prize Cart or All to view prize inventory.</p>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Low Stock & Purchase Needs</p>
              <h3 className="mt-1 text-base font-bold text-white">Items that need purchasing attention</h3>
            </div>
            <Button type="button" size="sm" className="h-8 rounded-full bg-[#2e769f] px-3 text-xs text-white hover:bg-[#3887b5]" onClick={() => setPlannedOpen(true)}>
              Add Planned Purchase
            </Button>
          </div>
          {lowStockNeeds.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
              <p className={EMPTY_TEXT}>Everything looks stocked right now.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {lowStockNeeds.map((item) => (
                <article key={item.id} className="rounded-xl border border-[#4a607f] bg-[#17263f] px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-[#b6c7e5]">
                        {item.category} · Qty {item.onHand} / Threshold {item.threshold}
                      </p>
                      <p className="mt-1 text-xs text-[#9eb2d8]">
                        Suggested reorder {item.suggestedReorderQty} · Est. {formatCurrency(item.estimatedCost)}
                      </p>
                    </div>
                    <Badge className={cn("border text-[11px]", stockStatusClass(item))}>{stockStatusLabel(item)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-[#4e6082] bg-[#1b2a42] px-2 text-[11px] text-[#dbe7ff] hover:bg-[#243858]"
                      onClick={() => void restockFromLowItem(item)}
                      disabled={!canEdit}
                    >
                      Mark Restocked
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-[#4e6082] bg-[#1b2a42] px-2 text-[11px] text-[#dbe7ff] hover:bg-[#243858]"
                      onClick={() => {
                        setPlannedForm({
                          title: `Restock ${item.name}`,
                          category: item.category,
                          estimatedCost: String(item.estimatedCost || 0),
                          priority: item.onHand === 0 ? "High" : "Medium",
                          dueDate: "",
                          status: "PLANNED",
                          notes: `Qty ${item.onHand}, threshold ${item.threshold}.`
                        });
                        setPlannedOpen(true);
                      }}
                    >
                      Add to Shopping List
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Planned Purchases</p>
              <h3 className="mt-1 text-base font-bold text-white">Upcoming purchasing plan</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4e6082] bg-[#1b2a42] px-3 text-xs text-[#dbe7ff] hover:bg-[#243858]" onClick={exportPlanned}>
                Export Planned
              </Button>
              <Button type="button" size="sm" className="h-8 rounded-full bg-[#2e769f] px-3 text-xs text-white hover:bg-[#3887b5]" onClick={() => setPlannedOpen(true)}>
                Add Planned
              </Button>
            </div>
          </div>

          {showPlanned ? (
            filteredPlanned.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
                <p className={EMPTY_TEXT}>No planned purchases have been added.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {filteredPlanned.map((row) => (
                  <article key={row.id} className="rounded-xl border border-[#4a607f] bg-[#17263f] px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.title}</p>
                        <p className="mt-1 text-xs text-[#b6c7e5]">
                          {row.category} · {formatCurrency(row.estimatedCost)}
                          {row.dueDate ? ` · Needed ${formatDateOnly(row.dueDate, timeZone)}` : ""}
                        </p>
                        {row.notes ? <p className="mt-1 text-xs text-[#9eb2d8]">{row.notes}</p> : null}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={cn("border text-[11px]", plannedPriorityClass(row.priority))}>
                          {row.priority}
                        </Badge>
                        <Badge className={cn("border text-[11px]", plannedStatusClass(row.status))}>
                          {row.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select
                        value={row.status}
                        onChange={(event) => updatePlannedStatus(row.id, event.target.value as PlannedStatus)}
                        className="h-7 rounded-full border border-[#4e6082] bg-[#1b2a42] px-2 text-[11px] text-[#dbe7ff]"
                      >
                        <option value="PLANNED">Planned</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PURCHASED">Purchased</option>
                        <option value="DELAYED">Delayed</option>
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-[#4e6082] bg-[#1b2a42] px-2 text-[11px] text-[#dbe7ff] hover:bg-[#243858]"
                        onClick={() => removePlanned(row.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[#516687] bg-[#17263f] p-6 text-center">
              <p className={EMPTY_TEXT}>Set type filter to Planned or All to view planned purchases.</p>
            </div>
          )}
        </article>
      </section>

      <section className={cn(PANEL, "p-4")}>
        <p className={META_LABEL}>Quick Actions</p>
        <h3 className="mt-1 text-base font-bold text-white">Move from review to action quickly</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <ActionButton label="Add Purchase" icon={<ReceiptText className="h-4 w-4" />} onClick={openCreateExpense} />
          <ActionButton label="Edit Monthly Budget" icon={<Settings2 className="h-4 w-4" />} onClick={openBudgetEditor} />
          <ActionButton label="Add Stock Item" icon={<PackagePlus className="h-4 w-4" />} onClick={() => setStockOpen(true)} />
          <ActionButton label="Open Low Stock" icon={<AlertTriangle className="h-4 w-4" />} onClick={() => setTypeFilter("stock")} />
          <ActionButton label="Log Prize Cart Item" icon={<ShoppingBasket className="h-4 w-4" />} onClick={() => setSaleOpen(true)} />
          <ActionButton label="View Monthly Summary" icon={<ListChecks className="h-4 w-4" />} onClick={exportSummary} />
          <ActionButton label="Export Budget" icon={<Download className="h-4 w-4" />} onClick={exportSummary} />
          <ActionLink href="/app/calendar" label="Open Calendar" icon={<CalendarClock className="h-4 w-4" />} />
          <ActionLink href="/app/volunteers" label="Open Volunteers" icon={<Store className="h-4 w-4" />} />
          <ActionLink href="/app/documentation" label="Open Documentation" icon={<FolderKanban className="h-4 w-4" />} />
          <ActionLink href="/app/residents" label="Open Residents" icon={<Layers3 className="h-4 w-4" />} />
        </div>
      </section>

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent className="border-[#4e6082] bg-[#101826] text-[#dce8ff] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Edit Monthly Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Monthly Budget Total" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={budgetTotalInput}
                onChange={(event) => setBudgetTotalInput(event.target.value)}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="0.00"
              />
            </Field>

            <Field label="How to apply this total">
              <div className="space-y-2 rounded-xl border border-[#4a607f] bg-[#17263f] p-3">
                <label className="flex items-start gap-2 text-sm text-[#dbe8ff]">
                  <input
                    type="radio"
                    name="budget-distribution"
                    value="proportional"
                    checked={budgetDistribution === "proportional"}
                    onChange={() => setBudgetDistribution("proportional")}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    Keep current category split
                    <span className="mt-1 block text-xs text-[#9eb2d8]">
                      Adjust all category limits proportionally to match the new total.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-[#dbe8ff]">
                  <input
                    type="radio"
                    name="budget-distribution"
                    value="primary"
                    checked={budgetDistribution === "primary"}
                    onChange={() => setBudgetDistribution("primary")}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    Put full total in primary category
                    <span className="mt-1 block text-xs text-[#9eb2d8]">
                      Sets Activity Supplies (or first category) to the full total and others to $0.
                    </span>
                  </span>
                </label>
              </div>
            </Field>

            <p className="text-xs text-[#9eb2d8]">
              This updates your monthly budget baseline for the facility and will be reflected in Budget cards immediately.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-[#4e6082] bg-[#1b2a42] text-[#dbe7ff] hover:bg-[#243858]"
              onClick={() => setBudgetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#7a5ea8] text-white hover:bg-[#8f6fc2]"
              onClick={() => void submitBudgetTotal()}
              disabled={budgetSaving || Number.isNaN(Number(budgetTotalInput)) || Number(budgetTotalInput) < 0}
            >
              {budgetSaving ? "Saving..." : "Save Monthly Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="border-[#4e6082] bg-[#101826] text-[#dce8ff] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">
              {editingExpense ? "Edit Purchase" : "Add Purchase"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" required>
              <Input
                type="date"
                value={purchaseForm.date}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, date: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Category" required>
              <select
                value={purchaseForm.category}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, category: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                <option value="">Select category</option>
                {allCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purchase Title">
              <Input
                value={purchaseForm.title}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, title: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="Craft supplies restock"
              />
            </Field>
            <Field label="Amount" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={purchaseForm.amount}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, amount: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="0.00"
              />
            </Field>
            <Field label="Vendor">
              <Input
                value={purchaseForm.vendor}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, vendor: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="Walmart"
              />
            </Field>
            <Field label="Linked Item">
              <select
                value={purchaseForm.linkedItemId}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, linkedItemId: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                <option value="">None</option>
                {snapshot.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={purchaseForm.note}
                onChange={(event) => setPurchaseForm((current) => ({ ...current, note: event.target.value }))}
                rows={4}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#4e6082] bg-[#1b2a42] text-[#dbe7ff] hover:bg-[#243858]" onClick={() => setPurchaseOpen(false)}>
              Cancel
            </Button>
            {editingExpense ? (
              <Button
                type="button"
                variant="outline"
                className="border-rose-400/55 bg-rose-500/14 text-rose-100 hover:bg-rose-500/22"
                onClick={() => void removeExpense()}
                disabled={purchaseSaving}
              >
                Delete
              </Button>
            ) : null}
            <Button
              type="button"
              className="bg-[#7a5ea8] text-white hover:bg-[#8f6fc2]"
              onClick={() => void submitExpense()}
              disabled={purchaseSaving || !purchaseForm.date || !purchaseForm.category || Number(purchaseForm.amount) < 0}
            >
              {purchaseSaving ? "Saving..." : editingExpense ? "Save Changes" : "Add Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="border-[#4e6082] bg-[#101826] text-[#dce8ff] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Add Stock Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Item Name" required>
              <Input
                value={stockForm.name}
                onChange={(event) => setStockForm((current) => ({ ...current, name: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Category" required>
              <select
                value={stockForm.category}
                onChange={(event) => setStockForm((current) => ({ ...current, category: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                {allCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="On Hand" required>
              <Input
                type="number"
                min="0"
                value={stockForm.onHand}
                onChange={(event) => setStockForm((current) => ({ ...current, onHand: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Par Level" required>
              <Input
                type="number"
                min="0"
                value={stockForm.parLevel}
                onChange={(event) => setStockForm((current) => ({ ...current, parLevel: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Reorder Threshold">
              <Input
                type="number"
                min="0"
                value={stockForm.reorderPoint}
                onChange={(event) => setStockForm((current) => ({ ...current, reorderPoint: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Cost Per Unit">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={stockForm.costPerUnit}
                onChange={(event) => setStockForm((current) => ({ ...current, costPerUnit: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Unit">
              <Input
                value={stockForm.unit}
                onChange={(event) => setStockForm((current) => ({ ...current, unit: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="unit"
              />
            </Field>
            <Field label="Vendor">
              <Input
                value={stockForm.vendor}
                onChange={(event) => setStockForm((current) => ({ ...current, vendor: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="Vendor"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#4e6082] bg-[#1b2a42] text-[#dbe7ff] hover:bg-[#243858]" onClick={() => setStockOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#2e769f] text-white hover:bg-[#3887b5]"
              onClick={() => void submitStockItem()}
              disabled={stockSaving || stockForm.name.trim().length < 1}
            >
              {stockSaving ? "Saving..." : "Add Stock Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="border-[#4e6082] bg-[#101826] text-[#dce8ff] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Adjust Stock Quantity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Item" required>
              <select
                value={adjustItemId}
                onChange={(event) => setAdjustItemId(event.target.value)}
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                <option value="">Select item</option>
                {snapshot.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.onHand} on hand)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Delta (+/-)" required>
              <Input
                type="number"
                value={adjustDelta}
                onChange={(event) => setAdjustDelta(event.target.value)}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="Use negative for reductions"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#4e6082] bg-[#1b2a42] text-[#dbe7ff] hover:bg-[#243858]" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#2e769f] text-white hover:bg-[#3887b5]"
              onClick={() => void submitAdjust()}
              disabled={adjustSaving || !adjustItemId || Number(adjustDelta) === 0 || Number.isNaN(Number(adjustDelta))}
            >
              {adjustSaving ? "Saving..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
        <DialogContent className="border-[#4e6082] bg-[#101826] text-[#dce8ff] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Log Prize Cart Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prize Item" required className="sm:col-span-2">
              <select
                value={saleForm.itemId}
                onChange={(event) => setSaleForm((current) => ({ ...current, itemId: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                <option value="">Select item</option>
                {prizeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.onHand} on hand)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={saleForm.date}
                onChange={(event) => setSaleForm((current) => ({ ...current, date: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Quantity" required>
              <Input
                type="number"
                min="1"
                value={saleForm.qty}
                onChange={(event) => setSaleForm((current) => ({ ...current, qty: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Sell Price Per Unit" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={saleForm.sellPricePerUnit}
                onChange={(event) => setSaleForm((current) => ({ ...current, sellPricePerUnit: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Resident Name">
              <Input
                value={saleForm.residentName}
                onChange={(event) => setSaleForm((current) => ({ ...current, residentName: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="Optional"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={saleForm.note}
                onChange={(event) => setSaleForm((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#4e6082] bg-[#1b2a42] text-[#dbe7ff] hover:bg-[#243858]" onClick={() => setSaleOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#8a64c7] text-white hover:bg-[#9f79dd]"
              onClick={() => void submitSale()}
              disabled={
                saleSaving ||
                !saleForm.itemId ||
                Number(saleForm.qty) < 1 ||
                Number.isNaN(Number(saleForm.sellPricePerUnit))
              }
            >
              {saleSaving ? "Saving..." : "Log Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={plannedOpen} onOpenChange={setPlannedOpen}>
        <DialogContent className="border-[#4e6082] bg-[#101826] text-[#dce8ff] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Add Planned Purchase</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Item / Purchase" required className="sm:col-span-2">
              <Input
                value={plannedForm.title}
                onChange={(event) => setPlannedForm((current) => ({ ...current, title: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
                placeholder="Easter prize basket fillers"
              />
            </Field>
            <Field label="Category" required>
              <select
                value={plannedForm.category}
                onChange={(event) => setPlannedForm((current) => ({ ...current, category: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                {allCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated Cost" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={plannedForm.estimatedCost}
                onChange={(event) => setPlannedForm((current) => ({ ...current, estimatedCost: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Priority">
              <select
                value={plannedForm.priority}
                onChange={(event) =>
                  setPlannedForm((current) => ({ ...current, priority: event.target.value as PlannedPriority }))
                }
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={plannedForm.status}
                onChange={(event) =>
                  setPlannedForm((current) => ({ ...current, status: event.target.value as PlannedStatus }))
                }
                className="h-10 w-full rounded-md border border-[#4e6082] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
              >
                <option value="PLANNED">Planned</option>
                <option value="APPROVED">Approved</option>
                <option value="PURCHASED">Purchased</option>
                <option value="DELAYED">Delayed</option>
              </select>
            </Field>
            <Field label="Needed By">
              <Input
                type="date"
                value={plannedForm.dueDate}
                onChange={(event) => setPlannedForm((current) => ({ ...current, dueDate: event.target.value }))}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={plannedForm.notes}
                onChange={(event) => setPlannedForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="border-[#4e6082] bg-[#17263f] text-[#dce8ff]"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#4e6082] bg-[#1b2a42] text-[#dbe7ff] hover:bg-[#243858]" onClick={() => setPlannedOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#2e769f] text-white hover:bg-[#3887b5]"
              onClick={addPlannedPurchase}
              disabled={plannedForm.title.trim().length < 2 || Number(plannedForm.estimatedCost) < 0}
            >
              Add Planned Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  accent
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <article className={cn(PANEL, "relative overflow-hidden p-3")}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r", accent)} />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className={META_LABEL}>{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-xs text-[#a7b8d7]">{detail}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#506588] bg-[#1b2a42]">
          {icon}
        </span>
      </div>
    </article>
  );
}

function MetricRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={cn(PANEL_SOFT, "flex items-center justify-between px-3 py-2 text-sm")}>
      <span className="text-[#bfd0ee]">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className={cn(PANEL_SOFT, "p-3")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9dafd2]">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-[#97abd0]">{helper}</p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-between rounded-xl border border-[#4e6082] bg-[#1b2a42] px-3 py-2 text-sm font-semibold text-[#dbe7ff] transition hover:bg-[#243858]"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span aria-hidden>→</span>
    </button>
  );
}

function ActionLink({
  href,
  label,
  icon
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between rounded-xl border border-[#4e6082] bg-[#1b2a42] px-3 py-2 text-sm font-semibold text-[#dbe7ff] transition hover:bg-[#243858]"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}

function Field({
  label,
  required,
  className,
  children
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("space-y-1 text-sm", className)}>
      <span className="inline-flex items-center gap-1 text-[#ccdaf2]">
        {label}
        {required ? <span className="text-rose-300">*</span> : null}
      </span>
      {children}
    </label>
  );
}
