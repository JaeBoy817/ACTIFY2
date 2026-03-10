import { redirect } from "next/navigation";

export default function TemplatesNewRedirectPage() {
  redirect("/app/calendar?section=library");
}
