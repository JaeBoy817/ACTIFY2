import { NextResponse } from "next/server";
import { z } from "zod";

import { asAppAccessErrorResponse, requireCurrentAppUserWithAccess } from "@/lib/access-control";
import { getAssistantResponseFromPrompt } from "@/lib/assistant/getAssistantResponse";
import {
  runMistralAssistantStream,
  MistralAssistantError
} from "@/lib/assistant/mistral";
import type {
  AssistantApiErrorResponse,
  AssistantApiRequest,
  AssistantApiSuccessResponse,
  AssistantConversationMessage,
  AssistantIntent
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

function shouldUseLocalFallback(error: MistralAssistantError) {
  return [
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

function splitIntoFallbackChunks(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 42) {
      if (current) chunks.push(`${current} `);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

function toStreamingErrorResponse(error: string, code: string): AssistantApiErrorResponse {
  return {
    ok: false,
    error,
    code
  };
}

export async function POST(request: Request) {
  try {
    await requireCurrentAppUserWithAccess();
  } catch (error) {
    const accessResponse = asAppAccessErrorResponse(error);
    if (accessResponse) return accessResponse;
    return NextResponse.json(
      toStreamingErrorResponse("You don't have access to use the assistant.", "ACCESS_DENIED"),
      { status: 403 }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = assistantRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      toStreamingErrorResponse("Please enter a prompt before sending.", "INVALID_REQUEST"),
      { status: 400 }
    );
  }

  const requestBody: AssistantApiRequest = {
    message: parsed.data.message,
    conversationHistory: parsed.data.conversationHistory as AssistantConversationMessage[],
    mode: parsed.data.mode,
    conversationId: parsed.data.conversationId ?? null
  };

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      const signal = request.signal;

      try {
        let activeConversationId = requestBody.conversationId ?? null;
        let activeModel: string | null = null;

        const result = await runMistralAssistantStream(
          {
            message: requestBody.message,
            conversationHistory: requestBody.conversationHistory ?? [],
            mode: requestBody.mode ?? "auto",
            conversationId: requestBody.conversationId ?? null
          },
          {
            signal,
            onConversationId: (conversationId) => {
              activeConversationId = conversationId;
              emit("meta", { conversationId: activeConversationId, model: activeModel });
            },
            onModel: (model) => {
              activeModel = model;
              emit("meta", { conversationId: activeConversationId, model: activeModel });
            },
            onTextChunk: (chunk) => {
              emit("chunk", { text: chunk });
            }
          }
        );

        emit("done", {
          meta: {
            source: "mistral-agent",
            agentId: result.agentId,
            agentVersion: result.agentVersion,
            intent: result.intent,
            conversationId: result.conversationId,
            model: result.model
          }
        });
        close();
      } catch (error) {
        if (signal.aborted) {
          emit("aborted", { reason: "request_aborted" });
          close();
          return;
        }

        if (error instanceof MistralAssistantError && shouldUseLocalFallback(error)) {
          const fallbackResponse = buildFallbackResponse(requestBody.message);
          const chunks = splitIntoFallbackChunks(fallbackResponse.message);

          for (const chunk of chunks) {
            emit("chunk", { text: chunk });
          }

          emit("done", {
            meta: {
              ...fallbackResponse.meta,
              conversationId: requestBody.conversationId ?? undefined
            }
          });
          close();
          return;
        }

        const defaultErrorMessage = "Response stopped unexpectedly. Try again.";
        if (error instanceof MistralAssistantError) {
          emit("error", {
            error: error.message || defaultErrorMessage,
            code: error.code
          });
        } else {
          emit("error", {
            error: defaultErrorMessage,
            code: "UNKNOWN_ERROR"
          });
        }
        close();
      }
    },
    cancel() {
      closed = true;
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
