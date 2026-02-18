import { notFound, redirect } from "next/navigation";

import { ReviewForm } from "@/components/care-plans/ReviewForm";
import { createCarePlanReview, getResidentCarePlan } from "@/app/app/care-plans/_actions/actions";

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function ResidentCarePlanReviewNewPage({
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

  const defaultNextReview = data.plan.nextReviewDate > new Date()
    ? data.plan.nextReviewDate
    : addDays(new Date(), 30);

  async function submitReviewAction(formData: FormData) {
    "use server";
    const payloadRaw = String(formData.get("payload") || "{}");
    const payload = JSON.parse(payloadRaw);
    await createCarePlanReview(planId, payload);
    redirect(`/app/residents/${params.id}/care-plan`);
  }

  return (
    <div>
      <ReviewForm
        residentName={data.resident.name}
        defaultNextReviewDate={defaultNextReview.toISOString().slice(0, 10)}
        submitAction={submitReviewAction}
      />
    </div>
  );
}
