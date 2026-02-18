import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { deleteBudgetExpense, updateBudgetExpense } from "@/lib/budget-stock/service";

const updateExpenseSchema = z.object({
  date: z.coerce.date().optional(),
  category: z.string().trim().min(1).optional(),
  amount: z.coerce.number().min(0).optional(),
  vendor: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  linkedItemId: z.string().trim().min(1).optional().nullable()
});

export async function PATCH(request: Request, { params }: { params: { expenseId: string } }) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = updateExpenseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid expense update payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const expense = await updateBudgetExpense({
      facilityId: context.facilityId,
      expenseId: params.expenseId,
      data: parsed.data
    });

    return Response.json({ expense });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { expenseId: string } }) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    await deleteBudgetExpense({
      facilityId: context.facilityId,
      expenseId: params.expenseId
    });
    return Response.json({ ok: true });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
