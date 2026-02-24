import { unstable_cache } from "next/cache";

import { CalendarUnifiedWorkspaceLazy } from "@/components/app/CalendarUnifiedWorkspaceLazy";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { resolveTimeZone, zonedDateKey } from "@/lib/timezone";

type CalendarView = "week" | "day" | "month" | "agenda";
type CalendarSection = "schedule" | "create" | "templates" | "settings";

function parseInitialView(raw?: string): CalendarView {
  if (raw === "day") return "day";
  if (raw === "month") return "month";
  if (raw === "agenda") return "agenda";
  return "week";
}

function parseInitialSection(raw?: string): CalendarSection {
  if (raw === "create") return "create";
  if (raw === "templates") return "templates";
  if (raw === "settings") return "settings";
  return "schedule";
}

function parseInitialDate(searchParams?: { date?: string; month?: string }, timeZone?: string) {
  const candidate = searchParams?.date ?? searchParams?.month;
  if (candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate.trim())) {
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
  searchParams?: { date?: string; month?: string; view?: string; section?: string };
}) {
  const context = await requireModulePage("calendar");
  const timeZone = resolveTimeZone(context.timeZone);
  const initialView = parseInitialView(searchParams?.view);
  const initialSection = parseInitialSection(searchParams?.section);
  const initialDateKey = parseInitialDate(searchParams, timeZone);

  const templates = await getCachedCalendarTemplatesByFacility(context.facilityId)();

  return (
    <CalendarUnifiedWorkspaceLazy
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
      hasExplicitView={Boolean(searchParams?.view)}
      timeZone={timeZone}
    />
  );
}
