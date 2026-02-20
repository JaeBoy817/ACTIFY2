import { Prisma } from "@prisma/client";

import { readBudgetTrackerConfig } from "@/lib/budget-tracker";
import { BUDGET_STOCK_CATEGORY_OPTIONS, normalizeBudgetStockCategory } from "@/lib/budget-stock/category-options";
import { prisma } from "@/lib/prisma";
import {
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedMonthShift,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";
import type {
  BudgetStockCategoryDTO,
  BudgetStockExpenseDTO,
  BudgetStockHubSnapshot,
  BudgetStockItemDTO,
  BudgetStockMonthSummary,
  BudgetStockSaleDTO
} from "@/lib/budget-stock/types";

export const DEFAULT_BUDGET_CATEGORY_NAMES = BUDGET_STOCK_CATEGORY_OPTIONS;

function parseMonthKey(monthKey: string | null | undefined, timeZone: string) {
  const zone = resolveTimeZone(timeZone);
  const nowKey = zonedDateKey(new Date(), zone);
  const fallbackMonthKey = nowKey.slice(0, 7);
  const normalized = typeof monthKey === "string" ? monthKey.trim() : "";
  const finalMonthKey = /^\d{4}-\d{2}$/.test(normalized) ? normalized : fallbackMonthKey;
  const start = zonedDateStringToUtcStart(`${finalMonthKey}-01`, zone);
  if (!start) {
    const fallbackStart = zonedDateStringToUtcStart(`${fallbackMonthKey}-01`, zone);
    if (!fallbackStart) {
      throw new Error("Could not resolve month range.");
    }
    return {
      monthKey: fallbackMonthKey,
      start: fallbackStart,
      endExclusive: startOfZonedMonthShift(fallbackStart, zone, 1),
      timeZone: zone
    };
  }

  return {
    monthKey: finalMonthKey,
    start,
    endExclusive: startOfZonedMonthShift(start, zone, 1),
    timeZone: zone
  };
}

function computeLowThreshold(parLevel: number, reorderPoint?: number | null) {
  if (typeof reorderPoint === "number" && Number.isFinite(reorderPoint)) {
    return Math.max(Math.floor(reorderPoint), 0);
  }
  return Math.max(Math.floor(parLevel * 0.3), 0);
}

export function isLowStock(input: { onHand: number; parLevel: number; reorderPoint?: number | null }) {
  return input.onHand <= computeLowThreshold(input.parLevel, input.reorderPoint);
}

function toItemDTO(item: {
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
  updatedAt: Date;
}): BudgetStockItemDTO {
  const threshold = computeLowThreshold(item.parLevel, item.reorderPoint);
  const suggestedReorderQty = Math.max(item.parLevel - item.onHand, 0);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    onHand: item.onHand,
    parLevel: item.parLevel,
    reorderPoint: item.reorderPoint,
    costPerUnit: item.costPerUnit,
    vendor: item.vendor,
    isActive: item.isActive,
    status: item.onHand <= threshold ? "low" : "ok",
    suggestedReorderQty,
    threshold,
    updatedAt: item.updatedAt.toISOString()
  };
}

function toExpenseDTO(expense: {
  id: string;
  date: Date;
  category: string;
  amount: number;
  vendor: string | null;
  note: string | null;
  linkedItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
  linkedItem: { name: string } | null;
}): BudgetStockExpenseDTO {
  return {
    id: expense.id,
    date: expense.date.toISOString(),
    category: expense.category,
    amount: expense.amount,
    vendor: expense.vendor,
    note: expense.note,
    linkedItemId: expense.linkedItemId,
    linkedItemName: expense.linkedItem?.name ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString()
  };
}

function toSaleDTO(sale: {
  id: string;
  date: Date;
  itemId: string;
  qty: number;
  sellPricePerUnit: number;
  revenue: number;
  costBasis: number;
  profit: number;
  residentName: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  item: { name: string };
}): BudgetStockSaleDTO {
  return {
    id: sale.id,
    date: sale.date.toISOString(),
    itemId: sale.itemId,
    itemName: sale.item.name,
    qty: sale.qty,
    sellPricePerUnit: sale.sellPricePerUnit,
    revenue: sale.revenue,
    costBasis: sale.costBasis,
    profit: sale.profit,
    residentName: sale.residentName,
    note: sale.note,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString()
  };
}

