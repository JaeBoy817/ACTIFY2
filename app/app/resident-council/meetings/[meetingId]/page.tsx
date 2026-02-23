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

type SearchParams = Record<string, string | string[] | undefined>;

function first(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseTab(value: string): MeetingDetailTab {
  if (value === "actions" || value === "attendance" || value === "history") return value;
  return "minutes";
}

function monthFromIso(value: string) {
  return value.slice(0, 7);
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
      month: monthFromIso(meeting.heldAt)
    }),
    writable ? getResidentCouncilActiveResidents(context.facilityId) : Promise.resolve([])
  ]);

  return (
    <div className="space-y-4">
      <ResidentCouncilShell
        writable={writable}
        timeZone={context.facility.timezone}
        currentSection="minutes"
        month={monthFromIso(meeting.heldAt)}
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
          nextMeetingLabel: overview.nextMeeting ? new Date(overview.nextMeeting.heldAt).toLocaleString() : null
        }}
        selectedMeeting={{ id: meeting.id, label: meeting.summary || new Date(meeting.heldAt).toLocaleString() }}
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
