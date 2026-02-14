import Link from "next/link";
import { addDays, endOfDay, format, isToday, isValid, parse, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { BarChart3, CalendarDays, ClipboardCheck, Users } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { computeFacilityPresenceMetrics } from "@/lib/facility-presence";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { asAttendanceRules } from "@/lib/settings/defaults";

type AttendanceTrackerPageProps = {
  searchParams?: {
    date?: string;
  };
};

type PastDaySummary = {
  dateKey: string;
  activityCount: number;
  attendanceEntries: number;
};

function resolveSelectedDay(rawDate: string | undefined, now: Date) {
  const todayStart = startOfDay(now);
  if (!rawDate) {
    return todayStart;
  }

  const parsed = parse(rawDate, "yyyy-MM-dd", now);
  if (!isValid(parsed)) {
    return todayStart;
  }

  const selected = startOfDay(parsed);
  if (selected > todayStart) {
    return todayStart;
  }

  return selected;
}

export default async function AttendanceTrackerPage({ searchParams }: AttendanceTrackerPageProps) {
  const context = await requireModulePage("calendar");
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayKey = format(todayStart, "yyyy-MM-dd");
  const selectedDayStart = resolveSelectedDay(searchParams?.date, now);
  const selectedDayEnd = endOfDay(selectedDayStart);
  const selectedDayKey = format(selectedDayStart, "yyyy-MM-dd");
  const selectedDayIsToday = isToday(selectedDayStart);

  const presenceWindowStart = startOfMonth(subMonths(now, 1));
  const presenceWindowEnd = endOfDay(now);
  const pastDaysWindowStart = subDays(todayStart, 30);

  const [activities, pastActivities, activeResidents, settings] = await Promise.all([
    prisma.activityInstance.findMany({
      where: {
        facilityId: context.facilityId,
        startAt: {
          gte: selectedDayStart,
          lte: selectedDayEnd
        }
      },
      orderBy: { startAt: "asc" },
      include: {
        attendance: {
          select: {
            status: true,
            barrierReason: true
          }
        },
        _count: {
          select: {
            attendance: true
          }
        }
      }
    }),
    prisma.activityInstance.findMany({
      where: {
        facilityId: context.facilityId,
        startAt: {
          gte: pastDaysWindowStart,
          lt: todayStart
        }
      },
      orderBy: { startAt: "desc" },
      select: {
        startAt: true,
        _count: {
          select: {
            attendance: true
          }
        }
      }
    }),
    prisma.resident.findMany({
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
      select: { id: true }
    }),
    prisma.facilitySettings.findUnique({
      where: { facilityId: context.facilityId },
      select: { attendanceRulesJson: true }
    })
  ]);

  const weights = asAttendanceRules(settings?.attendanceRulesJson).engagementWeights;
  const engagementScaleMax = Math.max(weights.leading, weights.active, weights.present);
  const engagementScoreMap: Record<string, number> = {
    PRESENT: weights.present,
    ACTIVE: weights.active,
    LEADING: weights.leading,
    REFUSED: 0,
    NO_SHOW: 0
  };

  const activeResidentIds = activeResidents.map((resident) => resident.id);
  const activeResidentCount = activeResidentIds.length;
  const residentIdFilter = activeResidentIds.length > 0 ? { in: activeResidentIds } : { in: ["__none__"] };

  const presenceRows = await prisma.attendance.findMany({
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
  });

  const facilityPresence = computeFacilityPresenceMetrics({
    rows: presenceRows.map((row) => ({
      residentId: row.residentId,
      status: row.status,
      occurredAt: row.activityInstance.startAt
    })),
    activeResidentIds,
    activeResidentCount,
    now
  });

  const pastDaySummaryMap = new Map<string, PastDaySummary>();
  for (const activity of pastActivities) {
    const dateKey = format(activity.startAt, "yyyy-MM-dd");
    const existing = pastDaySummaryMap.get(dateKey);
    if (existing) {
      existing.activityCount += 1;
      existing.attendanceEntries += activity._count.attendance;
    } else {
      pastDaySummaryMap.set(dateKey, {
        dateKey,
        activityCount: 1,
        attendanceEntries: activity._count.attendance
      });
    }
  }
  const pastDaySummaries = Array.from(pastDaySummaryMap.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const totalAttendanceEntries = activities.reduce((sum, activity) => sum + activity._count.attendance, 0);
  const activitiesWithAttendance = activities.filter((activity) => activity._count.attendance > 0).length;
  const coverageRate = activities.length > 0 ? (activitiesWithAttendance / activities.length) * 100 : 0;
  const overallEngagement = totalAttendanceEntries > 0
    ? (
        activities.reduce(
          (sum, activity) =>
            sum + activity.attendance.reduce((inner, row) => inner + (engagementScoreMap[row.status] ?? 0), 0),
          0
        ) / totalAttendanceEntries
      )
    : 0;

  const monthDeltaLabel = facilityPresence.monthOverMonthDelta === null
    ? "No prior month attendance data yet."
    : facilityPresence.monthOverMonthDelta > 0
      ? `Up ${facilityPresence.monthOverMonthDelta.toFixed(1)} pts from last month.`
      : facilityPresence.monthOverMonthDelta < 0
        ? `Down ${Math.abs(facilityPresence.monthOverMonthDelta).toFixed(1)} pts from last month.`
        : "No change from last month.";

  const previousDayKey = format(addDays(selectedDayStart, -1), "yyyy-MM-dd");
  const nextDay = addDays(selectedDayStart, 1);
  const nextDayKey = format(nextDay, "yyyy-MM-dd");
  const canGoForward = nextDay <= todayStart;
  const selectedDayLabel = format(selectedDayStart, "EEEE, MMM d");

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-actifyBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-8 left-20 h-36 w-36 rounded-full bg-actifyMint/20 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Attendance Tracker</h1>
              <Badge className="border-0 bg-actify-warm text-foreground">Live</Badge>
            </div>
            <p className="max-w-3xl text-sm text-foreground/75">
              The queue now defaults to today only. Choose a past date below to review and update earlier attendance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton asChild size="sm" variant="dense" className="min-w-[9.5rem] justify-center">
              <Link href="/app/calendar" className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Open calendar
              </Link>
            </GlassButton>
            <GlassButton asChild size="sm" variant="dense" className="min-w-[9.5rem] justify-center">
              <Link href="/app/analytics" className="inline-flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Open analytics
              </Link>
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      <GlassCard variant="dense">
        <div className="glass-content space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Queue day</h2>
              <p className="text-sm text-foreground/70">{selectedDayLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GlassButton asChild size="sm" variant={selectedDayIsToday ? "warm" : "dense"}>
                <Link href="/app/attendance">Today</Link>
              </GlassButton>
              <GlassButton asChild size="sm" variant="dense">
                <Link href={`/app/calendar/day/${selectedDayKey}`}>View day details</Link>
              </GlassButton>
            </div>
          </div>

          <form method="GET" className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Past date
              <Input name="date" type="date" max={todayKey} defaultValue={selectedDayKey} className="mt-1 w-[12.5rem] bg-white/85" />
            </label>
            <GlassButton type="submit" size="sm" variant="dense" className="min-w-[8rem] justify-center">
              Load day
            </GlassButton>
            {!selectedDayIsToday ? (
              <div className="ml-auto flex flex-wrap gap-2">
                <GlassButton asChild size="sm" variant="dense">
                  <Link href={`/app/attendance?date=${previousDayKey}`}>Previous day</Link>
                </GlassButton>
                {canGoForward ? (
                  <GlassButton asChild size="sm" variant="dense">
                    <Link href={`/app/attendance?date=${nextDayKey}`}>Next day</Link>
                  </GlassButton>
                ) : null}
              </div>
            ) : null}
          </form>
        </div>
      </GlassCard>

      <section className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-5">
        <GlassCard variant="dense" className="h-full min-h-[144px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyBlue/15 text-actifyBlue">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Activities on day</p>
              <p className="text-2xl font-semibold text-foreground">{activities.length}</p>
              <p className="text-xs text-foreground/70">{selectedDayLabel}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[144px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyMint/20 text-foreground">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Attendance entries</p>
              <p className="text-2xl font-semibold text-foreground">{totalAttendanceEntries}</p>
              <p className="text-xs text-foreground/70">{coverageRate.toFixed(1)}% of activities have entries</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[144px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyCoral/20 text-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Avg engagement</p>
              <p className="text-2xl font-semibold text-foreground">{overallEngagement.toFixed(1)} / {engagementScaleMax}</p>
              <p className="text-xs text-foreground/70">
                PRESENT={weights.present}, ACTIVE={weights.active}, LEADING={weights.leading}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[144px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Present today</p>
              <p className="text-2xl font-semibold text-foreground">{facilityPresence.todayPresentPercent.toFixed(1)}%</p>
            </div>
            <p className="text-xs text-foreground/70">
              {facilityPresence.todayPresentResidents}/{facilityPresence.activeResidentCount} residents
            </p>
          </div>
        </GlassCard>
        <GlassCard variant="dense" className="h-full min-h-[144px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Present this month</p>
              <p className="text-2xl font-semibold text-foreground">{facilityPresence.currentMonthPresentPercent.toFixed(1)}%</p>
            </div>
            <p className="text-xs text-foreground/70">
              {facilityPresence.currentMonthPresentResidents}/{facilityPresence.activeResidentCount} residents
            </p>
            <p className="text-xs text-foreground/70">{monthDeltaLabel}</p>
          </div>
        </GlassCard>
      </section>

      <GlassCard variant="dense">
        <div className="glass-content space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Activity attendance queue</h2>
            <Badge variant="outline">
              {activities.length} activities · {selectedDayIsToday ? "Today" : selectedDayKey}
            </Badge>
          </div>

          {activities.length === 0 && (
            <p className="rounded-lg border border-white/70 bg-white/65 px-4 py-3 text-sm text-foreground/70">
              No activities scheduled for this day.
            </p>
          )}

          <div className="space-y-2">
            {activities.map((activity) => {
              const statusCounts = {
                PRESENT_ACTIVE: 0,
                LEADING: 0,
                REFUSED: 0,
                NO_SHOW: 0
              };
              for (const row of activity.attendance) {
                // Count explicit refusal barriers as refusals in queue stats.
                if (row.status === "REFUSED" || row.barrierReason === "REFUSED") {
                  statusCounts.REFUSED = (statusCounts.REFUSED ?? 0) + 1;
                  continue;
                }
                if (row.status === "NO_SHOW") {
                  statusCounts.NO_SHOW = (statusCounts.NO_SHOW ?? 0) + 1;
                  continue;
                }
                if (row.status === "LEADING") {
                  statusCounts.LEADING = (statusCounts.LEADING ?? 0) + 1;
                  continue;
                }
                if (row.status === "PRESENT" || row.status === "ACTIVE") {
                  statusCounts.PRESENT_ACTIVE = (statusCounts.PRESENT_ACTIVE ?? 0) + 1;
                  continue;
                }
              }

              const rowScore = activity.attendance.length > 0
                ? activity.attendance.reduce((sum, row) => sum + (engagementScoreMap[row.status] ?? 0), 0) / activity.attendance.length
                : 0;
              const hasEntries = activity._count.attendance > 0;
              const timingLabel = isToday(activity.startAt) ? "Today" : "Past day";

              return (
                <div
                  key={activity.id}
                  className="rounded-xl border border-white/70 bg-white/65 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-foreground/70">
                        {format(activity.startAt, "EEE, MMM d · h:mm a")} - {format(activity.endAt, "h:mm a")} · {activity.location}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{timingLabel}</Badge>
                      <Badge variant="secondary">{activity._count.attendance} entries</Badge>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/75">
                    <span className="rounded-full bg-actifyBlue/10 px-2 py-0.5">Present/Active: {statusCounts.PRESENT_ACTIVE}</span>
                    <span className="rounded-full bg-actifyCoral/15 px-2 py-0.5">Leading: {statusCounts.LEADING}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5">Refused: {statusCounts.REFUSED}</span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5">No show: {statusCounts.NO_SHOW}</span>
                    <span className="rounded-full border border-white/70 bg-white/70 px-2 py-0.5">
                      Engagement: {rowScore.toFixed(1)} / {engagementScaleMax}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <GlassButton asChild size="sm" className="min-w-[11rem] justify-center">
                      <Link href={`/app/calendar/${activity.id}/attendance`} className="inline-flex items-center gap-1.5">
                        <ClipboardCheck className="h-4 w-4" />
                        {hasEntries ? "Update attendance" : "Start attendance"}
                      </Link>
                    </GlassButton>
                    <GlassButton asChild size="sm" variant="dense" className="min-w-[9.5rem] justify-center">
                      <Link
                        href={`/app/calendar/day/${format(activity.startAt, "yyyy-MM-dd")}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        <CalendarDays className="h-4 w-4" />
                        View day
                      </Link>
                    </GlassButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <GlassCard variant="dense">
        <div className="glass-content space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Past days</h2>
            <Badge variant="outline">Last 30 days</Badge>
          </div>
          {pastDaySummaries.length === 0 ? (
            <p className="rounded-lg border border-white/70 bg-white/65 px-4 py-3 text-sm text-foreground/70">
              No past activity days in the last 30 days.
            </p>
          ) : (
            <div className="space-y-2">
              {pastDaySummaries.map((day) => (
                <div
                  key={day.dateKey}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/65 p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{format(parse(day.dateKey, "yyyy-MM-dd", now), "EEEE, MMM d")}</p>
                    <p className="text-xs text-foreground/70">
                      {day.activityCount} activities · {day.attendanceEntries} attendance entries
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <GlassButton asChild size="sm" variant={day.dateKey === selectedDayKey ? "warm" : "dense"}>
                      <Link href={`/app/attendance?date=${day.dateKey}`}>
                        {day.dateKey === selectedDayKey ? "Viewing queue" : "Open queue"}
                      </Link>
                    </GlassButton>
                    <GlassButton asChild size="sm" variant="dense">
                      <Link href={`/app/calendar/day/${day.dateKey}`}>View day</Link>
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
