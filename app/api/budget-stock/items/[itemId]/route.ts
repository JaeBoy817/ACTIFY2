import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { deleteBudgetStockItem, updateBudgetStockItem } from "@/lib/budget-stock/service";

const updateItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  unit: z.string().trim().max(40).optional().nullable(),
  onHand: z.coerce.number().int().min(0).optional(),
  parLevel: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).optional().nullable(),
  costPerUnit: z.coerce.number().min(0).optional().nullable(),
  vendor: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: { itemId: string } }) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = updateItemSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid inventory update payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const item = await updateBudgetStockItem({
      facilityId: context.facilityId,
      itemId: params.itemId,
      data: parsed.data
    });

    return Response.json({ item });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { itemId: string } }) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    await deleteBudgetStockItem({
      facilityId: context.facilityId,
      itemId: params.itemId
    });
    return Response.json({ ok: true });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
