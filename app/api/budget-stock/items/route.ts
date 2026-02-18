import { z } from "zod";

import { asBudgetStockApiErrorResponse, BudgetStockApiError, requireBudgetStockApiContext } from "@/lib/budget-stock/api-context";
import { createBudgetStockItem, getBudgetStockHubSnapshot } from "@/lib/budget-stock/service";

const createItemSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unit: z.string().trim().max(40).optional().nullable(),
  onHand: z.coerce.number().int().min(0).optional(),
  parLevel: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).optional().nullable(),
  costPerUnit: z.coerce.number().min(0).optional().nullable(),
  vendor: z.string().trim().max(120).optional().nullable()
});

export async function GET(request: Request) {
  try {
    const context = await requireBudgetStockApiContext();
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
    const lowOnly = url.searchParams.get("lowOnly") === "true";
    const categories = (url.searchParams.get("categories") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const snapshot = await getBudgetStockHubSnapshot({
      facilityId: context.facilityId,
      monthKey: month,
      timeZone: context.timezone
    });

    let rows = snapshot.items;
    if (search.length > 0) {
      rows = rows.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search) ||
          (item.vendor ?? "").toLowerCase().includes(search)
      );
    }
    if (lowOnly) {
      rows = rows.filter((item) => item.status === "low");
    }
    if (categories.length > 0) {
      const set = new Set(categories.map((value) => value.toLowerCase()));
      rows = rows.filter((item) => set.has(item.category.toLowerCase()));
    }

    return Response.json({
      items: rows
    });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createItemSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid inventory item payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const item = await createBudgetStockItem({
      facilityId: context.facilityId,
      data: parsed.data
    });

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
