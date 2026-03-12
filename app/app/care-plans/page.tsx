import Link from "next/link";
import { redirect } from "next/navigation";

import { getCarePlansDashboardData } from "@/app/app/care-plans/_actions/actions";

type SearchParams = {
  residentId?: string;
  tab?: string;
  q?: string;
  focusStatus?: string;
  focusPriority?: string;
  focusSort?: string;
  focusView?: string;
  giFocus?: string;
  giStatus?: string;
};

function buildResidentCarePlanHref(residentId: string, searchParams?: SearchParams) {
  const params = new URLSearchParams();

  if (searchParams?.tab) params.set("tab", searchParams.tab);
  if (searchParams?.q) params.set("q", searchParams.q);
  if (searchParams?.focusStatus) params.set("focusStatus", searchParams.focusStatus);
  if (searchParams?.focusPriority) params.set("focusPriority", searchParams.focusPriority);
  if (searchParams?.focusSort) params.set("focusSort", searchParams.focusSort);
  if (searchParams?.focusView) params.set("focusView", searchParams.focusView);
  if (searchParams?.giFocus) params.set("giFocus", searchParams.giFocus);
  if (searchParams?.giStatus) params.set("giStatus", searchParams.giStatus);

  const query = params.toString();
  return `/app/residents/${residentId}/care-plan${query ? `?${query}` : ""}`;
}

export default async function CarePlansPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const data = await getCarePlansDashboardData({});

  if (data.rows.length === 0) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-[#263a60] bg-[linear-gradient(180deg,#0b162b_0%,#091123_100%)] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#99b3dc]">Care Plan</p>
        <h1 className="mt-2 text-3xl font-black text-white">No Residents Available</h1>
        <p className="mt-3 text-sm text-[#b9ccee]">
          Add a resident to begin building and reviewing Activities Care Plans.
        </p>
        <Link
          href="/app/residents"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-[#3b5a8e] bg-[#15315c] px-5 text-sm font-semibold text-[#d8e6ff] hover:bg-[#1a3a6d]"
        >
          Go to Residents
        </Link>
      </section>
    );
  }

  const requestedResidentId = searchParams?.residentId;
  const selectedResidentId =
    requestedResidentId && data.rows.some((row) => row.residentId === requestedResidentId)
      ? requestedResidentId
      : data.rows[0].residentId;

  redirect(buildResidentCarePlanHref(selectedResidentId, searchParams));
}
