import { redirect } from "next/navigation";

export default function TemplatesRedirectPage() {
  redirect("/app/calendar?section=library");
}
