import { redirect } from "next/navigation";

export default function NotesOneToOneRedirectPage() {
  redirect("/app/notes/new?type=1on1");
}
