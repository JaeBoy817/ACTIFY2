import { redirect } from "next/navigation";

export default function NewTemplatePageRedirect() {
  redirect("/app/calendar?section=library");
}
