import { CarePlansDashboard } from "@/components/care-plans/CarePlansDashboard";
import { getCarePlansDashboardData } from "@/app/app/care-plans/_actions/actions";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { resolveTimeZone } from "@/lib/timezone";

type SearchParams = {
  search?: string;
  status?: "ALL" | "NO_PLAN" | "ACTIVE" | "DUE_SOON" | "OVERDUE" | "ARCHIVED";
  bedBound?: "true" | "false";
  primaryFocus?: string;
  unitId?: string;
};

export default async function CarePlansPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const context = await getFacilityContextWithSubscription("carePlan");
  const filters = {
    search: searchParams?.search ?? "",
    status: searchParams?.status ?? "ALL",
    bedBound: searchParams?.bedBound === "true",
    primaryFocus: searchParams?.primaryFocus ?? "",
    unitId: searchParams?.unitId ?? ""
  } as const;

  const data = await getCarePlansDashboardData(filters);

  return (
    <CarePlansDashboard
      data={data}
      filters={{
        search: searchParams?.search ?? "",
        status: searchParams?.status ?? "ALL",
        bedBound: searchParams?.bedBound ?? "false",
        primaryFocus: searchParams?.primaryFocus ?? ""
      }}
      timeZone={resolveTimeZone(context.facility.timezone)}
    />
  );
}
