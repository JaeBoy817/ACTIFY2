import { redirect } from "next/navigation";

export default function OneToOneNotesRedirectPage({
  searchParams
}: {
  searchParams?: { residentId?: string };
}) {
  const residentId = searchParams?.residentId?.trim();
  if (residentId) {
    redirect(`/app/notes/new?type=1on1&residentId=${encodeURIComponent(residentId)}`);
  }
  redirect("/app/notes/new?type=1on1");
}
