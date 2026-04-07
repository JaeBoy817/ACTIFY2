import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { setBudgetStockMonthlyTotal } from "@/lib/budget-stock/service";

const patchSchema = z.object({
  total: z.coerce.number().min(0),
  distribution: z.enum(["proportional", "primary"]).optional()
});

export async function PATCH(request: Request) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid monthly budget payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const categories = await setBudgetStockMonthlyTotal({
      facilityId: context.facilityId,
      total: parsed.data.total,
      distribution: parsed.data.distribution
    });

    return Response.json({
      total: Number(categories.reduce((sum, category) => sum + category.monthlyLimit, 0).toFixed(2)),
      categories
    });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

