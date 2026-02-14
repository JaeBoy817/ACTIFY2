import { redirect } from "next/navigation";

export default function SettingsProfileRedirectPage() {
  redirect("/app/settings?tab=personal");
}
