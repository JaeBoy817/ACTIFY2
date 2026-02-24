import { notFound } from "next/navigation";

import { CarePlanOverview } from "@/components/care-plans/CarePlanOverview";
import { archiveCarePlan, getResidentCarePlan } from "@/app/app/care-plans/_actions/actions";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { resolveTimeZone } from "@/lib/timezone";

export default async function ResidentCarePlanOverviewPage({
  params
}: {
  params: { id: string };
}) {
  const context = await getFacilityContextWithSubscription("carePlan");
  const data = await getResidentCarePlan(params.id);

  if (!data) {
    notFound();
  }

  async function archiveAction(formData: FormData) {
    "use server";
    const carePlanId = String(formData.get("carePlanId") || "");
    if (!carePlanId) return;
    await archiveCarePlan(carePlanId);
  }

  return (
    <CarePlanOverview
      resident={data.resident}
      plan={data.plan}
      status={data.displayStatus}
      trend={data.trend}
      timeZone={resolveTimeZone(context.timeZone)}
      canEdit={canWrite(context.role)}
      archiveAction={archiveAction}
    />
  );
}
