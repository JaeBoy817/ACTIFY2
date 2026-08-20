import { Prisma } from "@prisma/client";
import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import {
  asCalendarBuilderDesign,
  calendarBuilderDesignSchema,
  getCalendarBuilderStore,
  mergeCalendarBuilderStore,
  normalizeMonthKey
} from "@/lib/calendar/builder-design";
import { prisma } from "@/lib/prisma";
import { ensureFacilitySettingsRecord } from "@/lib/settings/ensure";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const saveDesignSchema = z.object({
  monthKey: z.string().min(7),
  baseVersion: z.number().int().min(0).optional(),
  design: calendarBuilderDesignSchema.partial()
});

async function getFacilityName(facilityId: string) {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { name: true }
  });
  return facility?.name ?? "My Facility";
}

export async function GET(request: Request) {
  try {
    const context = await requireCalendarApiContext();
    const url = new URL(request.url);
    const monthKey = normalizeMonthKey(url.searchParams.get("month") ?? "");
    if (!monthKey) {
      throw new CalendarApiError("Invalid calendar builder month.", 400);
    }

    const [settings, facilityName] = await Promise.all([
      ensureFacilitySettingsRecord({
        facilityId: context.facilityId,
        timezone: context.timezone,
        moduleFlags: context.user.facility.moduleFlags
      }),
      getFacilityName(context.facilityId)
    ]);

    const store = getCalendarBuilderStore(settings.printDefaultsJson);
    const design = asCalendarBuilderDesign(store.designs[monthKey], monthKey, facilityName);

    return Response.json({ design });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await requireCalendarApiContext({ writable: true });
    const raw = await request.json();
    const parsed = saveDesignSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CalendarApiError("Invalid calendar builder design payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const monthKey = normalizeMonthKey(parsed.data.monthKey);
    if (!monthKey) {
      throw new CalendarApiError("Invalid calendar builder month.", 400);
    }

    const [settings, facilityName] = await Promise.all([
      ensureFacilitySettingsRecord({
        facilityId: context.facilityId,
        timezone: context.timezone,
        moduleFlags: context.user.facility.moduleFlags
      }),
      getFacilityName(context.facilityId)
    ]);

    const store = getCalendarBuilderStore(settings.printDefaultsJson);
    const current = asCalendarBuilderDesign(store.designs[monthKey], monthKey, facilityName);
    const baseVersion = parsed.data.baseVersion ?? parsed.data.design.version ?? 0;

    if (current.version > baseVersion) {
      return Response.json(
        {
          error: "A newer calendar design was saved. Reload before saving again.",
          code: "CALENDAR_DESIGN_VERSION_CONFLICT",
          design: current
        },
        { status: 409 }
      );
    }

    const nextDesign = calendarBuilderDesignSchema.parse({
      ...current,
      ...parsed.data.design,
      monthKey,
      version: Math.max(current.version, baseVersion) + 1,
      updatedAt: new Date().toISOString()
    });

    store.designs[monthKey] = nextDesign;

    await prisma.facilitySettings.update({
      where: { facilityId: context.facilityId },
      data: {
        printDefaultsJson: mergeCalendarBuilderStore(settings.printDefaultsJson, store) as Prisma.InputJsonValue
      }
    });

    return Response.json({ design: nextDesign });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}
