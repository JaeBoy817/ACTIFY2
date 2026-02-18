import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { createBudgetExpense, getBudgetStockHubSnapshot } from "@/lib/budget-stock/service";

const createExpenseSchema = z.object({
  date: z.coerce.date(),
  category: z.string().trim().min(1),
  amount: z.coerce.number().min(0),
  vendor: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  linkedItemId: z.string().trim().min(1).optional().nullable()
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
      expenses: snapshot.expenses
    });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createExpenseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid expense payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const expense = await createBudgetExpense({
      facilityId: context.facilityId,
      data: parsed.data
    });

    return Response.json({ expense }, { status: 201 });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
