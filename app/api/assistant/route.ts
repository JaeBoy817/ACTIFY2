import { NextResponse } from "next/server";
import { z } from "zod";

import { asAppAccessErrorResponse, requireCurrentAppUserWithAccess } from "@/lib/access-control";
import { getAssistantResponseFromPrompt } from "@/lib/assistant/getAssistantResponse";
import type { AssistantIntent } from "@/lib/assistant/presetResponses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assistantIntentSchema = z.enum([
  "backupActivityIdeas",
  "groupActivityIdeas",
  "oneToOneVisitIdeas",
  "bedBoundResidentIdeas",
  "dementiaFriendlyIdeas",
  "progressNoteHelp",
  "oneToOneNoteHelp",
  "carePlanWording",
  "calendarPlanningHelp",
  "holidayActivityPlanning",
  "residentEngagementSuggestions",
  "lowBudgetActivityIdeas",
  "fallback"
]);

const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  intent: assistantIntentSchema.optional(),
  excludeResponseId: z.string().trim().min(1).max(100).optional()
});

type AssistantApiSuccess = {
  ok: true;
  message: string;
  intent: AssistantIntent;
  responseId: string;
  engine: "local-preset";
};

type AssistantApiError = {
  ok: false;
  error: string;
  code?: string;
};

export async function POST(request: Request) {
  try {
    await requireCurrentAppUserWithAccess();

    const payload = await request.json().catch(() => null);
    const parsed = assistantRequestSchema.safeParse(payload);

    if (!parsed.success) {
      const response: AssistantApiError = {
        ok: false,
        error: "Please enter a prompt before sending.",
        code: "INVALID_REQUEST"
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = getAssistantResponseFromPrompt({
      prompt: parsed.data.message,
      forceIntent: parsed.data.intent,
      excludeResponseId: parsed.data.excludeResponseId
    });

    const response: AssistantApiSuccess = {
      ok: true,
      message: result.formattedMessage,
      intent: result.intent,
      responseId: result.response.id,
      engine: "local-preset"
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const accessResponse = asAppAccessErrorResponse(error);
    if (accessResponse) return accessResponse;

    console.error("[api/assistant] local preset failure", error);
    const response: AssistantApiError = {
      ok: false,
      error: "We couldn’t generate a response right now."
    };
    return NextResponse.json(response, { status: 500 });
  }
}
