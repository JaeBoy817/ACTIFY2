import { unstable_cache } from "next/cache";
import { AlertTriangle } from "lucide-react";

import { CalendarCommandCenter } from "@/components/calendar/command-center/CalendarCommandCenter";
import { isNextControlFlowError } from "@/lib/next-control-flow";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { resolveTimeZone, zonedDateKey } from "@/lib/timezone";

type CalendarView = "week" | "day" | "month" | "agenda";
type CalendarSection = "schedule" | "create" | "library" | "settings";

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseInitialView(raw?: string | string[]): CalendarView {
  const value = firstParam(raw);
  if (value === "day") return "day";
  if (value === "month") return "month";
  if (value === "agenda") return "agenda";
  return "month";
}

function parseInitialSection(raw?: string | string[]): CalendarSection {
  const value = firstParam(raw);
  if (value === "create") return "create";
  if (value === "library" || value === "templates") return "library";
  if (value === "settings") return "settings";
  return "schedule";
}

function parseInitialDate(
  searchParams?: { date?: string | string[]; month?: string | string[] },
  timeZone?: string
) {
  const candidate = firstParam(searchParams?.date) ?? firstParam(searchParams?.month);
  if (typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.trim())) {
    return candidate;
  }

  return zonedDateKey(new Date(), timeZone);
}

function getCachedCalendarTemplatesByFacility(facilityId: string) {
  return unstable_cache(
    async () =>
      prisma.activityTemplate.findMany({
        where: { facilityId },
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          defaultChecklist: true,
          adaptations: true
        },
        orderBy: { title: "asc" }
      }),
    ["calendar-templates-v1", facilityId],
    {
      revalidate: 60,
      tags: [`calendar:templates:${facilityId}`]
    }
  );
}

async function getCalendarTemplatesSafe(facilityId: string) {
  try {
    return await getCachedCalendarTemplatesByFacility(facilityId)();
  } catch (error) {
    // Keep calendar available even if template data is temporarily unavailable.
    console.error("[calendar] failed to load templates", {
      facilityId,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return [];
  }
}

function CalendarDataUnavailableNotice() {
  return (
    <section className="mb-4 rounded-[2rem] border border-amber-200 bg-amber-50/90 p-5 text-amber-950 shadow-sm">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <h1 className="text-lg font-black">Calendar data is temporarily unavailable.</h1>
          <p className="mt-1 text-sm leading-6">
            Actify loaded the Calendar page, but the calendar database did not respond. You can still use available
            navigation while the database connection is checked.
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: {
    date?: string | string[];
    month?: string | string[];
    view?: string | string[];
    section?: string | string[];
  };
}) {
  try {
    const context = await requireModulePage("calendar");
    const timeZone = resolveTimeZone(context.timeZone);
    const initialView = parseInitialView(searchParams?.view);
    const initialSection = parseInitialSection(searchParams?.section);
    const initialDateKey = parseInitialDate(searchParams, timeZone);

    const templates = await getCalendarTemplatesSafe(context.facilityId);

    return (
      <CalendarCommandCenter
        templates={templates.map((template) => ({
          id: template.id,
          title: template.title,
          category: template.category,
          difficulty: template.difficulty || "Moderate",
          defaultChecklist: template.defaultChecklist,
          adaptations: template.adaptations
        }))}
        initialDateKey={initialDateKey}
        initialView={initialView}
        initialSection={initialSection}
        timeZone={timeZone}
      />
    );
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("[calendar] page fallback rendered", error);
    const timeZone = "America/Chicago";
    const initialView = parseInitialView(searchParams?.view);
    const initialSection = parseInitialSection(searchParams?.section);
    const initialDateKey = parseInitialDate(searchParams, timeZone);

    return (
      <>
        <CalendarDataUnavailableNotice />
        <CalendarCommandCenter
          templates={[]}
          initialDateKey={initialDateKey}
          initialView={initialView}
          initialSection={initialSection}
          timeZone={timeZone}
        />
      </>
    );
  }
}
