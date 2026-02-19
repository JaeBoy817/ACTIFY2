export type NoteBuilderType = "general" | "1on1";

export type NoteBuilderValues = {
  noteType: NoteBuilderType;
  title: string;
  occurredAt: string;
  residentId: string;
  linkedResidentIds: string[];
  location: string;
  setting: string;
  activityLabel: string;
  narrative: string;
  participationLevel: "none" | "low" | "moderate" | "high";
  responseType: "positive" | "neutral" | "resistant";
  mood: "bright" | "calm" | "flat" | "anxious" | "agitated" | "other";
  cues: "none" | "verbal" | "visual" | "hand_on_hand" | "physical_assist";
  interventions: string[];
  followUpNeeded: boolean;
  followUpNotes: string;
  tags: string[];
  communicationMethod: string;
  mobilityAccess: string;
  goalLink: string;
  staffPresent: string;
};

export type ParsedProgressNote = {
  title: string;
  location: string;
  setting: string;
  activityLabel: string;
  narrativeBody: string;
  tags: string[];
  interventions: string[];
  followUpNeeded: boolean;
  followUpNotes: string;
  linkedResidentNames: string[];
  communicationMethod: string;
  mobilityAccess: string;
  goalLink: string;
  staffPresent: string;
};

export type NotesListRow = {
  id: string;
  createdAt: string;
  noteType: NoteBuilderType;
  residentId: string;
  residentName: string;
  residentRoom: string;
  createdByName: string;
  title: string;
  tags: string[];
  status: "Signed" | "Draft";
  narrativeBody: string;
};

export type NoteTemplateLite = {
  id: string;
  title: string;
  category?: string;
  tags: string[];
  quickPhrases: string[];
  narrativeStarter: string;
};
