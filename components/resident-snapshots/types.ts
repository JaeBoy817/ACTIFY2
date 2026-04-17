import type { ResidentListRow } from "@/lib/residents/types";

export const SNAPSHOT_VIEW_OPTIONS = ["ACTIVE", "ARCHIVED"] as const;
export type SnapshotViewKey = (typeof SNAPSHOT_VIEW_OPTIONS)[number];

export const SNAPSHOT_FILTER_OPTIONS = [
  { key: "ACTIVE", label: "Active" },
  { key: "ARCHIVED", label: "Archived" },
  { key: "NEW_ADMISSIONS", label: "New Admissions" },
  { key: "DISCHARGED_ARCHIVED", label: "Discharged / Archived" },
  { key: "NEEDS_FOLLOW_UP", label: "Needs Follow-Up" },
  { key: "BED_BOUND", label: "Bed-Bound" },
  { key: "PREFERS_1TO1", label: "Prefers 1:1" },
  { key: "GROUP_FRIENDLY", label: "Group-Friendly" },
  { key: "NEEDS_ENCOURAGEMENT", label: "Needs Encouragement" },
  { key: "QUIET_LOW_STIM", label: "Quiet / Low-Stimulation" },
  { key: "HIGH_PARTICIPATION", label: "High Participation" },
  { key: "LOW_PARTICIPATION", label: "Low Participation" },
  { key: "SMALL_GROUP", label: "Small Group Preference" },
  { key: "MORNING", label: "Morning Preference" },
  { key: "AFTERNOON", label: "Afternoon Preference" },
  { key: "LOW_ENERGY", label: "Low Energy" },
  { key: "SENSORY_FRIENDLY", label: "Sensory-Friendly" },
  { key: "SOCIAL", label: "Social" },
  { key: "QUIET_RESERVED", label: "Quiet / Reserved" },
  { key: "FAMILY_ORIENTED", label: "Family-Oriented" },
  { key: "MUSIC", label: "Music Lover" },
  { key: "BINGO", label: "Bingo" },
  { key: "GAMES", label: "Games / Puzzles" },
  { key: "CRAFTS", label: "Crafts" },
  { key: "SPORTS", label: "Sports" },
  { key: "BIBLE_STUDY", label: "Bible Study" },
  { key: "NAIL_CARE", label: "Nail Care" },
  { key: "MOVIES_TV", label: "Movies / TV" },
  { key: "WORD_SEARCHES", label: "Word Searches" },
  { key: "PUZZLES", label: "Puzzles" },
  { key: "ATTENDANCE_BELOW_GOAL", label: "Attendance Below Goal" },
  { key: "ATTENDANCE_IMPROVING", label: "Attendance Improving" },
  { key: "MISSED_RECENT_GROUP", label: "Missed Recent Group Activities" },
  { key: "ONE_TO_ONE_PRIORITY", label: "1:1 Priority" },
  { key: "FREQUENT_REFUSAL", label: "Frequent Refusal" },
  { key: "INCONSISTENT_PARTICIPATION", label: "Inconsistent Participation" },
  { key: "PARTICIPATION_BELOW_25", label: "Participation Below 25%" },
  { key: "PARTICIPATION_BELOW_50", label: "Participation Below 50%" },
  { key: "MOSTLY_1TO1_PARTICIPATION", label: "Mostly 1:1 Participation" },
  { key: "NO_ATTENDANCE_THIS_MONTH", label: "No Attendance Logged This Month" }
] as const;

export type SnapshotFilterKey = (typeof SNAPSHOT_FILTER_OPTIONS)[number]["key"];

export type ArchiveReason = "Returned Home" | "Transfer" | "Hospital" | "Other";

export type ResidentSupportNeed =
  | "Bed-Bound"
  | "Wheelchair Use"
  | "Hearing Support"
  | "Vision Support"
  | "Prefers Quiet Setting"
  | "Needs Cueing"
  | "Benefits from Sensory Items"
  | "Short Attention Span"
  | "Low Energy"
  | "Enjoys Social Settings"
  | "Better in Small Groups";

export type ResidentSnapshot = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  preferredName: string | null;
  room: string;
  status: ResidentListRow["status"];
  admissionDate: string | null;
  birthDate: string | null;
  tags: string[];
  interests: string[];
  dislikes: string[];
  favoriteActivities: string[];
  favoriteTopics: string[];
  favoriteMusic: string[];
  favoriteMedia: string[];
  independentActivities: string[];
  participationStyle: string;
  bestTimeOfDay: string;
  groupParticipationNotes: string;
  oneToOneStyle: string;
  commonRefusals: string;
  whatWorks: string;
  whatDoesNotWork: string;
  supportNeeds: ResidentSupportNeed[];
  quickSummary: string;
  sourceNotes: string | null;
  sourcePreferences: string | null;
  sourceSafetyNotes: string | null;
  lastEngagementDate: string | null;
  lastActivity: string | null;
  lastOneToOne: string | null;
  lastNoteDate: string | null;
  lastAiSuggestion: string | null;
  lastSuccessfulActivityType: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
  followUpPriority: "LOW" | "MEDIUM" | "HIGH" | null;
  dischargeDate: string | null;
  dischargeReason: string | null;
  totalActivitiesOffered?: number;
  totalActivitiesAttended?: number;
  participationPercentage?: number | null;
  attendanceCount?: number;
  oneToOneCount?: number;
  refusalCount?: number;
  missedActivitiesCount?: number;
  totalTrackedOpportunitiesThisMonth?: number;
  attendedCountThisMonth?: number;
  oneToOneCompletedCountThisMonth?: number;
  refusalCountThisMonth?: number;
  missedCountThisMonth?: number;
  noAttendanceLoggedThisMonth?: boolean;
  mostlyOneToOneParticipation?: boolean;
  lastAttendanceDate?: string | null;
  last30DayParticipation?: number | null;
  last90DayParticipation?: number | null;
  yearToDateParticipation?: number | null;
  attendanceByActivityType?: Array<{ label: string; count: number }>;
  lastParticipationTrend?: "up" | "flat" | "down";
};

export type ResidentSnapshotFormValue = {
  fullName: string;
  preferredName: string;
  room: string;
  admissionDate: string;
  status: "ACTIVE" | "PENDING" | "DISCHARGED";
  birthDate: string;
  interests: string;
  dislikes: string;
  favoriteActivities: string;
  favoriteTopics: string;
  favoriteMusic: string;
  favoriteMedia: string;
  independentActivities: string;
  participationStyle: string;
  bestTimeOfDay: string;
  groupParticipationNotes: string;
  oneToOneStyle: string;
  commonRefusals: string;
  whatWorks: string;
  whatDoesNotWork: string;
  engagementNotes: string;
  conversationStarters: string;
  thingsToAvoid: string;
  supportNeeds: ResidentSupportNeed[];
  quickTags: string;
};

export type ResidentDraftPayload = {
  firstName: string;
  lastName: string;
  preferredName: string | null;
  room: string;
  admissionDate: string | null;
  birthDate: string | null;
  status: ResidentListRow["status"];
  preferences: string | null;
  notes: string | null;
  safetyNotes: string | null;
  bestTimesOfDay: string | null;
  tags: string[];
};

export type SnapshotIntentAction = {
  id: string;
  label: string;
  prompt: string;
  description: string;
};
