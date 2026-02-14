import { redirect } from "next/navigation";

import { requireFacilityContext } from "@/lib/auth";

export default async function SettingsRolesRedirectPage() {
  const context = await requireFacilityContext();
  if (context.role !== "ADMIN") {
    redirect("/app/settings?tab=facility");
  }
  redirect("/app/settings?tab=roles");
}
