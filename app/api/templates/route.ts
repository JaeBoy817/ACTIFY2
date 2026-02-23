import { Prisma } from "@prisma/client";
import { z } from "zod";

import { asTemplatesApiErrorResponse, requireTemplatesApiContext, TemplatesApiError } from "@/lib/templates/api-context";
import { serializeNoteTemplateMeta } from "@/lib/templates/note-template-meta";
import { toUnifiedActivityTemplate, toUnifiedNoteTemplate } from "@/lib/templates/serializers";
import { getTemplatesLibrarySnapshot, revalidateTemplatesLibrary } from "@/lib/templates/service";
import { prisma } from "@/lib/prisma";

const activityPayloadSchema = z.object({
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  estimatedMinutes: z.coerce.number().int().min(5).max(480).optional().nullable(),
  supplies: z.array(z.string().trim().min(1)).default([]),
  setupSteps: z.array(z.string().trim().min(1)).default([]),
  checklistItems: z.array(z.string().trim().min(1)).default([]),
  adaptations: z.object({
    bedBound: z.string().trim().max(1000).optional().default(""),
    dementia: z.string().trim().max(1000).optional().default(""),
    lowVision: z.string().trim().max(1000).optional().default(""),
    oneToOne: z.string().trim().max(1000).optional().default("")
  })
});

const notePayloadSchema = z.object({
  fieldsEnabled: z
    .object({
      mood: z.boolean().default(true),
      cues: z.boolean().default(true),
      participation: z.boolean().default(true),
      response: z.boolean().default(true),
      followUp: z.boolean().default(true)
    })
    .default({
      mood: true,
      cues: true,
      participation: true,
      response: true,
      followUp: true
    }),
  defaultTextBlocks: z
    .object({
      opening: z.string().trim().max(2000).optional().nullable(),
      body: z.string().trim().max(8000).optional().nullable(),
      followUp: z.string().trim().max(2000).optional().nullable()
    })
    .default({}),
  quickPhrases: z.array(z.string().trim().min(1)).max(30).default([])
});

const createTemplateSchema = z.object({
  type: z.enum(["activity", "note"]),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  payload: z.union([activityPayloadSchema, notePayloadSchema])
});

export async function GET() {
  try {
    const context = await requireTemplatesApiContext();
    const templates = await getTemplatesLibrarySnapshot({
      facilityId: context.facilityId
    });

    return Response.json({ templates });
  } catch (error) {
    return asTemplatesApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireTemplatesApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createTemplateSchema.safeParse(payload);

    if (!parsed.success) {
      throw new TemplatesApiError("Invalid template payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const { type, title, category, tags } = parsed.data;

    if (type === "activity") {
      const activityPayload = activityPayloadSchema.parse(parsed.data.payload);

      const created = await prisma.activityTemplate.create({
        data: {
          facilityId: context.facilityId,
          title,
          category: category?.trim() || "General",
          supplies: activityPayload.supplies.join("\n"),
          setupSteps: activityPayload.setupSteps.join("\n"),
          difficulty: activityPayload.difficulty,
          defaultChecklist: activityPayload.checklistItems,
          adaptations: {
            bedBound: activityPayload.adaptations.bedBound,
            dementiaFriendly: activityPayload.adaptations.dementia,
            lowVisionHearing: activityPayload.adaptations.lowVision,
            oneToOneMini: activityPayload.adaptations.oneToOne,
            estimatedMinutes: activityPayload.estimatedMinutes ?? null,
            tags
          } as Prisma.InputJsonValue
        }
      });

      revalidateTemplatesLibrary(context.facilityId);

      return Response.json({
        template: toUnifiedActivityTemplate(created, 0)
      }, { status: 201 });
    }

    const notePayload = notePayloadSchema.parse(parsed.data.payload);
    const body = notePayload.defaultTextBlocks.body?.trim() || "";
    const serializedBody = serializeNoteTemplateMeta({
      body,
      category: category?.trim() || "Progress Note",
      tags,
      fieldsEnabled: notePayload.fieldsEnabled,
      defaultTextBlocks: {
        opening: notePayload.defaultTextBlocks.opening?.trim() || undefined,
        body,
        followUp: notePayload.defaultTextBlocks.followUp?.trim() || undefined
      }
    });

    const created = await prisma.progressNoteTemplate.create({
      data: {
        facilityId: context.facilityId,
        title,
        quickPhrases: notePayload.quickPhrases,
        bodyTemplate: serializedBody
      }
    });

    revalidateTemplatesLibrary(context.facilityId);

    return Response.json({
      template: toUnifiedNoteTemplate(created)
    }, { status: 201 });
  } catch (error) {
    return asTemplatesApiErrorResponse(error);
  }
}
