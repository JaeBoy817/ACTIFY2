import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCurrentAppUserWithAccess, asAppAccessErrorResponse } from "@/lib/access-control";
import {
  generateActifyAssistantReply,
  OpenRouterRequestError
} from "@/lib/ai/openrouter";
import type { ActifyAssistantMode } from "@/lib/ai/buildActifySystemPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assistantModeSchema = z.enum([
  "general",
  "ideas",
  "note_support",
  "calendar_planning",
  "resident_support"
]);

const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationHistory: z.array(conversationMessageSchema).max(30).optional().default([]),
  mode: assistantModeSchema.optional().default("general")
});

type AssistantApiSuccess = {
  ok: true;
  message: string;
  model: string;
  providerModel: string | null;
};

type AssistantApiError = {
  ok: false;
  error: string;
  code?: string;
};

function truncateHistory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxItems = 12
) {
  if (messages.length <= maxItems) return messages;
  return messages.slice(messages.length - maxItems);
}

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

    const mode = parsed.data.mode as ActifyAssistantMode;
    const history = truncateHistory(parsed.data.conversationHistory);

    const result = await generateActifyAssistantReply({
      mode,
      history,
      userMessage: parsed.data.message
    });

    const response: AssistantApiSuccess = {
      ok: true,
      message: result.message,
      model: result.model,
      providerModel: result.providerModel
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const accessResponse = asAppAccessErrorResponse(error);
    if (accessResponse) return accessResponse;

    if (error instanceof OpenRouterRequestError) {
      const response: AssistantApiError = {
        ok: false,
        error: error.message || "We couldn’t generate a response right now.",
        code: error.code
      };
      return NextResponse.json(response, { status: error.status });
    }

    console.error("[api/assistant] fatal", error);
    const response: AssistantApiError = {
      ok: false,
      error: "We couldn’t generate a response right now."
    };
    return NextResponse.json(response, { status: 500 });
  }
}
