import { redirect } from "next/navigation";

export default function TemplatesPageRedirect() {
  redirect("/app/calendar?section=library");
}
