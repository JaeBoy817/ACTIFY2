import { getOneOnOneSpotlightSnapshot, serializeOneOnOneSpotlightSnapshot } from "@/lib/one-on-one-queue/service";
import { asOneOnOneQueueApiErrorResponse, requireOneOnOneQueueApiContext } from "@/lib/one-on-one-queue/api-context";

export async function GET(request: Request) {
  try {
    const context = await requireOneOnOneQueueApiContext();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date") ?? undefined;
    const queueSizeRaw = searchParams.get("queueSize");
    const queueSize = queueSizeRaw ? Number(queueSizeRaw) : undefined;

    const snapshot = await getOneOnOneSpotlightSnapshot({
      facilityId: context.facilityId,
      date,
      queueSize,
      timeZone: context.timeZone
    });

    return Response.json(serializeOneOnOneSpotlightSnapshot(snapshot));
  } catch (error) {
    return asOneOnOneQueueApiErrorResponse(error);
  }
}
