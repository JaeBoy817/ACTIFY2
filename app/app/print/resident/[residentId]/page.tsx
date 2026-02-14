import { endOfDay, format, parseISO, startOfDay } from "date-fns";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/app/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export default async function PrintResidentPicksPage({
  params,
  searchParams
}: {
  params: { residentId: string };
  searchParams?: { date?: string };
}) {
  const context = await requireModulePage("calendar");
  const date = searchParams?.date ? parseISO(searchParams.date) : new Date();
  const from = startOfDay(date);
  const to = endOfDay(date);

  const resident = await prisma.resident.findFirst({
    where: { id: params.residentId, facilityId: context.facilityId }
  });
  if (!resident) notFound();

  const activities = await prisma.activityInstance.findMany({
    where: {
      facilityId: context.facilityId,
      startAt: { gte: from, lte: to }
    },
    orderBy: { startAt: "asc" }
  });

  return (
    <Card className="print-sheet">
      <CardHeader className="no-print flex-row items-center justify-between">
        <CardTitle>
          {resident.firstName} {resident.lastName} - Your Picks Today ({format(date, "PPP")})
        </CardTitle>
        <PrintButton />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {activities.length === 0 && <p>No programs scheduled today.</p>}
        {activities.map((activity) => (
          <div key={activity.id} className="rounded-md border p-3">
            <p className="font-medium">{activity.title}</p>
            <p>
              {format(activity.startAt, "p")} - {format(activity.endAt, "p")} · {activity.location}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
