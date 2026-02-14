import Link from "next/link";
import { addDays, subDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

type PlanFilter = "ALL" | "WITH_PLAN" | "WITHOUT_PLAN" | "REVIEW_DUE" | "NEEDS_ATTENTION";

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function CarePlansIndexPage({
  searchParams
}: {
  searchParams?: { q?: string; filter?: string };
}) {
  const context = await requireModulePage("carePlan");
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const filter = ((searchParams?.filter ?? "ALL").toUpperCase() as PlanFilter);

  const [residents, attendanceByResident] = await Promise.all([
    prisma.resident.findMany({
      where: {
        facilityId: context.facilityId
      },
      include: {
        unit: true,
        activitiesCarePlan: {
          select: {
            id: true,
            status: true,
            nextReviewAt: true,
            updatedAt: true,
            focuses: {
              select: {
                status: true,
                goals: {
                  select: {
                    status: true
                  }
                }
              }
            },
            reviews: {
              where: { status: "OPEN" },
              select: { id: true }
            }
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    prisma.attendance.groupBy({
      by: ["residentId"],
      where: {
        activityInstance: {
          facilityId: context.facilityId
        },
        createdAt: {
          gte: subDays(new Date(), 14)
        },
        status: {
          in: ["PRESENT", "ACTIVE", "LEADING"]
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  const recentAttendanceMap = new Map(attendanceByResident.map((row) => [row.residentId, row._count._all]));
  const reviewDueCutoff = addDays(new Date(), 14);

  const rows = residents.map((resident) => {
    const plan = resident.activitiesCarePlan;
    const activeFocuses = plan?.focuses.filter((focus) => focus.status === "ACTIVE").length ?? 0;
    const activeGoals =
      plan?.focuses.reduce((sum, focus) => sum + focus.goals.filter((goal) => goal.status === "ACTIVE").length, 0) ?? 0;
    const openReviews = plan?.reviews.length ?? 0;
    const recentEvidence14 = recentAttendanceMap.get(resident.id) ?? 0;
    const reviewDueSoon = Boolean(plan?.nextReviewAt && plan.nextReviewAt <= reviewDueCutoff);
    const needsAttention = Boolean(plan && recentEvidence14 === 0);

    return {
      resident,
      plan,
      activeFocuses,
      activeGoals,
      openReviews,
      recentEvidence14,
      reviewDueSoon,
      needsAttention
    };
  });

  const filteredRows = rows.filter((row) => {
    const fullName = `${row.resident.lastName}, ${row.resident.firstName}`.toLowerCase();
    const matchesQuery = !query || fullName.includes(query) || row.resident.room.toLowerCase().includes(query) || (row.resident.unit?.name ?? "").toLowerCase().includes(query);

    const matchesFilter =
      filter === "ALL" ||
      (filter === "WITH_PLAN" && Boolean(row.plan)) ||
      (filter === "WITHOUT_PLAN" && !row.plan) ||
      (filter === "REVIEW_DUE" && row.reviewDueSoon) ||
      (filter === "NEEDS_ATTENTION" && row.needsAttention);

    return matchesQuery && matchesFilter;
  });

  const withPlanCount = rows.filter((row) => Boolean(row.plan)).length;
  const reviewDueCount = rows.filter((row) => row.reviewDueSoon).length;
  const needsAttentionCount = rows.filter((row) => row.needsAttention).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Activities Care Plans</h1>
          <p className="text-sm text-muted-foreground">
            Manage Focuses, Goals, Interventions, Tasks, Reviews, and evidence links across residents.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/residents">Open Residents</Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Residents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">With Care Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{withPlanCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Review Due (14d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{reviewDueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{needsAttentionCount}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Care Plan Index</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Search by resident, room, or unit"
            />
            <select
              name="filter"
              defaultValue={filter}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">All residents</option>
              <option value="WITH_PLAN">With care plan</option>
              <option value="WITHOUT_PLAN">Without care plan</option>
              <option value="REVIEW_DUE">Review due soon</option>
              <option value="NEEDS_ATTENTION">Needs attention</option>
            </select>
            <Button type="submit" variant="outline">Apply</Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>Plan Status</TableHead>
                <TableHead>Active Focuses</TableHead>
                <TableHead>Active Goals</TableHead>
                <TableHead>Evidence (14d)</TableHead>
                <TableHead>Next Review</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No residents match current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.resident.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {row.resident.lastName}, {row.resident.firstName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Room {row.resident.room} · {row.resident.unit?.name ?? "No unit"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!row.plan ? (
                        <Badge variant="outline">Not Started</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={row.plan.status === "ACTIVE" ? "secondary" : "outline"}>
                            {toTitleCase(row.plan.status)}
                          </Badge>
                          {row.reviewDueSoon ? <Badge variant="destructive">Review Due</Badge> : null}
                          {row.openReviews > 0 ? <Badge variant="outline">Open Reviews: {row.openReviews}</Badge> : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.activeFocuses}</TableCell>
                    <TableCell>{row.activeGoals}</TableCell>
                    <TableCell>{row.recentEvidence14}</TableCell>
                    <TableCell>
                      {row.plan?.nextReviewAt ? row.plan.nextReviewAt.toLocaleDateString() : "Not set"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link href={`/app/residents/${row.resident.id}/care-plan`}>
                            {row.plan ? "Open" : "Start"}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/app/residents/${row.resident.id}/care-plan/print`}>Print</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
