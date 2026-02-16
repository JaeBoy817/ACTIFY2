import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Boxes, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { z } from "zod";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logAudit } from "@/lib/audit";
import { readBudgetTrackerConfig, writeBudgetTrackerConfig } from "@/lib/budget-tracker";
import { requireModulePage } from "@/lib/page-guards";
import { assertWritable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  importWalmartCartToPrizeCart,
  formatPrizeDecimal,
  formatPlainDecimal
} from "@/lib/prize-cart-walmart";

const optionalImageUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().url().optional());

const optionalNoteSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(300).optional());

const optionalDollarSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.coerce.number().min(0).optional());

const prizeCategorySchema = z.enum(["DRINK", "SNACK", "CANDY"]);

const budgetSettingsSchema = z.object({
  monthlyBudgetDollars: z.coerce.number().min(0),
  defaultUnitCostDollars: z.coerce.number().min(0)
});

const inventoryItemSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(1),
  unitLabel: z.string().trim().min(1),
  onHand: z.coerce.number().int().nonnegative(),
  reorderAt: z.coerce.number().int().nonnegative(),
  unitCostDollars: z.coerce.number().min(0),
  imageUrl: optionalImageUrlSchema
});

const inventoryItemUpdateSchema = inventoryItemSchema.extend({
  itemId: z.string().min(1)
});

const inventoryDeleteSchema = z.object({
  itemId: z.string().min(1)
});

const inventoryTxnSchema = z
  .object({
    itemId: z.string().min(1),
    type: z.enum(["IN", "OUT", "ADJUST"]),
    qty: z.coerce.number().int().nonnegative(),
    note: optionalNoteSchema
  })
  .superRefine((value, ctx) => {
    if (value.type !== "ADJUST" && value.qty < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qty"],
        message: "Quantity must be at least 1 for IN/OUT."
      });
    }
  });

const prizeItemSchema = z.object({
  name: z.string().trim().min(2),
  category: prizeCategorySchema,
  facilityPriceDollars: z.coerce.number().min(0),
  onHand: z.coerce.number().int().nonnegative(),
  reorderAt: z.coerce.number().int().nonnegative(),
  imageUrl: optionalImageUrlSchema
});

const prizeItemUpdateSchema = prizeItemSchema.extend({
  itemId: z.string().min(1)
});

const prizeDeleteSchema = z.object({
  itemId: z.string().min(1)
});

const prizeTxnSchema = z
  .object({
    prizeItemId: z.string().min(1),
    type: z.enum(["SALE", "RESTOCK", "ADJUST"]),
    qty: z.coerce.number().int().nonnegative(),
    totalDollars: optionalDollarSchema
  })
  .superRefine((value, ctx) => {
    if (value.type !== "ADJUST" && value.qty < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qty"],
        message: "Quantity must be at least 1 for sale/restock."
      });
    }
  });

function toCents(dollars: number) {
  return Math.round(dollars * 100);
}

function fromCents(cents: number) {
  return cents / 100;
}

