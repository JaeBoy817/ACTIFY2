import { BudgetStockHub } from "@/components/budget-stock/BudgetStockHub";
import { getBudgetStockHubSnapshot, buildMonthOptions } from "@/lib/budget-stock/service";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { resolveTimeZone } from "@/lib/timezone";

export default async function BudgetStockHubPage({
  searchParams
}: {
  searchParams?: {
    month?: string;
  };
}) {
  const context = await requireModulePage("inventory");
  const timeZone = resolveTimeZone(context.facility.timezone);
  const monthOptions = buildMonthOptions(timeZone, 12);
  const initialMonthKey = searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month)
    ? searchParams.month
    : monthOptions[0]?.key;

  const snapshot = await getBudgetStockHubSnapshot({
    facilityId: context.facilityId,
    monthKey: initialMonthKey,
    timeZone
  });

  return (
    <BudgetStockHub
      initialSnapshot={snapshot}
      initialMonthKey={snapshot.summary.monthKey}
      monthOptions={monthOptions}
      canEdit={canWrite(context.role)}
    />
  );
}
