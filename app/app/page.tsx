import Link from "next/link";
import { CalendarDays, ClipboardCheck, Package, Users } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { LiveDateTimeBadge } from "@/components/app/live-date-time-badge";
import { DailyBoostQuote } from "@/components/dashboard/DailyBoostQuote";
import { OneOnOneSpotlight } from "@/components/dashboard/one-on-one-spotlight";
import { CountUpValue } from "@/components/motion/CountUpValue";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { requireFacilityContext } from "@/lib/auth";
import { computeFacilityPresenceMetrics } from "@/lib/facility-presence";
import { getOneOnOneSpotlightSnapshot, serializeOneOnOneSpotlightSnapshot } from "@/lib/one-on-one-queue/service";
import { asModuleFlags } from "@/lib/module-flags";
import { ensureUserNotificationFeed } from "@/lib/notifications/service";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { asAttendanceRules } from "@/lib/settings/defaults";
import {
  endOfZonedDay,
  endOfZonedWeek,
  formatInTimeZone,
  startOfZonedDay,
  startOfZonedMonthShift,
  startOfZonedWeek,
  subtractDays
} from "@/lib/timezone";

const attendanceStatusMeta = [
  { status: "PRESENT_ACTIVE", label: "Present/Active", tone: "bg-actifyBlue/20 text-actifyBlue" },
  { status: "LEADING", label: "Leading", tone: "bg-actifyCoral/20 text-foreground" },
  { status: "REFUSED", label: "Refused", tone: "bg-amber-100 text-amber-700" },
  { status: "NO_SHOW", label: "No Show", tone: "bg-rose-100 text-rose-700" }
];

