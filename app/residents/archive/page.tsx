import { redirect } from "next/navigation";

export default function ResidentsArchiveRedirectPage() {
  redirect("/residents?view=archived");
}
