import { z } from "zod";

export const assistantModeSchema = z.enum([
  "general_assistant",
  "note_generation",
  "calendar_planning",
  "activity_ideas",
  "resident_support"
]);

export const assistantChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

export const assistantChatRequestSchema = z.object({
  mode: assistantModeSchema.optional().default("general_assistant"),
  messages: z.array(assistantChatMessageSchema).min(1).max(24)
});

export type AssistantMode = z.infer<typeof assistantModeSchema>;
export type AssistantChatMessageInput = z.infer<typeof assistantChatMessageSchema>;
export type AssistantChatRequestInput = z.infer<typeof assistantChatRequestSchema>;
