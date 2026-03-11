import { redirect } from "next/navigation";

export default function LegacyNotesPageRedirect({
  searchParams
}: {
  searchParams?: { type?: string };
}) {
  if ((searchParams?.type ?? "").toLowerCase() === "1on1") {
    redirect("/app/documentation/one-to-one");
  }
  redirect("/app/documentation");
}
