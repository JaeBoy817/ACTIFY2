import Link from "next/link";
import { CalendarDays, CircleCheck, Download, FileText, History, ListTodo, UsersRound } from "lucide-react";

import { AttendancePanel } from "@/components/resident-council/AttendancePanel";
import { MeetingMinutesEditor } from "@/components/resident-council/MeetingMinutesEditor";
import { MeetingTabs, type MeetingDetailTab } from "@/components/resident-council/MeetingTabs";
import { TopicCard } from "@/components/resident-council/TopicCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { residentCouncilCategoryOptions } from "@/lib/resident-council/service";
import type { ResidentCouncilMeetingDetailData } from "@/lib/resident-council/queries";

type ActionFn = (formData: FormData) => Promise<void>;

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

function getMeetingTitle(meeting: ResidentCouncilMeetingDetailData) {
  const line = meeting.summary.split(/\n+/).map((entry) => entry.trim()).find(Boolean);
  return line && line.length > 0 ? line : `Resident Council • ${formatDateTime(meeting.heldAt)}`;
}

export function MeetingDetail({
  meeting,
  tab,
  canEdit,
  onSaveMinutes,
  onCreateActionItem,
  onUpdateActionItem,
  onDeleteActionItem,
  onBulkUpdateActionItems,
  onDeleteMeeting
}: {
  meeting: ResidentCouncilMeetingDetailData;
  tab: MeetingDetailTab;
  canEdit: boolean;
  onSaveMinutes: ActionFn;
  onCreateActionItem: ActionFn;
  onUpdateActionItem: ActionFn;
  onDeleteActionItem: ActionFn;
  onBulkUpdateActionItems: ActionFn;
  onDeleteMeeting: ActionFn;
}) {
  const meetingTitle = getMeetingTitle(meeting);
  const unresolvedIds = meeting.actionItems.filter((item) => item.status === "UNRESOLVED").map((item) => item.id);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/30 bg-white/55 p-4 shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm text-foreground/75">
              <CalendarDays className="h-4 w-4 text-actifyBlue" />
              {formatDateTime(meeting.heldAt)}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{meetingTitle}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={meeting.status === "DRAFT" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}
              >
                {meeting.status}
              </Badge>
              <Badge variant="outline" className="bg-white/80">
                Attendance {meeting.attendanceCount}
              </Badge>
              <Badge variant="secondary">Open actions {meeting.unresolvedCount}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlassButton asChild variant="dense" size="sm">
              <Link href={`/app/resident-council/pdf?meetingId=${encodeURIComponent(meeting.id)}&preview=1`} target="_blank">
                <Download className="mr-1.5 h-4 w-4" />
                Export PDF
              </Link>
            </GlassButton>
            {canEdit && unresolvedIds.length > 0 ? (
              <form action={onBulkUpdateActionItems}>
                {unresolvedIds.map((id) => (
                  <input key={id} type="hidden" name="itemIds" value={id} />
                ))}
                <input type="hidden" name="status" value="RESOLVED" />
                <GlassButton type="submit" size="sm">
                  <CircleCheck className="mr-1.5 h-4 w-4" />
                  Finalize
                </GlassButton>
              </form>
            ) : null}
            {canEdit ? (
              <form action={onDeleteMeeting}>
                <input type="hidden" name="meetingId" value={meeting.id} />
                <GlassButton size="sm" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                  Delete Meeting
                </GlassButton>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <MeetingTabs currentTab={tab} />

      {tab === "minutes" ? (
        <section className="rounded-2xl border border-white/30 bg-white/55 p-4 shadow-lg shadow-black/10">
          <MeetingMinutesEditor
            meetingId={meeting.id}
            canEdit={canEdit}
            summary={meeting.summary}
            additionalNotes={meeting.additionalNotes}
            attendanceCount={meeting.attendanceCount}
            minuteSections={meeting.minuteSections}
            saveAction={onSaveMinutes}
          />
        </section>
      ) : null}

      {tab === "actions" ? (
        <section className="space-y-3 rounded-2xl border border-white/30 bg-white/55 p-4 shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
              <ListTodo className="h-4 w-4 text-actifyBlue" />
              Action Items
            </p>
            <GlassButton asChild size="sm" variant="dense">
              <Link href={`/app/resident-council?view=actions&meetingId=${encodeURIComponent(meeting.id)}`}>
                Open Full Action Board
              </Link>
            </GlassButton>
          </div>

          {meeting.actionItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/35 bg-white/65 px-3 py-8 text-center text-sm text-foreground/70">
              No action items yet. Add one below.
            </div>
          ) : (
            <div className="space-y-2">
              {meeting.actionItems.map((item) => (
                <article key={item.id} className="rounded-xl border border-white/35 bg-white/75 p-3 shadow-md shadow-black/10">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.concern}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="bg-white/80 text-[10px]">
                          {item.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.section === "OLD" ? "Old Business" : "New Business"}
                        </Badge>
                        {item.owner ? <span className="text-xs text-foreground/68">Owner {item.owner}</span> : null}
                        {item.dueDate ? <span className="text-xs text-foreground/68">Due {item.dueDate}</span> : null}
                        <span className="text-xs text-foreground/60">Updated {formatDateTime(item.updatedAt)}</span>
                      </div>
                      {item.followUp ? <p className="mt-1 text-xs text-foreground/72">{item.followUp}</p> : null}
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className={
                          item.status === "RESOLVED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }
                      >
                        {item.status === "RESOLVED" ? "Done" : "Open"}
                      </Badge>
                      {canEdit ? (
                        <div className="flex flex-wrap gap-1.5">
                          <form action={onUpdateActionItem}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="section" value={item.section} />
                            <input
                              type="hidden"
                              name="status"
                              value={item.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED"}
                            />
                            <input type="hidden" name="owner" value={item.owner ?? ""} />
                            <input type="hidden" name="dueDate" value={item.dueDate ?? ""} />
                            <input type="hidden" name="followUp" value={item.followUp ?? ""} />
                            <GlassButton size="sm" variant="dense" className="h-8 px-3 text-xs">
                              {item.status === "RESOLVED" ? "Reopen" : "Mark done"}
                            </GlassButton>
                          </form>
                          <form action={onDeleteActionItem}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <GlassButton size="sm" className="h-8 border-rose-200 bg-rose-50 px-3 text-xs text-rose-700 hover:bg-rose-100">
                              Delete
                            </GlassButton>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {canEdit ? (
            <form action={onCreateActionItem} className="rounded-xl border border-white/35 bg-white/70 p-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <div className="grid gap-2 md:grid-cols-[170px_170px_minmax(0,1fr)]">
                <label className="text-xs">
                  Department
                  <select
                    name="category"
                    defaultValue="Administration"
                    className="mt-1 h-9 w-full rounded-lg border border-white/35 bg-white/90 px-2 text-xs"
                  >
                    {residentCouncilCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Section
                  <select
                    name="section"
                    defaultValue="NEW"
                    className="mt-1 h-9 w-full rounded-lg border border-white/35 bg-white/90 px-2 text-xs"
                  >
                    <option value="OLD">Old Business</option>
                    <option value="NEW">New Business</option>
                  </select>
                </label>
                <label className="text-xs">
                  Owner
                  <Input name="owner" placeholder="Optional owner" className="mt-1 h-9 bg-white/90 text-xs" />
                </label>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-[170px_170px_minmax(0,1fr)]">
                <label className="text-xs">
                  Due date
                  <Input name="dueDate" type="date" className="mt-1 h-9 bg-white/90 text-xs" />
                </label>
                <label className="text-xs">
                  Status
                  <select
                    name="status"
                    defaultValue="UNRESOLVED"
                    className="mt-1 h-9 w-full rounded-lg border border-white/35 bg-white/90 px-2 text-xs"
                  >
                    <option value="UNRESOLVED">Open</option>
                    <option value="RESOLVED">Done</option>
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 self-end rounded-lg border border-white/35 bg-white/80 px-2.5 py-2 text-xs text-foreground/75">
                  <input type="checkbox" name="carryForward" value="true" className="h-4 w-4" />
                  Carry forward to next meeting
                </label>
              </div>
              <label className="mt-2 block text-xs">
                Concern / task
                <Textarea
                  name="concern"
                  rows={2}
                  required
                  placeholder="Document the action item in one clear line."
                  className="mt-1 bg-white/90 text-xs"
                />
              </label>
              <label className="mt-2 block text-xs">
                Follow-up notes
                <Textarea name="followUp" rows={2} className="mt-1 bg-white/90 text-xs" />
              </label>
              <div className="mt-2 flex justify-end">
                <GlassButton type="submit" size="sm">
                  Add action item
                </GlassButton>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {tab === "attendance" ? (
        <section className="space-y-3 rounded-2xl border border-white/30 bg-white/55 p-4 shadow-lg shadow-black/10">
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
            <UsersRound className="h-4 w-4 text-actifyBlue" />
            Attendance
          </p>
          <AttendancePanel attendees={meeting.residentsInAttendance} attendanceCount={meeting.attendanceCount} />
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-3 rounded-2xl border border-white/30 bg-white/55 p-4 shadow-lg shadow-black/10">
          <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
            <History className="h-4 w-4 text-actifyBlue" />
            History
          </p>
          <div className="rounded-xl border border-white/35 bg-white/75 px-3 py-3 text-sm text-foreground/75">
            Last updated {formatDateTime(meeting.updatedAt)}.
          </div>
          {meeting.actionItems.length > 0 ? (
            <div className="space-y-2">
              {meeting.actionItems.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-xl border border-white/30 bg-white/70 px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{item.concern}</p>
                  <p className="text-xs text-foreground/65">
                    {item.status === "RESOLVED" ? "Resolved" : "Open"} • {formatDateTime(item.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/35 bg-white/65 px-3 py-6 text-center text-sm text-foreground/70">
              No version history available yet.
            </div>
          )}
          <div className="rounded-xl border border-white/30 bg-white/70 p-3">
            <p className="text-xs uppercase tracking-wide text-foreground/60">Legacy Notes Snapshot</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/72">
              {meeting.legacyMinutesText || meeting.notes || "No legacy minutes captured."}
            </p>
          </div>
        </section>
      ) : null}

      {meeting.minuteSections.length > 0 && tab !== "minutes" ? (
        <section className="rounded-2xl border border-white/30 bg-white/45 p-4 shadow-lg shadow-black/10">
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-actifyBlue" />
            Department Snapshot
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {meeting.minuteSections
              .filter((section) => section.oldBusiness || section.newBusiness || section.notes)
              .slice(0, 6)
              .map((section) => (
                <TopicCard
                  key={section.key}
                  section="NEW"
                  topic={{
                    category: toCategoryLabel(section.label),
                    text: [section.oldBusiness, section.newBusiness, section.notes].filter(Boolean).join(" • "),
                    tags: []
                  }}
                />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function toCategoryLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("admin")) return "Administration";
  if (normalized.includes("social")) return "Social Services";
  if (normalized.includes("activit")) return "Activities";
  if (normalized.includes("nurs")) return "Nursing";
  if (normalized.includes("therap")) return "Therapy";
  if (normalized.includes("diet")) return "Dietary";
  if (normalized.includes("house")) return "Housekeeping";
  if (normalized.includes("laundr")) return "Laundry";
  if (normalized.includes("maint")) return "Maintenance";
  return "Other";
}
