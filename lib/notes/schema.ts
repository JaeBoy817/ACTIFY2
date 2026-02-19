import { z } from "zod";

const noteTypeSchema = z.enum(["general", "1on1"]);
const participationSchema = z.enum(["none", "low", "moderate", "high"]);
const responseSchema = z.enum(["positive", "neutral", "resistant"]);
const moodSchema = z.enum(["bright", "calm", "flat", "anxious", "agitated", "other"]);
const cuesSchema = z.enum(["none", "verbal", "visual", "hand_on_hand", "physical_assist"]);

export const noteBuilderPayloadSchema = z.object({
  id: z.string().trim().min(1).optional(),
  noteType: noteTypeSchema,
  title: z.string().trim().max(120).default(""),
  occurredAt: z.string().trim().min(1),
  residentId: z.string().trim().min(1),
  linkedResidentIds: z.array(z.string().trim().min(1)).default([]),
  location: z.string().trim().max(120).default(""),
  setting: z.string().trim().max(120).default(""),
  activityLabel: z.string().trim().max(160).default(""),
  narrative: z.string().trim().min(10).max(5000),
  participationLevel: participationSchema,
  responseType: responseSchema,
  mood: moodSchema,
  cues: cuesSchema,
  interventions: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  followUpNeeded: z.boolean().default(false),
  followUpNotes: z.string().trim().max(1500).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  communicationMethod: z.string().trim().max(120).default(""),
  mobilityAccess: z.string().trim().max(120).default(""),
  goalLink: z.string().trim().max(120).default(""),
  staffPresent: z.string().trim().max(160).default("")
});

export type NoteBuilderPayload = z.infer<typeof noteBuilderPayloadSchema>;

export const noteTemplateUpsertSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(2).max(120),
  noteType: noteTypeSchema,
  category: z.string().trim().max(80).default("Progress Note"),
  quickPhrases: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  narrativeStarter: z.string().trim().max(3000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([])
});

export type NoteTemplateUpsertPayload = z.infer<typeof noteTemplateUpsertSchema>;
