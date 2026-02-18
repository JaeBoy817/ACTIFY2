import { getBudgetStockHubSnapshot } from "@/lib/budget-stock/service";
import { asBudgetStockApiErrorResponse, requireBudgetStockApiContext } from "@/lib/budget-stock/api-context";

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
    return Response.json(snapshot);
  } catch (error) {
    return asBudgetStockApiErrorResponse(error);
  }
}
