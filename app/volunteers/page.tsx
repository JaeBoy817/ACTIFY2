import { redirect } from "next/navigation";

export default function VolunteersRootRedirect() {
  redirect("/app/volunteers");
}
