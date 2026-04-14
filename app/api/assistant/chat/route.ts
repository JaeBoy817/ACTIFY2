import { NextResponse } from "next/server";

import { createAssistantCompletionStream, AssistantConfigurationError } from "@/lib/assistant/openai";
import { assistantChatRequestSchema } from "@/lib/assistant/schema";
import {
  asAppAccessErrorResponse,
  requireCurrentAppUserWithAccess
} from "@/lib/access-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const upstream = await createAssistantCompletionStream({
      mode: parsed.data.mode,
      messages: parsed.data.messages
    });

    if (!upstream.ok) {
      const payload = await upstream
        .json()
        .catch(() => ({ error: { message: "Assistant request failed." } }));
      const message =
        payload?.error?.message || "Something went wrong generating that response. Please try again.";

      console.error("[assistant/chat] upstream error", {
        status: upstream.status,
        mode: parsed.data.mode,
        message
      });

      return NextResponse.json(
        {
          error: message
        },
        { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 500 }
      );
    }

    if (!upstream.body) {
      return NextResponse.json(
        {
          error: "Assistant returned an empty response stream."
        },
        { status: 502 }
      );
    }

    return new Response(upstream.body, {
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
