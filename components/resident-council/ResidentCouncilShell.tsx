import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  FileSpreadsheet,
  FileText,
  ListTodo,
  Settings2,
  Sparkles,
  Users
} from "lucide-react";

import { LiveDateTimeBadge } from "@/components/app/live-date-time-badge";
import { CreateResidentCouncilMeetingDialog } from "@/components/resident-council/CreateResidentCouncilMeetingDialog";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ResidentCouncilSectionKey =
  | "overview"
  | "meetings"
  | "minutes"
  | "actions"
  | "analytics"
  | "templates"
  | "settings";

type SectionNavItem = {
  key: ResidentCouncilSectionKey;
  label: string;
  description: string;
  icon: typeof CalendarDays;
  href: string;
  disabled?: boolean;
};

type MeetingTemplateOption = {
  id: string;
  title: string;
};

type ResidentOption = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
};

export function ResidentCouncilShell({
  writable,
  timeZone,
  currentSection,
  month,
  monthFormAction,
  monthFormView,
  sectionStats,
  selectedMeeting,
  meetingTemplates,
  residentOptions,
  createMeetingAction,
  children,
  contextPanel
}: {
  writable: boolean;
  timeZone: string;
  currentSection: ResidentCouncilSectionKey;
  month: string;
  monthFormAction?: string;
  monthFormView?: string;
  sectionStats: {
    meetingsCount: number;
    openItemsCount: number;
    resolvedItemsCount: number;
    averageAttendance: number;
    nextMeetingLabel?: string | null;
    meetingsThisMonth?: number;
  };
  selectedMeeting?: { id: string; label: string } | null;
  meetingTemplates: MeetingTemplateOption[];
  residentOptions: ResidentOption[];
  createMeetingAction: (formData: FormData) => Promise<void>;
  children: ReactNode;
  contextPanel?: ReactNode;
}) {
  const navItems: SectionNavItem[] = [
    {
      key: "overview",
      label: "Overview",
      description: "Snapshot + recent activity",
      icon: Sparkles,
      href: "/app/resident-council?view=overview"
    },
    {
      key: "meetings",
      label: "Meetings",
      description: "Search and open minutes",
      icon: CalendarDays,
      href: "/app/resident-council?view=meetings"
    },
    {
      key: "minutes",
      label: "Minutes Editor",
      description: "Department structured notes",
      icon: FileText,
      href: selectedMeeting ? `/app/resident-council/meetings/${selectedMeeting.id}` : "/app/resident-council?view=meetings",
      disabled: !selectedMeeting
    },
    {
      key: "actions",
      label: "Action Items",
      description: "Owners, due dates, statuses",
      icon: ListTodo,
      href: "/app/resident-council?view=actions"
    },
    {
      key: "analytics",
      label: "Analytics",
      description: "Meeting and follow-up trends",
      icon: BarChart3,
      href: "/app/resident-council?view=analytics"
    },
    {
      key: "templates",
      label: "Templates / Defaults",
      description: "Reusable agenda starters",
      icon: FileSpreadsheet,
      href: "/app/resident-council/templates"
    },
    {
      key: "settings",
      label: "Settings / Export",
      description: "PDF and export controls",
      icon: Settings2,
      href: "/app/resident-council?view=settings"
    }
  ];

  const monthOptions = buildMonthOptions(month);
  const currentMonthLabel = monthOptions.find((option) => option.value === month)?.label ?? month;

  return (
    <div className="space-y-5">
      <GlassPanel variant="warm" className="relative overflow-hidden px-5 py-5 md:px-6 md:py-6">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-actifyBlue/18 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-16 h-52 w-52 rounded-full bg-actifyMint/18 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Resident Council</h1>
              <Badge className="border-0 bg-actify-warm text-foreground">Council 2.0</Badge>
              {!writable ? <Badge variant="outline">Read-only</Badge> : null}
            </div>
            <p className="max-w-3xl text-sm text-foreground/75">
              Sectioned minutes, owner accountability, and export-ready council records in one calm workspace.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LiveDateTimeBadge timeZone={timeZone} mode="date-time" />
              <Badge variant="outline">Month: {currentMonthLabel}</Badge>
              {sectionStats.nextMeetingLabel ? <Badge variant="secondary">Next: {sectionStats.nextMeetingLabel}</Badge> : null}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-end justify-end gap-2 sm:w-auto">
            <form method="get" action={monthFormAction ?? "/app/resident-council"} className="space-y-1">
              <span className="block text-xs uppercase tracking-wide text-foreground/65">Month</span>
              <input type="hidden" name="view" value={monthFormView ?? "overview"} />
              <select
                name="month"
                defaultValue={month}
                className="h-10 rounded-xl border border-white/35 bg-white/70 px-3 text-sm shadow-lg shadow-black/10"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </form>
            {writable ? (
              <CreateResidentCouncilMeetingDialog
                action={createMeetingAction}
                templates={meetingTemplates}
                residents={residentOptions}
              />
            ) : null}
          </div>
        </div>

        <section className="relative mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryChip
            icon={CalendarDays}
            iconClassName="bg-sky-100 text-sky-700"
            label="Meetings"
            value={String(sectionStats.meetingsCount)}
            hint="All time"
          />
          <SummaryChip
            icon={CalendarClock}
            iconClassName="bg-indigo-100 text-indigo-700"
            label="This Month"
            value={String(sectionStats.meetingsThisMonth ?? 0)}
            hint="Logged meetings"
          />
          <SummaryChip
            icon={ListTodo}
            iconClassName="bg-rose-100 text-rose-700"
            label="Open Actions"
            value={String(sectionStats.openItemsCount)}
            hint="Needs follow-up"
          />
          <SummaryChip
            icon={CircleCheck}
            iconClassName="bg-emerald-100 text-emerald-700"
            label="Resolved"
            value={String(sectionStats.resolvedItemsCount)}
            hint="Closed tasks"
          />
          <SummaryChip
            icon={Users}
            iconClassName="bg-teal-100 text-teal-700"
            label="Avg Attendance"
            value={sectionStats.averageAttendance.toFixed(1)}
            hint="Per meeting"
          />
        </section>
      </GlassPanel>

      <div className="grid gap-4 xl:grid-cols-[246px_minmax(0,1fr)_310px]">
        <aside className="space-y-2 xl:sticky xl:top-6 xl:self-start">
          <GlassCard variant="dense" className="p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">Council Sections</p>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.key === currentSection;
                if (item.disabled) {
                  return (
                    <div
                      key={item.key}
                      className="rounded-xl border border-dashed border-white/30 bg-white/35 px-3 py-2 text-left opacity-70"
                    >
                      <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground/75">
                        <Icon className="h-4 w-4 text-foreground/50" />
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/55">{item.description}</p>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "block rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? "border-actifyBlue/40 bg-actifyBlue/10 shadow-lg shadow-actifyBlue/20"
                        : "border-white/30 bg-white/45 hover:bg-white/70"
                    )}
                  >
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon className={cn("h-4 w-4", active ? "text-actifyBlue" : "text-foreground/65")} />
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/65">{item.description}</p>
                  </Link>
                );
              })}
            </nav>
          </GlassCard>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-white/20 bg-white/40 p-1 shadow-xl shadow-black/10">
            <div className="rounded-[14px] border border-white/25 bg-white/35 p-4 md:p-5">{children}</div>
          </div>
        </section>

        <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start">
          <GlassCard variant="dense" className="p-4">
            <p className="text-sm font-semibold text-foreground">Context Panel</p>
            <p className="mt-1 text-xs text-foreground/65">Selected meeting metadata and quick shortcuts.</p>
            <div className="mt-3">{contextPanel ?? <DefaultContextPanel selectedMeeting={selectedMeeting} />}</div>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  iconClassName,
  label,
  value,
  hint
}: {
  icon: typeof CalendarDays;
  iconClassName: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/55 px-3 py-3 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-foreground/65">{label}</p>
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl", iconClassName)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-foreground/65">{hint}</p>
    </div>
  );
}

function DefaultContextPanel({
  selectedMeeting
}: {
  selectedMeeting?: { id: string; label: string } | null;
}) {
  if (!selectedMeeting) {
    return (
      <div className="rounded-xl border border-dashed border-white/30 bg-white/40 px-3 py-6 text-center text-sm text-foreground/65">
        Select a meeting to load minutes details and related action items here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/30 bg-white/60 px-3 py-3">
        <p className="text-xs uppercase tracking-wide text-foreground/65">Focused Meeting</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{selectedMeeting.label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/resident-council/meetings/${selectedMeeting.id}`}
          className="inline-flex items-center rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-white/90"
        >
          Open Minutes Editor
        </Link>
        <Link
          href={`/app/resident-council?view=actions&meetingId=${encodeURIComponent(selectedMeeting.id)}`}
          className="inline-flex items-center rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-white/90"
        >
          View Linked Actions
        </Link>
      </div>
    </div>
  );
}

function buildMonthOptions(activeMonth: string) {
  const options: Array<{ value: string; label: string }> = [];
  const base = /^\d{4}-\d{2}$/.test(activeMonth) ? new Date(`${activeMonth}-01T12:00:00`) : new Date();
  for (let offset = -5; offset <= 6; offset += 1) {
    const date = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}
