"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Copy,
  FileDown,
  Loader2,
  Plus,
  Printer,
  Save,
  Sparkles,
  Users,
  WandSparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ACTIVITY_BANK_TEMPLATES,
  CALENDAR_TEMPLATE_CARDS,
  DAY_PATTERNS,
  HOLIDAY_PLAN_EXAMPLE,
  LOW_BUDGET_WEEK_EXAMPLE,
  SAMPLE_CALENDARS,
  THEME_WEEK_EXAMPLE
} from "@/lib/calendar-creation/mockData";
import type { ActivityTemplateItem, CalendarActivity, CalendarMonth } from "@/lib/calendar-creation/types";
import {
  ActionButton,
  AIShortcutButton,
  DrawerShell,
  EmptyStateCard,
  NotesBlock,
  PageHeader,
  PageSubheader,
  SearchInput,
  SectionCard,
  SortDropdown,
  StatusBadge,
  StickyActionBar,
  SummaryStatCard,
  TagChip,
  ModalShell
} from "@/components/workspace/shared";
import { cn } from "@/lib/utils";

const MONTH_OPTIONS = [
  { key: "1", label: "January" },
  { key: "2", label: "February" },
  { key: "3", label: "March" },
  { key: "4", label: "April" },
  { key: "5", label: "May" },
  { key: "6", label: "June" },
  { key: "7", label: "July" },
  { key: "8", label: "August" },
  { key: "9", label: "September" },
  { key: "10", label: "October" },
  { key: "11", label: "November" },
  { key: "12", label: "December" }
] as const;

const VIEW_OPTIONS = [
  { key: "MONTH", label: "Month" },
  { key: "WEEK", label: "Week Preview" },
  { key: "PRINT", label: "Print Preview" }
] as const;

type CalendarViewMode = (typeof VIEW_OPTIONS)[number]["key"];

type BuilderModalKey =
  | "create"
  | "duplicate"
  | "save-template"
  | "fill-empty"
  | "theme-week"
  | "holiday"
  | "low-budget"
  | "weekend"
  | "copy"
  | "export"
  | null;

const QUICK_ACTIONS = [
  { id: "fill-empty", label: "Fill Empty Days" },
  { id: "theme-week", label: "Generate Themed Week" },
  { id: "holiday", label: "Generate Holiday Plan" },
  { id: "low-budget", label: "Build Low-Budget Month" },
  { id: "backup", label: "Add Backup Activities" },
  { id: "weekend", label: "Create Weekend Ideas" },
  { id: "balance", label: "Balance Group / 1:1 Mix" },
  { id: "bed-bound", label: "Add Bed-Bound Friendly Options" },
  { id: "duplicate-pattern", label: "Duplicate Last Week Pattern" },
  { id: "auto-title", label: "Auto-Suggest Activity Names" },
  { id: "rainy", label: "Build Rainy Day Backups" },
  { id: "seasonal", label: "Add Seasonal Ideas" },
  { id: "independent", label: "Generate Independent Room Options" }
] as const;

const ACTIVITY_CATEGORIES = [
  "All",
  "Group Activity",
  "1:1 Visits",
  "Bed-Bound Support",
  "Independent Activity",
  "Dementia-Friendly",
  "Physical Activity",
  "Cognitive Activity",
  "Sensory Activity",
  "Holiday Activity",
  "Social Event",
  "Spiritual / Religious",
  "Creative / Craft",
  "Entertainment / Music",
  "Games / Trivia",
  "Community / Family Event",
  "Room Visit",
  "Wellness / Relaxation",
  "Seasonal Special"
] as const;

function monthLabel(month: number) {
  return MONTH_OPTIONS.find((option) => Number(option.key) === month)?.label ?? "Month";
}

function toDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function CalendarCreationWorkspace() {
  const router = useRouter();

  const [calendars, setCalendars] = useState<CalendarMonth[]>(SAMPLE_CALENDARS);
  const [activeCalendarId] = useState(SAMPLE_CALENDARS[0]?.calendarId ?? "");
  const [activeView, setActiveView] = useState<CalendarViewMode>("MONTH");
  const [selectedDate, setSelectedDate] = useState(SAMPLE_CALENDARS[0]?.days[0]?.date ?? "");
  const [calendarTitle, setCalendarTitle] = useState(SAMPLE_CALENDARS[0]?.title ?? "");
  const [calendarMonth, setCalendarMonth] = useState(String(SAMPLE_CALENDARS[0]?.month ?? 1));
  const [calendarYear, setCalendarYear] = useState(String(SAMPLE_CALENDARS[0]?.year ?? new Date().getFullYear()));

  const [activitySearch, setActivitySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<(typeof ACTIVITY_CATEGORIES)[number]>("All");

  const [builderModal, setBuilderModal] = useState<BuilderModalKey>(null);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CalendarActivity | null>(null);

  const [draftDayNotes, setDraftDayNotes] = useState("");
  const [draftStaffNotes, setDraftStaffNotes] = useState("");
  const [draftPrepNotes, setDraftPrepNotes] = useState("");

  const activeCalendar = useMemo(() => calendars.find((calendar) => calendar.calendarId === activeCalendarId) ?? calendars[0], [activeCalendarId, calendars]);

  const selectedDay = useMemo(() => activeCalendar?.days.find((day) => day.date === selectedDate) ?? activeCalendar?.days[0] ?? null, [activeCalendar, selectedDate]);

  const filteredActivityBank = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();
    return ACTIVITY_BANK_TEMPLATES.filter((item) => {
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
      const text = `${item.title} ${item.category} ${item.tags.join(" ")} ${item.description}`.toLowerCase();
      const matchesQuery = query.length === 0 || text.includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [activitySearch, categoryFilter]);

  const summary = useMemo(() => {
    const days = activeCalendar.days;
    const scheduledDays = days.filter((day) => day.activities.length > 0).length;
    const emptyDays = days.filter((day) => day.activities.length === 0).length;
    const specialEvents = days.filter((day) => day.isSpecialEvent).length;
    const holidayDates = days.filter((day) => day.isHoliday).length;
    const oneToOneCoverage = days.filter((day) => day.hasOneToOneCoverage).length;
    const weekendGaps = days.filter((day) => {
      const parsed = new Date(`${day.date}T00:00:00`);
      const weekday = parsed.getDay();
      const weekend = weekday === 0 || weekday === 6;
      return weekend && day.activities.length === 0;
    }).length;
    const backupPlans = days.filter((day) => day.hasBackupPlan).length;

    return { scheduledDays, emptyDays, specialEvents, holidayDates, oneToOneCoverage, weekendGaps, backupPlans };
  }, [activeCalendar]);

  const aiShortcuts = [
    {
      id: "plan-week",
      label: "Plan this week",
      description: "Generate a practical week draft with group + 1:1 balance.",
      prompt: "Plan this week for an activity department with balanced group and 1:1 coverage."
    },
    {
      id: "fill-empty",
      label: "Fill empty days",
      description: "Get quick low-prep options for unscheduled dates.",
      prompt: "Fill my empty calendar days with low-prep activities and backups."
    },
    {
      id: "dementia-week",
      label: "Build dementia-friendly week",
      description: "Generate calm, familiar, low-stimulation options.",
      prompt: "Create a dementia-friendly themed week with 1:1 alternatives."
    },
    {
      id: "low-budget-month",
      label: "Create low-budget month",
      description: "Build a low-cost plan with reusable supplies.",
      prompt: "Build a low-budget monthly activity framework with weekend coverage."
    }
  ];

  function openAiPrompt(prompt: string) {
    router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
  }

  function addTemplateToDay(template: ActivityTemplateItem) {
    if (!selectedDay) return;

    setCalendars((current) =>
      current.map((calendar) => {
        if (calendar.calendarId !== activeCalendar.calendarId) return calendar;
        return {
          ...calendar,
          updatedAt: new Date().toISOString(),
          days: calendar.days.map((day) => {
            if (day.date !== selectedDay.date) return day;
            const nextActivity: CalendarActivity = {
              id: `act-${crypto.randomUUID()}`,
              title: template.title,
              startTime: "10:00 AM",
              endTime: "10:45 AM",
              location: "Activity Room",
              category: template.category,
              type: template.category === "1:1 Visits" || template.category === "Room Visit" ? "1:1" : "Group",
              description: template.description,
              residentFacingDescription: template.description,
              suppliesNeeded: [],
              internalNotes: "",
              prepLevel: template.prepLevel,
              indoorOutdoor: template.indoorOutdoor,
              backupAlternative: "Seated conversation circle",
              reusableTemplate: false,
              repeatRule: null,
              tags: template.tags,
              aiGenerated: false,
              createdFromTemplate: true
            };
            return {
              ...day,
              activities: [...day.activities, nextActivity]
            };
          })
        };
      })
    );
  }

  function selectDay(date: string) {
    setSelectedDate(date);
    setDayDrawerOpen(true);

    const day = activeCalendar.days.find((entry) => entry.date === date);
    setDraftDayNotes(day?.dayNotes ?? "");
    setDraftStaffNotes(day?.staffOnlyNotes ?? "");
    setDraftPrepNotes(day?.prepReminders ?? "");
  }

  function quickAction(actionId: string) {
    if (["fill-empty", "theme-week", "holiday", "low-budget", "weekend", "copy", "export"].includes(actionId)) {
      setBuilderModal(actionId as BuilderModalKey);
      return;
    }

    const actionLabel = QUICK_ACTIONS.find((item) => item.id === actionId)?.label ?? "calendar planning";
    openAiPrompt(`Help me with this calendar task: ${actionLabel}. Keep it practical for Activities Directors.`);
  }

  const dayPanel = selectedDay ? (
    <div className="space-y-3">
      <SectionCard
        title={toDateLabel(selectedDay.date)}
        action={
          <div className="flex items-center gap-2">
            {selectedDay.isHoliday ? <StatusBadge label={selectedDay.holidayName || "Holiday"} tone="warning" /> : null}
            {selectedDay.isSpecialEvent ? <StatusBadge label="Special Event" tone="success" /> : null}
          </div>
        }
      >
        <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold">Total activities:</span> {selectedDay.activities.length}
          </p>
          <p>
            <span className="font-semibold">1:1 coverage:</span> {selectedDay.hasOneToOneCoverage ? "Yes" : "No"}
          </p>
          <p>
            <span className="font-semibold">Backup plan:</span> {selectedDay.hasBackupPlan ? "Added" : "Not added"}
          </p>
          <p>
            <span className="font-semibold">Prep load:</span> {selectedDay.activities.length >= 4 ? "High" : selectedDay.activities.length >= 2 ? "Medium" : "Low"}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton tone="secondary" onClick={() => setActivityDrawerOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Activity
          </ActionButton>
          <ActionButton tone="secondary" onClick={() => openAiPrompt(`Suggest a full schedule for ${selectedDay.date}.`)}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Quick AI Day Help
          </ActionButton>
          <ActionButton tone="secondary" onClick={() => setBuilderModal("copy")}>
            <Copy className="h-4 w-4" aria-hidden />
            Duplicate Day
          </ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Activities List">
        {selectedDay.activities.length === 0 ? (
          <EmptyStateCard
            title="No activities added yet"
            description="No activities added yet. Add one manually or ask Actify to help fill this day."
            action={
              <ActionButton tone="secondary" onClick={() => setActivityDrawerOpen(true)}>
                Add Activity
              </ActionButton>
            }
          />
        ) : (
          <div className="space-y-2">
            {selectedDay.activities.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.startTime} - {item.endTime} • {item.location}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TagChip label={item.type} />
                    <TagChip label={item.category} />
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-700">{item.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <ActionButton
                    tone="secondary"
                    onClick={() => {
                      setEditingActivity(item);
                      setActivityDrawerOpen(true);
                    }}
                  >
                    Edit
                  </ActionButton>
                  <ActionButton tone="secondary" onClick={() => setBuilderModal("copy")}>Duplicate</ActionButton>
                  <ActionButton tone="secondary" onClick={() => openAiPrompt(`Suggest a backup for this activity: ${item.title}.`)}>
                    AI Help
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Quick Add Activities">
        <div className="grid grid-cols-2 gap-2">
          {[
            "Add Bingo",
            "Add Chair Exercise",
            "Add Trivia",
            "Add 1:1 Visits",
            "Add Backup Option",
            "Add Holiday Activity",
            "Add Sensory Activity"
          ].map((label) => (
            <ActionButton key={label} tone="secondary" onClick={() => openAiPrompt(`${label} to ${selectedDay.date}.`)}>
              {label}
            </ActionButton>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="AI Suggestions for This Day">
        <div className="space-y-2">
          {[
            "Fill this day with low-prep activities",
            "Create a quiet afternoon plan",
            "Suggest rainy-day backup",
            "Suggest dementia-friendly options",
            "Add 1:1 alternatives",
            "Make this day more balanced"
          ].map((suggestion) => (
            <AIShortcutButton
              key={suggestion}
              label={suggestion}
              description="Open in Actify Assistant"
              onClick={() => openAiPrompt(`${suggestion} for ${selectedDay.date}.`)}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Day Notes / Internal Notes">
        <div className="space-y-2">
          <NotesBlock value={draftDayNotes} onChange={setDraftDayNotes} placeholder="Day notes" />
          <NotesBlock value={draftPrepNotes} onChange={setDraftPrepNotes} placeholder="Prep reminders" />
          <NotesBlock value={draftStaffNotes} onChange={setDraftStaffNotes} placeholder="Staff-only notes" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton tone="secondary" onClick={() => setBuilderModal("copy")}>Copy to Another Day</ActionButton>
          <ActionButton tone="secondary" onClick={() => setBuilderModal("copy")}>Copy to Multiple Days</ActionButton>
          <ActionButton tone="secondary" onClick={() => openAiPrompt(`Create a backup plan for ${selectedDay.date}.`)}>Add Backup Plan</ActionButton>
          <ActionButton tone="secondary" onClick={() => setFeedbackToast("Day changes saved.")}>Save Day Changes</ActionButton>
        </div>
      </SectionCard>
    </div>
  ) : null;

  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  return (
    <section className="space-y-4" aria-label="Calendar Creation workspace">
      <header className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-200/70">
        <PageHeader title="Calendar Creation">
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton tone="secondary" onClick={() => setBuilderModal("create")}>
              <Plus className="h-4 w-4" aria-hidden />
              Create New Calendar
            </ActionButton>
            <ActionButton tone="secondary" onClick={() => setFeedbackToast("Draft saved.")}> 
              <Save className="h-4 w-4" aria-hidden />
              Save Draft
            </ActionButton>
            <ActionButton tone="secondary" onClick={() => setBuilderModal("export")}>
              <Printer className="h-4 w-4" aria-hidden />
              Export / Print
            </ActionButton>
            <ActionButton onClick={() => openAiPrompt("Help me improve this monthly calendar draft for Activities Directors.")}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Ask Actify
            </ActionButton>
          </div>
        </PageHeader>
        <PageSubheader text="Build monthly calendars, themed weeks, and backup activity plans faster." />

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Month</span>
            <select
              value={calendarMonth}
              onChange={(event) => setCalendarMonth(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Year</span>
            <input
              value={calendarYear}
              onChange={(event) => setCalendarYear(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Facility / Calendar Title</span>
            <input
              value={calendarTitle}
              onChange={(event) => setCalendarTitle(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <SummaryStatCard label="Total Scheduled Days" value={summary.scheduledDays} context="Days with at least one activity" icon={Calendar} />
          <SummaryStatCard label="Empty Days" value={summary.emptyDays} context="Needs fill support" icon={Calendar} />
          <SummaryStatCard label="Special Events" value={summary.specialEvents} context="Marked events" icon={Sparkles} />
          <SummaryStatCard label="Holiday Dates" value={summary.holidayDates} context="Holiday support enabled" icon={Sparkles} />
          <SummaryStatCard label="1:1 Coverage Days" value={summary.oneToOneCoverage} context="Personalized support days" icon={Users} />
          <SummaryStatCard label="Weekend Gaps" value={summary.weekendGaps} context="Weekend dates with no activities" icon={Calendar} />
          <SummaryStatCard label="Backup Plans Added" value={summary.backupPlans} context="Resilience coverage" icon={WandSparkles} />
        </div>
      </header>

      {feedbackToast ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{feedbackToast}</div>
      ) : null}

      <StickyActionBar>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <ActionButton key={action.id} tone="secondary" onClick={() => quickAction(action.id)}>
              {action.label}
            </ActionButton>
          ))}
          <SortDropdown
            label="View"
            options={VIEW_OPTIONS.map((option) => ({ ...option }))}
            value={activeView}
            onChange={setActiveView}
          />
        </div>
      </StickyActionBar>

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.7fr)_minmax(260px,0.95fr)]">
        <aside className="space-y-3">
          <SectionCard title="Activity Bank">
            <SearchInput value={activitySearch} onChange={setActivitySearch} placeholder="Search activities" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ACTIVITY_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition",
                    categoryFilter === category
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2 max-h-[36rem] overflow-y-auto pr-1">
              {filteredActivityBank.length === 0 ? (
                <EmptyStateCard title="No matching activities found" description="No matching activities found." />
              ) : (
                filteredActivityBank.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.category}</p>
                      </div>
                      <TagChip label={`${item.prepLevel} prep`} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <TagChip label={`${item.energy} energy`} />
                      <TagChip label={item.indoorOutdoor} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ActionButton tone="secondary" onClick={() => addTemplateToDay(item)}>
                        <Plus className="h-4 w-4" aria-hidden />
                        One-click add
                      </ActionButton>
                      <ActionButton tone="secondary" onClick={() => openAiPrompt(`Suggest a resident-friendly version of ${item.title}.`)}>
                        <Sparkles className="h-4 w-4" aria-hidden />
                        AI
                      </ActionButton>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </aside>

        <section className="space-y-3">
          <SectionCard title={`${monthLabel(Number(calendarMonth))} ${calendarYear} • Month Grid`}>
            {activeView === "PRINT" ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Print preview mode shows cleaner resident-facing output.</p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{calendarTitle || activeCalendar.title}</p>
                  <p className="text-xs text-slate-600">{activeCalendar.facilityName}</p>
                  <p className="mt-2 text-xs text-slate-600">Scheduled days: {summary.scheduledDays} • Empty days: {summary.emptyDays}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {activeCalendar.days.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => selectDay(day.date)}
                    className={cn(
                      "rounded-xl border p-2 text-left transition hover:border-slate-300 hover:bg-slate-50",
                      selectedDay?.date === day.date ? "border-teal-300 bg-teal-50/70" : "border-slate-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">{day.date.split("-").at(-1)}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDate(day.date);
                          setActivityDrawerOpen(true);
                        }}
                        className="rounded-full border border-slate-200 bg-white p-1 text-slate-600"
                        aria-label="Quick add activity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {day.isHoliday ? <StatusBadge label={day.holidayName || "Holiday"} tone="warning" /> : null}
                    {day.isSpecialEvent ? <StatusBadge label="Special Event" tone="success" /> : null}

                    <div className="mt-1 space-y-1">
                      {day.activities.slice(0, 3).map((activity) => (
                        <p key={activity.id} className="line-clamp-1 text-xs text-slate-700">• {activity.title}</p>
                      ))}
                      {day.activities.length > 3 ? <p className="text-[11px] text-slate-500">+{day.activities.length - 3} more</p> : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {day.hasBackupPlan ? <TagChip label="Backup" /> : null}
                      {day.hasOneToOneCoverage ? <TagChip label="1:1" /> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <aside className="space-y-3">
          <SectionCard title="AI Shortcuts + Templates">
            <div className="space-y-2">
              {aiShortcuts.map((shortcut) => (
                <AIShortcutButton
                  key={shortcut.id}
                  label={shortcut.label}
                  description={shortcut.description}
                  onClick={() => openAiPrompt(shortcut.prompt)}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Saved Templates">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {CALENDAR_TEMPLATE_CARDS.map((template) => (
                <article key={template.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{template.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{template.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <TagChip key={`${template.id}-${tag}`} label={tag} />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Prefilled days: {template.prefilledDays}</p>
                  <div className="mt-2">
                    <ActionButton tone="secondary" onClick={() => setFeedbackToast(`${template.title} applied to draft.`)}>
                      Use template
                    </ActionButton>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <div className="hidden xl:block">{dayPanel}</div>
        </aside>
      </div>

      <DrawerShell open={dayDrawerOpen} title={selectedDay ? toDateLabel(selectedDay.date) : "Day Details"} onClose={() => setDayDrawerOpen(false)}>
        {dayPanel}
      </DrawerShell>

      <DrawerShell open={activityDrawerOpen} title={editingActivity ? "Edit Activity" : "Add Activity"} onClose={() => {
        setActivityDrawerOpen(false);
        setEditingActivity(null);
      }}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Activity Title</span>
              <input defaultValue={editingActivity?.title} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Location</span>
              <input defaultValue={editingActivity?.location} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Start Time</span>
              <input defaultValue={editingActivity?.startTime || "10:00 AM"} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">End Time</span>
              <input defaultValue={editingActivity?.endTime || "10:45 AM"} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Description + Notes</span>
            <textarea
              defaultValue={editingActivity?.description}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </label>

          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">AI Help</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "Improve title",
                "Generate short description",
                "Suggest backup",
                "Suggest supplies",
                "Make resident-friendly",
                "Generate 1:1 alternatives",
                "Suggest dementia-friendly version",
                "Suggest low-budget version"
              ].map((label) => (
                <ActionButton key={label} tone="secondary" onClick={() => openAiPrompt(`${label} for ${editingActivity?.title || "this activity"}.`)}>
                  {label}
                </ActionButton>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton tone="secondary" onClick={() => setActivityDrawerOpen(false)}>Cancel</ActionButton>
            <ActionButton onClick={() => {
              setFeedbackToast("Activity saved.");
              setActivityDrawerOpen(false);
            }}>Save Activity</ActionButton>
            <ActionButton tone="secondary" onClick={() => setFeedbackToast("Activity duplicated in draft.")}>Save and Duplicate</ActionButton>
            <ActionButton tone="secondary" onClick={() => setBuilderModal("save-template")}>Save as Template</ActionButton>
            <ActionButton tone="secondary" onClick={() => openAiPrompt("Review this activity and improve resident readability.")}>Save and Ask Actify</ActionButton>
          </div>
        </div>
      </DrawerShell>

      <ModalShell open={builderModal === "create"} title="Create New Calendar" onClose={() => setBuilderModal(null)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Calendar Title</span><input className="h-10 w-full rounded-xl border border-slate-200 px-3" defaultValue="New Monthly Calendar" /></label>
          <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Facility Name</span><input className="h-10 w-full rounded-xl border border-slate-200 px-3" defaultValue={activeCalendar.facilityName} /></label>
          <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Month</span><select className="h-10 w-full rounded-xl border border-slate-200 px-3">{MONTH_OPTIONS.map((option) => <option key={option.key}>{option.label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Year</span><input className="h-10 w-full rounded-xl border border-slate-200 px-3" defaultValue={new Date().getFullYear()} /></label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("New calendar created."); setBuilderModal(null); }}>Create Calendar</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "duplicate"} title="Duplicate Calendar" onClose={() => setBuilderModal(null)}>
        <p className="text-sm text-slate-600">Duplicate a source calendar into a new month/year with full activities or structure only.</p>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Calendar duplicated."); setBuilderModal(null); }}>Duplicate</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "save-template"} title="Save as Template" onClose={() => setBuilderModal(null)}>
        <div className="space-y-3">
          <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Template Name</span><input className="h-10 w-full rounded-xl border border-slate-200 px-3" defaultValue="My Monthly Template" /></label>
          <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Template Category</span><input className="h-10 w-full rounded-xl border border-slate-200 px-3" defaultValue="Balanced" /></label>
          <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes</span><textarea rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Template saved."); setBuilderModal(null); }}>Save Template</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "fill-empty"} title="Fill Empty Days Wizard" onClose={() => setBuilderModal(null)}>
        <div className="space-y-2 text-sm text-slate-700">
          <p><span className="font-semibold">Step 1:</span> Select days to fill</p>
          <p><span className="font-semibold">Step 2:</span> Choose style (Balanced, Low Budget, Quiet, 1:1 Heavy, Dementia-Friendly)</p>
          <p><span className="font-semibold">Step 3:</span> Choose resident focus and budget level</p>
          <p><span className="font-semibold">Step 4:</span> Review and apply suggestions</p>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Suggested application: Fill {summary.emptyDays} empty days with low-prep options and backup alternatives.
        </div>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Suggestions applied to empty days."); setBuilderModal(null); }}>Apply to Calendar</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "theme-week"} title="Themed Week Builder" onClose={() => setBuilderModal(null)}>
        <p className="text-sm text-slate-600">{THEME_WEEK_EXAMPLE.description}</p>
        <div className="mt-3 space-y-2">
          {THEME_WEEK_EXAMPLE.dailySubthemes.map((day) => (
            <div key={day.day} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{day.day}: {day.label}</p>
              <p className="text-xs text-slate-600">{day.focus}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Themed week applied."); setBuilderModal(null); }}>Apply Week</ActionButton><ActionButton tone="secondary" onClick={() => setBuilderModal("save-template")}>Save as Template</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "holiday"} title="Holiday Plan Builder" onClose={() => setBuilderModal(null)}>
        <p className="text-sm text-slate-700">Holiday: {HOLIDAY_PLAN_EXAMPLE.holiday}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SectionCard title="Group Ideas">{HOLIDAY_PLAN_EXAMPLE.groupIdeas.map((item) => <p key={item} className="text-sm text-slate-700">• {item}</p>)}</SectionCard>
          <SectionCard title="1:1 Alternatives">{HOLIDAY_PLAN_EXAMPLE.oneToOneAlternatives.map((item) => <p key={item} className="text-sm text-slate-700">• {item}</p>)}</SectionCard>
        </div>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Holiday plan applied."); setBuilderModal(null); }}>Apply to Calendar</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "low-budget"} title="Low-Budget Month Builder" onClose={() => setBuilderModal(null)}>
        <p className="text-sm text-slate-700">{LOW_BUDGET_WEEK_EXAMPLE.title}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {LOW_BUDGET_WEEK_EXAMPLE.days.map((day) => (
            <li key={day}>{day}</li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Low-budget framework applied."); setBuilderModal(null); }}>Apply Draft</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "weekend"} title="Weekend Ideas Builder" onClose={() => setBuilderModal(null)}>
        <p className="text-sm text-slate-600">Generate weekend-specific ideas by energy level and social emphasis.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAY_PATTERNS.map((pattern) => (
            <TagChip key={pattern.id} label={pattern.label} />
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Weekend plan applied."); setBuilderModal(null); }}>Apply to Calendar</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "copy"} title="Copy Day / Copy Week" onClose={() => setBuilderModal(null)}>
        <p className="text-sm text-slate-600">Copy source day/week into target dates with times, notes, and backups.</p>
        <div className="mt-4 flex justify-end gap-2"><ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton><ActionButton onClick={() => { setFeedbackToast("Copy operation completed."); setBuilderModal(null); }}>Copy</ActionButton></div>
      </ModalShell>

      <ModalShell open={builderModal === "export"} title="Export / Print" onClose={() => setBuilderModal(null)}>
        <div className="grid gap-2 sm:grid-cols-3">
          <SectionCard title="Resident-Facing">
            <p className="text-xs text-slate-600">Clean layout, no internal notes.</p>
          </SectionCard>
          <SectionCard title="Staff/Internal">
            <p className="text-xs text-slate-600">Includes prep and backup notes.</p>
          </SectionCard>
          <SectionCard title="Print Preview">
            <p className="text-xs text-slate-600">Preview before export or print.</p>
          </SectionCard>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <ActionButton tone="secondary" onClick={() => setBuilderModal(null)}>Cancel</ActionButton>
          <ActionButton tone="secondary" onClick={() => { setFeedbackToast("PDF export created."); }}>
            <FileDown className="h-4 w-4" aria-hidden />
            Export
          </ActionButton>
          <ActionButton onClick={() => { setFeedbackToast("Print preview opened."); }}>
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </ActionButton>
        </div>
      </ModalShell>

      {feedbackToast ? (
        <button
          type="button"
          onClick={() => setFeedbackToast(null)}
          className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg"
        >
          {feedbackToast}
          <Loader2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </section>
  );
}
