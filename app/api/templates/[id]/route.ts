import { Prisma } from "@prisma/client";
import { z } from "zod";

import { asTemplatesApiErrorResponse, requireTemplatesApiContext, TemplatesApiError } from "@/lib/templates/api-context";
import { serializeNoteTemplateMeta } from "@/lib/templates/note-template-meta";
import { toUnifiedActivityTemplate, toUnifiedNoteTemplate } from "@/lib/templates/serializers";
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

const updateTemplateSchema = z.object({
  type: z.enum(["activity", "note"]),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  payload: z.union([activityPayloadSchema, notePayloadSchema])
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTemplatesApiContext({ writable: true });
    const raw = await request.json().catch(() => null);
    const parsed = updateTemplateSchema.safeParse(raw);

    if (!parsed.success) {
      throw new TemplatesApiError("Invalid template update payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const { type, title, category, tags } = parsed.data;

    if (type === "activity") {
      const existing = await prisma.activityTemplate.findFirst({
        where: {
          id: params.id,
          facilityId: context.facilityId
        }
      });
      if (!existing) {
        throw new TemplatesApiError("Template not found.", 404);
      }

      const activityPayload = activityPayloadSchema.parse(parsed.data.payload);
      const updated = await prisma.activityTemplate.update({
        where: { id: existing.id },
        data: {
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

      return Response.json({
        template: toUnifiedActivityTemplate(updated, 0)
      });
    }

    const existing = await prisma.progressNoteTemplate.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      }
    });
    if (!existing) {
      throw new TemplatesApiError("Template not found.", 404);
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

    const updated = await prisma.progressNoteTemplate.update({
      where: { id: existing.id },
      data: {
        title,
        quickPhrases: notePayload.quickPhrases,
        bodyTemplate: serializedBody
      }
    });

    return Response.json({
      template: toUnifiedNoteTemplate(updated)
    });
  } catch (error) {
    return asTemplatesApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTemplatesApiContext({ writable: true });

    const activityTemplate = await prisma.activityTemplate.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      },
      select: { id: true }
    });

    if (activityTemplate) {
      await prisma.activityTemplate.delete({
        where: { id: activityTemplate.id }
      });
      return Response.json({ ok: true });
    }

    const noteTemplate = await prisma.progressNoteTemplate.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      },
      select: { id: true }
    });

    if (!noteTemplate) {
      throw new TemplatesApiError("Template not found.", 404);
    }

    await prisma.progressNoteTemplate.delete({
      where: { id: noteTemplate.id }
    });

    return Response.json({ ok: true });
  } catch (error) {
    return asTemplatesApiErrorResponse(error);
  }
}

