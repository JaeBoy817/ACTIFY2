export type BudgetStockMonthSummary = {
  monthKey: string;
  spent: number;
  remaining: number;
  lowStockCount: number;
  categoryLimitTotal: number;
  salesRevenue: number;
  salesCostBasis: number;
  salesProfit: number;
};

export type BudgetStockItemDTO = {
  id: string;
  name: string;
  category: string;
  unit: string | null;
  onHand: number;
  parLevel: number;
  reorderPoint: number | null;
  costPerUnit: number | null;
  vendor: string | null;
  isActive: boolean;
  status: "ok" | "low";
  suggestedReorderQty: number;
  threshold: number;
  updatedAt: string;
};

export type BudgetStockCategoryDTO = {
  id: string;
  name: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  progressPercent: number;
};

export type BudgetStockExpenseDTO = {
  id: string;
  date: string;
  category: string;
  amount: number;
  vendor: string | null;
  note: string | null;
  linkedItemId: string | null;
  linkedItemName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetStockHubSnapshot = {
  summary: BudgetStockMonthSummary;
  items: BudgetStockItemDTO[];
  categories: BudgetStockCategoryDTO[];
  expenses: BudgetStockExpenseDTO[];
  sales: BudgetStockSaleDTO[];
};

export type BudgetStockSaleDTO = {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  qty: number;
  sellPricePerUnit: number;
  revenue: number;
  costBasis: number;
  profit: number;
  residentName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};
