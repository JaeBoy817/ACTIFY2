import { Prisma, type PrizeItemCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type InStockItem = {
  name: string;
  category: PrizeItemCategory;
  quantityPacksPurchased: number;
  purchasePackPrice: number;
  unitName: string;
  unitsPerPack: number | null;
  netWeightOz?: number | null;
  unitSizeOz?: number;
};

type UnavailableItem = {
  name: string;
  category: PrizeItemCategory;
  quantityDesired: number;
  lastKnownPrice: number;
};

const WALMART_IMPORT_SOURCE = "walmart-cart-feb-2026";

export const IN_STOCK_ITEMS: InStockItem[] = [
  {
    name: "Little Bites Party Cake Muffins (5 packs)",
    category: "SNACK",
    quantityPacksPurchased: 2,
    purchasePackPrice: 3.98,
    unitName: "pack",
    unitsPerPack: 5
  },
  {
    name: "Sprite Zero Sugar (12-pack cans)",
    category: "DRINK",
    quantityPacksPurchased: 1,
    purchasePackPrice: 8.42,
    unitName: "can",
    unitsPerPack: 12
  },
  {
    name: "Sprite (12-pack cans)",
    category: "DRINK",
    quantityPacksPurchased: 1,
    purchasePackPrice: 8.42,
    unitName: "can",
    unitsPerPack: 12
  },
  {
    name: "Coca-Cola Zero Sugar (24-pack cans)",
    category: "DRINK",
    quantityPacksPurchased: 1,
    purchasePackPrice: 14.97,
    unitName: "can",
    unitsPerPack: 24
  },
  {
    name: "Coca-Cola (24-pack cans)",
    category: "DRINK",
    quantityPacksPurchased: 1,
    purchasePackPrice: 14.97,
    unitName: "can",
    unitsPerPack: 24
  },
  {
    name: "A&W Zero Sugar Root Beer (12-pack cans)",
    category: "DRINK",
    quantityPacksPurchased: 2,
    purchasePackPrice: 8.42,
    unitName: "can",
    unitsPerPack: 12
  },
  {
    name: "Dr Pepper (24-pack cans)",
    category: "DRINK",
    quantityPacksPurchased: 1,
    purchasePackPrice: 13.77,
    unitName: "can",
    unitsPerPack: 24
  },
  {
    name: "Diet Dr Pepper (24-pack cans)",
    category: "DRINK",
    quantityPacksPurchased: 1,
    purchasePackPrice: 13.77,
    unitName: "can",
    unitsPerPack: 24
  },
  {
    name: "Hershey’s/Reese’s/York Zero Sugar Variety Bag (15.5 oz)",
    category: "CANDY",
    quantityPacksPurchased: 2,
    purchasePackPrice: 14.84,
    unitName: "oz",
    unitsPerPack: null,
    netWeightOz: 15.5
  },
  {
    name: "Hershey’s Miniatures Family Pack (17.6 oz)",
    category: "CANDY",
    quantityPacksPurchased: 2,
    purchasePackPrice: 9.74,
    unitName: "oz",
    unitsPerPack: null,
    netWeightOz: 17.6
  },
  {
    name: "Snickers/Twix & More Minis Variety Bag (8.31 oz)",
    category: "CANDY",
    quantityPacksPurchased: 2,
    purchasePackPrice: 5.97,
    unitName: "oz",
    unitsPerPack: null,
    netWeightOz: 8.31
  },
  {
    name: "RITZ Fresh Stacks (12 snack packs)",
    category: "SNACK",
    quantityPacksPurchased: 2,
    purchasePackPrice: 5.23,
    unitName: "snack_pack",
    unitsPerPack: 12
  },
  {
    name: "Cheez-It Variety Pack (30 count)",
    category: "SNACK",
    quantityPacksPurchased: 1,
    purchasePackPrice: 12.96,
    unitName: "pack",
    unitsPerPack: 30
  },
  {
    name: "Nabisco Cookie Variety Pack (10 snack packs)",
    category: "SNACK",
    quantityPacksPurchased: 2,
    purchasePackPrice: 5.97,
    unitName: "snack_pack",
    unitsPerPack: 10
  },
  {
    name: "Frito Lay Classic Mix Chips (42 count, 1 oz)",
    category: "SNACK",
    quantityPacksPurchased: 2,
    purchasePackPrice: 19.34,
    unitName: "bag",
    unitsPerPack: 42,
    unitSizeOz: 1
  }
];

export const UNAVAILABLE_ITEMS: UnavailableItem[] = [
  {
    name: "YORK Dark Chocolate Peppermint Patties Miniatures (7.1 oz)",
    category: "CANDY",
    quantityDesired: 1,
    lastKnownPrice: 14.99
  },
  {
    name: "Welch’s Fruit Snacks, Mixed Fruit, Family Size",
    category: "SNACK",
    quantityDesired: 1,
    lastKnownPrice: 15.78
  }
];

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  if (!value) return null;
  return Number(value.toString());
}

function toMoneyDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function roundToFour(value: number) {
  return Number(value.toFixed(4));
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function computeItemCostPerUnit(item: InStockItem) {
  if (item.unitsPerPack && item.unitsPerPack > 0) {
    return roundToFour(item.purchasePackPrice / item.unitsPerPack);
  }
  if (item.netWeightOz && item.netWeightOz > 0) {
    return roundToFour(item.purchasePackPrice / item.netWeightOz);
  }
  return null;
}

export type WalmartImportSummary = {
  inStockUniqueItems: number;
  unavailableItems: number;
  expectedInStockUniqueItems: number;
  expectedTotalPacks: number;
  expectedSubtotalCents: number;
  subtotalCents: number;
  subtotalMatchesExpected: boolean;
  totalPacks: number;
  createdItems: number;
  updatedItems: number;
  createdWishlistItems: number;
  updatedWishlistItems: number;
};

export async function importWalmartCartToPrizeCart(params: {
  facilityId: string;
  userId: string;
}): Promise<WalmartImportSummary> {
  const { facilityId, userId } = params;

  let createdItems = 0;
  let updatedItems = 0;
  let createdWishlistItems = 0;
  let updatedWishlistItems = 0;
  let subtotalCents = 0;
  let totalPacks = 0;

  for (const item of IN_STOCK_ITEMS) {
    const purchasePackPrice = toMoneyDecimal(item.purchasePackPrice);
    const costPerUnit = computeItemCostPerUnit(item);
    const totalUnits = item.unitsPerPack ? item.quantityPacksPurchased * item.unitsPerPack : null;
    const totalOz = item.netWeightOz ? roundToFour(item.quantityPacksPurchased * item.netWeightOz) : null;
    const defaultFacilityPriceCents = costPerUnit !== null ? toCents(costPerUnit) : toCents(item.purchasePackPrice);

    subtotalCents += toCents(item.purchasePackPrice) * item.quantityPacksPurchased;
    totalPacks += item.quantityPacksPurchased;

    const existing = await prisma.prizeItem.findFirst({
      where: { facilityId, name: item.name },
      include: { inventory: true }
    });

    const nextOnHandLegacy = totalUnits ?? item.quantityPacksPurchased;
    const nextReorderLegacy = existing?.reorderAt ?? Math.max(1, Math.floor(nextOnHandLegacy * 0.2));
    const nextPriceCents = existing?.priceCents ?? defaultFacilityPriceCents;

    let prizeItemId = existing?.id;
    if (!existing) {
      const created = await prisma.prizeItem.create({
        data: {
          facilityId,
          name: item.name,
          category: item.category,
          priceCents: nextPriceCents,
          onHand: nextOnHandLegacy,
          reorderAt: nextReorderLegacy,
          purchasePackPrice,
          unitName: item.unitName,
          unitsPerPack: item.unitsPerPack,
          netWeightOz: item.netWeightOz !== undefined && item.netWeightOz !== null ? new Prisma.Decimal(item.netWeightOz.toString()) : null,
          costPerUnit: costPerUnit !== null ? new Prisma.Decimal(costPerUnit.toString()) : null,
          isAvailable: true,
          inventory: {
            create: {
              packsOnHand: item.quantityPacksPurchased,
              unitsOnHand: totalUnits,
              ozOnHand: totalOz !== null ? new Prisma.Decimal(totalOz.toString()) : null
            }
          }
        }
      });
      prizeItemId = created.id;
      createdItems += 1;
    } else {
      await prisma.prizeItem.update({
        where: { id: existing.id },
        data: {
          category: item.category,
          onHand: nextOnHandLegacy,
          reorderAt: nextReorderLegacy,
          purchasePackPrice,
          unitName: item.unitName,
          unitsPerPack: item.unitsPerPack,
          netWeightOz: item.netWeightOz !== undefined && item.netWeightOz !== null ? new Prisma.Decimal(item.netWeightOz.toString()) : null,
          costPerUnit: costPerUnit !== null ? new Prisma.Decimal(costPerUnit.toString()) : null,
          isAvailable: true,
          inventory: {
            upsert: {
              create: {
                packsOnHand: item.quantityPacksPurchased,
                unitsOnHand: totalUnits,
                ozOnHand: totalOz !== null ? new Prisma.Decimal(totalOz.toString()) : null
              },
              update: {
                packsOnHand: item.quantityPacksPurchased,
                unitsOnHand: totalUnits,
                ozOnHand: totalOz !== null ? new Prisma.Decimal(totalOz.toString()) : null
              }
            }
          }
        }
      });
      updatedItems += 1;
    }

    if (!prizeItemId) {
      throw new Error(`Failed to resolve prize item id for ${item.name}.`);
    }

    const sourceKey = `${WALMART_IMPORT_SOURCE}:${slugify(item.name)}`;
    const existingTxn = await prisma.prizeTxn.findFirst({
      where: {
        prizeItemId,
        sourceKey
      }
    });

    const txnData = {
      prizeItemId,
      type: "RESTOCK" as const,
      qty: item.quantityPacksPurchased,
      totalCents: toCents(item.purchasePackPrice) * item.quantityPacksPurchased,
      packsDelta: item.quantityPacksPurchased,
      unitsDelta: totalUnits,
      ozDelta: totalOz !== null ? new Prisma.Decimal(totalOz.toString()) : null,
      packPriceAtTime: purchasePackPrice,
      sourceKey,
      userId
    };

    if (!existingTxn) {
      await prisma.prizeTxn.create({ data: txnData });
    } else {
      await prisma.prizeTxn.update({
        where: { id: existingTxn.id },
        data: txnData
      });
    }
  }

  for (const item of UNAVAILABLE_ITEMS) {
    const existing = await prisma.prizeWishlistItem.findFirst({
      where: { facilityId, name: item.name }
    });

    if (!existing) {
      await prisma.prizeWishlistItem.create({
        data: {
          facilityId,
          name: item.name,
          category: item.category,
          quantityDesired: item.quantityDesired,
          lastKnownPrice: toMoneyDecimal(item.lastKnownPrice)
        }
      });
      createdWishlistItems += 1;
    } else {
      await prisma.prizeWishlistItem.update({
        where: { id: existing.id },
        data: {
          category: item.category,
          quantityDesired: item.quantityDesired,
          lastKnownPrice: toMoneyDecimal(item.lastKnownPrice)
        }
      });
      updatedWishlistItems += 1;
    }
  }

  return {
    inStockUniqueItems: IN_STOCK_ITEMS.length,
    unavailableItems: UNAVAILABLE_ITEMS.length,
    expectedInStockUniqueItems: 15,
    expectedTotalPacks: 23,
    expectedSubtotalCents: 23426,
    subtotalCents,
    subtotalMatchesExpected: subtotalCents === 23426,
    totalPacks,
    createdItems,
    updatedItems,
    createdWishlistItems,
    updatedWishlistItems
  };
}

export function formatPrizeDecimal(value: Prisma.Decimal | null | undefined, fractionDigits = 2) {
  const num = decimalToNumber(value);
  if (num === null) return "—";
  return `$${num.toFixed(fractionDigits)}`;
}

export function formatPlainDecimal(value: Prisma.Decimal | null | undefined, fractionDigits = 2) {
  const num = decimalToNumber(value);
  if (num === null) return "—";
  return num.toFixed(fractionDigits);
}
