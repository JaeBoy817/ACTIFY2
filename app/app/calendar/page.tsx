import { unstable_cache } from "next/cache";

import { CalendarShell } from "@/components/calendar/CalendarShell";
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
  const context = await requireModulePage("calendar");
  const timeZone = resolveTimeZone(context.timeZone);
  const initialView = parseInitialView(searchParams?.view);
  const initialSection = parseInitialSection(searchParams?.section);
  const initialDateKey = parseInitialDate(searchParams, timeZone);

  const templates = await getCachedCalendarTemplatesByFacility(context.facilityId)();

  return (
    <CalendarShell
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
}
