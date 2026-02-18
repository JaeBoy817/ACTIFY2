import { notFound, redirect } from "next/navigation";

import { CarePlanWizard } from "@/components/care-plans/CarePlanWizard";
import { getResidentCarePlan, updateCarePlan } from "@/app/app/care-plans/_actions/actions";

export default async function ResidentCarePlanEditPage({
  params
}: {
  params: { id: string };
}) {
  const data = await getResidentCarePlan(params.id);
  if (!data) {
    notFound();
  }
  if (!data.plan) {
    redirect(`/app/residents/${params.id}/care-plan/new`);
  }
  const planId = data.plan.id;

  async function submitUpdateAction(formData: FormData) {
    "use server";
    const payloadRaw = String(formData.get("payload") || "{}");
    const payload = JSON.parse(payloadRaw);
    await updateCarePlan(planId, payload);
    redirect(`/app/residents/${params.id}/care-plan`);
  }

  return (
    <CarePlanWizard
      mode="edit"
      residentName={data.resident.name}
      residentStatus={data.resident.status}
      existingPlan={{
        focusAreasList: data.plan.focusAreasList,
        goals: data.plan.goals.map((goal) => ({
          id: goal.id,
          templateKey: goal.templateKey ?? null,
          customText: goal.customText ?? null,
          baseline: goal.baseline,
          target: goal.target,
          timeframeDays: goal.timeframeDays
        })),
        interventions: data.plan.interventions.map((intervention) => ({
          id: intervention.id,
          title: intervention.title,
          type: intervention.type,
          bedBoundFriendly: intervention.bedBoundFriendly,
          dementiaFriendly: intervention.dementiaFriendly,
          lowVisionFriendly: intervention.lowVisionFriendly,
          hardOfHearingFriendly: intervention.hardOfHearingFriendly
        })),
        frequency: data.plan.frequency,
        frequencyCustom: data.plan.frequencyCustom,
        nextReviewDate: data.plan.nextReviewDate.toISOString().slice(0, 10),
        barriersList: data.plan.barriersList,
        supportsList: data.plan.supportsList,
        preferencesText: data.plan.preferencesText,
        safetyNotes: data.plan.safetyNotes,
        status: data.plan.status
      }}
      submitAction={submitUpdateAction}
    />
  );
}
