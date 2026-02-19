export type AnalyticsRangePreset = "today" | "7d" | "30d" | "custom";

export type AnalyticsFilters = {
  range: AnalyticsRangePreset;
  from: string | null;
  to: string | null;
  unitId: string | null;
  residentId: string | null;
  category: string | null;
  staffId: string | null;
};

export type AnalyticsDateRange = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  label: string;
  totalDays: number;
};

export type AnalyticsFilterOptions = {
  units: Array<{ id: string; label: string }>;
  residents: Array<{ id: string; label: string; room: string }>;
  categories: Array<{ key: string; label: string }>;
  staffAndVolunteers: Array<{ id: string; label: string; type: "staff" | "volunteer" }>;
};

export type AnalyticsKpi = {
  key: string;
  label: string;
  value: string;
  detail: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  accent: string;
  icon:
    | "users"
    | "user-check"
    | "percent"
    | "pulse"
    | "calendar"
    | "barriers"
    | "notes"
    | "care-plan"
    | "programs"
    | "volunteer";
};

export type AnalyticsAttendanceSnapshot = {
  counts: {
    present: number;
    active: number;
    leading: number;
    refused: number;
    noShow: number;
    total: number;
  };
  topAttendees: Array<{
    residentId: string;
    residentName: string;
    room: string;
    attendedCount: number;
    supportiveCount: number;
  }>;
  topBarriers: Array<{
    barrier: string;
    count: number;
    previousCount: number;
    delta: number;
  }>;
  engagementTrend: Array<{
    label: string;
    score: number;
    entries: number;
  }>;
  dailyParticipation: Array<{
    dayKey: string;
    label: string;
    uniqueResidents: number;
    totalEntries: number;
    participationPercent: number;
  }>;
  totalAttendedResidents: number;
  residentsParticipated: number;
  participationPercent: number;
  averageDailyPercent: number;
  previousParticipationPercent: number;
  monthDeltaPercent: number | null;
};

export type AnalyticsEngagementSnapshot = {
  averageEngagementScore: number;
  topBarriers: AnalyticsAttendanceSnapshot["topBarriers"];
  weeklyScores: AnalyticsAttendanceSnapshot["engagementTrend"];
  categoryMix: Array<{ category: string; count: number }>;
  insightChips: Array<{ label: string; tone: "violet" | "sky" | "emerald" | "amber" | "rose" }>;
};

export type AnalyticsOneOnOneSnapshot = {
  totalNotes: number;
  previousTotalNotes: number;
  notesWithFollowUp: number;
  topResidents: Array<{
    residentId: string;
    residentName: string;
    room: string;
    notesCount: number;
    lastNoteAt: string;
  }>;
  moodBreakdown: Array<{ label: string; count: number }>;
  responseBreakdown: Array<{ label: string; count: number }>;
  recentNotes: Array<{
    id: string;
    residentName: string;
    room: string;
    createdAt: string;
    response: string;
    mood: string;
    narrativePreview: string;
  }>;
};

export type AnalyticsCarePlanSnapshot = {
  counts: {
    noPlan: number;
    active: number;
    dueSoon: number;
    overdue: number;
    archived: number;
  };
  upcomingReviews: Array<{
    carePlanId: string;
    residentId: string;
    residentName: string;
    room: string;
    nextReviewDate: string;
    status: "DUE_SOON" | "OVERDUE" | "ACTIVE";
  }>;
  reviewResults: Array<{ result: string; count: number }>;
  focusAreas: Array<{ label: string; count: number }>;
};

export type AnalyticsProgramsSnapshot = {
  topPrograms: Array<{
    title: string;
    category: string;
    attendedCount: number;
    location: string;
  }>;
  categoryMix: Array<{ category: string; count: number }>;
  locationMix: Array<{ location: string; count: number }>;
};

export type AnalyticsStaffVolunteersSnapshot = {
  staffActivity: Array<{ id: string; label: string; notesCount: number }>;
  volunteerActivity: Array<{ id: string; label: string; visits: number; hours: number }>;
  volunteerTotals: {
    visits: number;
    hours: number;
  };
};

export type AnalyticsExportsSnapshot = {
  monthlyReportPath: string;
  attendanceCsvPath: string;
};

export type AnalyticsSnapshot = {
  range: AnalyticsDateRange;
  options: AnalyticsFilterOptions;
  kpis: AnalyticsKpi[];
  attendance: AnalyticsAttendanceSnapshot;
  engagement: AnalyticsEngagementSnapshot;
  oneOnOne: AnalyticsOneOnOneSnapshot;
  carePlan: AnalyticsCarePlanSnapshot;
  programs: AnalyticsProgramsSnapshot;
  staffVolunteers: AnalyticsStaffVolunteersSnapshot;
  exports: AnalyticsExportsSnapshot;
};
