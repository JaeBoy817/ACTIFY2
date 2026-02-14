interface BudgetTrackerConfig {
  monthlyBudgetCents: number;
  defaultUnitCostCents: number;
  itemUnitCosts: Record<string, number>;
  prizeItemImages: Record<string, string>;
}

const defaultBudgetTrackerConfig: BudgetTrackerConfig = {
  monthlyBudgetCents: 0,
  defaultUnitCostCents: 0,
  itemUnitCosts: {},
  prizeItemImages: {}
};

function asNonNegativeInteger(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(Math.round(value), 0);
}

export function readBudgetTrackerConfig(flagsRaw: unknown): BudgetTrackerConfig {
  if (!flagsRaw || typeof flagsRaw !== "object") return defaultBudgetTrackerConfig;
  const root = flagsRaw as Record<string, unknown>;
  const raw = root.budgetTracker;
  if (!raw || typeof raw !== "object") return defaultBudgetTrackerConfig;

  const safe = raw as Record<string, unknown>;
  const rawCosts = safe.itemUnitCosts && typeof safe.itemUnitCosts === "object"
    ? (safe.itemUnitCosts as Record<string, unknown>)
    : {};
  const rawPrizeImages = safe.prizeItemImages && typeof safe.prizeItemImages === "object"
    ? (safe.prizeItemImages as Record<string, unknown>)
    : {};

  const itemUnitCosts = Object.fromEntries(
    Object.entries(rawCosts).map(([key, value]) => [key, asNonNegativeInteger(value)])
  );
  const prizeItemImages = Object.fromEntries(
    Object.entries(rawPrizeImages)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => [key, String(value).trim()])
  );

  return {
    monthlyBudgetCents: asNonNegativeInteger(safe.monthlyBudgetCents),
    defaultUnitCostCents: asNonNegativeInteger(safe.defaultUnitCostCents),
    itemUnitCosts,
    prizeItemImages
  };
}

export function writeBudgetTrackerConfig(flagsRaw: unknown, next: BudgetTrackerConfig) {
  const root = flagsRaw && typeof flagsRaw === "object" ? { ...(flagsRaw as Record<string, unknown>) } : {};
  return {
    ...root,
    budgetTracker: {
      monthlyBudgetCents: asNonNegativeInteger(next.monthlyBudgetCents),
      defaultUnitCostCents: asNonNegativeInteger(next.defaultUnitCostCents),
      itemUnitCosts: Object.fromEntries(
        Object.entries(next.itemUnitCosts).map(([key, value]) => [key, asNonNegativeInteger(value)])
      ),
      prizeItemImages: Object.fromEntries(
        Object.entries(next.prizeItemImages)
          .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
          .map(([key, value]) => [key, value.trim()])
      )
    }
  };
}
