export type ModuleFlags = {
  mode: "CORE_WORKFLOW" | "FULL_TOOLKIT";
  modules: {
    templates: boolean;
    calendar: boolean;
    notes: boolean;
    reports: boolean;
    goals: boolean;
    analytics: boolean;
    assessments: boolean;
    inventory: boolean;
    prizeCart: boolean;
    residentCouncil: boolean;
    volunteers: boolean;
    carePlan: boolean;
    analyticsHeatmaps: boolean;
    familyEngagementNotes: boolean;
  };
};

export const defaultModuleFlags: ModuleFlags = {
  mode: "FULL_TOOLKIT",
  modules: {
    templates: true,
    calendar: true,
    notes: true,
    reports: true,
    goals: true,
    analytics: true,
    assessments: true,
    inventory: true,
    prizeCart: true,
    residentCouncil: true,
    volunteers: true,
    carePlan: true,
    analyticsHeatmaps: true,
    familyEngagementNotes: true
  }
};

export function asModuleFlags(raw: unknown): ModuleFlags {
  if (!raw || typeof raw !== "object") return defaultModuleFlags;
  const merged = {
    ...defaultModuleFlags,
    ...(raw as Partial<ModuleFlags>),
    modules: {
      ...defaultModuleFlags.modules,
      ...((raw as Partial<ModuleFlags>).modules ?? {})
    }
  };
  return merged;
}
