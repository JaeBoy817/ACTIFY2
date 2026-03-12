import { CuesRequired, MoodAffect, ParticipationLevel, ProgressNoteType, ResponseType } from "@prisma/client";
import { z } from "zod";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { attachDocumentationMeta } from "@/lib/documentation/meta";
import { prisma } from "@/lib/prisma";

const completeAssessmentSchema = z.object({
  kind: z.enum(["QUARTERLY_UDA", "ANNUAL_UDA", "MDS"]),
  completedAt: z.string().datetime().optional().nullable()
});

function parseCompletedAt(value: string | null | undefined) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ResidentsApiError("Invalid completion date.", 400);
  }
  return parsed;
}

export async function POST(request: Request, { params }: { params: { residentId: string } }) {
  try {
    const context = await requireResidentsApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = completeAssessmentSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ResidentsApiError("Invalid assessment completion payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const resident = await prisma.resident.findFirst({
      where: {
        id: params.residentId,
        facilityId: context.facilityId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    if (!resident) {
      throw new ResidentsApiError("Resident not found.", 404);
    }

    const completedAt = parseCompletedAt(parsed.data.completedAt);

    const meta =
      parsed.data.kind === "MDS"
        ? {
            kind: "MDS" as const,
            status: "COMPLETED" as const,
            assessmentType: "SECTION_F" as const,
            dueDate: null,
            reviewDate: completedAt.toISOString()
          }
        : {
            kind: "UDA" as const,
            status: "COMPLETED" as const,
            assessmentType: parsed.data.kind === "ANNUAL_UDA" ? ("ANNUAL" as const) : ("QUARTERLY" as const),
            dueDate: null,
            reviewDate: completedAt.toISOString()
          };

    const narrative = attachDocumentationMeta(
      `${resident.firstName} ${resident.lastName}: ${
        parsed.data.kind === "ANNUAL_UDA"
          ? "Annual UDA"
          : parsed.data.kind === "QUARTERLY_UDA"
            ? "Quarterly UDA"
            : "MDS Section F"
      } marked complete from Residents workspace.`,
      meta
    );

    await prisma.progressNote.create({
      data: {
        residentId: resident.id,
        type: ProgressNoteType.GROUP,
        participationLevel: ParticipationLevel.MODERATE,
        moodAffect: MoodAffect.CALM,
        cuesRequired: CuesRequired.NONE,
        response: ResponseType.POSITIVE,
        followUp: null,
        narrative,
        createdAt: completedAt,
        createdByUserId: context.user.id
      }
    });

    return Response.json({ ok: true });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