export async function ensureBudgetStockCategories(facilityId: string) {
  const existingCount = await prisma.budgetStockCategory.count({
    where: { facilityId }
  });
  if (existingCount > 0) {
    return;
  }

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { moduleFlags: true }
  });
  const legacyConfig = readBudgetTrackerConfig(facility?.moduleFlags);
  const legacyBudgetDollars = legacyConfig.monthlyBudgetCents / 100;

  await prisma.budgetStockCategory.createMany({
    data: DEFAULT_BUDGET_CATEGORY_NAMES.map((name, index) => ({
      facilityId,
      name,
      monthlyLimit: index === 0 ? legacyBudgetDollars : 0
    })),
    skipDuplicates: true
  });
}

export async function ensureBudgetStockCategoryName(facilityId: string, name: string) {
  const normalized = normalizeBudgetStockCategory(name);
  if (!normalized) {
    return null;
  }
  return prisma.budgetStockCategory.upsert({
    where: {
      facilityId_name: {
        facilityId,
        name: normalized
      }
    },
    update: {},
    create: {
      facilityId,
      name: normalized,
      monthlyLimit: 0
    }
  });
}

async function canonicalizeBudgetStockCategories(facilityId: string) {
  const rows = await prisma.budgetStockCategory.findMany({
    where: { facilityId },
    select: { id: true, name: true, monthlyLimit: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }]
  });

  const groups = new Map<string, Array<{ id: string; name: string; monthlyLimit: number; createdAt: Date }>>();
  for (const row of rows) {
    const canonicalName = normalizeBudgetStockCategory(row.name);
    const bucket = groups.get(canonicalName);
    if (bucket) {
      bucket.push(row);
    } else {
      groups.set(canonicalName, [row]);
    }
  }

  for (const [canonicalName, group] of groups) {
    const hasAliasRows = group.some((row) => row.name !== canonicalName);
    if (group.length === 1 && !hasAliasRows) {
      continue;
    }

    const keeper = group.find((row) => row.name === canonicalName) ?? group[0];
    const aliasRows = group.filter((row) => row.id !== keeper.id);
    const aliasIds = aliasRows.map((row) => row.id);
    const aliasNames = aliasRows.map((row) => row.name);
    const monthlyLimit = Number(group.reduce((sum, row) => sum + row.monthlyLimit, 0).toFixed(2));

    await prisma.$transaction(async (tx) => {
      await tx.budgetStockCategory.update({
        where: { id: keeper.id },
        data: {
          name: canonicalName,
          monthlyLimit
        }
      });

      await tx.budgetStockExpense.updateMany({
        where: {
          facilityId,
          category: { in: [canonicalName, ...aliasNames] }
        },
        data: {
          category: canonicalName,
          categoryId: keeper.id
        }
      });

      if (aliasNames.length > 0) {
        await tx.budgetStockItem.updateMany({
          where: {
            facilityId,
            category: { in: aliasNames }
          },
          data: {
            category: canonicalName
          }
        });
      }

      if (aliasIds.length > 0) {
        await tx.budgetStockCategory.deleteMany({
          where: {
            id: { in: aliasIds },
            facilityId
          }
        });
      }
    });
  }
}

function computeCategoryCards(
  categories: Array<{ id: string; name: string; monthlyLimit: number }>,
  expenses: BudgetStockExpenseDTO[]
) {
  const spentByCategory = new Map<string, number>();
  for (const expense of expenses) {
    spentByCategory.set(expense.category, (spentByCategory.get(expense.category) ?? 0) + expense.amount);
  }

  return categories.map((category): BudgetStockCategoryDTO => {
    const spent = Number((spentByCategory.get(category.name) ?? 0).toFixed(2));
    const remaining = Number((category.monthlyLimit - spent).toFixed(2));
    const progressPercent =
      category.monthlyLimit > 0 ? Math.min(100, Math.max(0, (spent / category.monthlyLimit) * 100)) : 0;
    return {
      id: category.id,
      name: category.name,
      monthlyLimit: Number(category.monthlyLimit.toFixed(2)),
      spent,
      remaining,
      progressPercent: Number(progressPercent.toFixed(1))
    };
  });
}

