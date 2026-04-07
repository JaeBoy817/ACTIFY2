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

function normalizeToken(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

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
        search: normalizeToken(searchParams?.search, ""),
        status: normalizeToken(searchParams?.status, "ALL"),
        primaryFocus: normalizeToken(searchParams?.primaryFocus, "all"),
        unitId: normalizeToken(searchParams?.unitId, "all"),
        sort: normalizeToken(searchParams?.sort, "REVIEW_DUE"),
        followUp: searchParams?.followUp ?? "false",
        residentId: normalizeToken(searchParams?.residentId, "")
      }}
      timeZone={resolveTimeZone(context.timeZone)}
    />
  );
}
