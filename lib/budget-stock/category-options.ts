export const BUDGET_STOCK_CATEGORY_OPTIONS = [
  "Activity Supplies",
  "Decorations",
  "Misc",
  "Outings",
  "Prizes",
  "Snack/Drink"
] as const;

const CATEGORY_NORMALIZATION_MAP: Record<string, string> = {
  "activity supplies": "Activity Supplies",
  "activities supplies": "Activity Supplies",
  decorations: "Decorations",
  misc: "Misc",
  outings: "Outings",
  prizes: "Prizes",
  "snack/drink": "Snack/Drink",
  "snacks/drinks": "Snack/Drink",
  snacks: "Snack/Drink",
  drinks: "Snack/Drink"
};

export function normalizeBudgetStockCategory(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "Misc";
  const normalized = CATEGORY_NORMALIZATION_MAP[raw.toLowerCase()];
  return normalized ?? raw;
}
