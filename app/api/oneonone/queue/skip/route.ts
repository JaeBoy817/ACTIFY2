import { z } from "zod";

import { asOneOnOneQueueApiErrorResponse, OneOnOneQueueApiError, requireOneOnOneQueueApiContext } from "@/lib/one-on-one-queue/api-context";
import { serializeOneOnOneSpotlightSnapshot, skipOneOnOneQueueItem } from "@/lib/one-on-one-queue/service";

const skipPayloadSchema = z.object({
  queueItemId: z.string().min(1),
  skipReason: z.enum(["RESIDENT_DECLINED", "ASLEEP", "IN_APPOINTMENT", "CLINICAL_HOLD", "STAFFING_CONSTRAINT", "OTHER"])
});

export async function POST(request: Request) {
  try {
    const context = await requireOneOnOneQueueApiContext({ writable: true });
    const raw = await request.json().catch(() => ({}));
    const parsed = skipPayloadSchema.safeParse(raw);

    if (!parsed.success) {
      throw new OneOnOneQueueApiError("Invalid skip payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const snapshot = await skipOneOnOneQueueItem({
      facilityId: context.facilityId,
      queueItemId: parsed.data.queueItemId,
      skipReason: parsed.data.skipReason,
      timeZone: context.timeZone
    });

    return Response.json(serializeOneOnOneSpotlightSnapshot(snapshot));
  } catch (error) {
    return asOneOnOneQueueApiErrorResponse(error);
  }
}
