import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

import { readBudgetTrackerConfig } from "../lib/budget-tracker";
import {
  BUDGET_STOCK_CATEGORY_OPTIONS,
  normalizeBudgetStockCategory
} from "../lib/budget-stock/category-options";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

const DEFAULT_BUDGET_CATEGORY_NAMES = BUDGET_STOCK_CATEGORY_OPTIONS;

type RunMode = "dry-run" | "commit";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value && "toString" in value) {
    const parsed = Number((value as { toString: () => string }).toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseArgs(argv: string[]) {
  const values = new Set(argv.slice(2));
  const facilityArgIndex = argv.findIndex((arg) => arg === "--facility");
  const facilityId = facilityArgIndex >= 0 ? argv[facilityArgIndex + 1] : undefined;

  const mode: RunMode = values.has("--commit") ? "commit" : "dry-run";
  const force = values.has("--force");
  return { mode, facilityId, force };
}

function maybeBackupSqliteDb() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.startsWith("file:")) {
    return null;
  }

  const sourcePath = dbUrl.replace("file:", "");
  const absoluteSource = path.isAbsolute(sourcePath) ? sourcePath : path.join(process.cwd(), sourcePath);
  if (!fs.existsSync(absoluteSource)) {
    return null;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = absoluteSource.replace(/\.db$/, `.backup.${stamp}.db`);
  fs.copyFileSync(absoluteSource, backupPath);
  return backupPath;
}

function stableLegacyFingerprint(input: {
  facilityId: string;
  dateIso: string;
  amount: number;
  category: string;
  vendor?: string | null;
  note?: string | null;
}) {
  const vendor = (input.vendor ?? "").trim().toLowerCase();
  const note = (input.note ?? "").trim().toLowerCase();
  return [
    input.facilityId,
    input.dateIso.slice(0, 10),
    input.amount.toFixed(2),
    input.category.trim().toLowerCase(),
    vendor,
    note.slice(0, 120)
  ].join("|");
}

async function migrateFacility(params: { facilityId: string; mode: RunMode; force: boolean }) {
  const facility = await prisma.facility.findUnique({
    where: { id: params.facilityId },
    select: {
      id: true,
      name: true,
      moduleFlags: true
    }
  });
  if (!facility) {
    throw new Error(`Facility ${params.facilityId} not found.`);
  }

  const existingMeta = await prisma.budgetStockMigrationMeta.findUnique({
    where: {
      facilityId_key: {
        facilityId: facility.id,
        key: "budget_stock_2_0"
      }
    }
  });

  if (existingMeta && params.mode === "commit" && !params.force) {
    return {
      facilityId: facility.id,
      facilityName: facility.name,
      skipped: true,
      reason: "Migration meta already exists. Use --force to run again.",
      createdItems: 0,
      updatedItems: 0,
      createdExpenses: 0,
      updatedExpenses: 0,
      createdCategories: 0
    };
  }

  const [legacyInventory, legacyPrizeItems, legacyInventoryTxns, legacyPrizeTxns] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { facilityId: facility.id },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    prisma.prizeItem.findMany({
      where: { facilityId: facility.id },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    }),
    prisma.inventoryTxn.findMany({
      where: {
        item: {
          facilityId: facility.id
        }
      },
      include: {
        item: true
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.prizeTxn.findMany({
      where: {
        prizeItem: {
          facilityId: facility.id
        }
      },
      include: {
        prizeItem: true
      },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const legacyConfig = readBudgetTrackerConfig(facility.moduleFlags);
  const defaultUnitCost = legacyConfig.defaultUnitCostCents / 100;

  const inventoryItemPayloads = legacyInventory.map((item) => {
    const mappedCost = legacyConfig.itemUnitCosts[item.id] !== undefined ? legacyConfig.itemUnitCosts[item.id] / 100 : defaultUnitCost;
    return {
      facilityId: facility.id,
      legacySource: "InventoryItem",
      legacySourceId: item.id,
      name: item.name,
      category: normalizeBudgetStockCategory(item.category),
      unit: item.unitLabel || null,
      onHand: Math.max(item.onHand, 0),
      parLevel: Math.max(item.reorderAt, 0),
      reorderPoint: Math.max(item.reorderAt, 0),
      costPerUnit: Number.isFinite(mappedCost) ? Number(mappedCost.toFixed(4)) : null,
      vendor: null,
      isActive: true
    };
  });

  const prizeItemPayloads = legacyPrizeItems.map((item) => {
    const costPerUnit = toNumber(item.costPerUnit);
    return {
      facilityId: facility.id,
      legacySource: "PrizeItem",
      legacySourceId: item.id,
      name: item.name,
      category: "Prizes",
      unit: item.unitName || null,
      onHand: Math.max(item.onHand, 0),
      parLevel: Math.max(item.reorderAt, 0),
      reorderPoint: Math.max(item.reorderAt, 0),
      costPerUnit: costPerUnit !== null ? Number(costPerUnit.toFixed(4)) : null,
      vendor: null,
      isActive: item.isAvailable
    };
  });

  const distinctCategories = new Set<string>();
  for (const item of inventoryItemPayloads) distinctCategories.add(item.category);
  for (const item of prizeItemPayloads) distinctCategories.add(item.category);
  for (const fallback of DEFAULT_BUDGET_CATEGORY_NAMES) distinctCategories.add(fallback);

  const expensePayloadsFromInventory = legacyInventoryTxns
    .filter((txn) => txn.type === "IN")
    .map((txn) => {
      const unitCost =
        legacyConfig.itemUnitCosts[txn.itemId] !== undefined
          ? legacyConfig.itemUnitCosts[txn.itemId] / 100
          : defaultUnitCost;
      const amount = Number((Math.max(txn.qty, 0) * Math.max(unitCost, 0)).toFixed(2));
      if (amount <= 0) return null;
      return {
        facilityId: facility.id,
        legacySource: "InventoryTxn",
        legacySourceId: txn.id,
        linkedLegacySource: "InventoryItem",
        linkedLegacySourceId: txn.itemId,
        date: txn.createdAt,
        category: normalizeBudgetStockCategory(txn.item.category),
        amount,
        vendor: null as string | null,
        note:
          txn.note?.trim() ||
          `Migrated from inventory transaction (type=${txn.type}, qty=${txn.qty}).`,
        fingerprint: stableLegacyFingerprint({
          facilityId: facility.id,
          dateIso: txn.createdAt.toISOString(),
          amount,
          category: normalizeBudgetStockCategory(txn.item.category),
          note: txn.note ?? null
        })
      };
    })
    .filter((payload): payload is NonNullable<typeof payload> => Boolean(payload));

  const expensePayloadsFromPrize = legacyPrizeTxns
    .filter((txn) => txn.type === "RESTOCK")
    .map((txn) => {
      const packPrice = toNumber(txn.packPriceAtTime);
      const qty = Math.max(txn.qty, 0);
      const packsDelta = Math.max(txn.packsDelta, 0);
      const unitsPerPack = txn.prizeItem.unitsPerPack ?? null;

      let amount = 0;
      if (packPrice !== null && packsDelta > 0) {
        amount = packPrice * packsDelta;
      } else if (packPrice !== null && qty > 0) {
        const estimatedPacks = unitsPerPack && unitsPerPack > 0 ? qty / unitsPerPack : qty;
        amount = packPrice * estimatedPacks;
      }
      amount = Number(Math.max(amount, 0).toFixed(2));
      if (amount <= 0) return null;

      return {
        facilityId: facility.id,
        legacySource: "PrizeTxn",
        legacySourceId: txn.id,
        linkedLegacySource: "PrizeItem",
        linkedLegacySourceId: txn.prizeItemId,
        date: txn.createdAt,
        category: normalizeBudgetStockCategory("Prizes"),
        amount,
        vendor: null as string | null,
        note: `Migrated from prize restock transaction (qty=${txn.qty}, packsDelta=${txn.packsDelta}).`,
        fingerprint: stableLegacyFingerprint({
          facilityId: facility.id,
          dateIso: txn.createdAt.toISOString(),
          amount,
          category: normalizeBudgetStockCategory("Prizes"),
          note: `prize-${txn.id}`
        })
      };
    })
    .filter((payload): payload is NonNullable<typeof payload> => Boolean(payload));

  const expensePayloads = [...expensePayloadsFromInventory, ...expensePayloadsFromPrize];

  if (params.mode === "dry-run") {
    return {
      facilityId: facility.id,
      facilityName: facility.name,
      skipped: false,
      reason: null,
      createdItems: inventoryItemPayloads.length + prizeItemPayloads.length,
      updatedItems: 0,
      createdExpenses: expensePayloads.length,
      updatedExpenses: 0,
      createdCategories: distinctCategories.size
    };
  }

  const existingCategoryCount = await prisma.budgetStockCategory.count({
    where: { facilityId: facility.id }
  });
  if (existingCategoryCount === 0) {
    const legacyBudgetDollars = legacyConfig.monthlyBudgetCents / 100;
    await prisma.budgetStockCategory.createMany({
      data: DEFAULT_BUDGET_CATEGORY_NAMES.map((name, index) => ({
        facilityId: facility.id,
        name,
        monthlyLimit: index === 0 ? legacyBudgetDollars : 0
      })),
      skipDuplicates: true
    });
  }

  const itemIdByLegacy = new Map<string, string>();
  let createdItems = 0;
  let updatedItems = 0;
  for (const payload of [...inventoryItemPayloads, ...prizeItemPayloads]) {
    const existing = await prisma.budgetStockItem.findUnique({
      where: {
        facilityId_legacySource_legacySourceId: {
          facilityId: payload.facilityId,
          legacySource: payload.legacySource,
          legacySourceId: payload.legacySourceId
        }
      }
    });

    const item = await prisma.budgetStockItem.upsert({
      where: {
        facilityId_legacySource_legacySourceId: {
          facilityId: payload.facilityId,
          legacySource: payload.legacySource,
          legacySourceId: payload.legacySourceId
        }
      },
      update: {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        onHand: payload.onHand,
        parLevel: payload.parLevel,
        reorderPoint: payload.reorderPoint,
        costPerUnit: payload.costPerUnit,
        vendor: payload.vendor,
        isActive: payload.isActive
      },
      create: payload
    });

    if (existing) updatedItems += 1;
    else createdItems += 1;

    const key = `${payload.legacySource}|${payload.legacySourceId}`;
    itemIdByLegacy.set(key, item.id);
    distinctCategories.add(payload.category);
  }

  let createdCategories = 0;
  for (const category of distinctCategories) {
    const existed = await prisma.budgetStockCategory.findUnique({
      where: {
        facilityId_name: {
          facilityId: facility.id,
          name: category
        }
      }
    });
    await prisma.budgetStockCategory.upsert({
      where: {
        facilityId_name: {
          facilityId: facility.id,
          name: category
        }
      },
      update: {},
      create: {
        facilityId: facility.id,
        name: category,
        monthlyLimit: 0
      }
    });
    if (!existed) createdCategories += 1;
  }

  let createdExpenses = 0;
  let updatedExpenses = 0;
  for (const payload of expensePayloads) {
    const category = await prisma.budgetStockCategory.findUnique({
      where: {
        facilityId_name: {
          facilityId: facility.id,
          name: payload.category
        }
      },
      select: { id: true }
    });
    const linkedItemId = itemIdByLegacy.get(`${payload.linkedLegacySource}|${payload.linkedLegacySourceId}`) ?? null;

    const existing = await prisma.budgetStockExpense.findUnique({
      where: {
        facilityId_legacySource_legacySourceId: {
          facilityId: payload.facilityId,
          legacySource: payload.legacySource,
          legacySourceId: payload.legacySourceId
        }
      }
    });

    await prisma.budgetStockExpense.upsert({
      where: {
        facilityId_legacySource_legacySourceId: {
          facilityId: payload.facilityId,
          legacySource: payload.legacySource,
          legacySourceId: payload.legacySourceId
        }
      },
      update: {
        date: payload.date,
        category: payload.category,
        categoryId: category?.id ?? null,
        amount: payload.amount,
        vendor: payload.vendor,
        note: payload.note,
        linkedItemId,
        legacyFingerprint: payload.fingerprint
      },
      create: {
        facilityId: payload.facilityId,
        date: payload.date,
        category: payload.category,
        categoryId: category?.id ?? null,
        amount: payload.amount,
        vendor: payload.vendor,
        note: payload.note,
        linkedItemId,
        legacySource: payload.legacySource,
        legacySourceId: payload.legacySourceId,
        legacyFingerprint: payload.fingerprint
      }
    });

    if (existing) updatedExpenses += 1;
    else createdExpenses += 1;
  }

  await prisma.budgetStockMigrationMeta.upsert({
    where: {
      facilityId_key: {
        facilityId: facility.id,
        key: "budget_stock_2_0"
      }
    },
    update: {
      valueJson: {
        mode: params.mode,
        migratedAt: new Date().toISOString(),
        createdItems,
        updatedItems,
        createdExpenses,
        updatedExpenses,
        createdCategories
      }
    },
    create: {
      facilityId: facility.id,
      key: "budget_stock_2_0",
      valueJson: {
        mode: params.mode,
        migratedAt: new Date().toISOString(),
        createdItems,
        updatedItems,
        createdExpenses,
        updatedExpenses,
        createdCategories
      }
    }
  });

  return {
    facilityId: facility.id,
    facilityName: facility.name,
    skipped: false,
    reason: null,
    createdItems,
    updatedItems,
    createdExpenses,
    updatedExpenses,
    createdCategories
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const backupPath = args.mode === "commit" ? maybeBackupSqliteDb() : null;

  if (backupPath) {
    console.log(`SQLite backup created: ${backupPath}`);
  } else if (args.mode === "commit") {
    console.log("No local SQLite database file detected for automatic backup (non-file DATABASE_URL).");
  }

  const facilities = args.facilityId
    ? [{ id: args.facilityId }]
    : await prisma.facility.findMany({
        select: { id: true },
        orderBy: { createdAt: "asc" }
      });

  if (facilities.length === 0) {
    console.log("No facilities found. Nothing to migrate.");
    return;
  }

  console.log(`Mode: ${args.mode.toUpperCase()}${args.force ? " (force)" : ""}`);
  console.log(`Facilities to process: ${facilities.length}`);

  const summaries = [];
  for (const facility of facilities) {
    const summary = await migrateFacility({
      facilityId: facility.id,
      mode: args.mode,
      force: args.force
    });
    summaries.push(summary);
    const prefix = summary.skipped ? "SKIP" : args.mode === "commit" ? "COMMIT" : "DRY";
    console.log(
      `[${prefix}] ${summary.facilityName} (${summary.facilityId}) -> items +${summary.createdItems} / ~${summary.updatedItems}, expenses +${summary.createdExpenses} / ~${summary.updatedExpenses}, categories +${summary.createdCategories}${
        summary.reason ? ` (${summary.reason})` : ""
      }`
    );
  }

  const totals = summaries.reduce(
    (acc, row) => ({
      facilities: acc.facilities + 1,
      createdItems: acc.createdItems + row.createdItems,
      updatedItems: acc.updatedItems + row.updatedItems,
      createdExpenses: acc.createdExpenses + row.createdExpenses,
      updatedExpenses: acc.updatedExpenses + row.updatedExpenses,
      createdCategories: acc.createdCategories + row.createdCategories,
      skippedFacilities: acc.skippedFacilities + (row.skipped ? 1 : 0)
    }),
    {
      facilities: 0,
      createdItems: 0,
      updatedItems: 0,
      createdExpenses: 0,
      updatedExpenses: 0,
      createdCategories: 0,
      skippedFacilities: 0
    }
  );

  console.log("-----");
  console.log(JSON.stringify(totals, null, 2));
  if (args.mode === "dry-run") {
    console.log("Dry run complete. No changes written.");
  } else {
    console.log("Commit complete.");
  }
}

main()
  .catch((error) => {
    console.error("Budget/stock migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
