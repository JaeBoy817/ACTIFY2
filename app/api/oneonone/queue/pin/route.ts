import { z } from "zod";

import { asOneOnOneQueueApiErrorResponse, OneOnOneQueueApiError, requireOneOnOneQueueApiContext } from "@/lib/one-on-one-queue/api-context";
import { pinOneOnOneQueueItemToTomorrow, serializeOneOnOneSpotlightSnapshot } from "@/lib/one-on-one-queue/service";

const pinPayloadSchema = z.object({
  queueItemId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const context = await requireOneOnOneQueueApiContext({ writable: true });
    const raw = await request.json().catch(() => ({}));
    const parsed = pinPayloadSchema.safeParse(raw);

    if (!parsed.success) {
      throw new OneOnOneQueueApiError("Invalid pin payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const snapshot = await pinOneOnOneQueueItemToTomorrow({
      facilityId: context.facilityId,
      queueItemId: parsed.data.queueItemId
    });

    return Response.json(serializeOneOnOneSpotlightSnapshot(snapshot));
  } catch (error) {
    return asOneOnOneQueueApiErrorResponse(error);
  }
}
