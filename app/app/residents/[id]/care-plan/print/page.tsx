import Link from "next/link";
import { subDays } from "date-fns";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/app/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const engagementScoreMap: Record<string, number> = {
  PRESENT: 1,
  ACTIVE: 2,
  LEADING: 3,
  REFUSED: 0,
  NO_SHOW: 0
};

export default async function CarePlanPrintSnapshotPage({ params }: { params: { id: string } }) {
  const context = await getFacilityContextWithSubscription("carePlan");

  const resident = await prisma.resident.findFirst({
    where: {
      id: params.id,
      facilityId: context.facilityId
    },
    include: {
      unit: true,
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!resident) {
    notFound();
  }

  const carePlan = await prisma.activitiesCarePlan.findUnique({
    where: { residentId: resident.id },
    include: {
      focuses: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: {
          goals: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "asc" }
          },
          interventions: {
            where: { status: "ACTIVE", isActive: true },
            orderBy: { createdAt: "asc" },
            include: {
              tasks: {
                where: { active: true },
                orderBy: { createdAt: "asc" }
              }
            }
          }
        }
      }
    }
  });

  const thirtyDaysAgo = subDays(new Date(), 30);

  const last30Attendance = await prisma.attendance.findMany({
    where: {
      residentId: resident.id,
      createdAt: { gte: thirtyDaysAgo }
    },
    include: {
      activityInstance: {
        select: {
          title: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const attendanceCounts = {
    present: last30Attendance.filter((row) => row.status === "PRESENT").length,
    active: last30Attendance.filter((row) => row.status === "ACTIVE").length,
    leading: last30Attendance.filter((row) => row.status === "LEADING").length,
    refused: last30Attendance.filter((row) => row.status === "REFUSED").length,
    noShow: last30Attendance.filter((row) => row.status === "NO_SHOW").length
  };

  const scoredRows = last30Attendance.filter((row) => ["PRESENT", "ACTIVE", "LEADING"].includes(row.status));
  const engagementAvg =
    scoredRows.length > 0
      ? Number(
          (
            scoredRows.reduce((sum, row) => sum + (engagementScoreMap[row.status] ?? 0), 0) / scoredRows.length
          ).toFixed(2)
        )
      : 0;

  const barrierSummary = last30Attendance.reduce<Record<string, number>>((acc, row) => {
    if (!row.barrierReason) return acc;
    acc[row.barrierReason] = (acc[row.barrierReason] ?? 0) + 1;
    return acc;
  }, {});

  const topBarriers = Object.entries(barrierSummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const lastUpdatedAt = [
    carePlan?.updatedAt,
    ...(carePlan?.focuses ?? []).map((focus) => focus.updatedAt),
    ...(carePlan?.focuses ?? []).flatMap((focus) => [
      ...focus.goals.map((goal) => goal.updatedAt),
      ...focus.interventions.map((intervention) => intervention.updatedAt)
    ])
  ]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const latestAssessment = resident.assessments[0];
  const assessmentAnswers =
    latestAssessment && latestAssessment.answers && typeof latestAssessment.answers === "object"
      ? (latestAssessment.answers as Record<string, string | undefined>)
      : {};

  return (
    <Card className="print-sheet">
      <CardHeader className="no-print flex-row items-center justify-between gap-2">
        <CardTitle>Activities Care Plan Snapshot</CardTitle>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/residents/${resident.id}/care-plan`}>Back to Care Plan</Link>
          </Button>
          <PrintButton />
        </div>
      </CardHeader>

      <CardContent className="space-y-5 text-sm">
        <section className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {resident.firstName} {resident.lastName}
              </h2>
              <p className="text-muted-foreground">
                Room {resident.room} · {resident.unit?.name ?? "No unit"}
              </p>
            </div>
            <Badge variant={resident.isActive ? "secondary" : "destructive"}>
              {resident.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <p>
              <span className="font-medium">Best times:</span>{" "}
              {resident.bestTimesOfDay || assessmentAnswers.bestTimeOfDay || "Not set"}
            </p>
            <p>
              <span className="font-medium">Preferences:</span>{" "}
              {resident.notes || latestAssessment?.dislikesTriggers || "Not set"}
            </p>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h3 className="text-base font-semibold">Active Focuses, Goals, and Interventions</h3>
          {(carePlan?.focuses?.length ?? 0) === 0 ? (
            <p className="mt-2 text-muted-foreground">No active focuses in this care plan.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {carePlan?.focuses.map((focus) => (
                <div key={focus.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{focus.title}</p>
                    <Badge variant="outline">{toTitleCase(focus.category)}</Badge>
                  </div>

                  {focus.goals.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Goals</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                        {focus.goals.map((goal) => (
                          <li key={goal.id}>
                            {goal.statement}
                            <span className="text-muted-foreground">
                              {" "}({toTitleCase(goal.measurementMethod)}{goal.targetValue ? ` · Target ${goal.targetValue}` : ""})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {focus.interventions.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Interventions</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                        {focus.interventions.map((intervention) => (
                          <li key={intervention.id}>
                            {intervention.title}
                            <span className="text-muted-foreground">
                              {" "}({toTitleCase(intervention.frequencyType)} · {toTitleCase(intervention.responsibleRole)} · Tasks {intervention.tasks.length})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border p-4">
          <h3 className="text-base font-semibold">Last 30-Day Evidence Summary</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Entries</p>
              <p className="text-2xl font-semibold">{last30Attendance.length}</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Engagement Avg</p>
              <p className="text-2xl font-semibold">{engagementAvg}</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Attended</p>
              <p className="text-2xl font-semibold">
                {attendanceCounts.present + attendanceCounts.active + attendanceCounts.leading}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Attendance breakdown</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Present</TableCell>
                    <TableCell className="text-right">{attendanceCounts.present}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Active</TableCell>
                    <TableCell className="text-right">{attendanceCounts.active}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Leading</TableCell>
                    <TableCell className="text-right">{attendanceCounts.leading}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Refused</TableCell>
                    <TableCell className="text-right">{attendanceCounts.refused}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>No show</TableCell>
                    <TableCell className="text-right">{attendanceCounts.noShow}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Top barriers</p>
              {topBarriers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No barriers documented in the last 30 days.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barrier</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topBarriers.map(([barrier, count]) => (
                      <TableRow key={barrier}>
                        <TableCell>{toTitleCase(barrier)}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h3 className="text-base font-semibold">Review & Update</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <p>
              <span className="font-medium">Next review date:</span>{" "}
              {carePlan?.nextReviewAt ? carePlan.nextReviewAt.toLocaleDateString() : "Not set"}
            </p>
            <p>
              <span className="font-medium">Last updated:</span>{" "}
              {lastUpdatedAt ? lastUpdatedAt.toLocaleString() : "Not available"}
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
