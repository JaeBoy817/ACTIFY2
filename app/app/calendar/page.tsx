import { CalendarUnifiedWorkspace } from "@/components/app/calendar-unified-workspace";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { zonedDateKey } from "@/lib/timezone";

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

export default async function CalendarPage({
  searchParams
}: {
  searchParams?: { date?: string; month?: string; view?: string; section?: string };
}) {
  const context = await requireModulePage("calendar");
  const timeZone = context.facility.timezone || "America/Chicago";
  const initialView = parseInitialView(searchParams?.view);
  const initialSection = parseInitialSection(searchParams?.section);
  const initialDateKey = parseInitialDate(searchParams, timeZone);

  const templates = await prisma.activityTemplate.findMany({
    where: { facilityId: context.facilityId },
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      defaultChecklist: true,
      adaptations: true
    },
    orderBy: { title: "asc" }
  });

  return (
    <CalendarUnifiedWorkspace
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
