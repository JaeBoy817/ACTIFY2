import { z } from "zod";

import { asOneOnOneQueueApiErrorResponse, OneOnOneQueueApiError, requireOneOnOneQueueApiContext } from "@/lib/one-on-one-queue/api-context";
import { regenerateOneOnOneQueueSnapshot, serializeOneOnOneSpotlightSnapshot } from "@/lib/one-on-one-queue/service";

const regeneratePayloadSchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  queueSize: z.number().int().min(1).max(20).optional(),
  missingThisMonthOnly: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const context = await requireOneOnOneQueueApiContext({ writable: true });
    const raw = await request.json().catch(() => ({}));
    const parsed = regeneratePayloadSchema.safeParse(raw);

    if (!parsed.success) {
      throw new OneOnOneQueueApiError("Invalid regenerate payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const snapshot = await regenerateOneOnOneQueueSnapshot({
      facilityId: context.facilityId,
      date: parsed.data.date,
      queueSize: parsed.data.queueSize,
      missingThisMonthOnly: parsed.data.missingThisMonthOnly,
      timeZone: context.timeZone
    });

    return Response.json(serializeOneOnOneSpotlightSnapshot(snapshot));
  } catch (error) {
    return asOneOnOneQueueApiErrorResponse(error);
  }
}
