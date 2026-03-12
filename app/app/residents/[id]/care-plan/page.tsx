import { notFound } from "next/navigation";

import {
  ActivitiesCarePlanPage,
  type ActivitiesCarePlanQuery,
  type ActivitiesCarePlanTab
} from "@/components/care-plans/ActivitiesCarePlanPage";
import { archiveCarePlan, getResidentActivitiesCarePlanData } from "@/app/app/care-plans/_actions/actions";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { resolveTimeZone } from "@/lib/timezone";

export default async function ResidentCarePlanOverviewPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: {
    tab?: string;
    q?: string;
    focusStatus?: string;
    focusPriority?: string;
    focusSort?: string;
    focusView?: string;
    giFocus?: string;
    giStatus?: string;
  };
}) {
  const context = await getFacilityContextWithSubscription("carePlan");
  const data = await getResidentActivitiesCarePlanData(params.id);

  if (!data) {
    notFound();
  }

  async function archiveAction(formData: FormData) {
    "use server";
    const carePlanId = String(formData.get("carePlanId") || "");
    if (!carePlanId) return;
    await archiveCarePlan(carePlanId);
  }

  const tabParam = searchParams?.tab;
  const activeTab: ActivitiesCarePlanTab =
    tabParam === "focuses" ||
    tabParam === "goals-interventions" ||
    tabParam === "participation" ||
    tabParam === "documents" ||
    tabParam === "history"
      ? tabParam
      : "overview";

  const query: ActivitiesCarePlanQuery = {
    tab: activeTab,
    q: typeof searchParams?.q === "string" ? searchParams.q : "",
    focusStatus:
      searchParams?.focusStatus === "active" ||
      searchParams?.focusStatus === "monitor" ||
      searchParams?.focusStatus === "resolved" ||
      searchParams?.focusStatus === "draft"
        ? searchParams.focusStatus
        : "all",
    focusPriority:
      searchParams?.focusPriority === "high" ||
      searchParams?.focusPriority === "moderate" ||
      searchParams?.focusPriority === "low"
        ? searchParams.focusPriority
        : "all",
    focusSort:
      searchParams?.focusSort === "priority" ||
      searchParams?.focusSort === "review" ||
      searchParams?.focusSort === "updated" ||
      searchParams?.focusSort === "title"
        ? searchParams.focusSort
        : "priority",
    focusView:
      searchParams?.focusView === "board" || searchParams?.focusView === "list"
        ? searchParams.focusView
        : "board",
    giFocus: typeof searchParams?.giFocus === "string" ? searchParams.giFocus : "all",
    giStatus:
      searchParams?.giStatus === "ongoing" ||
      searchParams?.giStatus === "met" ||
      searchParams?.giStatus === "not-met" ||
      searchParams?.giStatus === "revised"
        ? searchParams.giStatus
        : "all"
  };

  return (
    <ActivitiesCarePlanPage
      data={data}
      timeZone={resolveTimeZone(context.timeZone)}
      canEdit={canWrite(context.role)}
      query={query}
      archiveAction={archiveAction}
    />
  );
}
