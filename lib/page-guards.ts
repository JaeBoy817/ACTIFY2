import { redirect } from "next/navigation";

import { requireFacilityContext } from "@/lib/auth";
import { isModuleEnabled, type ModuleKey } from "@/lib/module-access";

export async function requireModulePage(moduleKey: ModuleKey) {
  const context = await requireFacilityContext();
  const enabled = isModuleEnabled(context.facility.moduleFlags, moduleKey);
  if (!enabled) {
    redirect("/app");
  }

  return { ...context, activeSubscription: true };
}

export async function getFacilityContextWithSubscription(moduleKey?: ModuleKey) {
  const context = await requireFacilityContext();
  if (moduleKey && !isModuleEnabled(context.facility.moduleFlags, moduleKey)) {
    redirect("/app");
  }
  return { ...context, activeSubscription: true };
}
