type MessageOutputLike = {
  type?: string;
  role?: string;
  model?: string | null;
  content?: unknown;
};

type ExtractedAssistantOutput = {
  text: string;
  model: string | null;
};

function normalizeChunkContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  const parts = content
    .map((chunk) => {
      if (!chunk || typeof chunk !== "object") return "";
      const typed = chunk as { text?: unknown };
      return typeof typed.text === "string" ? typed.text : "";
    })
    .filter((part) => part.trim().length > 0);

  return parts.join("").trim();
}

function isAssistantMessageOutput(entry: unknown): entry is MessageOutputLike {
  if (!entry || typeof entry !== "object") return false;
  const typed = entry as MessageOutputLike;
  const byType = typed.type === "message.output";
  const byRole = typed.role === "assistant";
  return byType || byRole;
}

export function extractAssistantTextFromMistralResponse(response: unknown): ExtractedAssistantOutput {
  if (!response || typeof response !== "object") {
    throw new Error("MISTRAL_INVALID_RESPONSE");
  }

  const typedResponse = response as { outputs?: unknown };
  if (!Array.isArray(typedResponse.outputs)) {
    throw new Error("MISTRAL_INVALID_RESPONSE");
  }

  for (let index = typedResponse.outputs.length - 1; index >= 0; index -= 1) {
    const output = typedResponse.outputs[index];
    if (!isAssistantMessageOutput(output)) continue;
    const text = normalizeChunkContent(output.content);
    if (!text) continue;

    return {
      text,
      model: typeof output.model === "string" ? output.model : null
    };
  }

  throw new Error("MISTRAL_EMPTY_OUTPUT");
}
