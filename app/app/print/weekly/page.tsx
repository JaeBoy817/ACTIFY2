import { addDays, format, parseISO, startOfWeek } from "date-fns";

import { PrintButton } from "@/components/app/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export default async function PrintWeeklyPage({ searchParams }: { searchParams?: { weekStart?: string } }) {
  const context = await requireModulePage("calendar");
  const weekStart = searchParams?.weekStart ? parseISO(searchParams.weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const activities = await prisma.activityInstance.findMany({
    where: {
      facilityId: context.facilityId,
      startAt: { gte: weekStart, lte: addDays(weekEnd, 1) }
    },
    orderBy: { startAt: "asc" }
  });

  const grouped = new Map<string, typeof activities>();
  activities.forEach((activity) => {
    const key = format(activity.startAt, "yyyy-MM-dd");
    grouped.set(key, [...(grouped.get(key) ?? []), activity]);
  });

  return (
    <Card className="print-sheet">
      <CardHeader className="no-print flex-row items-center justify-between">
        <CardTitle>Weekly Calendar ({format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")})</CardTitle>
        <PrintButton />
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 7 }).map((_, idx) => {
          const day = addDays(weekStart, idx);
          const key = format(day, "yyyy-MM-dd");
          const rows = grouped.get(key) ?? [];
          return (
            <div key={key} className="rounded-md border p-3">
              <p className="font-medium">{format(day, "EEEE, MMM d")}</p>
              {rows.length === 0 && <p className="text-sm">No activities</p>}
              {rows.map((activity) => (
                <p key={activity.id} className="text-sm">
                  {format(activity.startAt, "p")} {activity.title} ({activity.location})
                </p>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
