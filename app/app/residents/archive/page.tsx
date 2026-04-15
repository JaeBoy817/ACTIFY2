import { redirect } from "next/navigation";

export default function ResidentsArchivePage() {
  redirect("/app/residents?view=archived");
}