export async function getBudgetStockHubSnapshot(params: {
  facilityId: string;
  monthKey?: string | null;
  timeZone?: string | null;
}): Promise<BudgetStockHubSnapshot> {
  const range = parseMonthKey(params.monthKey, params.timeZone ?? "America/Chicago");
  await ensureBudgetStockCategories(params.facilityId);
  await canonicalizeBudgetStockCategories(params.facilityId);

  const [items, categories, expenses, sales] = await Promise.all([
    prisma.budgetStockItem.findMany({
      where: { facilityId: params.facilityId, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    prisma.budgetStockCategory.findMany({
      where: { facilityId: params.facilityId },
      orderBy: { name: "asc" }
    }),
    prisma.budgetStockExpense.findMany({
      where: {
        facilityId: params.facilityId,
        date: {
          gte: range.start,
          lt: range.endExclusive
        }
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        linkedItem: {
          select: { name: true }
        }
      }
    }),
    prisma.budgetStockSale.findMany({
      where: {
        facilityId: params.facilityId,
        date: {
          gte: range.start,
          lt: range.endExclusive
        }
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        item: {
          select: { name: true }
        }
      }
    })
  ]);

  const itemRows = items.map((item) =>
    toItemDTO({
      ...item,
      unit: item.unit ?? null,
      reorderPoint: item.reorderPoint ?? null,
      costPerUnit: item.costPerUnit ?? null,
      vendor: item.vendor ?? null
    })
  );
  const expenseRows = expenses.map((expense) => toExpenseDTO(expense));
  const saleRows = sales.map((sale) => toSaleDTO(sale));
  const categoryCards = computeCategoryCards(categories, expenseRows);

  const spent = Number(expenseRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
  const limitTotal = Number(categoryCards.reduce((sum, row) => sum + row.monthlyLimit, 0).toFixed(2));
  const remaining = Number((limitTotal - spent).toFixed(2));
  const lowStockCount = itemRows.filter((row) => row.status === "low").length;
  const salesRevenue = Number(saleRows.reduce((sum, row) => sum + row.revenue, 0).toFixed(2));
  const salesCostBasis = Number(saleRows.reduce((sum, row) => sum + row.costBasis, 0).toFixed(2));
  const salesProfit = Number((salesRevenue - salesCostBasis).toFixed(2));

  const summary: BudgetStockMonthSummary = {
    monthKey: range.monthKey,
    spent,
    remaining,
    lowStockCount,
    categoryLimitTotal: limitTotal,
    salesRevenue,
    salesCostBasis,
    salesProfit
  };

  return {
    summary,
    items: itemRows,
    categories: categoryCards,
    expenses: expenseRows,
    sales: saleRows
  };
}

export async function getBudgetStockSummary(params: {
  facilityId: string;
  monthKey?: string | null;
  timeZone?: string | null;
}): Promise<BudgetStockMonthSummary> {
  const snapshot = await getBudgetStockHubSnapshot(params);
  return snapshot.summary;
}

export async function createBudgetStockItem(params: {
  facilityId: string;
  data: {
    name: string;
    category: string;
    unit?: string | null;
    onHand?: number;
    parLevel?: number;
    reorderPoint?: number | null;
    costPerUnit?: number | null;
    vendor?: string | null;
  };
}) {
  const categoryName = normalizeBudgetStockCategory(params.data.category);
  const onHand = Math.max(Math.round(params.data.onHand ?? 0), 0);
  const costPerUnit =
    typeof params.data.costPerUnit === "number" && Number.isFinite(params.data.costPerUnit)
      ? Number(params.data.costPerUnit)
      : null;
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.budgetStockItem.create({
      data: {
        facilityId: params.facilityId,
        name: params.data.name.trim(),
        category: categoryName,
        unit: params.data.unit?.trim() || null,
        onHand,
        parLevel: Math.max(Math.round(params.data.parLevel ?? 0), 0),
        reorderPoint:
          params.data.reorderPoint === null || params.data.reorderPoint === undefined
            ? null
            : Math.max(Math.round(params.data.reorderPoint), 0),
        costPerUnit,
        vendor: params.data.vendor?.trim() || null
      }
    });

    if (onHand > 0 && costPerUnit !== null && costPerUnit > 0) {
      const category = await tx.budgetStockCategory.upsert({
        where: {
          facilityId_name: {
            facilityId: params.facilityId,
            name: categoryName
          }
        },
        update: {},
        create: {
          facilityId: params.facilityId,
          name: categoryName,
          monthlyLimit: 0
        }
      });

      await tx.budgetStockExpense.create({
        data: {
          facilityId: params.facilityId,
          date: new Date(),
          category: categoryName,
          amount: Number((onHand * costPerUnit).toFixed(2)),
          vendor: params.data.vendor?.trim() || null,
          note: `Auto inventory cost for initial stock (${onHand} @ ${costPerUnit.toFixed(2)})`,
          linkedItemId: created.id,
          categoryId: category.id
        }
      });
    }

    return created;
  });
  return toItemDTO({
    ...row,
    unit: row.unit ?? null,
    reorderPoint: row.reorderPoint ?? null,
    costPerUnit: row.costPerUnit ?? null,
    vendor: row.vendor ?? null
  });
}

export async function updateBudgetStockItem(params: {
  facilityId: string;
  itemId: string;
  data: {
    name?: string;
    category?: string;
    unit?: string | null;
    onHand?: number;
    parLevel?: number;
    reorderPoint?: number | null;
    costPerUnit?: number | null;
    vendor?: string | null;
    isActive?: boolean;
  };
}) {
  const existing = await prisma.budgetStockItem.findFirst({
    where: {
      id: params.itemId,
      facilityId: params.facilityId
    }
  });
  if (!existing) {
    throw new Error("Inventory item not found.");
  }

  const item = await prisma.budgetStockItem.update({
    where: { id: existing.id },
    data: {
      ...(params.data.name !== undefined ? { name: params.data.name.trim() } : {}),
      ...(params.data.category !== undefined ? { category: normalizeBudgetStockCategory(params.data.category) } : {}),
      ...(params.data.unit !== undefined ? { unit: params.data.unit?.trim() || null } : {}),
      ...(params.data.onHand !== undefined ? { onHand: Math.max(Math.round(params.data.onHand), 0) } : {}),
      ...(params.data.parLevel !== undefined ? { parLevel: Math.max(Math.round(params.data.parLevel), 0) } : {}),
      ...(params.data.reorderPoint !== undefined
        ? {
            reorderPoint:
              params.data.reorderPoint === null ? null : Math.max(Math.round(params.data.reorderPoint), 0)
          }
        : {}),
      ...(params.data.costPerUnit !== undefined
        ? {
            costPerUnit:
              params.data.costPerUnit === null || !Number.isFinite(params.data.costPerUnit)
                ? null
                : Number(params.data.costPerUnit)
          }
        : {}),
      ...(params.data.vendor !== undefined ? { vendor: params.data.vendor?.trim() || null } : {}),
      ...(params.data.isActive !== undefined ? { isActive: params.data.isActive } : {})
    }
  });

  return toItemDTO({
    ...item,
    unit: item.unit ?? null,
    reorderPoint: item.reorderPoint ?? null,
    costPerUnit: item.costPerUnit ?? null,
    vendor: item.vendor ?? null
  });
}

export async function deleteBudgetStockItem(params: { facilityId: string; itemId: string }) {
  await prisma.budgetStockItem.updateMany({
    where: {
      id: params.itemId,
      facilityId: params.facilityId
    },
    data: {
      isActive: false
    }
  });
}

export async function adjustBudgetStockItemQuantity(params: {
  facilityId: string;
  itemId: string;
  delta: number;
}) {
  if (!Number.isFinite(params.delta) || Math.round(params.delta) === 0) {
    throw new Error("Adjustment delta must be non-zero.");
  }

  const roundedDelta = Math.round(params.delta);
  const next = await prisma.$transaction(async (tx) => {
    const item = await tx.budgetStockItem.findFirst({
      where: {
        id: params.itemId,
        facilityId: params.facilityId,
        isActive: true
      }
    });
    if (!item) {
      throw new Error("Inventory item not found.");
    }

    const nextOnHand = Math.max(item.onHand + roundedDelta, 0);
    const updated = await tx.budgetStockItem.update({
      where: { id: item.id },
      data: {
        onHand: nextOnHand
      }
    });

    if (roundedDelta > 0 && item.costPerUnit !== null && item.costPerUnit > 0) {
      const categoryName = normalizeBudgetStockCategory(item.category);
      const category = await tx.budgetStockCategory.upsert({
        where: {
          facilityId_name: {
            facilityId: params.facilityId,
            name: categoryName
          }
        },
        update: {},
        create: {
          facilityId: params.facilityId,
          name: categoryName,
          monthlyLimit: 0
        }
      });

      await tx.budgetStockExpense.create({
        data: {
          facilityId: params.facilityId,
          date: new Date(),
          category: categoryName,
          amount: Number((roundedDelta * item.costPerUnit).toFixed(2)),
          vendor: item.vendor,
          note: `Auto inventory cost from stock adjustment (+${roundedDelta} @ ${item.costPerUnit.toFixed(2)})`,
          linkedItemId: item.id,
          categoryId: category.id
        }
      });
    }

    return updated;
  });

  return toItemDTO({
    ...next,
    unit: next.unit ?? null,
    reorderPoint: next.reorderPoint ?? null,
    costPerUnit: next.costPerUnit ?? null,
    vendor: next.vendor ?? null
  });
}

export async function createBudgetStockSale(params: {
  facilityId: string;
  data: {
    itemId: string;
    qty: number;
    sellPricePerUnit: number;
    residentName?: string | null;
    note?: string | null;
    date?: Date;
  };
}) {
  const qty = Math.max(Math.round(params.data.qty), 0);
  if (qty < 1) {
    throw new Error("Quantity must be at least 1.");
  }
  const sellPricePerUnit = Number(params.data.sellPricePerUnit);
  if (!Number.isFinite(sellPricePerUnit) || sellPricePerUnit < 0) {
    throw new Error("Sell price must be 0 or greater.");
  }

  const payload = await prisma.$transaction(async (tx) => {
    const item = await tx.budgetStockItem.findFirst({
      where: {
        id: params.data.itemId,
        facilityId: params.facilityId,
        isActive: true
      }
    });
    if (!item) {
      throw new Error("Inventory item not found.");
    }
    if (item.onHand < qty) {
      throw new Error(`Not enough stock for ${item.name}. On hand: ${item.onHand}, requested: ${qty}.`);
    }

    const nextOnHand = item.onHand - qty;
    const costPerUnit = item.costPerUnit ?? 0;
    const revenue = Number((qty * sellPricePerUnit).toFixed(2));
    const costBasis = Number((qty * costPerUnit).toFixed(2));
    const profit = Number((revenue - costBasis).toFixed(2));

    const [updatedItem, sale] = await Promise.all([
      tx.budgetStockItem.update({
        where: { id: item.id },
        data: { onHand: nextOnHand }
      }),
      tx.budgetStockSale.create({
        data: {
          facilityId: params.facilityId,
          itemId: item.id,
          date: params.data.date ?? new Date(),
          qty,
          sellPricePerUnit: Number(sellPricePerUnit.toFixed(2)),
          revenue,
          costBasis,
          profit,
          residentName: params.data.residentName?.trim() || null,
          note: params.data.note?.trim() || null
        },
        include: {
          item: {
            select: { name: true }
          }
        }
      })
    ]);

    return {
      item: updatedItem,
      sale
    };
  });

  return {
    item: toItemDTO({
      ...payload.item,
      unit: payload.item.unit ?? null,
      reorderPoint: payload.item.reorderPoint ?? null,
      costPerUnit: payload.item.costPerUnit ?? null,
      vendor: payload.item.vendor ?? null
    }),
    sale: toSaleDTO(payload.sale)
  };
}

export async function createBudgetCategory(params: {
  facilityId: string;
  name: string;
  monthlyLimit?: number;
}) {
  const row = await prisma.budgetStockCategory.upsert({
    where: {
      facilityId_name: {
        facilityId: params.facilityId,
        name: normalizeBudgetStockCategory(params.name)
      }
    },
    update: {
      monthlyLimit:
        typeof params.monthlyLimit === "number" && Number.isFinite(params.monthlyLimit)
          ? Math.max(params.monthlyLimit, 0)
          : undefined
    },
    create: {
      facilityId: params.facilityId,
      name: normalizeBudgetStockCategory(params.name),
      monthlyLimit:
        typeof params.monthlyLimit === "number" && Number.isFinite(params.monthlyLimit)
          ? Math.max(params.monthlyLimit, 0)
          : 0
    }
  });
  return row;
}

export async function updateBudgetCategory(params: {
  facilityId: string;
  categoryId: string;
  data: {
    name?: string;
    monthlyLimit?: number;
  };
}) {
  const existing = await prisma.budgetStockCategory.findFirst({
    where: {
      id: params.categoryId,
      facilityId: params.facilityId
    }
  });
  if (!existing) {
    throw new Error("Budget category not found.");
  }
  return prisma.budgetStockCategory.update({
    where: { id: existing.id },
    data: {
      ...(params.data.name !== undefined ? { name: normalizeBudgetStockCategory(params.data.name) } : {}),
      ...(params.data.monthlyLimit !== undefined
        ? { monthlyLimit: Math.max(Number(params.data.monthlyLimit) || 0, 0) }
        : {})
    }
  });
}

export async function deleteBudgetCategory(params: {
  facilityId: string;
  categoryId: string;
}) {
  const category = await prisma.budgetStockCategory.findFirst({
    where: {
      id: params.categoryId,
      facilityId: params.facilityId
    }
  });
  if (!category) {
    return;
  }

  await prisma.$transaction([
    prisma.budgetStockExpense.updateMany({
      where: {
        facilityId: params.facilityId,
        categoryId: category.id
      },
      data: {
        categoryId: null,
        category: "Misc"
      }
    }),
    prisma.budgetStockCategory.delete({
      where: { id: category.id }
    })
  ]);
}

export async function createBudgetExpense(params: {
  facilityId: string;
  data: {
    date: Date;
    category: string;
    amount: number;
    vendor?: string | null;
    note?: string | null;
    linkedItemId?: string | null;
  };
}) {
  const categoryName = normalizeBudgetStockCategory(params.data.category);
  const category = await ensureBudgetStockCategoryName(params.facilityId, categoryName);

  const row = await prisma.budgetStockExpense.create({
    data: {
      facilityId: params.facilityId,
      date: params.data.date,
      category: categoryName,
      amount: Number(Math.max(params.data.amount, 0).toFixed(2)),
      vendor: params.data.vendor?.trim() || null,
      note: params.data.note?.trim() || null,
      linkedItemId: params.data.linkedItemId || null,
      categoryId: category?.id ?? null
    },
    include: {
      linkedItem: {
        select: { name: true }
      }
    }
  });

  return toExpenseDTO(row);
}

export async function updateBudgetExpense(params: {
  facilityId: string;
  expenseId: string;
  data: {
    date?: Date;
    category?: string;
    amount?: number;
    vendor?: string | null;
    note?: string | null;
    linkedItemId?: string | null;
  };
}) {
  const categoryName = params.data.category ? normalizeBudgetStockCategory(params.data.category) : undefined;
  const category =
    categoryName && categoryName.length > 0
      ? await ensureBudgetStockCategoryName(params.facilityId, categoryName)
      : null;

  const existing = await prisma.budgetStockExpense.findFirst({
    where: {
      id: params.expenseId,
      facilityId: params.facilityId
    }
  });
  if (!existing) {
    throw new Error("Expense not found.");
  }

  await prisma.budgetStockExpense.update({
    where: { id: existing.id },
    data: {
      ...(params.data.date ? { date: params.data.date } : {}),
      ...(categoryName ? { category: categoryName, categoryId: category?.id ?? null } : {}),
      ...(params.data.amount !== undefined
        ? { amount: Number(Math.max(params.data.amount, 0).toFixed(2)) }
        : {}),
      ...(params.data.vendor !== undefined ? { vendor: params.data.vendor?.trim() || null } : {}),
      ...(params.data.note !== undefined ? { note: params.data.note?.trim() || null } : {}),
      ...(params.data.linkedItemId !== undefined ? { linkedItemId: params.data.linkedItemId || null } : {})
    }
  });

  const row = await prisma.budgetStockExpense.findUnique({
    where: { id: existing.id },
    include: {
      linkedItem: {
        select: { name: true }
      }
    }
  });

  if (!row) {
    throw new Error("Expense not found.");
  }
  return toExpenseDTO(row);
}

export async function deleteBudgetExpense(params: {
  facilityId: string;
  expenseId: string;
}) {
  await prisma.budgetStockExpense.deleteMany({
    where: {
      id: params.expenseId,
      facilityId: params.facilityId
    }
  });
}

export function formatBudgetMonthLabel(monthKey: string, timeZone: string) {
  const start = zonedDateStringToUtcStart(`${monthKey}-01`, timeZone);
  if (!start) return monthKey;
  return formatInTimeZone(start, timeZone, {
    month: "long",
    year: "numeric"
  });
}

export function buildMonthOptions(timeZone: string, count = 12) {
  const zone = resolveTimeZone(timeZone);
  const options: Array<{ key: string; label: string }> = [];
  const start = parseMonthKey(undefined, zone);
  for (let index = 0; index < count; index += 1) {
    const date = startOfZonedMonthShift(start.start, zone, -index);
    const key = zonedDateKey(date, zone).slice(0, 7);
    options.push({
      key,
      label: formatBudgetMonthLabel(key, zone)
    });
  }
  return options;
}

export type BudgetStockMigrationStatus = {
  hasRun: boolean;
  migratedAt: string | null;
  itemCount: number;
  expenseCount: number;
  categoryCount: number;
};

export async function getBudgetStockMigrationStatus(facilityId: string): Promise<BudgetStockMigrationStatus> {
  const [meta, itemCount, expenseCount, categoryCount] = await Promise.all([
    prisma.budgetStockMigrationMeta.findUnique({
      where: {
        facilityId_key: {
          facilityId,
          key: "budget_stock_2_0"
        }
      }
    }),
    prisma.budgetStockItem.count({ where: { facilityId } }),
    prisma.budgetStockExpense.count({ where: { facilityId } }),
    prisma.budgetStockCategory.count({ where: { facilityId } })
  ]);

  return {
    hasRun: Boolean(meta),
    migratedAt: meta?.updatedAt ? meta.updatedAt.toISOString() : null,
    itemCount,
    expenseCount,
    categoryCount
  };
}

export async function upsertBudgetStockMigrationMeta(params: {
  facilityId: string;
  valueJson: Prisma.InputJsonValue;
}) {
  return prisma.budgetStockMigrationMeta.upsert({
    where: {
      facilityId_key: {
        facilityId: params.facilityId,
        key: "budget_stock_2_0"
      }
    },
    update: {
      valueJson: params.valueJson
    },
    create: {
      facilityId: params.facilityId,
      key: "budget_stock_2_0",
      valueJson: params.valueJson
    }
  });
}
