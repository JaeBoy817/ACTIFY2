import type { AssistantIntent, AssistantMode } from "@/lib/assistant/types";
import type { ParsedRewriteRequest } from "@/lib/assistant/parseRewriteRequest";
import { ACTIFY_ASSISTANT_SYSTEM_PROMPT } from "@/lib/actifyAssistantPrompt";

type BuildActifySystemPromptOptions = {
  mode: AssistantMode;
  intent: AssistantIntent;
  rewriteRequest: ParsedRewriteRequest;
};

function getModeInstruction(mode: AssistantMode) {
  if (mode === "note_rewrite") {
    return "Focus on preserving user details exactly while improving wording and structure.";
  }
  if (mode === "note_support") {
    return "Prioritize documentation support outputs that are ready to copy into PCC workflows.";
  }
  if (mode === "calendar_planning") {
    return "Prioritize practical calendar planning blocks, themed weeks, and backup coverage ideas.";
  }
  if (mode === "activity_ideas") {
    return "Prioritize actionable activity ideas with short setup notes and adaptations.";
  }
  if (mode === "resident_support") {
    return "Prioritize personalized engagement suggestions based on interests, mood, and limitations.";
  }
  return "Choose the most practical output format for the user request.";
}

function getIntentInstruction(intent: AssistantIntent) {
  if (intent === "rewrite_progress_note") {
    return "Current intent: rewrite a Progress Note while preserving activity, participation, cueing, mood, and response details.";
  }
  if (intent === "rewrite_1to1_note") {
    return "Current intent: rewrite a 1:1 Note while preserving location, interaction details, mood, and follow-up preference details.";
  }
  if (intent === "rewrite_note") {
    return "Current intent: rewrite documentation text without dropping specific user-provided details.";
  }
  if (intent === "calendar_planning") {
    return "Current intent: produce a concise, practical planning outline for upcoming days.";
  }
  if (intent === "activity_bed_bound") {
    return "Current intent: provide bed-bound-safe 1:1 ideas with realistic setup.";
  }
  return "";
}

function getRewriteStyleInstruction(rewriteRequest: ParsedRewriteRequest) {
  if (rewriteRequest.intent !== "rewriteNote") return "";
  if (rewriteRequest.style === "shorter") {
    return "Rewrite style requested: shorter PCC-ready version.";
  }
  if (rewriteRequest.style === "detailed") {
    return "Rewrite style requested: more detailed PCC-ready version while staying factual and concise.";
  }
  return "Rewrite style requested: professional balanced PCC-ready version.";
}

export function buildActifySystemPrompt(options: BuildActifySystemPromptOptions) {
  const sections = [
    ACTIFY_ASSISTANT_SYSTEM_PROMPT,
    getModeInstruction(options.mode),
    getIntentInstruction(options.intent),
    getRewriteStyleInstruction(options.rewriteRequest)
  ].filter(Boolean);

  return sections.join("\n\n");
}
