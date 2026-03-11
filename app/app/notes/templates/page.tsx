import { redirect } from "next/navigation";

export default function LegacyNoteTemplatesRedirectPage() {
  redirect("/app/documentation/progress-notes");
}
