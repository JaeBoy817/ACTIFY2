import { NextResponse } from "next/server";

import { AssistantConfigurationError, streamAssistantCompletion } from "@/lib/assistant/openrouter";
import { assistantChatRequestSchema } from "@/lib/assistant/schema";
import {
  asAppAccessErrorResponse,
  requireCurrentAppUserWithAccess
} from "@/lib/access-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractDeltaFromChunk(chunk: unknown) {
  if (!chunk || typeof chunk !== "object") return "";

  const maybeChoices = (chunk as { choices?: unknown }).choices;
  if (!Array.isArray(maybeChoices) || maybeChoices.length === 0) return "";

  const deltaContent = (maybeChoices[0] as { delta?: { content?: unknown } })?.delta?.content;
  if (typeof deltaContent === "string") return deltaContent;

  if (Array.isArray(deltaContent)) {
    return deltaContent
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }

  return "";
}

export async function POST(request: Request) {
  try {
    await requireCurrentAppUserWithAccess();

    const body = await request.json().catch(() => null);
    const parsed = assistantChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid assistant request.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const { stream, model } = await streamAssistantCompletion({
      mode: parsed.data.mode,
      messages: parsed.data.messages
    });

    const encoder = new TextEncoder();
    const completionStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const maybeAsyncStream = stream as AsyncIterable<unknown>;
          if (typeof maybeAsyncStream?.[Symbol.asyncIterator] !== "function") {
            const completion = stream as { choices?: Array<{ message?: { content?: unknown } }>; model?: string };
            const content = completion.choices?.[0]?.message?.content;
            const text = typeof content === "string" ? content : "";
            if (text) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    choices: [{ delta: { content: text } }],
                    model: completion.model ?? model
                  })}\n\n`
                )
              );
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          for await (const chunk of maybeAsyncStream) {
            const delta = extractDeltaFromChunk(chunk);
            if (!delta) continue;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  choices: [{ delta: { content: delta } }],
                  model
                })}\n\n`
              )
            );
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("[assistant/chat] stream failed", {
            mode: parsed.data.mode,
            error: streamError
          });

          controller.close();
        }
      }
    });

    return new Response(completionStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    const accessResponse = asAppAccessErrorResponse(error);
    if (accessResponse) return accessResponse;

    if (error instanceof AssistantConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("[assistant/chat] fatal", error);
    return NextResponse.json(
      {
        error: "Something went wrong generating that response. Please try again."
      },
      { status: 500 }
    );
  }
}
