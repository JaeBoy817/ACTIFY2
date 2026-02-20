export type ResidentCouncilView = "meetings" | "actions" | "topics" | "reports";

export type ResidentCouncilSection = "OLD" | "NEW";

export type ResidentCouncilMeetingStatus = "OPEN" | "CLOSED";

export type ResidentCouncilTopicCategory =
  | "Activities"
  | "Nursing"
  | "Therapy"
  | "Dietary"
  | "Housekeeping"
  | "Laundry"
  | "Maintenance"
  | "Social Services"
  | "Administration"
  | "Other";

export type ResidentCouncilDepartmentUpdate = {
  label: string;
  notes: string;
};

export type ResidentCouncilAttendanceEntry = {
  name: string;
  status: "PRESENT";
  notes?: string;
};

export type ResidentCouncilTopicEntry = {
  id: string;
  meetingId: string;
  meetingHeldAt: string;
  section: ResidentCouncilSection;
  category: ResidentCouncilTopicCategory;
  text: string;
  tags: string[];
  createdAt: string;
};

export type ResidentCouncilActionItemDTO = {
  id: string;
  meetingId: string;
  meetingHeldAt: string;
  section: ResidentCouncilSection;
  category: string;
  concern: string;
  followUp: string | null;
  owner: string | null;
  dueDate: string | null;
  status: "RESOLVED" | "UNRESOLVED";
  updatedAt: string;
};

export type ResidentCouncilParsedMeetingSheet = {
  summary: string | null;
  residentsInAttendance: string[];
  departmentUpdates: ResidentCouncilDepartmentUpdate[];
  oldBusiness: string | null;
  newBusiness: string | null;
  additionalNotes: string | null;
};

export type ResidentCouncilMeetingDTO = {
  id: string;
  heldAt: string;
  attendanceCount: number;
  notes: string | null;
  parsed: ResidentCouncilParsedMeetingSheet | null;
  status: ResidentCouncilMeetingStatus;
  unresolvedCount: number;
  actionItems: ResidentCouncilActionItemDTO[];
  topics: ResidentCouncilTopicEntry[];
};

export type ResidentCouncilTopicTemplate = {
  id: string;
  title: string;
  section: ResidentCouncilSection;
  category: ResidentCouncilTopicCategory;
  prompt: string;
};

export type ResidentCouncilSnapshot = {
  generatedAt: string;
  meetings: ResidentCouncilMeetingDTO[];
  topicEntries: ResidentCouncilTopicEntry[];
  actionItems: ResidentCouncilActionItemDTO[];
  templates: ResidentCouncilTopicTemplate[];
  activeResidents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    room: string;
    status: string;
  }>;
  stats: {
    meetingsCount: number;
    openItemsCount: number;
    resolvedItemsCount: number;
    averageAttendance: number;
    topicsCount: number;
  };
};
