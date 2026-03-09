import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  FileText,
  HeartHandshake,
  Package,
  Sparkles,
  TrendingUp,
  UsersRound
} from "lucide-react";

import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";
import { cn } from "@/lib/utils";

type DashboardCommandCenterProps = {
  summary: DashboardCommandCenterSummary;
};

const MODULE_COLOR: Record<
  DashboardCommandCenterSummary["missions"][number]["module"],
  { dot: string; chip: string; link: string }
> = {
  calendar: {
    dot: "bg-blue-500",
    chip: "bg-blue-500/20 text-blue-200 border-blue-400/35",
    link: "text-blue-200 hover:text-blue-100"
  },
  attendance: {
    dot: "bg-sky-400",
    chip: "bg-sky-500/20 text-sky-200 border-sky-400/35",
    link: "text-sky-200 hover:text-sky-100"
  },
  notes: {
    dot: "bg-violet-400",
    chip: "bg-violet-500/20 text-violet-200 border-violet-400/35",
    link: "text-violet-200 hover:text-violet-100"
  },
  oneToOne: {
    dot: "bg-orange-400",
    chip: "bg-orange-500/20 text-orange-100 border-orange-400/35",
    link: "text-orange-100 hover:text-orange-50"
  },
  carePlan: {
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/20 text-emerald-100 border-emerald-400/35",
    link: "text-emerald-100 hover:text-emerald-50"
  },
  budgetStock: {
    dot: "bg-rose-400",
    chip: "bg-rose-500/20 text-rose-100 border-rose-400/35",
    link: "text-rose-100 hover:text-rose-50"
  },
  volunteers: {
    dot: "bg-fuchsia-400",
    chip: "bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/35",
    link: "text-fuchsia-100 hover:text-fuchsia-50"
  },
  residentCouncil: {
    dot: "bg-amber-400",
    chip: "bg-amber-500/20 text-amber-100 border-amber-400/35",
    link: "text-amber-100 hover:text-amber-50"
  },
  reports: {
    dot: "bg-zinc-400",
    chip: "bg-zinc-500/20 text-zinc-100 border-zinc-400/35",
    link: "text-zinc-100 hover:text-zinc-50"
  },
  residents: {
    dot: "bg-cyan-400",
    chip: "bg-cyan-500/20 text-cyan-100 border-cyan-400/35",
    link: "text-cyan-100 hover:text-cyan-50"
  }
};

