import { redirect, notFound } from "next/navigation";

import { CarePlanWizard } from "@/components/care-plans/CarePlanWizard";
import { createCarePlan, getResidentCarePlan } from "@/app/app/care-plans/_actions/actions";

export default async function ResidentCarePlanNewPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { template?: string };
}) {
  const data = await getResidentCarePlan(params.id);
  if (!data) {
    notFound();
  }

  async function submitCreateAction(formData: FormData) {
    "use server";
    const payloadRaw = String(formData.get("payload") || "{}");
    const payload = JSON.parse(payloadRaw);
    await createCarePlan(params.id, payload);
    redirect(`/app/residents/${params.id}/care-plan`);
  }

  return (
    <CarePlanWizard
      mode="create"
      residentName={data.resident.name}
      residentStatus={data.resident.status}
      templateKey={searchParams?.template ?? null}
      submitAction={submitCreateAction}
    />
  );
}
