import { redirect } from "next/navigation";

export default function NotesRedirectPage() {
  redirect("/app/notes");
}
