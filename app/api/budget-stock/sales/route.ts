import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { createBudgetStockSale, getBudgetStockHubSnapshot } from "@/lib/budget-stock/service";

const createSaleSchema = z.object({
  itemId: z.string().trim().min(1),
  qty: z.coerce.number().int().min(1),
  sellPricePerUnit: z.coerce.number().min(0),
  residentName: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
  date: z.coerce.date().optional()
});

export async function GET(request: Request) {
  try {
    const context = await requireBudgetStockApiContext();
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const snapshot = await getBudgetStockHubSnapshot({
      facilityId: context.facilityId,
      monthKey: month,
      timeZone: context.timezone
    });
    return Response.json({
      sales: snapshot.sales,
      summary: {
        salesRevenue: snapshot.summary.salesRevenue,
        salesCostBasis: snapshot.summary.salesCostBasis,
        salesProfit: snapshot.summary.salesProfit
      }
    });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createSaleSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid sale payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const result = await createBudgetStockSale({
      facilityId: context.facilityId,
      data: parsed.data
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
