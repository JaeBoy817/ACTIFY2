import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { deleteBudgetCategory, updateBudgetCategory } from "@/lib/budget-stock/service";

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  monthlyLimit: z.coerce.number().min(0).optional()
});

export async function PATCH(request: Request, { params }: { params: { categoryId: string } }) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = updateCategorySchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid category update payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const category = await updateBudgetCategory({
      facilityId: context.facilityId,
      categoryId: params.categoryId,
      data: parsed.data
    });

    return Response.json({ category });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { categoryId: string } }) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    await deleteBudgetCategory({
      facilityId: context.facilityId,
      categoryId: params.categoryId
    });
    return Response.json({ ok: true });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
