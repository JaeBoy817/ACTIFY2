export type VolunteerDirectoryStatus = "ACTIVE" | "INACTIVE" | "ON_SHIFT";

export type VolunteerSummary = {
  id: string;
  name: string;
  phone: string | null;
  status: VolunteerDirectoryStatus;
  tags: string[];
  availability: string | null;
  requirements: string[];
  lastVisitAt: string | null;
  nextShiftAt: string | null;
  monthlyHours: number;
  pendingOnboardingCount: number;
  expiringChecksCount: number;
};

export type VolunteerShiftStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETE";

export type VolunteerShift = {
  id: string;
  volunteerId: string;
  volunteerName: string;
  volunteerPhone: string | null;
  startAt: string;
  endAt: string | null;
  assignedLocation: string;
  notes: string | null;
  status: VolunteerShiftStatus;
};

export type VolunteerHourApproval = "PENDING" | "APPROVED" | "DENIED";

export type VolunteerHourEntry = {
  id: string;
  volunteerId: string;
  volunteerName: string;
  startAt: string;
  endAt: string | null;
  assignedLocation: string;
  notes: string | null;
  durationHours: number;
  approval: VolunteerHourApproval;
};

export type VolunteerKpis = {
  activeVolunteers: number;
  scheduledNext7Days: number;
  hoursThisMonth: number;
  pendingOnboarding: number;
  expiringChecks30Days: number;
  expiringChecks60Days: number;
};

export type VolunteerHubPayload = {
  kpis: VolunteerKpis;
  volunteers: VolunteerSummary[];
  shifts: VolunteerShift[];
  hours: VolunteerHourEntry[];
  hoursPagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
};

export type VolunteerComplianceItem = {
  label: string;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  status: "OK" | "EXPIRING_60" | "EXPIRING_30" | "EXPIRED";
};

export type VolunteerDetailPayload = {
  volunteer: VolunteerSummary;
  profile: {
    notes: string[];
    onboardingChecklist: Array<{ label: string; done: boolean }>;
  };
  compliance: {
    items: VolunteerComplianceItem[];
  };
  hours: {
    entries: VolunteerHourEntry[];
    totalHours30Days: number;
    totalHoursMonth: number;
  };
  permissions: {
    capabilities: string[];
  };
};
