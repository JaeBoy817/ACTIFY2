import type { ResidentListRow } from "@/lib/residents/types";

export const SNAPSHOT_VIEW_OPTIONS = ["ACTIVE", "ARCHIVED"] as const;
export type SnapshotViewKey = (typeof SNAPSHOT_VIEW_OPTIONS)[number];

export const SNAPSHOT_FILTER_OPTIONS = [
  { key: "ACTIVE", label: "Active" },
  { key: "NEW_ADMISSIONS", label: "New Admissions" },
  { key: "DISCHARGED_ARCHIVED", label: "Discharged / Archived" },
  { key: "BED_BOUND", label: "Bed-Bound" },
  { key: "PREFERS_1TO1", label: "Prefers 1:1" },
  { key: "GROUP_FRIENDLY", label: "Group-Friendly" },
  { key: "NEEDS_ENCOURAGEMENT", label: "Needs Encouragement" },
  { key: "QUIET_LOW_STIM", label: "Quiet / Low-Stimulation" },
  { key: "HIGH_PARTICIPATION", label: "High Participation" },
  { key: "LOW_PARTICIPATION", label: "Low Participation" },
  { key: "MORNING", label: "Morning Preference" },
  { key: "AFTERNOON", label: "Afternoon Preference" },
  { key: "SOCIAL", label: "Social" },
  { key: "FAMILY_ORIENTED", label: "Family-Oriented" },
  { key: "MUSIC", label: "Music Lover" },
  { key: "GAMES", label: "Games / Puzzles" },
  { key: "CRAFTS", label: "Crafts" },
  { key: "SPORTS", label: "Sports" }
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
  dischargeDate: string | null;
  dischargeReason: string | null;
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
