export type AssistantRole = "user" | "assistant";

export type AssistantMode =
  | "auto"
  | "activity_ideas"
  | "calendar_planning"
  | "note_support"
  | "note_rewrite"
  | "resident_support";

export type AssistantConversationMessage = {
  role: AssistantRole;
  content: string;
};

export type ResidentAIContext = {
  residentId: string;
  name: string;
  preferredName: string | null;
  roomNumber: string | null;
  birthday: string | null;
  interests: string[];
  dislikes: string[];
  favoriteActivities: string[];
  favoriteMusic: string[];
  favoriteConversationTopics: string[];
  participationStyle: string | null;
  supportNeeds: string[];
  bestTimeOfDay: string | null;
  whatWorks: string | null;
  whatDoesNotWork: string | null;
};

export type AssistantIntent =
  | "rewrite_progress_note"
  | "rewrite_1to1_note"
  | "rewrite_note"
  | "activity_backup"
  | "activity_group"
  | "activity_1to1"
  | "activity_bed_bound"
  | "activity_dementia_friendly"
  | "calendar_planning"
  | "holiday_planning"
  | "resident_engagement"
  | "low_budget_ideas"
  | "progress_note_help"
  | "one_to_one_note_help"
  | "care_plan_wording"
  | "general_assistant";

export type AssistantApiRequest = {
  message: string;
  conversationHistory?: AssistantConversationMessage[];
  mode?: AssistantMode;
  conversationId?: string | null;
  residentContext?: ResidentAIContext | null;
};

export type AssistantApiSuccessResponse = {
  ok: true;
  message: string;
  meta: {
    source: "mistral-agent" | "local-fallback";
    agentId: string;
    agentVersion: number;
    intent: AssistantIntent;
    conversationId?: string;
    model?: string | null;
  };
};

export type AssistantApiErrorResponse = {
  ok: false;
  error: string;
  code?: string;
};

export type AssistantApiResponse = AssistantApiSuccessResponse | AssistantApiErrorResponse;
