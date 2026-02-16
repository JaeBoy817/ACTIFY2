import { EngagementTrendChart } from "@/components/app/engagement-trend-chart";
import { TopAttendeesBarChart } from "@/components/app/top-attendees-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeFacilityPresenceMetrics } from "@/lib/facility-presence";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { asAttendanceRules } from "@/lib/settings/defaults";
import {
  endOfZonedDay,
  formatInTimeZone,
  startOfZonedMonthShift,
  startOfZonedWeek,
  subtractDays
} from "@/lib/timezone";

export default async function AnalyticsPage() {
  const context = await requireModulePage("analyticsHeatmaps");
  const timeZone = context.facility.timezone;

  const now = new Date();
  const todayEnd = endOfZonedDay(now, timeZone);
  const last60 = subtractDays(now, 60);
  const last30 = subtractDays(now, 30);
  const presenceWindowStart = startOfZonedMonthShift(now, timeZone, -1);
  const presenceWindowEnd = todayEnd;
  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      OR: [
        { isActive: true },
        { status: { in: ["ACTIVE", "BED_BOUND"] } }
      ],
      NOT: {
        status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
      }
    },
    include: { unit: true },
    orderBy: [{ unit: { name: "asc" } }, { room: "asc" }]
  });
  const activeResidentIds = residents.map((resident) => resident.id);
  const residentIdFilter = activeResidentIds.length > 0 ? { in: activeResidentIds } : { in: ["__none__"] };

  const [attendanceRows, presenceRows, settings] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        residentId: residentIdFilter,
        activityInstance: {
          facilityId: context.facilityId,
          startAt: { gte: last60, lte: now }
        }
      },
      include: {
        resident: { include: { unit: true } },
        activityInstance: true
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.attendance.findMany({
      where: {
        residentId: residentIdFilter,
        activityInstance: {
          facilityId: context.facilityId,
          startAt: {
            gte: presenceWindowStart,
            lte: presenceWindowEnd
          }
        }
      },
      select: {
        residentId: true,
        status: true,
        activityInstance: {
          select: {
            startAt: true
          }
        }
      }
    }),
    prisma.facilitySettings.findUnique({
      where: { facilityId: context.facilityId },
      select: { attendanceRulesJson: true }
    })
  ]);

  const weights = asAttendanceRules(settings?.attendanceRulesJson).engagementWeights;
  const scoreMap: Record<string, number> = {
    PRESENT: weights.present,
    ACTIVE: weights.active,
    LEADING: weights.leading,
    REFUSED: 0,
    NO_SHOW: 0
  };

  const last30Rows = attendanceRows.filter((row) => row.activityInstance.startAt >= last30);
  const previous30Rows = attendanceRows.filter((row) => row.activityInstance.startAt < last30);

  const residentCounts = new Map<string, number>();
  last30Rows.forEach((row) => {
    if (row.status !== "PRESENT" && row.status !== "ACTIVE" && row.status !== "LEADING") return;
    residentCounts.set(row.residentId, (residentCounts.get(row.residentId) ?? 0) + 1);
  });

  const topAttendeesData = residents
    .map((resident) => ({
      label: `${resident.lastName}, ${resident.firstName} (Rm ${resident.room})`,
      count: residentCounts.get(resident.id) ?? 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const barrierCounts = new Map<string, number>();
  const prevBarrierCounts = new Map<string, number>();

  last30Rows.forEach((row) => {
    if (!row.barrierReason) return;
    barrierCounts.set(row.barrierReason, (barrierCounts.get(row.barrierReason) ?? 0) + 1);
  });

  previous30Rows.forEach((row) => {
    if (!row.barrierReason) return;
    prevBarrierCounts.set(row.barrierReason, (prevBarrierCounts.get(row.barrierReason) ?? 0) + 1);
  });

  const topBarriers = Array.from(barrierCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([barrier, count]) => {
      const previous = prevBarrierCounts.get(barrier) ?? 0;
      const delta = count - previous;
      return {
        barrier,
        count,
        note: delta > 0 ? `Up ${delta} from prior 30 days` : delta < 0 ? `Down ${Math.abs(delta)} from prior 30 days` : "No change"
      };
    });

  const weeklyScores = new Map<string, { sum: number; count: number }>();
  attendanceRows.forEach((row) => {
    const week = formatInTimeZone(startOfZonedWeek(row.activityInstance.startAt, timeZone, 1), timeZone, {
      month: "short",
      day: "numeric"
    });
    const current = weeklyScores.get(week) ?? { sum: 0, count: 0 };
    const score = scoreMap[row.status] ?? 0;
    weeklyScores.set(week, { sum: current.sum + score, count: current.count + 1 });
  });

  const engagementData = Array.from(weeklyScores.entries()).map(([label, value]) => ({
    label,
    score: Number((value.sum / Math.max(value.count, 1)).toFixed(2))
  }));

  const facilityPresence = computeFacilityPresenceMetrics({
    rows: presenceRows.map((row) => ({
      residentId: row.residentId,
      status: row.status,
      occurredAt: row.activityInstance.startAt
    })),
    activeResidentIds,
    activeResidentCount: residents.length,
    now,
    timeZone
  });

  const monthDeltaLabel = facilityPresence.monthOverMonthDelta === null
    ? "No last-month attendance data yet"
    : facilityPresence.monthOverMonthDelta > 0
      ? `+${facilityPresence.monthOverMonthDelta.toFixed(1)} pts vs last month`
      : facilityPresence.monthOverMonthDelta < 0
        ? `${facilityPresence.monthOverMonthDelta.toFixed(1)} pts vs last month`
        : "No change vs last month";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Attended Residents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold">{facilityPresence.currentMonthTotalResidentsAttended}</p>
            <p className="text-sm text-muted-foreground">
              {facilityPresence.activeResidentCount} active residents in facility.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Residents Participated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold">{facilityPresence.currentMonthResidentsParticipated}</p>
            <p className="text-sm text-muted-foreground">
              Unique residents with Present/Active/Leading this month.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participation %</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{facilityPresence.currentMonthParticipationPercent.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">
              {facilityPresence.currentMonthResidentsParticipated} of {facilityPresence.activeResidentCount} active residents.
            </p>
            <Badge variant="outline">{monthDeltaLabel}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Daily %</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">
              {facilityPresence.currentMonthAverageDailyPercent.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">Average daily resident participation in current month.</p>
            <Badge variant="outline">
              Last month: {facilityPresence.previousMonthPresentPercent.toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top attendees (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <TopAttendeesBarChart data={topAttendeesData} />
          <p className="text-xs text-muted-foreground">
            Showing the top {topAttendeesData.length} residents by attended activity count (Present, Active, Leading).
          </p>
          <div className="flex flex-wrap gap-2">
            {topAttendeesData.slice(0, 3).map((item) => (
              <Badge key={item.label} variant="outline">
                {item.label.split(" (")[0]}: {item.count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top barriers (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topBarriers.length === 0 && <p className="text-sm text-muted-foreground">No barriers documented yet.</p>}
            {topBarriers.map((item) => (
              <div key={item.barrier} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.barrier.replaceAll("_", " ")}</p>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement score trend</CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementTrendChart data={engagementData} />
            <p className="text-xs text-muted-foreground">
              Scoring: PRESENT={weights.present}, ACTIVE={weights.active}, LEADING={weights.leading}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
