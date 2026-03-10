import { redirect } from "next/navigation";

export default function EditTemplatePageRedirect() {
  redirect("/app/calendar?section=library");
}
