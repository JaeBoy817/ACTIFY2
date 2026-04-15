import { NextResponse } from "next/server";
import { z } from "zod";

import { asAppAccessErrorResponse, requireCurrentAppUserWithAccess } from "@/lib/access-control";
import { runMistralAssistant, MistralAssistantError } from "@/lib/assistant/mistral";
import type {
  AssistantApiErrorResponse,
  AssistantApiRequest,
  AssistantApiSuccessResponse,
  AssistantConversationMessage
} from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const conversationEntrySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationHistory: z.array(conversationEntrySchema).max(24).optional().default([]),
  mode: z
    .enum(["auto", "activity_ideas", "calendar_planning", "note_support", "note_rewrite", "resident_support"])
    .optional()
    .default("auto"),
  conversationId: z.string().trim().min(1).max(200).optional().nullable()
});

export async function POST(request: Request) {
  try {
    await requireCurrentAppUserWithAccess();

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
      conversationId: parsed.data.conversationId ?? null
    };

    const result = await runMistralAssistant({
      message: requestBody.message,
      conversationHistory: requestBody.conversationHistory ?? [],
      mode: requestBody.mode ?? "auto",
      conversationId: requestBody.conversationId ?? null
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
      error: "We couldn’t generate a response right now. Please try again.",
      code: "UNKNOWN_ERROR"
    };
    return NextResponse.json(response, { status: 500 });
  }
}
