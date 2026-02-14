import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/app/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export default async function PrintUnitWeeklyPage({
  params,
  searchParams
}: {
  params: { unitId: string };
  searchParams?: { weekStart?: string };
}) {
  const context = await requireModulePage("calendar");
  const unit = await prisma.unit.findFirst({ where: { id: params.unitId, facilityId: context.facilityId } });
  if (!unit) notFound();

  const weekStart = searchParams?.weekStart ? parseISO(searchParams.weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const activities = await prisma.activityInstance.findMany({
    where: {
      facilityId: context.facilityId,
      startAt: { gte: weekStart, lte: addDays(weekEnd, 1) }
    },
    orderBy: { startAt: "asc" }
  });

  return (
    <Card className="print-sheet">
      <CardHeader className="no-print flex-row items-center justify-between">
        <CardTitle>{unit.name} calendar ({format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")})</CardTitle>
        <PrintButton />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {activities.length === 0 && <p>No activities this week.</p>}
        {activities.map((activity) => (
          <div key={activity.id} className="rounded-md border p-3">
            <p className="font-medium">{activity.title}</p>
            <p>{format(activity.startAt, "PPP p")} · {activity.location}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
