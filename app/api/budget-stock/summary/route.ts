import { getBudgetStockSummary } from "@/lib/budget-stock/service";
import { asBudgetStockApiErrorResponse, requireBudgetStockApiContext } from "@/lib/budget-stock/api-context";

export async function GET(request: Request) {
  try {
    const context = await requireBudgetStockApiContext();
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const summary = await getBudgetStockSummary({
      facilityId: context.facilityId,
      monthKey: month,
      timeZone: context.timezone
    });
    return Response.json(summary);
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
