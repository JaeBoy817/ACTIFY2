import type { AssistantIntent } from "@/lib/assistant/presetResponses";

type IntentRule = {
  intent: AssistantIntent;
  phrases: string[];
  keywords: string[];
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: "oneToOneNoteHelp",
    phrases: ["1:1 note", "one to one note", "visit note", "room visit note"],
    keywords: ["1:1", "note", "visit", "documentation"]
  },
  {
    intent: "progressNoteHelp",
    phrases: ["progress note", "write a note", "documentation note"],
    keywords: ["progress", "note", "documentation", "charting"]
  },
  {
    intent: "carePlanWording",
    phrases: ["care plan", "careplan", "goal and intervention", "intervention wording"],
    keywords: ["care", "plan", "goal", "intervention"]
  },
  {
    intent: "bedBoundResidentIdeas",
    phrases: ["bed-bound", "bed bound", "bedside", "in-room resident"],
    keywords: ["bed", "bound", "bedside", "room", "visit"]
  },
  {
    intent: "dementiaFriendlyIdeas",
    phrases: ["dementia friendly", "memory care", "cognitive support ideas"],
    keywords: ["dementia", "memory", "cognitive", "redirection"]
  },
  {
    intent: "calendarPlanningHelp",
    phrases: ["plan next week", "plan my week", "monthly calendar", "theme week", "fill empty days"],
    keywords: ["calendar", "week", "month", "schedule", "planning", "theme"]
  },
  {
    intent: "holidayActivityPlanning",
    phrases: ["holiday plan", "holiday activity", "seasonal plan", "christmas", "easter", "thanksgiving"],
    keywords: ["holiday", "seasonal", "christmas", "easter", "thanksgiving", "valentine"]
  },
  {
    intent: "backupActivityIdeas",
    phrases: ["backup activity", "last minute activity", "quick backup", "activity backup plan"],
    keywords: ["backup", "last-minute", "quick", "fallback"]
  },
  {
    intent: "groupActivityIdeas",
    phrases: ["group activity", "group ideas", "small group"],
    keywords: ["group", "circle", "social", "bingo", "trivia"]
  },
  {
    intent: "oneToOneVisitIdeas",
    phrases: ["1:1 idea", "one to one idea", "room visit idea", "individual visit"],
    keywords: ["1:1", "one-to-one", "visit", "individual"]
  },
  {
    intent: "residentEngagementSuggestions",
    phrases: ["resident engagement", "engagement suggestions", "resident preferences"],
    keywords: ["engagement", "preferences", "dislikes", "interests", "participation"]
  },
  {
    intent: "lowBudgetActivityIdeas",
    phrases: ["low budget", "no budget", "cheap activity", "free activity ideas"],
    keywords: ["budget", "low-cost", "cheap", "free", "supplies"]
  }
];

function normalizePrompt(prompt: string) {
  return prompt.toLowerCase().replace(/[^a-z0-9:\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreRule(normalizedPrompt: string, rule: IntentRule) {
  let score = 0;

  for (const phrase of rule.phrases) {
    if (normalizedPrompt.includes(phrase)) {
      score += 4;
    }
  }

  const tokens = new Set(normalizedPrompt.split(" ").filter(Boolean));
  for (const keyword of rule.keywords) {
    if (tokens.has(keyword) || normalizedPrompt.includes(keyword)) {
      score += 1;
    }
  }

  return score;
}

export function matchPromptToIntent(prompt: string): AssistantIntent {
  const normalizedPrompt = normalizePrompt(prompt);
  if (!normalizedPrompt) return "fallback";

  let bestIntent: AssistantIntent = "fallback";
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    const ruleScore = scoreRule(normalizedPrompt, rule);
    if (ruleScore > bestScore) {
      bestScore = ruleScore;
      bestIntent = rule.intent;
    }
  }

  return bestScore > 0 ? bestIntent : "fallback";
}

