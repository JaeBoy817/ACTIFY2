import { NextResponse } from "next/server";
import { z } from "zod";

import { asAppAccessErrorResponse, requireCurrentAssistantUserWithAccess } from "@/lib/access-control";
import { getAssistantResponseFromPrompt } from "@/lib/assistant/getAssistantResponse";
import { runMistralAssistant, MistralAssistantError } from "@/lib/assistant/mistral";
import type {
  AssistantApiErrorResponse,
  AssistantApiRequest,
  AssistantApiSuccessResponse,
  AssistantConversationMessage,
  AssistantIntent
} from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ASSISTANT_GENERATION_ERROR = "Actify had trouble generating that response. Please try again.";

const conversationEntrySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

const residentContextSchema = z.object({
  residentId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  preferredName: z.string().trim().max(120).nullable().optional().default(null),
  roomNumber: z.string().trim().max(40).nullable().optional().default(null),
  birthday: z.string().trim().max(64).nullable().optional().default(null),
  interests: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  dislikes: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  favoriteActivities: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  favoriteMusic: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  favoriteConversationTopics: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  participationStyle: z.string().trim().max(220).nullable().optional().default(null),
  supportNeeds: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  bestTimeOfDay: z.string().trim().max(120).nullable().optional().default(null),
  whatWorks: z.string().trim().max(320).nullable().optional().default(null),
  whatDoesNotWork: z.string().trim().max(320).nullable().optional().default(null)
});

const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationHistory: z.array(conversationEntrySchema).max(24).optional().default([]),
  mode: z
    .enum(["auto", "activity_ideas", "calendar_planning", "note_support", "note_rewrite", "resident_support"])
    .optional()
    .default("auto"),
  conversationId: z.string().trim().min(1).max(200).optional().nullable(),
  residentContext: residentContextSchema.nullable().optional().default(null)
});

function shouldUseLocalFallback(error: MistralAssistantError) {
  return [
    "MISTRAL_NOT_CONFIGURED",
    "TIMEOUT",
    "MISTRAL_PROVIDER_ERROR",
    "MISTRAL_EMPTY_OUTPUT",
    "MISSING_CONVERSATION_ID"
  ].includes(error.code);
}

function mapLocalIntentToAssistantIntent(localIntent: string): AssistantIntent {
  if (localIntent === "noteRewordProgress") return "rewrite_progress_note";
  if (localIntent === "noteRewordOneToOne") return "rewrite_1to1_note";
  if (localIntent === "noteRewordNeedsType" || localIntent === "noteRewordNeedsText") return "rewrite_note";
  if (localIntent === "backupActivityIdeas") return "activity_backup";
  if (localIntent === "groupActivityIdeas") return "activity_group";
  if (localIntent === "oneToOneVisitIdeas") return "activity_1to1";
  if (localIntent === "bedBoundResidentIdeas") return "activity_bed_bound";
  if (localIntent === "dementiaFriendlyIdeas") return "activity_dementia_friendly";
  if (localIntent === "calendarPlanningHelp") return "calendar_planning";
  if (localIntent === "holidayActivityPlanning") return "holiday_planning";
  if (localIntent === "residentEngagementSuggestions") return "resident_engagement";
  if (localIntent === "lowBudgetActivityIdeas") return "low_budget_ideas";
  if (localIntent === "progressNoteHelp") return "progress_note_help";
  if (localIntent === "oneToOneNoteHelp") return "one_to_one_note_help";
  if (localIntent === "carePlanWording") return "care_plan_wording";
  return "general_assistant";
}

function buildFallbackResponse(message: string): AssistantApiSuccessResponse {
  const fallback = getAssistantResponseFromPrompt({ prompt: message });
  const agentId = process.env.MISTRAL_AGENT_ID?.trim() || "ag_019d92c5923371f19d586b2c54926fad";
  const rawVersion = process.env.MISTRAL_AGENT_VERSION?.trim();
  const parsedVersion = rawVersion ? Number.parseInt(rawVersion, 10) : 0;

  return {
    ok: true,
    message: fallback.formattedMessage,
    meta: {
      source: "local-fallback",
      agentId,
      agentVersion: Number.isFinite(parsedVersion) ? parsedVersion : 0,
      intent: mapLocalIntentToAssistantIntent(fallback.intent),
      model: null
    }
  };
}

export async function POST(request: Request) {
  let parsedMessageForFallback: string | null = null;

  try {
    await requireCurrentAssistantUserWithAccess();

    const payload = await request.json().catch(() => null);
    const parsed = assistantRequestSchema.safeParse(payload);

    if (!parsed.success) {
      const response: AssistantApiErrorResponse = {
        ok: false,
        error: "Please enter a prompt before sending.",
        code: "INVALID_REQUEST"
      };
      return NextResponse.json(response, { status: 400 });
    }

    const requestBody: AssistantApiRequest = {
      message: parsed.data.message,
      conversationHistory: parsed.data.conversationHistory as AssistantConversationMessage[],
      mode: parsed.data.mode,
      conversationId: parsed.data.conversationId ?? null,
      residentContext: parsed.data.residentContext ?? null
    };
    parsedMessageForFallback = requestBody.message;

    const result = await runMistralAssistant({
      message: requestBody.message,
      conversationHistory: requestBody.conversationHistory ?? [],
      mode: requestBody.mode ?? "auto",
      conversationId: requestBody.conversationId ?? null,
      residentContext: requestBody.residentContext ?? null
    });

    const response: AssistantApiSuccessResponse = {
      ok: true,
      message: result.message,
      meta: {
        source: "mistral-agent",
        agentId: result.agentId,
        agentVersion: result.agentVersion,
        intent: result.intent,
        conversationId: result.conversationId,
        model: result.model
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const accessResponse = asAppAccessErrorResponse(error);
    if (accessResponse) return accessResponse;

    if (error instanceof MistralAssistantError) {
      if (shouldUseLocalFallback(error)) {
        console.warn("[api/assistant] using local fallback after mistral failure", {
          code: error.code
        });
        if (parsedMessageForFallback) {
          const fallbackResponse = buildFallbackResponse(parsedMessageForFallback);
          return NextResponse.json(fallbackResponse, { status: 200 });
        }
      }

      const response: AssistantApiErrorResponse = {
        ok: false,
        error: error.message,
        code: error.code
      };
      return NextResponse.json(response, { status: error.status });
    }

    console.error("[api/assistant] mistral failure", error);
    const response: AssistantApiErrorResponse = {
      ok: false,
      error: ASSISTANT_GENERATION_ERROR,
      code: "UNKNOWN_ERROR"
    };
    return NextResponse.json(response, { status: 500 });
  }
}
