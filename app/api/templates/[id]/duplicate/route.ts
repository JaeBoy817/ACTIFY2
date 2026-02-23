import { Prisma } from "@prisma/client";

import { asTemplatesApiErrorResponse, requireTemplatesApiContext, TemplatesApiError } from "@/lib/templates/api-context";
import { toUnifiedActivityTemplate, toUnifiedNoteTemplate } from "@/lib/templates/serializers";
import { revalidateTemplatesLibrary } from "@/lib/templates/service";
import { prisma } from "@/lib/prisma";

function withCopySuffix(title: string) {
  if (title.toLowerCase().endsWith("(copy)")) return title;
  return `${title} (Copy)`;
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTemplatesApiContext({ writable: true });

    const activityTemplate = await prisma.activityTemplate.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      }
    });

    if (activityTemplate) {
      const copy = await prisma.activityTemplate.create({
        data: {
          facilityId: context.facilityId,
          title: withCopySuffix(activityTemplate.title),
          category: activityTemplate.category,
          supplies: activityTemplate.supplies,
          setupSteps: activityTemplate.setupSteps,
          difficulty: activityTemplate.difficulty,
          defaultChecklist: activityTemplate.defaultChecklist as Prisma.InputJsonValue,
          adaptations: activityTemplate.adaptations as Prisma.InputJsonValue
        }
      });

      revalidateTemplatesLibrary(context.facilityId);

      return Response.json({
        template: toUnifiedActivityTemplate(copy, 0)
      }, { status: 201 });
    }

    const noteTemplate = await prisma.progressNoteTemplate.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      }
    });

    if (!noteTemplate) {
      throw new TemplatesApiError("Template not found.", 404);
    }

    const copy = await prisma.progressNoteTemplate.create({
      data: {
        facilityId: context.facilityId,
        title: withCopySuffix(noteTemplate.title),
        quickPhrases: noteTemplate.quickPhrases as Prisma.InputJsonValue,
        bodyTemplate: noteTemplate.bodyTemplate
      }
    });

    revalidateTemplatesLibrary(context.facilityId);

    return Response.json({
      template: toUnifiedNoteTemplate(copy)
    }, { status: 201 });
  } catch (error) {
    return asTemplatesApiErrorResponse(error);
  }
}
