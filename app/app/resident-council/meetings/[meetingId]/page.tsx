import { notFound } from "next/navigation";

import {
  bulkUpdateResidentCouncilActionItemsAction,
  createResidentCouncilActionItemAction,
  createResidentCouncilMeetingAction,
  deleteResidentCouncilActionItemAction,
  deleteResidentCouncilMeetingAction,
  updateResidentCouncilActionItemAction,
  updateResidentCouncilMeetingMinutesAction
} from "@/app/app/resident-council/_actions";
import { MeetingDetail } from "@/components/resident-council/MeetingDetail";
import { type MeetingDetailTab } from "@/components/resident-council/MeetingTabs";
import { ResidentCouncilShell } from "@/components/resident-council/ResidentCouncilShell";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import {
  getResidentCouncilActiveResidents,
  getResidentCouncilMeetingDetail,
  getResidentCouncilOverviewData
} from "@/lib/resident-council/queries";
import { residentCouncilTopicTemplates } from "@/lib/resident-council/service";
import { formatInTimeZone, zonedDateKey } from "@/lib/timezone";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseTab(value: string): MeetingDetailTab {
  if (value === "actions" || value === "attendance" || value === "history") return value;
  return "minutes";
}

function monthFromIso(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return zonedDateKey(new Date(), timeZone).slice(0, 7);
  }
  return zonedDateKey(parsed, timeZone).slice(0, 7);
}

function formatDateTime(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return formatInTimeZone(parsed, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default async function ResidentCouncilMeetingDetailPage({
  params,
  searchParams
}: {
  params: { meetingId: string };
  searchParams?: SearchParams;
}) {
  const context = await requireModulePage("residentCouncil");
  const writable = canWrite(context.role);
  const activeTab = parseTab(first(searchParams?.tab));

  const meeting = await getResidentCouncilMeetingDetail({
    facilityId: context.facilityId,
    meetingId: params.meetingId
  });

  if (!meeting) notFound();

  const [overview, residentOptions] = await Promise.all([
    getResidentCouncilOverviewData({
      facilityId: context.facilityId,
      month: monthFromIso(meeting.heldAt, context.timeZone),
      timeZone: context.timeZone
    }),
    writable ? getResidentCouncilActiveResidents(context.facilityId) : Promise.resolve([])
  ]);

  return (
    <div className="space-y-4">
      <ResidentCouncilShell
        writable={writable}
        timeZone={context.timeZone}
        currentSection="minutes"
        month={monthFromIso(meeting.heldAt, context.timeZone)}
        monthFormAction="/app/resident-council"
        monthFormView="overview"
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
          nextMeetingLabel: overview.nextMeeting ? formatDateTime(overview.nextMeeting.heldAt, context.timeZone) : null
        }}
        selectedMeeting={{ id: meeting.id, label: meeting.summary || formatDateTime(meeting.heldAt, context.timeZone) }}
        meetingTemplates={residentCouncilTopicTemplates.map((template) => ({ id: template.id, title: template.title }))}
        residentOptions={residentOptions}
        createMeetingAction={createResidentCouncilMeetingAction}
      >
        <MeetingDetail
          meeting={meeting}
          tab={activeTab}
          canEdit={writable}
          onSaveMinutes={updateResidentCouncilMeetingMinutesAction}
          onCreateActionItem={createResidentCouncilActionItemAction}
          onUpdateActionItem={updateResidentCouncilActionItemAction}
          onDeleteActionItem={deleteResidentCouncilActionItemAction}
          onBulkUpdateActionItems={bulkUpdateResidentCouncilActionItemsAction}
          onDeleteMeeting={deleteResidentCouncilMeetingAction}
        />
      </ResidentCouncilShell>
    </div>
  );
}
