export type ResidentSnapshot = {
  id: string;
  name: string;
  room: string;
  interests: string[];
  dislikes: string[];
  favoriteTopics: string[];
  participationStyle: string;
  limitations: string[];
  suggestedMatches: string[];
};

export type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  bullets?: string[];
  tags?: string[];
};
