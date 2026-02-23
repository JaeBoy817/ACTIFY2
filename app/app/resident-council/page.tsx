import Link from "next/link";
import { BarChart3, CalendarDays, Clock3, FileDown, ListTodo } from "lucide-react";

import {
  createResidentCouncilMeetingAction,
  deleteResidentCouncilActionItemAction,
  updateResidentCouncilActionItemAction
} from "@/app/app/resident-council/_actions";
import { ActionItemsPanel } from "@/components/resident-council/ActionItemsPanel";
import { MeetingList } from "@/components/resident-council/MeetingList";
import { ResidentCouncilShell, type ResidentCouncilSectionKey } from "@/components/resident-council/ResidentCouncilShell";
import { GlassCard } from "@/components/glass/GlassCard";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import {
  getResidentCouncilActiveResidents,
  getResidentCouncilMeetingDetail,
  getResidentCouncilOverviewData,
  getResidentCouncilOwners,
  listResidentCouncilActionItems,
  listResidentCouncilMeetings,
  type ResidentCouncilActionSort,
  type ResidentCouncilMeetingSort
} from "@/lib/resident-council/queries";
import { residentCouncilTopicTemplates } from "@/lib/resident-council/service";

type HubView = "overview" | "meetings" | "actions" | "analytics" | "settings";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseView(value: string): HubView {
  if (value === "topics") return "settings";
  if (value === "reports") return "settings";
  if (value === "overview" || value === "meetings" || value === "actions" || value === "analytics" || value === "settings") {
    return value;
  }
  return "overview";
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMeetingSort(value: string): ResidentCouncilMeetingSort {
  if (value === "oldest" || value === "most_action_items" || value === "most_departments") return value;
  return "newest";
}

function parseActionSort(value: string): ResidentCouncilActionSort {
  if (value === "oldest" || value === "due_soon") return value;
  return "newest";
}

export default async function ResidentCouncilPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const context = await requireModulePage("residentCouncil");
  const writable = canWrite(context.role);

  const rawView = first(searchParams?.view);
  const currentView = parseView(rawView);
  const month = /^\d{4}-\d{2}$/.test(first(searchParams?.month)) ? first(searchParams?.month) : currentMonthKey();
  const selectedMeetingId = first(searchParams?.meetingId);

  const [overview, residentOptions] = await Promise.all([
    getResidentCouncilOverviewData({
      facilityId: context.facilityId,
      month
    }),
    writable ? getResidentCouncilActiveResidents(context.facilityId) : Promise.resolve([])
  ]);

  const meetingFilters = {
    search: first(searchParams?.q),
    status: (first(searchParams?.status) as "ALL" | "DRAFT" | "FINAL") || "ALL",
    hasOpenActionItems: first(searchParams?.hasOpen) === "1",
    department: first(searchParams?.department) || "ALL",
    from: first(searchParams?.from),
    to: first(searchParams?.to),
    sort: parseMeetingSort(first(searchParams?.sort)),
    page: Number(first(searchParams?.page) || "1")
  };

  const actionFilters = {
    search: first(searchParams?.actionQ),
    status: (first(searchParams?.actionStatus) as "ALL" | "OPEN" | "DONE") || "ALL",
    department: first(searchParams?.actionDepartment) || "ALL",
    owner: first(searchParams?.actionOwner) || "ALL",
    sort: parseActionSort(first(searchParams?.actionSort)),
    page: Number(first(searchParams?.actionPage) || "1"),
    meetingId: first(searchParams?.meetingId)
  };

  const [meetingsResult, actionsResult, owners] = await Promise.all([
    currentView === "meetings" || currentView === "settings"
      ? listResidentCouncilMeetings({
          facilityId: context.facilityId,
          page: Number.isFinite(meetingFilters.page) && meetingFilters.page > 0 ? meetingFilters.page : 1,
          search: meetingFilters.search || undefined,
          status: meetingFilters.status,
          hasOpenActionItems: meetingFilters.hasOpenActionItems,
          department: meetingFilters.department === "ALL" ? undefined : meetingFilters.department,
          from: meetingFilters.from || undefined,
          to: meetingFilters.to || undefined,
          sort: meetingFilters.sort
        })
      : Promise.resolve(null),
    currentView === "actions"
      ? listResidentCouncilActionItems({
          facilityId: context.facilityId,
          page: Number.isFinite(actionFilters.page) && actionFilters.page > 0 ? actionFilters.page : 1,
          search: actionFilters.search || undefined,
          status: actionFilters.status,
          department: actionFilters.department === "ALL" ? undefined : actionFilters.department,
          owner: actionFilters.owner === "ALL" ? undefined : actionFilters.owner,
          meetingId: actionFilters.meetingId || undefined,
          sort: actionFilters.sort
        })
      : Promise.resolve(null),
    currentView === "actions" ? getResidentCouncilOwners(context.facilityId) : Promise.resolve([])
  ]);

  const selectedMeetingRow =
    (meetingsResult?.rows.find((row) => row.id === selectedMeetingId) ??
      overview.recentMeetings.find((row) => row.id === selectedMeetingId) ??
      overview.recentMeetings[0]) ||
    null;

  const detailForContext = selectedMeetingRow
    ? await getResidentCouncilMeetingDetail({
        facilityId: context.facilityId,
        meetingId: selectedMeetingRow.id
      })
    : null;

  const currentSection: ResidentCouncilSectionKey =
    currentView === "meetings"
      ? "meetings"
      : currentView === "actions"
        ? "actions"
        : currentView === "analytics"
          ? "analytics"
          : currentView === "settings"
            ? "settings"
            : "overview";

  return (
    <div className="space-y-4">
      <ResidentCouncilShell
        writable={writable}
        timeZone={context.facility.timezone}
        currentSection={currentSection}
        month={month}
        monthFormAction="/app/resident-council"
        monthFormView={currentView}
        sectionStats={{
          meetingsCount: overview.totalMeetings,
          meetingsThisMonth: overview.meetingsThisMonth,
          openItemsCount: overview.openActionItems,
          resolvedItemsCount: overview.totalResolvedActionItems,
          averageAttendance:
            overview.trends.length > 0
              ? Number(
                  (
                    overview.trends.reduce((sum, entry) => sum + entry.avgAttendance, 0) /
                    Math.max(overview.trends.length, 1)
                  ).toFixed(1)
                )
              : 0,
          nextMeetingLabel: overview.nextMeeting ? formatDateTime(overview.nextMeeting.heldAt) : null
        }}
        selectedMeeting={selectedMeetingRow ? { id: selectedMeetingRow.id, label: selectedMeetingRow.title } : null}
        meetingTemplates={residentCouncilTopicTemplates.map((template) => ({ id: template.id, title: template.title }))}
        residentOptions={residentOptions}
        createMeetingAction={createResidentCouncilMeetingAction}
        contextPanel={
          detailForContext ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/30 bg-white/60 p-3">
                <p className="text-xs uppercase tracking-wide text-foreground/65">Focused Meeting</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{getMeetingLabel(detailForContext)}</p>
                <p className="mt-1 text-xs text-foreground/68">
                  {detailForContext.status} • {detailForContext.unresolvedCount} open actions
                </p>
              </div>
              <div className="space-y-1">
                <Link
                  href={`/app/resident-council/meetings/${detailForContext.id}`}
                  className="block rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/90"
                >
                  Open Minutes Editor
                </Link>
                <Link
                  href={`/app/resident-council?view=actions&meetingId=${encodeURIComponent(detailForContext.id)}`}
                  className="block rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/90"
                >
                  Show linked action items
                </Link>
                <Link
                  href={`/app/resident-council/pdf?meetingId=${encodeURIComponent(detailForContext.id)}&preview=1`}
                  target="_blank"
                  className="block rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/90"
                >
                  Preview PDF
                </Link>
              </div>
            </div>
          ) : undefined
        }
      >
        {currentView === "overview" ? (
          <OverviewPanel overview={overview} />
        ) : null}

        {currentView === "meetings" && meetingsResult ? (
          <MeetingList result={meetingsResult} filters={meetingFilters} />
        ) : null}

        {currentView === "actions" && actionsResult ? (
          <ActionItemsPanel
            result={actionsResult}
            filters={actionFilters}
            owners={owners}
            canEdit={writable}
            onUpdateActionItem={updateResidentCouncilActionItemAction}
            onDeleteActionItem={deleteResidentCouncilActionItemAction}
          />
        ) : null}

        {currentView === "analytics" ? (
          <AnalyticsPanel overview={overview} />
        ) : null}

        {currentView === "settings" ? (
          <SettingsExportPanel
            month={month}
            overview={overview}
            meetings={meetingsResult?.rows ?? overview.recentMeetings}
            selectedMeetingId={selectedMeetingRow?.id ?? ""}
          />
        ) : null}
      </ResidentCouncilShell>
    </div>
  );
}

