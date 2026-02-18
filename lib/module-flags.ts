export type ModuleFlags = {
  mode: "CORE_WORKFLOW" | "FULL_TOOLKIT";
  modules: {
    attendanceTracking: boolean;
    oneToOneNotes: boolean;
    groupNotes: boolean;
    carePlanBuilder: boolean;
    activityTemplatesLibrary: boolean;
    outingsTransportation: boolean;
    prizeCartIncentives: boolean;
    inventorySupplyTracking: boolean;
    therapyCollaboration: boolean;
    photoAttachments: boolean;
    documentESignature: boolean;

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
  widgets: {
    oneToOneDueList: boolean;
    birthdays: boolean;
    newAdmitsDischarges: boolean;
    monthlyParticipationSnapshot: boolean;
  };
};

export const defaultModuleFlags: ModuleFlags = {
  mode: "FULL_TOOLKIT",
  modules: {
    attendanceTracking: true,
    oneToOneNotes: true,
    groupNotes: true,
    carePlanBuilder: true,
    activityTemplatesLibrary: true,
    outingsTransportation: false,
    prizeCartIncentives: true,
    inventorySupplyTracking: true,
    therapyCollaboration: false,
    photoAttachments: true,
    documentESignature: false,

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
  },
  widgets: {
    oneToOneDueList: true,
    birthdays: true,
    newAdmitsDischarges: true,
    monthlyParticipationSnapshot: true
  }
};

export function asModuleFlags(raw: unknown): ModuleFlags {
  if (!raw || typeof raw !== "object") return defaultModuleFlags;
  const candidate = raw as Partial<ModuleFlags> & { modules?: Record<string, unknown>; widgets?: Record<string, unknown> };

  const merged: ModuleFlags = {
    ...defaultModuleFlags,
    ...candidate,
    modules: {
      ...defaultModuleFlags.modules,
      ...(candidate.modules ?? {})
    },
    widgets: {
      ...defaultModuleFlags.widgets,
      ...(candidate.widgets ?? {})
    }
  };

  // Keep compatibility with existing guards/navigation keys.
  merged.modules.templates = merged.modules.templates && merged.modules.activityTemplatesLibrary;
  merged.modules.notes = merged.modules.notes && (merged.modules.oneToOneNotes || merged.modules.groupNotes);
  merged.modules.calendar = merged.modules.calendar && merged.modules.attendanceTracking;
  merged.modules.carePlan = merged.modules.carePlan && merged.modules.carePlanBuilder;
  merged.modules.prizeCart = merged.modules.prizeCart && merged.modules.prizeCartIncentives;
  merged.modules.inventory = merged.modules.inventory && merged.modules.inventorySupplyTracking;

  return merged;
}
