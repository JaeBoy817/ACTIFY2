import { z } from "zod";

import {
  asBudgetStockApiErrorResponse,
  BudgetStockApiError,
  requireBudgetStockApiContext
} from "@/lib/budget-stock/api-context";
import { createBudgetCategory, ensureBudgetStockCategories } from "@/lib/budget-stock/service";
import { prisma } from "@/lib/prisma";

const createCategorySchema = z.object({
  name: z.string().trim().min(1),
  monthlyLimit: z.coerce.number().min(0).optional()
});

export async function GET() {
  try {
    const context = await requireBudgetStockApiContext();
    await ensureBudgetStockCategories(context.facilityId);
    const categories = await prisma.budgetStockCategory.findMany({
      where: { facilityId: context.facilityId },
      orderBy: { name: "asc" }
    });
    return Response.json({ categories });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireBudgetStockApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createCategorySchema.safeParse(payload);
    if (!parsed.success) {
      throw new BudgetStockApiError("Invalid budget category payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const category = await createBudgetCategory({
      facilityId: context.facilityId,
      name: parsed.data.name,
      monthlyLimit: parsed.data.monthlyLimit
    });

    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
