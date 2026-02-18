import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { adjustBudgetStockItemQuantity } from "@/lib/budget-stock/service";

const payloadSchema = z.object({
  delta: z.coerce.number().int().refine((value) => value !== 0, "delta must be non-zero")
});

export async function POST(request: Request, { params }: { params: { itemId: string } }) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid stock adjustment payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const item = await adjustBudgetStockItemQuantity({
      facilityId: context.facilityId,
      itemId: params.itemId,
      delta: parsed.data.delta
    });

    return Response.json({ item });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
