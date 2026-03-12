import { notFound } from "next/navigation";

import { ActivitiesCarePlanPage, type ActivitiesCarePlanTab } from "@/components/care-plans/ActivitiesCarePlanPage";
import { archiveCarePlan, getResidentActivitiesCarePlanData } from "@/app/app/care-plans/_actions/actions";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { resolveTimeZone } from "@/lib/timezone";

export default async function ResidentCarePlanOverviewPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { tab?: string };
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

  return (
    <ActivitiesCarePlanPage
      data={data}
      timeZone={resolveTimeZone(context.timeZone)}
      canEdit={canWrite(context.role)}
      activeTab={activeTab}
      archiveAction={archiveAction}
    />
  );
}
