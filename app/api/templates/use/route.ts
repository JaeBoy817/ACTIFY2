import { z } from "zod";

import { asTemplatesApiErrorResponse, requireTemplatesApiContext, TemplatesApiError } from "@/lib/templates/api-context";
import { prisma } from "@/lib/prisma";

const useTemplateSchema = z.object({
  templateId: z.string().trim().min(1),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1),
  location: z.string().trim().min(1).max(200)
});

export async function POST(request: Request) {
  try {
    const context = await requireTemplatesApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = useTemplateSchema.safeParse(payload);
    if (!parsed.success) {
      throw new TemplatesApiError("Invalid schedule payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = new Date(parsed.data.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new TemplatesApiError("Invalid start/end time.", 400);
    }

    const template = await prisma.activityTemplate.findFirst({
      where: {
        id: parsed.data.templateId,
        facilityId: context.facilityId
      }
    });
    if (!template) {
      throw new TemplatesApiError("Activity template not found.", 404);
    }

    const checklist = Array.isArray(template.defaultChecklist)
      ? template.defaultChecklist.map((item) => ({ text: String(item), done: false }))
      : [];

    const instance = await prisma.activityInstance.create({
      data: {
        facilityId: context.facilityId,
        templateId: template.id,
        title: template.title,
        startAt,
        endAt,
        location: parsed.data.location.trim(),
        adaptationsEnabled: {
          bedBound: false,
          dementiaFriendly: false,
          lowVisionHearing: false,
          oneToOneMini: false,
          overrides: {}
        },
        checklist
      }
    });

    return Response.json({
      activity: {
        id: instance.id,
        startAt: instance.startAt.toISOString(),
        endAt: instance.endAt.toISOString()
      }
    }, { status: 201 });
  } catch (error) {
    return asTemplatesApiErrorResponse(error);
  }
}

