import { redirect } from "next/navigation";

export default function LegacyCarePlanPrintRedirect({
  params
}: {
  params: { id: string };
}) {
  redirect(`/app/residents/${params.id}/care-plan`);
}
