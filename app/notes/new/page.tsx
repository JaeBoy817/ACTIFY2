import { redirect } from "next/navigation";

export default function NotesNewRedirectPage() {
  redirect("/app/documentation/progress-notes/new");
}
