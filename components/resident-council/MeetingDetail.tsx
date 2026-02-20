import Link from "next/link";
import { CalendarDays, ClipboardList, FileText, ListTodo, UserCheck, Vote } from "lucide-react";

import { AttendancePanel } from "@/components/resident-council/AttendancePanel";
import { TopicCard } from "@/components/resident-council/TopicCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { residentCouncilCategoryOptions } from "@/lib/resident-council/service";
import type { ResidentCouncilMeetingDTO } from "@/lib/resident-council/types";

type ActiveResidentOption = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  status: string;
};

type ActionFn = (formData: FormData) => Promise<void>;

const departmentFields = [
  { key: "departmentActivities", label: "Activities" },
  { key: "departmentNursing", label: "Nursing" },
  { key: "departmentTherapy", label: "Therapy" },
  { key: "departmentDietary", label: "Dietary" },
  { key: "departmentHousekeeping", label: "Housekeeping" },
  { key: "departmentLaundry", label: "Laundry" },
  { key: "departmentMaintenance", label: "Maintenance" },
  { key: "departmentSocialServices", label: "Social Services" },
  { key: "departmentAdministrator", label: "Administration" }
] as const;

function toLocalDateTimeValue(input: Date) {
  const local = new Date(input.getTime() - input.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function parseVoteLines(value?: string | null) {
  if (!value) return [];
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && /vote|approved|denied|motion/i.test(line));
}

export function MeetingDetail({
  meeting,
  meetings,
  residents,
  canEdit,
  onCreateMeeting,
  onCreateActionItem,
  onUpdateActionItem,
  onDeleteActionItem,
  onDeleteMeeting
}: {
  meeting: ResidentCouncilMeetingDTO | null;
  meetings: ResidentCouncilMeetingDTO[];
  residents: ActiveResidentOption[];
  canEdit: boolean;
  onCreateMeeting: ActionFn;
  onCreateActionItem: ActionFn;
  onUpdateActionItem: ActionFn;
  onDeleteActionItem: ActionFn;
  onDeleteMeeting: ActionFn;
}) {
  const voteLines = parseVoteLines(meeting?.parsed?.additionalNotes);

  return (
    <div className="space-y-4">
      {canEdit ? (
        <section className="rounded-2xl border border-white/35 bg-white/65 p-4 shadow-lg shadow-black/10">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-actifyBlue" />
            <h2 className="text-base font-semibold text-foreground">Create Meeting</h2>
          </div>
          <form action={onCreateMeeting} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-foreground/70">Meeting date & time</span>
                <Input type="datetime-local" name="heldAt" required defaultValue={toLocalDateTimeValue(new Date())} className="bg-white/80" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-foreground/70">Attendance override</span>
                <Input type="number" name="attendanceCountOverride" min={0} placeholder="Optional" className="bg-white/80" />
              </label>
              <label className="space-y-1 text-sm md:col-span-1">
                <span className="text-foreground/70">Quick summary</span>
                <Input name="summary" placeholder="One-line summary" className="bg-white/80" />
              </label>
            </div>

            <details className="rounded-xl border border-white/35 bg-white/70 p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Attendance names (optional)</summary>
              <div className="mt-3 max-h-40 overflow-y-auto pr-1">
                {residents.length === 0 ? (
                  <p className="text-sm text-foreground/65">No active residents found.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {residents.map((resident) => (
                      <label
                        key={resident.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/80 px-2.5 py-2 text-xs"
                      >
                        <input type="checkbox" name="residentsAttendedIds" value={resident.id} className="h-4 w-4" />
                        <span>
                          {resident.lastName}, {resident.firstName} <span className="text-foreground/60">(Room {resident.room})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </details>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-foreground/70">Old business</span>
                <Textarea name="oldBusiness" rows={4} className="bg-white/80" placeholder="Carryover topics from previous meetings" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-foreground/70">New business</span>
                <Textarea name="newBusiness" rows={4} className="bg-white/80" placeholder="New concerns and requests" />
              </label>
            </div>

            <details className="rounded-xl border border-white/35 bg-white/70 p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Department updates</summary>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {departmentFields.map((department) => (
                  <label key={department.key} className="space-y-1 text-xs">
                    <span className="text-foreground/70">{department.label}</span>
                    <Textarea name={department.key} rows={2} className="bg-white/80" placeholder={`${department.label} update`} />
                  </label>
                ))}
              </div>
            </details>

            <label className="space-y-1 text-sm">
              <span className="text-foreground/70">Additional notes</span>
              <Textarea name="additionalNotes" rows={3} className="bg-white/80" placeholder="Optional notes, votes, or attachments summary" />
            </label>

            <GlassButton type="submit">Save Meeting</GlassButton>
          </form>
        </section>
      ) : null}

      {meeting ? (
        <section className="rounded-2xl border border-white/35 bg-white/65 p-4 shadow-lg shadow-black/10">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                <ClipboardList className="h-4 w-4 text-actifyBlue" />
                {formatDateTime(meeting.heldAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-white/80">
                  Attendance {meeting.attendanceCount}
                </Badge>
                <Badge variant={meeting.status === "OPEN" ? "destructive" : "secondary"}>
                  {meeting.status === "OPEN" ? `Open actions ${meeting.unresolvedCount}` : "Closed"}
                </Badge>
                <GlassButton asChild size="sm" variant="dense">
                  <Link href={`/app/resident-council?view=reports&meetingId=${encodeURIComponent(meeting.id)}`}>
                    Open in Reports
                  </Link>
                </GlassButton>
              </div>
            </div>
            {canEdit ? (
              <form action={onDeleteMeeting}>
                <input type="hidden" name="meetingId" value={meeting.id} />
                <GlassButton type="submit" size="sm" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                  Delete Meeting
                </GlassButton>
              </form>
            ) : null}
          </div>

          <Accordion type="multiple" defaultValue={["summary", "attendance", "actions"]} className="space-y-2">
            <AccordionItem value="summary" className="rounded-xl border border-white/30 bg-white/70 px-3">
              <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-actifyBlue" />
                  Quick Summary
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="whitespace-pre-wrap text-sm text-foreground/80">
                  {meeting.parsed?.summary ?? "No summary provided."}
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="attendance" className="rounded-xl border border-white/30 bg-white/70 px-3">
              <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-actifyBlue" />
                  Attendance
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <AttendancePanel attendees={meeting.parsed?.residentsInAttendance ?? []} attendanceCount={meeting.attendanceCount} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="old-business" className="rounded-xl border border-white/30 bg-white/70 px-3">
              <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">Old Business</AccordionTrigger>
              <AccordionContent>
                {meeting.topics.filter((topic) => topic.section === "OLD").length === 0 ? (
                  <p className="text-sm text-foreground/65">No old business topics captured.</p>
                ) : (
                  <div className="space-y-2">
                    {meeting.topics
                      .filter((topic) => topic.section === "OLD")
                      .map((topic) => <TopicCard key={topic.id} topic={topic} section="OLD" />)}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="new-business" className="rounded-xl border border-white/30 bg-white/70 px-3">
              <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">New Business</AccordionTrigger>
              <AccordionContent>
                {meeting.topics.filter((topic) => topic.section === "NEW").length === 0 ? (
                  <p className="text-sm text-foreground/65">No new business topics captured.</p>
                ) : (
                  <div className="space-y-2">
                    {meeting.topics
                      .filter((topic) => topic.section === "NEW")
                      .map((topic) => <TopicCard key={topic.id} topic={topic} section="NEW" />)}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="votes" className="rounded-xl border border-white/30 bg-white/70 px-3">
              <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">
                <span className="inline-flex items-center gap-1.5">
                  <Vote className="h-4 w-4 text-actifyBlue" />
                  Votes
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {voteLines.length === 0 ? (
                  <p className="text-sm text-foreground/65">No vote records found for this meeting.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
                    {voteLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="actions" className="rounded-xl border border-white/30 bg-white/70 px-3">
              <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">
                <span className="inline-flex items-center gap-1.5">
                  <ListTodo className="h-4 w-4 text-actifyBlue" />
                  Action Items
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {meeting.actionItems.length === 0 ? (
                    <p className="text-sm text-foreground/65">No action items for this meeting yet.</p>
                  ) : (
                    meeting.actionItems.map((item) => (
                      <article key={item.id} className="rounded-xl border border-white/40 bg-white/80 p-3 text-sm shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">{item.concern}</p>
                            <p className="mt-1 text-xs text-foreground/70">
                              {item.category} · Updated {formatDateTime(item.updatedAt)}
                            </p>
                            {item.owner ? <p className="text-xs text-foreground/70">Owner: {item.owner}</p> : null}
                            {item.dueDate ? <p className="text-xs text-foreground/70">Due: {item.dueDate}</p> : null}
                            {item.followUp ? <p className="mt-1 text-xs text-foreground/75">{item.followUp}</p> : null}
                          </div>
                          <Badge variant={item.status === "RESOLVED" ? "secondary" : "destructive"}>{item.status}</Badge>
                        </div>

                        {canEdit ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <form action={onUpdateActionItem}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <input type="hidden" name="section" value={item.section} />
                              <input type="hidden" name="status" value={item.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED"} />
                              <input type="hidden" name="owner" value={item.owner ?? ""} />
                              <input type="hidden" name="dueDate" value={item.dueDate ?? ""} />
                              <input type="hidden" name="followUp" value={item.followUp ?? ""} />
                              <GlassButton type="submit" size="sm" variant="dense">
                                Mark {item.status === "RESOLVED" ? "Unresolved" : "Resolved"}
                              </GlassButton>
                            </form>

                            <details>
                              <summary className="cursor-pointer rounded-lg border border-white/35 bg-white/85 px-3 py-1.5 text-xs font-medium text-foreground">
                                Edit owner / due date
                              </summary>
                              <form action={onUpdateActionItem} className="mt-2 space-y-2 rounded-xl border border-white/40 bg-white/85 p-3">
                                <input type="hidden" name="itemId" value={item.id} />
                                <input type="hidden" name="section" value={item.section} />
                                <input type="hidden" name="status" value={item.status} />
                                <label className="block text-xs">
                                  Owner
                                  <Input name="owner" defaultValue={item.owner ?? ""} className="mt-1 h-8 bg-white/90 text-xs" />
                                </label>
                                <label className="block text-xs">
                                  Due date
                                  <Input type="date" name="dueDate" defaultValue={item.dueDate ?? ""} className="mt-1 h-8 bg-white/90 text-xs" />
                                </label>
                                <label className="block text-xs">
                                  Follow-up
                                  <Textarea name="followUp" defaultValue={item.followUp ?? ""} rows={2} className="mt-1 bg-white/90 text-xs" />
                                </label>
                                <GlassButton type="submit" size="sm" variant="dense">Save</GlassButton>
                              </form>
                            </details>

                            <form action={onDeleteActionItem}>
                              <input type="hidden" name="itemId" value={item.id} />
                              <GlassButton type="submit" size="sm" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                                Delete
                              </GlassButton>
                            </form>
                          </div>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>

                {canEdit ? (
                  <form action={onCreateActionItem} className="mt-3 space-y-2 rounded-xl border border-white/40 bg-white/85 p-3">
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="text-xs">
                        Category
                        <select
                          name="category"
                          defaultValue={residentCouncilCategoryOptions[0]}
                          className="mt-1 h-8 w-full rounded-lg border border-white/40 bg-white/95 px-2 text-xs"
                        >
                          {residentCouncilCategoryOptions.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs">
                        Section
                        <select name="section" defaultValue="NEW" className="mt-1 h-8 w-full rounded-lg border border-white/40 bg-white/95 px-2 text-xs">
                          <option value="NEW">New Business</option>
                          <option value="OLD">Old Business</option>
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="text-xs">
                        Owner
                        <Input name="owner" className="mt-1 h-8 bg-white/95 text-xs" placeholder="Optional" />
                      </label>
                      <label className="text-xs">
                        Due date
                        <Input type="date" name="dueDate" className="mt-1 h-8 bg-white/95 text-xs" />
                      </label>
                    </div>
                    <label className="block text-xs">
                      Concern / task
                      <Textarea name="concern" rows={2} className="mt-1 bg-white/95 text-xs" required placeholder="Document the follow-up item" />
                    </label>
                    <div className="grid gap-2 md:grid-cols-1">
                      <label className="text-xs">
                        Status
                        <select name="status" defaultValue="UNRESOLVED" className="mt-1 h-8 w-full rounded-lg border border-white/40 bg-white/95 px-2 text-xs">
                          <option value="UNRESOLVED">Unresolved</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </label>
                    </div>
                    <label className="block text-xs">
                      Follow-up notes
                      <Textarea name="followUp" rows={2} className="mt-1 bg-white/95 text-xs" placeholder="Optional detail" />
                    </label>
                    <GlassButton type="submit" size="sm">Add Action Item</GlassButton>
                  </form>
                ) : null}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notes" className="rounded-xl border border-white/30 bg-white/70 px-3">
              <AccordionTrigger className="py-3 text-sm font-semibold no-underline hover:no-underline">Attachments / Notes</AccordionTrigger>
              <AccordionContent>
                <p className="whitespace-pre-wrap text-sm text-foreground/75">
                  {meeting.parsed?.additionalNotes ?? meeting.notes ?? "No additional attachments or notes."}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-white/35 bg-white/65 p-8 text-center shadow-lg shadow-black/10">
          <p className="text-base font-semibold text-foreground">No meeting selected</p>
          <p className="mt-1 text-sm text-foreground/70">
            {meetings.length === 0
              ? "Create your first Resident Council meeting using the form above."
              : "Select a meeting from the left list to view details."}
          </p>
        </section>
      )}
    </div>
  );
}