function OverviewPanel({
  overview
}: {
  overview: Awaited<ReturnType<typeof getResidentCouncilOverviewData>>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard variant="dense" className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-actifyBlue" />
              Recent Meetings
            </p>
            <Link
              href="/app/resident-council?view=meetings"
              className="text-xs text-actifyBlue underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          {overview.recentMeetings.length === 0 ? (
            <EmptyCard message="No meetings logged yet. Create your first meeting from the header action." />
          ) : (
            <div className="space-y-2">
              {overview.recentMeetings.slice(0, 10).map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/app/resident-council/meetings/${meeting.id}`}
                  className="block rounded-xl border border-white/30 bg-white/70 px-3 py-3 shadow-sm transition hover:bg-white/85"
                >
                  <p className="text-sm font-semibold text-foreground">{meeting.title}</p>
                  <p className="text-xs text-foreground/65">{formatDateTime(meeting.heldAt)}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-foreground/72">{meeting.snippet}</p>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard variant="dense" className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ListTodo className="h-4 w-4 text-actifyBlue" />
              Open Action Items
            </p>
            <Link
              href="/app/resident-council?view=actions&actionStatus=OPEN"
              className="text-xs text-actifyBlue underline-offset-2 hover:underline"
            >
              Open board
            </Link>
          </div>
          {overview.openItemsPreview.length === 0 ? (
            <EmptyCard message="All clear. No open action items in this period." />
          ) : (
            <div className="space-y-2">
              {overview.openItemsPreview.slice(0, 10).map((item) => (
                <Link
                  key={item.id}
                  href={`/app/resident-council/meetings/${item.meetingId}?tab=actions`}
                  className="block rounded-xl border border-white/30 bg-white/70 px-3 py-3 shadow-sm transition hover:bg-white/85"
                >
                  <p className="text-sm font-semibold text-foreground">{item.concern}</p>
                  <p className="mt-1 text-xs text-foreground/68">
                    {item.category} • {item.owner ? `Owner ${item.owner}` : "No owner"} • Due {item.dueDate || "TBD"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard variant="dense" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <BarChart3 className="h-4 w-4 text-actifyBlue" />
            Trends
          </p>
          <Link href="/app/resident-council?view=analytics" className="text-xs text-actifyBlue underline-offset-2 hover:underline">
            View analytics
          </Link>
        </div>
        {overview.trends.length === 0 ? (
          <EmptyCard message="No trend data available yet. Trends appear after at least one meeting is logged." />
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overview.trends.slice(-4).map((trend) => (
              <div key={trend.month} className="rounded-xl border border-white/30 bg-white/70 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-foreground/65">{trend.month}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{trend.meetings} meetings</p>
                <p className="text-xs text-foreground/70">Avg attendance {trend.avgAttendance}</p>
                <p className="text-xs text-foreground/70">Open {trend.openItems} • Done {trend.resolvedItems}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function AnalyticsPanel({
  overview
}: {
  overview: Awaited<ReturnType<typeof getResidentCouncilOverviewData>>;
}) {
  const latest = overview.trends[overview.trends.length - 1];
  const previous = overview.trends[overview.trends.length - 2];

  const attendanceDelta = latest && previous ? Number((latest.avgAttendance - previous.avgAttendance).toFixed(1)) : 0;
  const openDelta = latest && previous ? latest.openItems - previous.openItems : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current Avg Attendance"
          value={latest ? `${latest.avgAttendance}` : "0"}
          hint={attendanceDelta >= 0 ? `+${attendanceDelta} vs prior month` : `${attendanceDelta} vs prior month`}
          tone={attendanceDelta >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <MetricCard
          label="Open Actions"
          value={latest ? `${latest.openItems}` : "0"}
          hint={openDelta >= 0 ? `+${openDelta} vs prior month` : `${openDelta} vs prior month`}
          tone={openDelta <= 0 ? "text-emerald-700" : "text-amber-700"}
        />
        <MetricCard
          label="Resolved Actions"
          value={latest ? `${latest.resolvedItems}` : "0"}
          hint="Closed follow-ups in latest month"
          tone="text-indigo-700"
        />
        <MetricCard
          label="Top Departments"
          value={overview.topDepartments.length ? overview.topDepartments.map((entry) => entry.department).join(", ") : "N/A"}
          hint={overview.topDepartments.length ? `${overview.topDepartments[0]?.count ?? 0} active issues` : "No open items"}
          tone="text-foreground"
        />
      </div>

      <GlassCard variant="dense" className="p-4">
        <p className="text-sm font-semibold text-foreground">Six-Month Trend Table</p>
        {overview.trends.length === 0 ? (
          <EmptyCard message="No analytics trends yet." />
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/25 bg-white/65">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/25 text-left text-xs uppercase tracking-wide text-foreground/65">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Meetings</th>
                  <th className="px-3 py-2">Avg Attendance</th>
                  <th className="px-3 py-2">Open Items</th>
                  <th className="px-3 py-2">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {overview.trends.map((row) => (
                  <tr key={row.month} className="border-b border-white/20 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{row.month}</td>
                    <td className="px-3 py-2">{row.meetings}</td>
                    <td className="px-3 py-2">{row.avgAttendance}</td>
                    <td className="px-3 py-2">{row.openItems}</td>
                    <td className="px-3 py-2">{row.resolvedItems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function SettingsExportPanel({
  month,
  overview,
  meetings,
  selectedMeetingId
}: {
  month: string;
  overview: Awaited<ReturnType<typeof getResidentCouncilOverviewData>>;
  meetings: Array<{ id: string; heldAt: string; title: string }>;
  selectedMeetingId: string;
}) {
  const fallbackMeetingId = selectedMeetingId || meetings[0]?.id || "";
  return (
    <div className="space-y-4">
      <GlassCard variant="dense" className="space-y-3 p-4">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FileDown className="h-4 w-4 text-actifyBlue" />
          Export Settings
        </p>
        <p className="text-sm text-foreground/72">
          Export resident council minutes in PDF format with optional sections. This month is set to {month}.
        </p>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <select defaultValue={fallbackMeetingId} className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10">
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {formatDateTime(meeting.heldAt)}
              </option>
            ))}
          </select>
          {fallbackMeetingId ? (
            <Link
              href={`/app/resident-council/pdf?meetingId=${encodeURIComponent(fallbackMeetingId)}`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/35 bg-white/80 px-3 text-sm font-medium text-foreground shadow-md shadow-black/10 hover:bg-white/95"
            >
              Download PDF
            </Link>
          ) : (
            <div className="inline-flex h-10 items-center justify-center rounded-xl border border-white/25 bg-white/50 px-3 text-sm text-foreground/55">
              No meeting selected
            </div>
          )}
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-xs text-foreground/75">
            <input type="checkbox" defaultChecked className="h-4 w-4" />
            Include attendance
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-xs text-foreground/75">
            <input type="checkbox" className="h-4 w-4" />
            Include history
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-xs text-foreground/75">
            <input type="checkbox" className="h-4 w-4" />
            New business only
          </label>
        </div>
      </GlassCard>

      <GlassCard variant="dense" className="p-4">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Clock3 className="h-4 w-4 text-actifyBlue" />
          Snapshot
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-white/30 bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-foreground/65">Meetings this month</p>
            <p className="text-2xl font-semibold text-foreground">{overview.meetingsThisMonth}</p>
          </div>
          <div className="rounded-xl border border-white/30 bg-white/70 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-foreground/65">Open action items</p>
            <p className="text-2xl font-semibold text-foreground">{overview.openActionItems}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <GlassCard variant="dense" className="p-4">
      <p className="text-xs uppercase tracking-wide text-foreground/65">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-foreground/65">{hint}</p>
    </GlassCard>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/35 bg-white/65 px-3 py-8 text-center text-sm text-foreground/70">
      {message}
    </div>
  );
}

function getMeetingLabel(meeting: Awaited<ReturnType<typeof getResidentCouncilMeetingDetail>>) {
  if (!meeting) return "Unknown meeting";
  const summaryLine = meeting.summary.split(/\n+/).map((entry) => entry.trim()).find(Boolean);
  return summaryLine && summaryLine.length > 0 ? summaryLine : formatDateTime(meeting.heldAt);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
