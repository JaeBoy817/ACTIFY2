import { CarePlansDashboard } from "@/components/care-plans/CarePlansDashboard";
import { getCarePlansDashboardData } from "@/app/app/care-plans/_actions/actions";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { resolveTimeZone } from "@/lib/timezone";

type SearchParams = {
  search?: string;
  status?: string;
  bedBound?: "true" | "false";
  primaryFocus?: string;
  unitId?: string;
  sort?: string;
  followUp?: "true" | "false";
  residentId?: string;
};

export default async function CarePlansPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const context = await getFacilityContextWithSubscription("carePlan");
  const data = await getCarePlansDashboardData();

  return (
    <CarePlansDashboard
      data={data}
      filters={{
        search: searchParams?.search ?? "",
        status: searchParams?.status ?? "ALL",
        primaryFocus: searchParams?.primaryFocus ?? "",
        unitId: searchParams?.unitId ?? "all",
        sort: searchParams?.sort ?? "REVIEW_DUE",
        followUp: searchParams?.followUp ?? "false",
        residentId: searchParams?.residentId ?? ""
      }}
      timeZone={resolveTimeZone(context.timeZone)}
    />
  );
}
