import { redirect } from "next/navigation";

export default function OneToOneNotesRedirectPage({
  searchParams
}: {
  searchParams?: { residentId?: string };
}) {
  const residentId = searchParams?.residentId?.trim();
  if (residentId) {
    redirect(`/app/documentation/one-to-one/new?residentId=${encodeURIComponent(residentId)}`);
  }
  redirect("/app/documentation/one-to-one");
}