function formatCurrency(cents: number) {
  return `$${fromCents(cents).toFixed(2)}`;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

type WalmartImportSummaryBanner = {
  inStockUniqueItems: number;
  totalPacks: number;
  subtotalCents: number;
  expectedInStockUniqueItems: number;
  expectedTotalPacks: number;
  expectedSubtotalCents: number;
  subtotalMatchesExpected: boolean;
};

function parseWalmartImportSummaryToken(token?: string): WalmartImportSummaryBanner | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const value = JSON.parse(decoded) as WalmartImportSummaryBanner;
    if (
      typeof value.inStockUniqueItems !== "number" ||
      typeof value.totalPacks !== "number" ||
      typeof value.subtotalCents !== "number"
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function encodeWalmartImportSummaryToken(value: WalmartImportSummaryBanner) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function revalidateBudgetWorkspace() {
  revalidatePath("/app/budget");
  revalidatePath("/app/inventory");
  revalidatePath("/app/prize-cart");
}

export default async function BudgetPage({
  searchParams
}: {
  searchParams?: {
    walmartImport?: string;
  };
}) {
  const context = await requireModulePage("inventory");
  const writable = context.role !== "READ_ONLY";
  const walmartImportSummary = parseWalmartImportSummaryToken(searchParams?.walmartImport);
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const previousMonthDate = subMonths(now, 1);
  const previousMonthStart = startOfMonth(previousMonthDate);
  const previousMonthEnd = endOfMonth(previousMonthDate);
  const thirtyDaysAgo = subDays(now, 30);

  const [facility, inventoryItems, prizeItems, prizeWishlistItems, inventoryTxns, prizeTxns] = await Promise.all([
    prisma.facility.findUnique({
      where: { id: context.facilityId },
      select: { id: true, moduleFlags: true }
    }),
    prisma.inventoryItem.findMany({
      where: { facilityId: context.facilityId },
      include: {
        txns: {
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    prisma.prizeItem.findMany({
      where: { facilityId: context.facilityId },
      include: {
        inventory: true,
        txns: {
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: [{ name: "asc" }]
    }),
    prisma.prizeWishlistItem.findMany({
      where: { facilityId: context.facilityId },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    prisma.inventoryTxn.findMany({
      where: {
        item: { facilityId: context.facilityId },
        createdAt: { gte: previousMonthStart, lte: now }
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    }),
    prisma.prizeTxn.findMany({
      where: {
        prizeItem: { facilityId: context.facilityId },
        createdAt: { gte: previousMonthStart, lte: now }
      },
      include: {
        prizeItem: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ]);

  const budgetConfig = readBudgetTrackerConfig(facility?.moduleFlags);
  const itemCostMap = new Map<string, number>(
    inventoryItems.map((item) => [item.id, budgetConfig.itemUnitCosts[item.id] ?? budgetConfig.defaultUnitCostCents])
  );

  const inventoryRows = inventoryItems.map((item) => {
    const unitCostCents = itemCostMap.get(item.id) ?? budgetConfig.defaultUnitCostCents;
    const reorderQty = Math.max(item.reorderAt - item.onHand, 0);
    return {
      ...item,
      unitCostCents,
      reorderQty,
      stockValueCents: item.onHand * unitCostCents,
      reorderCostCents: reorderQty * unitCostCents
    };
  });

  const prizeRows = prizeItems.map((item) => {
    const packsOnHand = item.inventory?.packsOnHand ?? 0;
    const unitsOnHand = item.inventory?.unitsOnHand ?? null;
    const ozOnHand = item.inventory?.ozOnHand ?? null;
    const legacyOnHand = item.onHand;
    const reorderQty = Math.max(item.reorderAt - legacyOnHand, 0);
    return {
      ...item,
      imageUrl: budgetConfig.prizeItemImages[item.id] ?? null,
      packsOnHand,
      unitsOnHand,
      ozOnHand,
      reorderQty,
      stockValueCents: legacyOnHand * item.priceCents,
      reorderCostCents: reorderQty * item.priceCents
    };
  });

  const currentInventoryTxns = inventoryTxns.filter((txn) => txn.createdAt >= currentMonthStart && txn.createdAt <= now);
  const previousInventoryTxns = inventoryTxns.filter((txn) => txn.createdAt >= previousMonthStart && txn.createdAt <= previousMonthEnd);
  const currentPrizeTxns = prizeTxns.filter((txn) => txn.createdAt >= currentMonthStart && txn.createdAt <= now);
  const previousPrizeTxns = prizeTxns.filter((txn) => txn.createdAt >= previousMonthStart && txn.createdAt <= previousMonthEnd);

  const inventorySpendFor = (txns: typeof inventoryTxns) =>
    txns
      .filter((txn) => txn.type === "IN")
      .reduce((sum, txn) => sum + (itemCostMap.get(txn.itemId) ?? budgetConfig.defaultUnitCostCents) * txn.qty, 0);

  const prizeRevenueFor = (txns: typeof prizeTxns) => txns.filter((txn) => txn.type === "SALE").reduce((sum, txn) => sum + txn.totalCents, 0);

  const currentSpendCents = inventorySpendFor(currentInventoryTxns);
  const previousSpendCents = inventorySpendFor(previousInventoryTxns);
  const currentRevenueCents = prizeRevenueFor(currentPrizeTxns);
  const previousRevenueCents = prizeRevenueFor(previousPrizeTxns);

  const budgetRemainingCents = budgetConfig.monthlyBudgetCents - currentSpendCents;
  const budgetUsedPercent = percent(currentSpendCents, budgetConfig.monthlyBudgetCents);
  const restockForecastCents = inventoryRows.reduce((sum, row) => sum + row.reorderCostCents, 0);

  const inventoryStockValueCents = inventoryRows.reduce((sum, row) => sum + row.stockValueCents, 0);
  const prizeStockValueCents = prizeRows.reduce((sum, row) => sum + row.stockValueCents, 0);
  const combinedStockValueCents = inventoryStockValueCents + prizeStockValueCents;

  const spendByCategory = new Map<string, number>();
  for (const txn of currentInventoryTxns) {
    if (txn.type !== "IN") continue;
    const category = txn.item.category || "Uncategorized";
    const lineTotal = (itemCostMap.get(txn.itemId) ?? budgetConfig.defaultUnitCostCents) * txn.qty;
    spendByCategory.set(category, (spendByCategory.get(category) ?? 0) + lineTotal);
  }

  const topSpendCategories = Array.from(spendByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const recentSupplyRows = currentInventoryTxns
    .filter((txn) => txn.type === "IN")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12)
    .map((txn) => {
      const unitCost = itemCostMap.get(txn.itemId) ?? budgetConfig.defaultUnitCostCents;
      return {
        id: txn.id,
        date: txn.createdAt,
        itemName: txn.item.name,
        category: txn.item.category || "Uncategorized",
        qty: txn.qty,
        unitCostCents: unitCost,
        totalCostCents: unitCost * txn.qty
      };
    });

  const fastestSellers = prizeRows
    .map((row) => {
      const soldQty = row.txns
        .filter((txn) => txn.type === "SALE" && txn.createdAt >= thirtyDaysAgo)
        .reduce((sum, txn) => sum + txn.qty, 0);
      return {
        id: row.id,
        name: row.name,
        soldQty
      };
    })
    .filter((entry) => entry.soldQty > 0)
    .sort((a, b) => b.soldQty - a.soldQty)
    .slice(0, 5);

  async function saveBudgetSettings(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = budgetSettingsSchema.parse({
      monthlyBudgetDollars: formData.get("monthlyBudgetDollars"),
      defaultUnitCostDollars: formData.get("defaultUnitCostDollars")
    });

    const facilityRecord = await prisma.facility.findUnique({
      where: { id: scoped.facilityId },
      select: { moduleFlags: true }
    });
    if (!facilityRecord) return;

    const currentConfig = readBudgetTrackerConfig(facilityRecord.moduleFlags);
    const nextConfig = {
      ...currentConfig,
      monthlyBudgetCents: toCents(parsed.monthlyBudgetDollars),
      defaultUnitCostCents: toCents(parsed.defaultUnitCostDollars)
    };

    await prisma.facility.update({
      where: { id: scoped.facilityId },
      data: { moduleFlags: writeBudgetTrackerConfig(facilityRecord.moduleFlags, nextConfig) }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "BudgetTrackerSettings",
      entityId: scoped.facilityId,
      before: currentConfig,
      after: nextConfig
    });

    revalidateBudgetWorkspace();
  }

  async function createInventoryItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = inventoryItemSchema.parse({
      name: formData.get("name"),
      category: formData.get("category"),
      unitLabel: formData.get("unitLabel"),
      onHand: formData.get("onHand"),
      reorderAt: formData.get("reorderAt"),
      unitCostDollars: formData.get("unitCostDollars"),
      imageUrl: formData.get("imageUrl")
    });

    const facilityRecord = await prisma.facility.findUnique({
      where: { id: scoped.facilityId },
      select: { moduleFlags: true }
    });
    if (!facilityRecord) return;

    const item = await prisma.inventoryItem.create({
      data: {
        facilityId: scoped.facilityId,
        name: parsed.name,
        category: parsed.category,
        unitLabel: parsed.unitLabel,
        onHand: parsed.onHand,
        reorderAt: parsed.reorderAt,
        imageUrl: parsed.imageUrl ?? null
      }
    });

    const currentConfig = readBudgetTrackerConfig(facilityRecord.moduleFlags);
    const nextConfig = {
      ...currentConfig,
      itemUnitCosts: {
        ...currentConfig.itemUnitCosts,
        [item.id]: toCents(parsed.unitCostDollars)
      }
    };

    await prisma.facility.update({
      where: { id: scoped.facilityId },
      data: { moduleFlags: writeBudgetTrackerConfig(facilityRecord.moduleFlags, nextConfig) }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "InventoryItem",
      entityId: item.id,
      after: {
        ...item,
        unitCostCents: nextConfig.itemUnitCosts[item.id]
      }
    });

    revalidateBudgetWorkspace();
  }

  async function updateInventoryItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = inventoryItemUpdateSchema.parse({
      itemId: formData.get("itemId"),
      name: formData.get("name"),
      category: formData.get("category"),
      unitLabel: formData.get("unitLabel"),
      onHand: formData.get("onHand"),
      reorderAt: formData.get("reorderAt"),
      unitCostDollars: formData.get("unitCostDollars"),
      imageUrl: formData.get("imageUrl")
    });

    const [item, facilityRecord] = await Promise.all([
      prisma.inventoryItem.findFirst({
        where: { id: parsed.itemId, facilityId: scoped.facilityId }
      }),
      prisma.facility.findUnique({
        where: { id: scoped.facilityId },
        select: { moduleFlags: true }
      })
    ]);

    if (!item || !facilityRecord) return;

    const currentConfig = readBudgetTrackerConfig(facilityRecord.moduleFlags);
    const beforeUnitCost = currentConfig.itemUnitCosts[item.id] ?? currentConfig.defaultUnitCostCents;

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        name: parsed.name,
        category: parsed.category,
        unitLabel: parsed.unitLabel,
        onHand: parsed.onHand,
        reorderAt: parsed.reorderAt,
        imageUrl: parsed.imageUrl ?? null
      }
    });

    const nextConfig = {
      ...currentConfig,
      itemUnitCosts: {
        ...currentConfig.itemUnitCosts,
        [item.id]: toCents(parsed.unitCostDollars)
      }
    };

    await prisma.facility.update({
      where: { id: scoped.facilityId },
      data: { moduleFlags: writeBudgetTrackerConfig(facilityRecord.moduleFlags, nextConfig) }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "InventoryItem",
      entityId: item.id,
      before: {
        ...item,
        unitCostCents: beforeUnitCost
      },
      after: {
        ...updatedItem,
        unitCostCents: nextConfig.itemUnitCosts[item.id]
      }
    });

    revalidateBudgetWorkspace();
  }

  async function deleteInventoryItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = inventoryDeleteSchema.parse({
      itemId: formData.get("itemId")
    });

    const [item, facilityRecord] = await Promise.all([
      prisma.inventoryItem.findFirst({
        where: { id: parsed.itemId, facilityId: scoped.facilityId }
      }),
      prisma.facility.findUnique({
        where: { id: scoped.facilityId },
        select: { moduleFlags: true }
      })
    ]);

    if (!item || !facilityRecord) return;

    const currentConfig = readBudgetTrackerConfig(facilityRecord.moduleFlags);
    const nextCosts = { ...currentConfig.itemUnitCosts };
    delete nextCosts[item.id];
    const nextConfig = {
      ...currentConfig,
      itemUnitCosts: nextCosts
    };

    await prisma.$transaction([
      prisma.inventoryItem.delete({
        where: { id: item.id }
      }),
      prisma.facility.update({
        where: { id: scoped.facilityId },
        data: { moduleFlags: writeBudgetTrackerConfig(facilityRecord.moduleFlags, nextConfig) }
      })
    ]);

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "InventoryItem",
      entityId: item.id,
      before: {
        ...item,
        unitCostCents: currentConfig.itemUnitCosts[item.id] ?? currentConfig.defaultUnitCostCents
      }
    });

    revalidateBudgetWorkspace();
  }

  async function addInventoryTxn(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = inventoryTxnSchema.parse({
      itemId: formData.get("itemId"),
      type: formData.get("type"),
      qty: formData.get("qty"),
      note: formData.get("note")
    });

    const item = await prisma.inventoryItem.findFirst({
      where: { id: parsed.itemId, facilityId: scoped.facilityId }
    });
    if (!item) return;

    const nextOnHand =
      parsed.type === "IN"
        ? item.onHand + parsed.qty
        : parsed.type === "OUT"
          ? Math.max(item.onHand - parsed.qty, 0)
          : parsed.qty;

    const [updatedItem, txn] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { onHand: nextOnHand }
      }),
      prisma.inventoryTxn.create({
        data: {
          itemId: item.id,
          type: parsed.type,
          qty: parsed.qty,
          note: parsed.note,
          userId: scoped.user.id
        }
      })
    ]);

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "InventoryItem",
      entityId: item.id,
      before: item,
      after: updatedItem
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "InventoryTxn",
      entityId: txn.id,
      after: txn
    });

    revalidateBudgetWorkspace();
  }

  async function createPrizeItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = prizeItemSchema.parse({
      name: formData.get("name"),
      category: formData.get("category"),
      facilityPriceDollars: formData.get("facilityPriceDollars"),
      onHand: formData.get("onHand"),
      reorderAt: formData.get("reorderAt"),
      imageUrl: formData.get("imageUrl")
    });

    const facilityRecord = await prisma.facility.findUnique({
      where: { id: scoped.facilityId },
      select: { moduleFlags: true }
    });
    if (!facilityRecord) return;

    const item = await prisma.prizeItem.create({
      data: {
        facilityId: scoped.facilityId,
        name: parsed.name,
        category: parsed.category,
        priceCents: toCents(parsed.facilityPriceDollars),
        onHand: parsed.onHand,
        reorderAt: parsed.reorderAt,
        unitName: "unit",
        isAvailable: true,
        inventory: {
          create: {
            packsOnHand: parsed.onHand,
            unitsOnHand: parsed.onHand,
            ozOnHand: null
          }
        }
      }
    });

    const currentConfig = readBudgetTrackerConfig(facilityRecord.moduleFlags);
    const nextConfig = {
      ...currentConfig,
      prizeItemImages: {
        ...currentConfig.prizeItemImages,
        [item.id]: parsed.imageUrl ?? ""
      }
    };

    await prisma.facility.update({
      where: { id: scoped.facilityId },
      data: { moduleFlags: writeBudgetTrackerConfig(facilityRecord.moduleFlags, nextConfig) }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "PrizeItem",
      entityId: item.id,
      after: {
        ...item,
        imageUrl: parsed.imageUrl ?? null
      }
    });

    revalidateBudgetWorkspace();
  }

  async function updatePrizeItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = prizeItemUpdateSchema.parse({
      itemId: formData.get("itemId"),
      name: formData.get("name"),
      category: formData.get("category"),
      facilityPriceDollars: formData.get("facilityPriceDollars"),
      onHand: formData.get("onHand"),
      reorderAt: formData.get("reorderAt"),
      imageUrl: formData.get("imageUrl")
    });

    const [item, facilityRecord] = await Promise.all([
      prisma.prizeItem.findFirst({
        where: { id: parsed.itemId, facilityId: scoped.facilityId }
      }),
      prisma.facility.findUnique({
        where: { id: scoped.facilityId },
        select: { moduleFlags: true }
      })
    ]);
    if (!item || !facilityRecord) return;

    const updatedItem = await prisma.prizeItem.update({
      where: { id: item.id },
      data: {
        name: parsed.name,
        category: parsed.category,
        priceCents: toCents(parsed.facilityPriceDollars),
        onHand: parsed.onHand,
        reorderAt: parsed.reorderAt,
        inventory: {
          upsert: {
            create: {
              packsOnHand: parsed.onHand,
              unitsOnHand: parsed.onHand
            },
            update: {
              packsOnHand: parsed.onHand,
              unitsOnHand: parsed.onHand,
              ozOnHand: null
            }
          }
        }
      }
    });

    const currentConfig = readBudgetTrackerConfig(facilityRecord.moduleFlags);
    const nextConfig = {
      ...currentConfig,
      prizeItemImages: {
        ...currentConfig.prizeItemImages,
        [item.id]: parsed.imageUrl ?? ""
      }
    };

    await prisma.facility.update({
      where: { id: scoped.facilityId },
      data: { moduleFlags: writeBudgetTrackerConfig(facilityRecord.moduleFlags, nextConfig) }
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "PrizeItem",
      entityId: item.id,
      before: {
        ...item,
        imageUrl: currentConfig.prizeItemImages[item.id] ?? null
      },
      after: {
        ...updatedItem,
        imageUrl: parsed.imageUrl ?? null
      }
    });

    revalidateBudgetWorkspace();
  }

  async function deletePrizeItem(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = prizeDeleteSchema.parse({
      itemId: formData.get("itemId")
    });

    const [item, facilityRecord] = await Promise.all([
      prisma.prizeItem.findFirst({
        where: { id: parsed.itemId, facilityId: scoped.facilityId }
      }),
      prisma.facility.findUnique({
        where: { id: scoped.facilityId },
        select: { moduleFlags: true }
      })
    ]);
    if (!item || !facilityRecord) return;

    const currentConfig = readBudgetTrackerConfig(facilityRecord.moduleFlags);
    const nextPrizeImages = { ...currentConfig.prizeItemImages };
    delete nextPrizeImages[item.id];
    const nextConfig = {
      ...currentConfig,
      prizeItemImages: nextPrizeImages
    };

    await prisma.$transaction([
      prisma.prizeItem.delete({
        where: { id: item.id }
      }),
      prisma.facility.update({
        where: { id: scoped.facilityId },
        data: { moduleFlags: writeBudgetTrackerConfig(facilityRecord.moduleFlags, nextConfig) }
      })
    ]);

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "DELETE",
      entityType: "PrizeItem",
      entityId: item.id,
      before: {
        ...item,
        imageUrl: currentConfig.prizeItemImages[item.id] ?? null
      }
    });

    revalidateBudgetWorkspace();
  }

  async function addPrizeTxn(formData: FormData) {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const parsed = prizeTxnSchema.parse({
      prizeItemId: formData.get("prizeItemId"),
      type: formData.get("type"),
      qty: formData.get("qty"),
      totalDollars: formData.get("totalDollars")
    });

    const item = await prisma.prizeItem.findFirst({
      where: { id: parsed.prizeItemId, facilityId: scoped.facilityId },
      include: { inventory: true }
    });
    if (!item) return;

    const nextOnHand =
      parsed.type === "SALE"
        ? Math.max(item.onHand - parsed.qty, 0)
        : parsed.type === "RESTOCK"
          ? item.onHand + parsed.qty
          : parsed.qty;

    const totalCents = parsed.type === "SALE" ? parsed.totalDollars !== undefined ? toCents(parsed.totalDollars) : item.priceCents * parsed.qty : 0;

    const isWeightBased = item.unitName === "oz" && !item.unitsPerPack;
    const previousUnits = item.inventory?.unitsOnHand ?? item.onHand;
    const previousPacks = item.inventory?.packsOnHand ?? item.onHand;
    const previousOz = item.inventory?.ozOnHand ? Number(item.inventory.ozOnHand.toString()) : 0;

    let packsDelta = 0;
    let unitsDelta: number | null = null;
    let ozDelta: Prisma.Decimal | null = null;
    let nextUnitsOnHand: number | null = item.inventory?.unitsOnHand ?? null;
    let nextPacksOnHand = item.inventory?.packsOnHand ?? 0;
    let nextOzOnHand: Prisma.Decimal | null = item.inventory?.ozOnHand ?? null;

    if (isWeightBased) {
      const ozChange = parsed.type === "SALE" ? -parsed.qty : parsed.type === "RESTOCK" ? parsed.qty : parsed.qty - previousOz;
      ozDelta = new Prisma.Decimal(ozChange.toFixed(4));
      const resolvedOz = parsed.type === "ADJUST" ? parsed.qty : Math.max(previousOz + ozChange, 0);
      nextOzOnHand = new Prisma.Decimal(resolvedOz.toFixed(4));
      nextPacksOnHand = item.netWeightOz ? Math.max(Math.round(resolvedOz / Number(item.netWeightOz.toString())), 0) : previousPacks;
      packsDelta = nextPacksOnHand - previousPacks;
      nextUnitsOnHand = null;
    } else {
      const deltaUnits = parsed.type === "SALE" ? -parsed.qty : parsed.type === "RESTOCK" ? parsed.qty : parsed.qty - previousUnits;
      unitsDelta = deltaUnits;
      const resolvedUnits = parsed.type === "ADJUST" ? parsed.qty : Math.max(previousUnits + deltaUnits, 0);
      nextUnitsOnHand = resolvedUnits;
      if (item.unitsPerPack && item.unitsPerPack > 0) {
        const previousPackCount = Math.max(Math.ceil(previousUnits / item.unitsPerPack), 0);
        nextPacksOnHand = Math.max(Math.ceil(resolvedUnits / item.unitsPerPack), 0);
        packsDelta = nextPacksOnHand - previousPackCount;
      } else {
        packsDelta = deltaUnits;
        nextPacksOnHand = Math.max(resolvedUnits, 0);
      }
    }

    const [updatedItem, , txn] = await prisma.$transaction([
      prisma.prizeItem.update({
        where: { id: item.id },
        data: { onHand: nextOnHand }
      }),
      prisma.prizeInventory.upsert({
        where: { prizeItemId: item.id },
        create: {
          prizeItemId: item.id,
          packsOnHand: nextPacksOnHand,
          unitsOnHand: nextUnitsOnHand,
          ozOnHand: nextOzOnHand
        },
        update: {
          packsOnHand: nextPacksOnHand,
          unitsOnHand: nextUnitsOnHand,
          ozOnHand: nextOzOnHand
        }
      }),
      prisma.prizeTxn.create({
        data: {
          prizeItemId: item.id,
          type: parsed.type,
          qty: parsed.qty,
          totalCents,
          packsDelta,
          unitsDelta,
          ozDelta,
          packPriceAtTime: item.purchasePackPrice,
          userId: scoped.user.id
        }
      })
    ]);

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "UPDATE",
      entityType: "PrizeItem",
      entityId: item.id,
      before: item,
      after: updatedItem
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "CREATE",
      entityType: "PrizeTxn",
      entityId: txn.id,
      after: txn
    });

    revalidateBudgetWorkspace();
  }

  async function importWalmartCart() {
    "use server";

    const scoped = await requireModulePage("inventory");
    assertWritable(scoped.role);

    const summary = await importWalmartCartToPrizeCart({
      facilityId: scoped.facilityId,
      userId: scoped.user.id
    });

    await logAudit({
      facilityId: scoped.facilityId,
      actorUserId: scoped.user.id,
      action: "IMPORT",
      entityType: "PrizeCart",
      entityId: scoped.facilityId,
      after: summary
    });

    revalidateBudgetWorkspace();

    const summaryToken = encodeWalmartImportSummaryToken({
      inStockUniqueItems: summary.inStockUniqueItems,
      totalPacks: summary.totalPacks,
      subtotalCents: summary.subtotalCents,
      expectedInStockUniqueItems: summary.expectedInStockUniqueItems,
      expectedTotalPacks: summary.expectedTotalPacks,
      expectedSubtotalCents: summary.expectedSubtotalCents,
      subtotalMatchesExpected: summary.subtotalMatchesExpected
    });

    redirect(`/app/budget?walmartImport=${encodeURIComponent(summaryToken)}`);
  }

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-actifyBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 left-20 h-40 w-40 rounded-full bg-actifyMint/20 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Budget, Supplies, and Prize Cart</h1>
              <Badge className="border-0 bg-actify-warm text-foreground">All in one page</Badge>
              {!writable ? <Badge variant="outline">Read-only</Badge> : null}
            </div>
            <p className="max-w-3xl text-sm text-foreground/75">
              Set your monthly budget, track supply costs in dollars, and log prize sales in one place. Budget totals update automatically.
            </p>
          </div>
        </div>
      </GlassPanel>

      <section className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-5">
        <GlassCard variant="dense" className="h-full min-h-[148px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyBlue/15 text-actifyBlue">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Monthly budget</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(budgetConfig.monthlyBudgetCents)}</p>
              <p className="text-xs text-foreground/70">Used: {budgetUsedPercent.toFixed(1)}%</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[148px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <TrendingDown className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Supply spend (month)</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(currentSpendCents)}</p>
              <p className="text-xs text-foreground/70">Last month: {formatCurrency(previousSpendCents)}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[148px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Prize sales (month)</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(currentRevenueCents)}</p>
              <p className="text-xs text-foreground/70">Last month: {formatCurrency(previousRevenueCents)}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[148px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyMint/20 text-foreground">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Budget remaining</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(Math.max(budgetRemainingCents, 0))}</p>
              <p className="text-xs text-foreground/70">
                {budgetRemainingCents < 0 ? `Over by ${formatCurrency(Math.abs(budgetRemainingCents))}` : "Within budget"}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[148px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyCoral/20 text-foreground">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Total stock value</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(combinedStockValueCents)}</p>
              <p className="text-xs text-foreground/70">Supplies + prize cart</p>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard variant="dense">
          <div className="glass-content space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Budget settings</h2>
            <p className="text-sm text-foreground/75">Set these once, then each supply purchase and prize sale will reflect here automatically.</p>
            <form action={saveBudgetSettings} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-foreground/65">Monthly budget ($)</p>
                <Input
                  name="monthlyBudgetDollars"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={fromCents(budgetConfig.monthlyBudgetCents).toFixed(2)}
                  disabled={!writable}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-foreground/65">Default supply unit cost ($)</p>
                <Input
                  name="defaultUnitCostDollars"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={fromCents(budgetConfig.defaultUnitCostCents).toFixed(2)}
                  disabled={!writable}
                />
              </div>
              <div className="sm:col-span-2">
                <GlassButton type="submit" size="sm" disabled={!writable}>Save budget settings</GlassButton>
              </div>
            </form>
          </div>
        </GlassCard>

        <GlassCard variant="dense">
          <div className="glass-content space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Quick budget impact</h2>
            <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-foreground/80">
              Planned restock cost right now: <span className="font-semibold text-foreground">{formatCurrency(restockForecastCents)}</span>
            </p>
            <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-foreground/80">
              If you restock everything now, estimated remaining budget: <span className="font-semibold text-foreground">{formatCurrency(Math.max(budgetRemainingCents - restockForecastCents, 0))}</span>
            </p>
            <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-foreground/80">
              Net this month (spend minus prize sales): <span className="font-semibold text-foreground">{formatCurrency(currentSpendCents - currentRevenueCents)}</span>
            </p>
          </div>
        </GlassCard>
      </section>

      {walmartImportSummary ? (
        <GlassCard variant="dense">
          <div className="glass-content space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Walmart cart import complete</h2>
            <p className="text-sm text-foreground/75">
              Imported <span className="font-semibold text-foreground">{walmartImportSummary.inStockUniqueItems}</span> in-stock items and{" "}
              <span className="font-semibold text-foreground">{walmartImportSummary.totalPacks}</span> packs.
            </p>
            <p className="text-sm text-foreground/75">
              Subtotal check: <span className="font-semibold text-foreground">{formatCurrency(walmartImportSummary.subtotalCents)}</span>{" "}
              {walmartImportSummary.subtotalMatchesExpected ? "matches" : "does not match"} expected{" "}
              {formatCurrency(walmartImportSummary.expectedSubtotalCents)}.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-foreground/70">
              <Badge variant="outline">
                Items {walmartImportSummary.inStockUniqueItems}/{walmartImportSummary.expectedInStockUniqueItems}
              </Badge>
              <Badge variant="outline">
                Packs {walmartImportSummary.totalPacks}/{walmartImportSummary.expectedTotalPacks}
              </Badge>
            </div>
          </div>
        </GlassCard>
      ) : null}

      <Tabs defaultValue="supplies" className="space-y-4">
        <TabsList className="bg-white/80">
          <TabsTrigger value="supplies">Supplies</TabsTrigger>
          <TabsTrigger value="prizes">Prize Cart</TabsTrigger>
          <TabsTrigger value="budget-view">Budget View</TabsTrigger>
        </TabsList>

        <TabsContent value="supplies" className="space-y-4">
          <GlassCard variant="dense">
            <div className="glass-content space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Add supply item</h2>
              <p className="text-sm text-foreground/75">Use dollar amounts for unit cost. This is what powers your budget totals.</p>
              <form action={createInventoryItem} className="grid gap-3 md:grid-cols-7">
                <Input name="name" placeholder="Name (e.g., Bingo cards)" required disabled={!writable} />
                <Input name="category" placeholder="Category" required disabled={!writable} />
                <Input name="unitLabel" placeholder="Unit (box, pack, each)" required disabled={!writable} />
                <Input name="onHand" type="number" min="0" placeholder="On hand" required disabled={!writable} />
                <Input name="reorderAt" type="number" min="0" placeholder="Reorder at" required disabled={!writable} />
                <Input name="unitCostDollars" type="number" min="0" step="0.01" placeholder="Unit cost ($)" required disabled={!writable} />
                <Input name="imageUrl" placeholder="Image URL (optional)" disabled={!writable} />
                <div className="md:col-span-7">
                  <GlassButton type="submit" disabled={!writable}>Add supply item</GlassButton>
                </div>
              </form>
            </div>
          </GlassCard>

          <GlassCard variant="dense">
            <div className="glass-content space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Supplies list</h2>
                <Badge variant="outline">{inventoryRows.length} items</Badge>
              </div>

              {inventoryRows.length === 0 ? (
                <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-3 text-sm text-foreground/70">No supplies yet.</p>
              ) : null}

              <div className="space-y-3">
                {inventoryRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.imageUrl} alt={`${row.name} preview`} className="h-12 w-12 rounded-md border object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">No image</div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{row.name}</p>
                          <p className="text-xs text-foreground/70">{row.category} · {row.unitLabel}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Unit {formatCurrency(row.unitCostCents)}</Badge>
                        <Badge variant="outline">Stock {formatCurrency(row.stockValueCents)}</Badge>
                        <Badge variant={row.reorderQty > 0 ? "destructive" : "secondary"}>
                          {row.reorderQty > 0 ? `Restock ${row.reorderQty}` : "In range"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                      <p className="rounded-lg border border-white/80 bg-white px-3 py-2 text-foreground/80">On hand: <span className="font-semibold text-foreground">{row.onHand}</span> {row.unitLabel}</p>
                      <p className="rounded-lg border border-white/80 bg-white px-3 py-2 text-foreground/80">Reorder at: <span className="font-semibold text-foreground">{row.reorderAt}</span> {row.unitLabel}</p>
                      <p className="rounded-lg border border-white/80 bg-white px-3 py-2 text-foreground/80">Restock cost: <span className="font-semibold text-foreground">{formatCurrency(row.reorderCostCents)}</span></p>
                    </div>

                    {writable ? (
                      <>
                        <form action={updateInventoryItem} className="mt-3 grid gap-2 md:grid-cols-7">
                          <input type="hidden" name="itemId" value={row.id} />
                          <Input name="name" defaultValue={row.name} required />
                          <Input name="category" defaultValue={row.category} required />
                          <Input name="unitLabel" defaultValue={row.unitLabel} required />
                          <Input name="onHand" type="number" min="0" defaultValue={row.onHand} required />
                          <Input name="reorderAt" type="number" min="0" defaultValue={row.reorderAt} required />
                          <Input name="unitCostDollars" type="number" min="0" step="0.01" defaultValue={fromCents(row.unitCostCents).toFixed(2)} required />
                          <Input name="imageUrl" defaultValue={row.imageUrl ?? ""} placeholder="Image URL (optional)" />
                          <div className="md:col-span-7">
                            <GlassButton type="submit" size="sm" variant="dense">Save supply details</GlassButton>
                          </div>
                        </form>

                        <form action={addInventoryTxn} className="mt-2 grid gap-2 md:grid-cols-[200px_120px_1fr_auto]">
                          <input type="hidden" name="itemId" value={row.id} />
                          <select name="type" className="h-10 rounded-md border border-border/80 bg-white px-3 text-sm text-foreground">
                            <option value="IN">Bought supplies (adds stock)</option>
                            <option value="OUT">Used supplies (reduces stock)</option>
                            <option value="ADJUST">Set exact stock count</option>
                          </select>
                          <Input name="qty" type="number" min="0" placeholder="Qty" required />
                          <Input name="note" placeholder="Optional note" />
                          <GlassButton type="submit" size="sm" variant="dense">Log movement</GlassButton>
                        </form>

                        <form action={deleteInventoryItem} className="mt-2">
                          <input type="hidden" name="itemId" value={row.id} />
                          <GlassButton type="submit" size="sm" variant="dense" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                            Delete supply
                          </GlassButton>
                        </form>
                      </>
                    ) : null}

                    <div className="mt-3 space-y-1 text-xs text-foreground/70">
                      {row.txns.length === 0 ? (
                        <p>No movements yet.</p>
                      ) : (
                        row.txns.map((txn) => (
                          <p key={txn.id}>
                            {format(txn.createdAt, "MMM d, h:mm a")} · {txn.type} {txn.qty} · {txn.user.name}
                            {txn.note ? ` · ${txn.note}` : ""}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <GlassCard variant="dense">
            <div className="glass-content space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Add prize item</h2>
                <form action={importWalmartCart}>
                  <GlassButton type="submit" size="sm" disabled={!writable}>
                    Import Walmart Cart
                  </GlassButton>
                </form>
              </div>
              <p className="text-sm text-foreground/75">Set facility price, category, and optional image URL. Use Import Walmart Cart to load pack costs and starting inventory.</p>
              <form action={createPrizeItem} className="grid gap-3 md:grid-cols-6">
                <Input name="name" placeholder="Name" required disabled={!writable} />
                <select name="category" defaultValue="SNACK" className="h-10 rounded-md border border-border/80 bg-white px-3 text-sm text-foreground" disabled={!writable}>
                  <option value="DRINK">Drink</option>
                  <option value="SNACK">Snack</option>
                  <option value="CANDY">Candy</option>
                </select>
                <Input
                  name="facilityPriceDollars"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Facility price ($)"
                  required
                  disabled={!writable}
                />
                <Input name="onHand" type="number" min="0" placeholder="On hand" required disabled={!writable} />
                <Input name="reorderAt" type="number" min="0" placeholder="Reorder at" required disabled={!writable} />
                <Input name="imageUrl" placeholder="Image URL (optional)" disabled={!writable} />
                <div className="md:col-span-6">
                  <GlassButton type="submit" disabled={!writable}>Add prize item</GlassButton>
                </div>
              </form>
            </div>
          </GlassCard>

          <GlassCard variant="dense">
            <div className="glass-content space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Prize cart items</h2>
                <Badge variant="outline">{prizeRows.length} items</Badge>
              </div>

              <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-foreground/80">
                <p className="font-medium text-foreground">Fastest sellers (last 30 days)</p>
                <p className="text-foreground/70">{fastestSellers.length > 0 ? fastestSellers.map((entry) => `${entry.name} (${entry.soldQty})`).join(" · ") : "No sales yet"}</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/70 bg-white/70">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/75 text-xs uppercase tracking-wide text-foreground/65">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="px-3 py-2 text-left font-medium">Category</th>
                      <th className="px-3 py-2 text-right font-medium">Pack Price</th>
                      <th className="px-3 py-2 text-right font-medium">Packs On Hand</th>
                      <th className="px-3 py-2 text-right font-medium">Units/Pack</th>
                      <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                      <th className="px-3 py-2 text-right font-medium">Units On Hand</th>
                      <th className="px-3 py-2 text-right font-medium">Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeRows.map((row) => (
                      <tr key={`summary-${row.id}`} className="border-t border-white/70">
                        <td className="px-3 py-2 text-left text-foreground">{row.name}</td>
                        <td className="px-3 py-2 text-left text-foreground/80">{row.category}</td>
                        <td className="px-3 py-2 text-right text-foreground">{row.purchasePackPrice !== null ? formatPrizeDecimal(row.purchasePackPrice, 2) : "—"}</td>
                        <td className="px-3 py-2 text-right text-foreground">{row.packsOnHand}</td>
                        <td className="px-3 py-2 text-right text-foreground">
                          {row.unitsPerPack ?? (row.netWeightOz ? `${formatPlainDecimal(row.netWeightOz, 2)} oz` : "—")}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground">{row.costPerUnit !== null ? `${formatPrizeDecimal(row.costPerUnit, 2)} / ${row.unitName}` : "—"}</td>
                        <td className="px-3 py-2 text-right text-foreground">
                          {row.unitsOnHand !== null && row.unitsOnHand !== undefined
                            ? row.unitsOnHand
                              : row.ozOnHand !== null
                              ? `${formatPlainDecimal(row.ozOnHand, 2)} oz`
                              : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Badge variant={row.isAvailable ? "secondary" : "destructive"}>
                            {row.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 rounded-xl border border-white/70 bg-white/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">Wishlist / Backorder</p>
                  <Badge variant="outline">{prizeWishlistItems.length} items</Badge>
                </div>
                {prizeWishlistItems.length === 0 ? (
                  <p className="text-sm text-foreground/70">No unavailable items tracked.</p>
                ) : (
                  prizeWishlistItems.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-foreground/70">{item.category}</p>
                      </div>
                      <div className="text-right text-foreground/80">
                        <p>Desired qty: {item.quantityDesired}</p>
                        <p>Last known price: {item.lastKnownPrice ? formatPrizeDecimal(item.lastKnownPrice, 2) : "—"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {prizeRows.length === 0 ? (
                <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-3 text-sm text-foreground/70">No prize items yet.</p>
              ) : null}

              <div className="space-y-3">
                {prizeRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-white/70 bg-white/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.imageUrl} alt={`${row.name} preview`} className="h-12 w-12 rounded-md border object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">No image</div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{row.name}</p>
                          <p className="text-xs text-foreground/70">
                            {row.category} · Packs {row.packsOnHand}
                            {row.unitsOnHand !== null && row.unitsOnHand !== undefined ? ` · Units ${row.unitsOnHand}` : ""}
                            {row.ozOnHand !== null ? ` · ${formatPlainDecimal(row.ozOnHand, 2)} oz` : ""}
                            {" · "}Reorder at {row.reorderAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Facility price {formatCurrency(row.priceCents)}</Badge>
                        <Badge variant="outline">
                          Pack {row.purchasePackPrice !== null ? formatPrizeDecimal(row.purchasePackPrice, 2) : "—"}
                        </Badge>
                        <Badge variant="outline">
                          Unit {row.costPerUnit !== null ? `${formatPrizeDecimal(row.costPerUnit, 2)} / ${row.unitName}` : "—"}
                        </Badge>
                        <Badge variant="outline">Stock {formatCurrency(row.stockValueCents)}</Badge>
                        <Badge variant={row.reorderQty > 0 ? "destructive" : "secondary"}>
                          {row.reorderQty > 0 ? `Restock ${row.reorderQty}` : "In range"}
                        </Badge>
                      </div>
                    </div>

                    {writable ? (
                      <>
                        <form action={updatePrizeItem} className="mt-3 grid gap-2 md:grid-cols-7">
                          <input type="hidden" name="itemId" value={row.id} />
                          <Input name="name" defaultValue={row.name} required />
                          <select name="category" defaultValue={row.category} className="h-10 rounded-md border border-border/80 bg-white px-3 text-sm text-foreground">
                            <option value="DRINK">Drink</option>
                            <option value="SNACK">Snack</option>
                            <option value="CANDY">Candy</option>
                          </select>
                          <Input
                            name="facilityPriceDollars"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={fromCents(row.priceCents).toFixed(2)}
                            required
                          />
                          <Input name="onHand" type="number" min="0" defaultValue={row.onHand} required />
                          <Input name="reorderAt" type="number" min="0" defaultValue={row.reorderAt} required />
                          <Input name="imageUrl" defaultValue={row.imageUrl ?? ""} placeholder="Image URL (optional)" />
                          <GlassButton type="submit" size="sm" variant="dense">Save item</GlassButton>
                        </form>

                        <form action={addPrizeTxn} className="mt-2 grid gap-2 md:grid-cols-[200px_120px_180px_auto]">
                          <input type="hidden" name="prizeItemId" value={row.id} />
                          <select name="type" className="h-10 rounded-md border border-border/80 bg-white px-3 text-sm text-foreground">
                            <option value="SALE">Sale (reduces stock)</option>
                            <option value="RESTOCK">Restock (adds stock)</option>
                            <option value="ADJUST">Set exact stock count</option>
                          </select>
                          <Input name="qty" type="number" min="0" placeholder="Qty" required />
                          <Input name="totalDollars" type="number" min="0" step="0.01" placeholder="Sale total $ (optional, defaults to facility price)" />
                          <GlassButton type="submit" size="sm" variant="dense">Log transaction</GlassButton>
                        </form>

                        <form action={deletePrizeItem} className="mt-2">
                          <input type="hidden" name="itemId" value={row.id} />
                          <GlassButton type="submit" size="sm" variant="dense" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                            Delete prize item
                          </GlassButton>
                        </form>
                      </>
                    ) : null}

                    <div className="mt-3 space-y-1 text-xs text-foreground/70">
                      {row.txns.length === 0 ? (
                        <p>No transactions yet.</p>
                      ) : (
                        row.txns.map((txn) => (
                          <p key={txn.id}>
                            {format(txn.createdAt, "MMM d, h:mm a")} · {txn.type} {txn.qty} · {formatCurrency(txn.totalCents)} · {txn.user.name}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="budget-view" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <GlassCard variant="dense">
              <div className="glass-content space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Top supply spend categories (this month)</h2>
                {topSpendCategories.length === 0 ? (
                  <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-3 text-sm text-foreground/70">No supply purchase transactions yet this month.</p>
                ) : (
                  topSpendCategories.map(([category, total]) => (
                    <div key={category} className="flex items-center justify-between rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm">
                      <span className="text-foreground/80">{category}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard variant="dense">
              <div className="glass-content space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Recent supply purchases</h2>
                {recentSupplyRows.length === 0 ? (
                  <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-3 text-sm text-foreground/70">No supply purchases this month.</p>
                ) : (
                  recentSupplyRows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm">
                      <p className="font-medium text-foreground">{row.itemName}</p>
                      <p className="text-xs text-foreground/70">{format(row.date, "MMM d, h:mm a")} · {row.category}</p>
                      <p className="text-xs text-foreground/70">Qty {row.qty} × {formatCurrency(row.unitCostCents)}</p>
                      <p className="font-semibold text-foreground">{formatCurrency(row.totalCostCents)}</p>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <GlassCard variant="dense">
              <div className="glass-content space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Supplies stock value</h2>
                  <Badge variant="outline">{inventoryRows.length} rows</Badge>
                </div>
                {inventoryRows.length === 0 ? (
                  <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-3 text-sm text-foreground/70">No supplies yet.</p>
                ) : (
                  inventoryRows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{row.name}</p>
                        <p className="text-xs text-foreground/70">{row.onHand} {row.unitLabel} × {formatCurrency(row.unitCostCents)}</p>
                      </div>
                      <p className="font-semibold text-foreground">{formatCurrency(row.stockValueCents)}</p>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard variant="dense">
              <div className="glass-content space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Prize stock value</h2>
                  <Badge variant="outline">{prizeRows.length} rows</Badge>
                </div>
                {prizeRows.length === 0 ? (
                  <p className="rounded-lg border border-white/70 bg-white/70 px-3 py-3 text-sm text-foreground/70">No prize items yet.</p>
                ) : (
                  prizeRows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{row.name}</p>
                        <p className="text-xs text-foreground/70">{row.onHand} units × {formatCurrency(row.priceCents)}</p>
                      </div>
                      <p className="font-semibold text-foreground">{formatCurrency(row.stockValueCents)}</p>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
