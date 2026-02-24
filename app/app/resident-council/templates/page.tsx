import {
  applyResidentCouncilTemplateAction,
  createResidentCouncilMeetingAction,
  createResidentCouncilTopicFromLibraryAction
} from "@/app/app/resident-council/_actions";
import { ResidentCouncilShell } from "@/components/resident-council/ResidentCouncilShell";
import { TemplateSettingsPanel } from "@/components/resident-council/TemplateSettingsPanel";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import {
  getResidentCouncilActiveResidents,
  getResidentCouncilOverviewData,
  listResidentCouncilMeetings
} from "@/lib/resident-council/queries";
import { residentCouncilTopicTemplates } from "@/lib/resident-council/service";
import { formatInTimeZone, zonedDateKey } from "@/lib/timezone";

export default async function ResidentCouncilTemplatesPage() {
  const context = await requireModulePage("residentCouncil");
  const writable = canWrite(context.role);
  const month = zonedDateKey(new Date(), context.timeZone).slice(0, 7);

  const [overview, residents, meetings] = await Promise.all([
    getResidentCouncilOverviewData({
      facilityId: context.facilityId,
      month,
      timeZone: context.timeZone
    }),
    writable ? getResidentCouncilActiveResidents(context.facilityId) : Promise.resolve([]),
    listResidentCouncilMeetings({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      page: 1,
      pageSize: 30,
      sort: "newest"
    })
  ]);

  const selectedMeeting = meetings.rows[0] ?? overview.recentMeetings[0] ?? null;

  return (
    <div className="space-y-4">
      <ResidentCouncilShell
        writable={writable}
        timeZone={context.timeZone}
        currentSection="templates"
        month={month}
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
          nextMeetingLabel: overview.nextMeeting
            ? formatInTimeZone(new Date(overview.nextMeeting.heldAt), context.timeZone, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit"
              })
            : null
        }}
        selectedMeeting={selectedMeeting ? { id: selectedMeeting.id, label: selectedMeeting.title } : null}
        meetingTemplates={residentCouncilTopicTemplates.map((template) => ({ id: template.id, title: template.title }))}
        residentOptions={residents}
        createMeetingAction={createResidentCouncilMeetingAction}
      >
        <TemplateSettingsPanel
          templates={residentCouncilTopicTemplates}
          meetings={meetings.rows}
          canEdit={writable}
          onApplyTemplate={applyResidentCouncilTemplateAction}
          onCreateTopicFromLibrary={createResidentCouncilTopicFromLibraryAction}
        />
      </ResidentCouncilShell>
    </div>
  );
}