function DashboardCard({
  title,
  subtitle,
  icon,
  action,
  className,
  children
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.6rem] border border-white/10 bg-[#181c25] p-5 shadow-[0_16px_34px_rgba(0,0,0,0.34)] transition-transform duration-200 hover:-translate-y-[2px]",
        className
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-[1rem] font-bold tracking-tight text-white">{title}</h2>
          {subtitle ? <p className="text-xs uppercase tracking-[0.14em] text-white/55">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {icon ? <div className="text-white/70">{icon}</div> : null}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

function ProgressBar({
  value,
  tone = "blue"
}: {
  value: number;
  tone?: "blue" | "violet" | "emerald" | "orange" | "sky" | "rose";
}) {
  const colors: Record<typeof tone, string> = {
    blue: "from-blue-400 to-blue-600",
    violet: "from-violet-400 to-violet-600",
    emerald: "from-emerald-400 to-emerald-600",
    orange: "from-orange-400 to-orange-600",
    sky: "from-sky-400 to-sky-600",
    rose: "from-rose-400 to-rose-600"
  };
  return (
    <div className="h-2.5 rounded-full bg-white/10">
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", colors[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function SmallMeta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function DashboardCommandCenter({ summary }: DashboardCommandCenterProps) {
  const overdueCareOrDocs = summary.hero.overdueItemsCount;

  return (
    <div className="-mx-2 rounded-[2rem] border border-[#2a3142] bg-[#0f1117] px-4 pb-24 pt-3 md:px-6">
      <section className="rounded-[2rem] border border-[#323b50] bg-[#131927] p-6 shadow-[0_20px_48px_rgba(0,0,0,0.4)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Today in Actify</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Command Center</h1>
            <p className="text-sm uppercase tracking-[0.15em] text-white/60">
              {summary.hero.dayOfWeek} · {summary.hero.fullDate}
            </p>
            <p className="text-base text-white/80">{summary.hero.facilityName}</p>
            <p className="max-w-3xl text-sm leading-relaxed text-white/80">{summary.hero.smartSummary}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#1d2333] p-4">
              <SmallMeta label="Census" value={summary.hero.censusCount} />
            </div>
            <div className="rounded-2xl bg-[#1d2333] p-4">
              <SmallMeta label="Scheduled Today" value={summary.hero.scheduledTodayCount} />
            </div>
            <div className="rounded-2xl bg-[#1d2333] p-4">
              <SmallMeta label="Needs 1:1" value={summary.hero.oneToOneNeededThisMonthCount} />
            </div>
            <div className="rounded-2xl bg-[#1d2333] p-4">
              <SmallMeta label="Overdue Items" value={overdueCareOrDocs} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Daily Mission Strip</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.missions.map((mission) => {
            const palette = MODULE_COLOR[mission.module];
            return (
              <Link
                key={mission.id}
                href={mission.href}
                className={cn(
                  "group rounded-2xl border bg-[#181c25] p-4 transition-all duration-200 hover:-translate-y-[2px] hover:border-white/25",
                  mission.priority === "high" ? "border-white/20" : "border-white/10"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", palette.dot)} />
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                    {mission.priority === "high" ? "High Priority" : mission.priority === "medium" ? "Next Up" : "Queued"}
                  </p>
                </div>
                <h3 className="mt-2 text-lg font-bold text-white">{mission.title}</h3>
                <p className="mt-2 text-sm text-white/75">{mission.detail}</p>
                <p className={cn("mt-3 inline-flex items-center gap-1 text-sm font-semibold", palette.link)}>
                  {mission.ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <DashboardCard
            title="Today’s Schedule / Timeline"
            subtitle="Ready to run"
            icon={<CalendarClock className="h-5 w-5" />}
            action={
              <Link href="/app/calendar?view=day" className="text-xs font-semibold text-white/70 hover:text-white">
                Open full calendar
              </Link>
            }
          >
            <div className="space-y-3">
              {summary.timeline.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/20 bg-[#11161f] px-4 py-6 text-sm text-white/65">
                  No activities scheduled today.
                </p>
              ) : null}
              {summary.timeline.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-2xl border bg-[#121722] p-4",
                    item.isNextUp ? "border-blue-400/60" : "border-white/10"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{item.title}</h3>
                        {item.isNextUp ? (
                          <span className="rounded-full border border-blue-300/40 bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100">
                            Next up
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-white/75">{item.timeLabel} · {item.location}</p>
                      {item.templateSource ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">Template: {item.templateSource}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.11em]",
                          item.attendanceCompleted
                            ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                            : "border-amber-300/40 bg-amber-500/20 text-amber-100"
                        )}
                      >
                        {item.attendanceCompleted ? "Attendance complete" : "Attendance pending"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.11em]",
                          item.documentationCompleted
                            ? "border-violet-300/40 bg-violet-500/20 text-violet-100"
                            : "border-rose-300/40 bg-rose-500/20 text-rose-100"
                        )}
                      >
                        {item.documentationCompleted ? "Documentation complete" : "Documentation missing"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={item.attendanceHref} className="rounded-lg border border-white/15 bg-[#1c2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">
                      Mark attendance
                    </Link>
                    <Link href={item.openHref} className="rounded-lg border border-white/15 bg-[#1c2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">
                      Open details
                    </Link>
                    <Link href={item.editHref} className="rounded-lg border border-white/15 bg-[#1c2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">
                      Edit activity
                    </Link>
                    <Link href={item.noteHref} className="rounded-lg border border-white/15 bg-[#1c2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">
                      Create note
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Resident Attention Board"
            subtitle="Needs attention"
            icon={<UsersRound className="h-5 w-5" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {summary.residentAttention.map((category) => (
                <section key={category.key} className="rounded-2xl border border-white/10 bg-[#111722] p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{category.title}</h3>
                      <p className="text-xs text-white/60">{category.description}</p>
                    </div>
                    <Link href={category.viewAllHref} className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", MODULE_COLOR[category.module].chip)}>
                      View all
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {category.items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs text-white/65">No residents in this category.</p>
                    ) : null}
                    {category.items.slice(0, 4).map((item) => (
                      <article key={item.id} className="rounded-xl border border-white/10 bg-[#0f141d] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-white/60">Room {item.room} · {item.status}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.chips.slice(0, 2).map((chip) => (
                              <span key={chip} className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/60">
                                {chip}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-white/75">{item.reason}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link href={item.primaryAction.href} className="rounded-md border border-white/15 bg-[#1b2433] px-2.5 py-1 text-[11px] font-semibold text-white hover:border-white/30">
                            {item.primaryAction.label}
                          </Link>
                          {item.secondaryAction ? (
                            <Link href={item.secondaryAction.href} className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/75 hover:border-white/25 hover:text-white">
                              {item.secondaryAction.label}
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <DashboardCard
            title="Progress / Momentum"
            subtitle="Ahead this week"
            icon={<TrendingUp className="h-5 w-5" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Daily Participation</p>
                <p className="mt-1 text-3xl font-black text-white">{summary.momentum.dailyParticipationRate}%</p>
                <ProgressBar value={summary.momentum.dailyParticipationRate} tone="sky" />
              </div>
              <div className="rounded-2xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Weekly Trend</p>
                <p className="mt-1 text-3xl font-black text-white">{summary.momentum.weeklyParticipationTrend >= 0 ? "+" : ""}{summary.momentum.weeklyParticipationTrend}%</p>
                <ProgressBar value={Math.abs(summary.momentum.weeklyParticipationTrend)} tone="blue" />
              </div>
              <div className="rounded-2xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Monthly Goal Progress</p>
                <p className="mt-1 text-3xl font-black text-white">{summary.momentum.monthlyParticipationGoalProgress}%</p>
                <ProgressBar value={summary.momentum.monthlyParticipationGoalProgress} tone="violet" />
              </div>
              <div className="rounded-2xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">1:1 Completion</p>
                <p className="mt-1 text-3xl font-black text-white">{summary.momentum.monthlyOneOnOneCompletionRate}%</p>
                <ProgressBar value={summary.momentum.monthlyOneOnOneCompletionRate} tone="orange" />
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Documentation completion</p>
                <p className="mt-1 text-xl font-bold text-white">{summary.momentum.documentationCompletionRate}%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Care plan coverage</p>
                <p className="mt-1 text-xl font-bold text-white">{summary.momentum.carePlanCompletionRate}%</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Inventory / Budget Pulse" subtitle="Low stock" icon={<Package className="h-5 w-5" />}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Low stock alerts</p>
                <p className="mt-1 text-2xl font-black text-white">{summary.inventoryPulse.lowStockCount}</p>
              </div>
              <div className="rounded-xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Month spending</p>
                <p className="mt-1 text-2xl font-black text-white">${summary.inventoryPulse.monthSpending.toFixed(0)}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {summary.inventoryPulse.lowStockItems.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#10161f] px-3 py-2 text-sm text-white/80">
                  <span>{item.name}</span>
                  <span className="text-xs text-rose-200">On hand {item.onHand} / {item.threshold}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/app/dashboard/budget-stock?tab=stock&open=inventory" className="rounded-lg border border-white/15 bg-[#1b2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">
                Quick-add inventory
              </Link>
              <Link href="/app/dashboard/budget-stock?tab=stock&mode=LOW" className="rounded-lg border border-white/15 bg-[#1b2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">
                Quick restock
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard title="Notes + Documentation Hub" subtitle="Still missing" icon={<FileText className="h-5 w-5" />}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Notes today</p>
                <p className="mt-1 text-2xl font-black text-white">{summary.notesHub.notesCreatedToday}</p>
              </div>
              <div className="rounded-xl bg-[#111722] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">1:1 today</p>
                <p className="mt-1 text-2xl font-black text-white">{summary.notesHub.oneToOneCreatedToday}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-orange-300/30 bg-orange-500/10 px-3 py-2 text-orange-100">
                Overdue 1:1: {summary.notesHub.overdueOneToOneCount}
              </div>
              <div className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-rose-100">
                Missing group docs: {summary.notesHub.groupDocumentationMissingCount}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {summary.notesHub.recentActivity.slice(0, 4).map((note) => (
                <Link
                  key={note.id}
                  href={note.href}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-[#10161f] px-3 py-2 text-sm text-white/80 hover:border-white/25"
                >
                  <span>{note.residentName} · {note.room}</span>
                  <span className="text-xs uppercase tracking-[0.12em] text-white/50">{note.type === "ONE_TO_ONE" ? "1:1" : "Group"}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/app/notes/new?type=general" className="rounded-lg border border-white/15 bg-[#1b2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">New Note</Link>
              <Link href="/app/notes/new?type=1on1" className="rounded-lg border border-white/15 bg-[#1b2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">New 1:1 Note</Link>
              <Link href="/app/notes" className="rounded-lg border border-white/15 bg-[#1b2433] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30">View Recent Notes</Link>
            </div>
          </DashboardCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <DashboardCard title="Upcoming + Planning" subtitle="Plan tomorrow" icon={<CalendarDays className="h-5 w-5" />} className="xl:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#10161f] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Tomorrow’s activities</p>
              <p className="mt-1 text-2xl font-black text-white">{summary.upcoming.tomorrowActivityCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#10161f] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Volunteer coverage (7d)</p>
              <p className="mt-1 text-2xl font-black text-white">{summary.upcoming.volunteerCoverageSoon.shifts} shifts</p>
              <p className="text-xs text-white/55">{summary.upcoming.volunteerCoverageSoon.hours} hours planned</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#10161f] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Next outing / special event</p>
              {summary.upcoming.nextOuting ? (
                <div className="mt-1 text-sm text-white/85">
                  <p className="font-semibold">{summary.upcoming.nextOuting.title}</p>
                  <p>{summary.upcoming.nextOuting.when}</p>
                  <p className="text-white/65">{summary.upcoming.nextOuting.location}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-white/65">No upcoming outing identified.</p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-[#10161f] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Next resident council meeting</p>
              {summary.upcoming.nextResidentCouncilMeeting ? (
                <div className="mt-1 text-sm text-white/85">
                  <p className="font-semibold">{summary.upcoming.nextResidentCouncilMeeting.when}</p>
                  <p className="text-white/65">Last attendance: {summary.upcoming.nextResidentCouncilMeeting.attendanceCount}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-white/65">No upcoming meeting scheduled.</p>
              )}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-[#10161f] p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Upcoming birthdays</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.upcoming.upcomingBirthdays.length === 0 ? (
                <span className="text-sm text-white/65">No birthdays in the next 30 days.</span>
              ) : null}
              {summary.upcoming.upcomingBirthdays.map((resident) => (
                <span key={resident.id} className="rounded-full border border-white/15 bg-[#1c2433] px-3 py-1 text-xs font-semibold text-white">
                  {resident.residentName} · {resident.when}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-[#10161f] p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">{summary.upcoming.reportDueIndicator.label}</p>
            <p className="mt-1 text-sm text-white/85">
              Due {summary.upcoming.reportDueIndicator.dueDate} · {summary.upcoming.reportDueIndicator.daysRemaining} days remaining
            </p>
          </div>
        </DashboardCard>

        <section className="rounded-[1.6rem] border border-[#374151] bg-[#201a17] p-5 shadow-[0_16px_34px_rgba(0,0,0,0.34)]">
          <div className="mb-3 flex items-center gap-2 text-orange-200">
            <Sparkles className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Morale / Idea Card</p>
          </div>
          <h3 className="text-2xl font-black text-white">{summary.morale.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/85">{summary.morale.message}</p>
          <p className="mt-4 rounded-xl border border-orange-300/20 bg-orange-500/15 p-3 text-sm text-orange-50">
            {summary.morale.prompt}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-white/65">
            <HeartHandshake className="h-4 w-4" />
            Rotate content daily
          </div>
        </section>
      </div>

      <nav
        className="fixed bottom-4 left-1/2 z-40 w-[min(96vw,1100px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#0f141f] px-3 py-2 shadow-[0_16px_30px_rgba(0,0,0,0.45)] backdrop-blur-none"
        aria-label="Quick actions"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {summary.quickActions.map((action) => {
            const palette = MODULE_COLOR[action.module];
            return (
              <Link
                key={action.id}
                href={action.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  "border-white/15 bg-[#192132] text-white hover:border-white/30",
                  palette.link
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", palette.dot)} />
                {action.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function DashboardCommandCenterSkeleton() {
  return (
    <div className="-mx-2 rounded-[2rem] border border-[#2a3142] bg-[#0f1117] p-6">
      <div className="h-64 animate-pulse rounded-[2rem] bg-[#1a2030]" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-[#171d2a]" />
        <div className="h-28 animate-pulse rounded-2xl bg-[#171d2a]" />
        <div className="h-28 animate-pulse rounded-2xl bg-[#171d2a]" />
      </div>
      <div className="mt-4 h-80 animate-pulse rounded-2xl bg-[#171d2a]" />
    </div>
  );
}