export default async function DashboardPage() {
  const { facilityId, facility, role, user } = await requireFacilityContext();
  const canEditOneOnOne = canWrite(role);
  const timeZone = facility.timezone;
  const moduleFlags = asModuleFlags(facility.moduleFlags);
  await ensureUserNotificationFeed({
    userId: user.id,
    facilityId,
    timezone: timeZone
  });

  const now = new Date();
  const weekStart = startOfZonedWeek(now, timeZone, 1);
  const weekEnd = endOfZonedWeek(now, timeZone, 1);
  const dayStart = startOfZonedDay(now, timeZone);
  const dayEnd = endOfZonedDay(now, timeZone);
  const last7 = subtractDays(now, 7);
  const last30 = subtractDays(now, 30);
  const presenceWindowStart = startOfZonedMonthShift(now, timeZone, -1);
  const presenceWindowEnd = dayEnd;

  const [
    activeResidentCount,
    scheduledThisWeek,
    presenceRows,
    inventoryLevels,
    prizeLevels,
    todaysActivities,
    settings,
    oneOnOneSnapshot,
    birthdayResidents
  ] = await Promise.all([
    prisma.resident.count({
      where: {
        facilityId,
        OR: [
          { isActive: true },
          { status: { in: ["ACTIVE", "BED_BOUND"] } }
        ],
        NOT: {
          status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
        }
      },
    }),
    prisma.activityInstance.count({
      where: {
        facilityId,
        startAt: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    }),
    prisma.attendance.findMany({
      where: {
        resident: {
          facilityId,
          OR: [
            { isActive: true },
            { status: { in: ["ACTIVE", "BED_BOUND"] } }
          ],
          NOT: {
            status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
          }
        },
        activityInstance: {
          facilityId,
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
    prisma.inventoryItem.findMany({
      where: { facilityId },
      select: {
        onHand: true,
        reorderAt: true
      }
    }),
    prisma.prizeItem.findMany({
      where: { facilityId },
      select: {
        onHand: true,
        reorderAt: true
      }
    }),
    prisma.activityInstance.findMany({
      where: {
        facilityId,
        startAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      orderBy: { startAt: "asc" },
      take: 4,
      select: {
        id: true,
        title: true,
        startAt: true,
        location: true
      }
    }),
    prisma.facilitySettings.findUnique({
      where: { facilityId },
      select: {
        attendanceRulesJson: true
      }
    }),
    getOneOnOneSpotlightSnapshot({
      facilityId
    }),
    prisma.resident.findMany({
      where: {
        facilityId,
        birthDate: { not: null },
        NOT: {
          status: {
            in: ["DISCHARGED", "TRANSFERRED", "DECEASED"]
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        birthDate: true
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
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
  const engagementScaleMax = Math.max(weights.leading, weights.active, weights.present);

  const activeResidents = activeResidentCount;
  const attendanceRows30 = presenceRows.filter(
    (row) => row.activityInstance.startAt >= last30 && row.activityInstance.startAt <= now
  );
  const facilityPresence = computeFacilityPresenceMetrics({
    rows: presenceRows.map((row) => ({
      residentId: row.residentId,
      status: row.status,
      occurredAt: row.activityInstance.startAt
    })),
    activeResidentCount: activeResidents,
    now,
    timeZone
  });
  const attendanceRows7 = attendanceRows30.filter((row) => row.activityInstance.startAt >= last7);
  const engagementAverage7 = attendanceRows7.length === 0
    ? 0
    : Number((attendanceRows7.reduce((sum, row) => sum + (scoreMap[row.status] ?? 0), 0) / attendanceRows7.length).toFixed(1));

  const inventoryAlerts = inventoryLevels.filter((item) => item.onHand < item.reorderAt).length;
  const prizeAlerts = prizeLevels.filter((item) => item.onHand < item.reorderAt).length;
  const lowStockAlerts = inventoryAlerts + prizeAlerts;

  const statusCounts: Record<string, number> = {
    PRESENT_ACTIVE: 0,
    LEADING: 0,
    REFUSED: 0,
    NO_SHOW: 0
  };

  for (const row of attendanceRows30) {
    if (row.status === "PRESENT" || row.status === "ACTIVE") {
      statusCounts.PRESENT_ACTIVE = (statusCounts.PRESENT_ACTIVE ?? 0) + 1;
      continue;
    }
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  const totalAttendance30 = attendanceRows30.length;
  const statusBreakdown = attendanceStatusMeta.map((item) => {
    const count = statusCounts[item.status] ?? 0;
    const percent = totalAttendance30 === 0 ? 0 : Number(((count / totalAttendance30) * 100).toFixed(1));
    return {
      ...item,
      count,
      percent
    };
  });
  const monthDeltaLabel = facilityPresence.monthOverMonthDelta === null
    ? "No prior month attendance data yet."
    : facilityPresence.monthOverMonthDelta > 0
      ? `Up ${facilityPresence.monthOverMonthDelta.toFixed(1)} pts from last month.`
      : facilityPresence.monthOverMonthDelta < 0
        ? `Down ${Math.abs(facilityPresence.monthOverMonthDelta).toFixed(1)} pts from last month.`
        : "No change from last month.";

  const overviewStats = [
    {
      label: "Active Residents",
      value: activeResidents,
      detail: "Residents tab",
      icon: Users,
      iconTone: "bg-actifyBlue/20 text-actifyBlue"
    },
    {
      label: "Activities This Week",
      value: scheduledThisWeek,
      detail: "Calendar tab",
      icon: CalendarDays,
      iconTone: "bg-actifyMint/20 text-foreground"
    },
    {
      label: "Attendance Entries",
      value: totalAttendance30,
      detail: "Last 30 days",
      icon: ClipboardCheck,
      iconTone: "bg-actifyCoral/20 text-foreground"
    },
    {
      label: "Low Stock Alerts",
      value: lowStockAlerts,
      detail: `Inventory ${inventoryAlerts} · Prize ${prizeAlerts}`,
      icon: Package,
      iconTone: "bg-amber-100 text-amber-700"
    }
  ];

  const schedulePreview = todaysActivities.map((item) => ({
    id: item.id,
    time: formatInTimeZone(item.startAt, timeZone, {
      hour: "numeric",
      minute: "2-digit"
    }),
    name: item.title,
    location: item.location
  }));
  const todayMonthDay = formatInTimeZone(now, timeZone, { month: "2-digit", day: "2-digit" });
  const birthdaysToday = birthdayResidents.filter((resident) => {
    if (!resident.birthDate) return false;
    const residentMonthDay = formatInTimeZone(resident.birthDate, "UTC", { month: "2-digit", day: "2-digit" });
    return residentMonthDay === todayMonthDay;
  });
  const showBirthdaysWidget = moduleFlags.widgets.birthdays;

  return (
    <div className="space-y-6">
      <Reveal>
        <GlassPanel variant="warm" className="relative overflow-hidden px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2">
                <LiveDateTimeBadge timeZone={timeZone} mode="date-time" />
                <Badge variant="outline">Engagement (7d): {engagementAverage7.toFixed(1)} / {engagementScaleMax}</Badge>
              </div>
              <p className="text-sm text-foreground/70">
                Live snapshot from Residents, Calendar, Attendance, Inventory, and Prize Cart.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <GlassButton asChild size="sm" magnetic>
                <Link href="/app/notes/new">New note</Link>
              </GlassButton>
              <GlassButton asChild size="sm" variant="dense">
                <Link href="/app/calendar">Calendar</Link>
              </GlassButton>
              <GlassButton asChild size="sm" variant="dense">
                <Link href="/app/reports">Reports</Link>
              </GlassButton>
            </div>
          </div>
        </GlassPanel>
      </Reveal>

      <section className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((item, index) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.label} delayMs={index * 90} className="h-full">
              <GlassCard hover variant="dense" className="h-full min-h-[152px]">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-xl p-2 ${item.iconTone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-right text-xs uppercase tracking-wide text-foreground/60">{item.label}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">
                      <CountUpValue
                        value={item.value}
                        durationMs={760}
                      />
                    </p>
                    <p className="mt-1 text-xs text-foreground/70">{item.detail}</p>
                  </div>
                </div>
              </GlassCard>
            </Reveal>
          );
        })}
      </section>

      <section className="grid gap-4 xl:auto-rows-fr xl:grid-cols-2">
        <Reveal delayMs={110} className="h-full">
          <GlassCard variant="dense" className="h-full">
            <div className="flex h-full flex-col">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Attendance Overview</h2>
                  <p className="text-xs text-foreground/70">
                    Clear resident-based attendance totals so the numbers are easy to compare.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Resident-based</Badge>
                  <Badge variant="secondary">{activeResidents} active residents</Badge>
                </div>
              </div>

              <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex h-full min-h-28 flex-col justify-between rounded-xl border border-white/75 bg-white/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-foreground/65">Total Attended Residents</p>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-actifyBlue/15 text-actifyBlue">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    <CountUpValue value={facilityPresence.currentMonthTotalResidentsAttended} />
                  </p>
                  <p className="text-[11px] text-foreground/70">{facilityPresence.activeResidentCount} active residents in facility.</p>
                </div>
                <div className="flex h-full min-h-28 flex-col justify-between rounded-xl border border-white/75 bg-white/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-foreground/65">Residents Participated</p>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-actifyMint/20 text-foreground">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    <CountUpValue value={facilityPresence.currentMonthResidentsParticipated} />
                  </p>
                  <p className="text-[11px] text-foreground/70">Unique residents with Present/Active/Leading this month.</p>
                </div>
                <div className="flex h-full min-h-28 flex-col justify-between rounded-xl border border-white/75 bg-white/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-foreground/65">Participation %</p>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-actifyCoral/20 text-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    <CountUpValue value={facilityPresence.currentMonthParticipationPercent} decimals={1} suffix="%" />
                  </p>
                  <p className="text-[11px] text-foreground/70">
                    {facilityPresence.currentMonthResidentsParticipated} of {facilityPresence.activeResidentCount} active residents.
                  </p>
                  <p className="text-[11px] text-foreground/70">{monthDeltaLabel}</p>
                </div>
                <div className="flex h-full min-h-28 flex-col justify-between rounded-xl border border-white/75 bg-white/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-foreground/65">Average Daily %</p>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-actifyBlue/15 text-actifyBlue">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    <CountUpValue value={facilityPresence.currentMonthAverageDailyPercent} decimals={1} suffix="%" />
                  </p>
                  <p className="text-[11px] text-foreground/70">
                    Average daily resident participation in current month.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/70 bg-white/60 p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Entry status mix (30d)</p>
                  <p className="text-xs text-foreground/70">{totalAttendance30} total entries</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {statusBreakdown.map((item) => (
                    <div key={item.status} className="rounded-lg border border-white/70 bg-white/70 p-2.5">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className={`rounded-full px-2 py-0.5 ${item.tone}`}>{item.label}</span>
                        <span className="text-foreground/70">{item.count} ({item.percent.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/60">
                        <div className="h-2 rounded-full bg-actify-brand" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </Reveal>

        <Reveal delayMs={180} className="h-full">
          <GlassCard variant="dense" className="h-full">
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Today&apos;s schedule</h2>
                <LiveDateTimeBadge timeZone={timeZone} mode="short-date" variant="secondary" />
              </div>
              <div className="flex-1 space-y-2">
                {schedulePreview.length === 0 && (
                  <div className="rounded-lg border border-white/70 bg-white/65 px-3 py-3 text-sm text-foreground/70">
                    No activities scheduled today.
                  </div>
                )}
                {schedulePreview.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/70 bg-white/65 px-3 py-3">
                    <p className="text-xs uppercase tracking-wide text-foreground/65">{item.time}</p>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-foreground/70">{item.location}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <GlassButton asChild size="sm" variant="dense">
                  <Link href="/app/calendar">View full calendar</Link>
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </section>

      <section>
        <Reveal delayMs={220}>
          <OneOnOneSpotlight
            initialSnapshot={serializeOneOnOneSpotlightSnapshot(oneOnOneSnapshot)}
            canEdit={canEditOneOnOne}
            timeZone={timeZone}
          />
        </Reveal>
      </section>

      {showBirthdaysWidget ? (
        <section>
          <Reveal delayMs={250}>
            <GlassCard variant="dense" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Resident Birthdays</h2>
                <Badge variant="secondary">{birthdaysToday.length} today</Badge>
              </div>
              {birthdaysToday.length === 0 ? (
                <p className="text-sm text-foreground/70">No resident birthdays today.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {birthdaysToday.map((resident) => (
                    <div key={resident.id} className="rounded-lg border border-white/70 bg-white/65 px-3 py-2.5">
                      <p className="text-sm font-medium">{resident.firstName} {resident.lastName}</p>
                      <p className="text-xs text-foreground/70">Room {resident.room}</p>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <GlassButton asChild size="sm" variant="dense">
                  <Link href="/app/residents">Open residents</Link>
                </GlassButton>
              </div>
            </GlassCard>
          </Reveal>
        </section>
      ) : null}

      <section className="mt-10 border-t border-border/60 pt-8">
        <DailyBoostQuote />
      </section>

    </div>
  );
}
