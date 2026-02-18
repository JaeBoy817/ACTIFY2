import { getBudgetStockMigrationStatus } from "@/lib/budget-stock/service";
import { asBudgetStockApiErrorResponse, requireBudgetStockApiContext } from "@/lib/budget-stock/api-context";

export async function GET() {
  try {
    const context = await requireBudgetStockApiContext();
    const status = await getBudgetStockMigrationStatus(context.facilityId);
    return Response.json(status);
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
