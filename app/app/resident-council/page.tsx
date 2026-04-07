import {
  createResidentCouncilActionItemAction,
  createResidentCouncilMeetingAction,
  duplicateResidentCouncilMeetingAction,
  updateResidentCouncilActionItemAction,
  updateResidentCouncilMeetingMinutesAction
} from "@/app/app/resident-council/_actions";
import { ResidentCouncilWorkspace } from "@/components/resident-council/ResidentCouncilWorkspace";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { parseResidentCouncilMeetingMetadata, RESIDENT_COUNCIL_MEAL_DEFAULT } from "@/lib/resident-council/meeting-metadata";
import { getResidentCouncilSnapshot } from "@/lib/resident-council/service";
import { formatInTimeZone, resolveTimeZone, zonedDateKey } from "@/lib/timezone";

type SearchParams = Record<string, string | string[] | undefined>;

type DepartmentKey =
  | "administration"
  | "therapy"
  | "dietary"
  | "activities"
  | "nursing"
  | "housekeeping"
  | "laundry"
  | "maintenance"
  | "socialServices";

const DEPARTMENT_MAP = [
  { key: "administration", label: "Administration" },
  { key: "therapy", label: "Therapy" },
  { key: "dietary", label: "Dietary" },
  { key: "activities", label: "Activities" },
  { key: "nursing", label: "Nursing" },
  { key: "housekeeping", label: "Housekeeping" },
  { key: "laundry", label: "Laundry" },
  { key: "maintenance", label: "Maintenance" },
  { key: "socialServices", label: "Social Services" }
] as const;

function first(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeDepartmentLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("admin")) return "Administration";
  if (normalized.includes("social")) return "Social Services";
  if (normalized.includes("therap")) return "Therapy";
  if (normalized.includes("diet")) return "Dietary";
  if (normalized.includes("house")) return "Housekeeping";
  if (normalized.includes("laundr")) return "Laundry";
  if (normalized.includes("maint")) return "Maintenance";
  if (normalized.includes("nurs")) return "Nursing";
  if (normalized.includes("activit")) return "Activities";
  return "";
}

function parseDepartmentLines(newBusiness: string | null | undefined) {
  const byDepartment = new Map<string, string>();
  for (const line of (newBusiness ?? "").split(/\n+/)) {
    const cleaned = line.replace(/^[\-\u2022]\s*/, "").trim();
    if (!cleaned) continue;
    const match = cleaned.match(/^([^:]{2,40}):\s*(.+)$/);
    if (!match) continue;
    const department = normalizeDepartmentLabel(match[1]);
    if (!department) continue;
    const existing = byDepartment.get(department);
    byDepartment.set(department, existing ? `${existing}\n${match[2].trim()}` : match[2].trim());
  }
  return byDepartment;
}

function buildMonthOptions(timeZone: string, count = 12) {
  const now = new Date();
  const options: Array<{ key: string; label: string }> = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const key = formatInTimeZone(date, timeZone, { year: "numeric", month: "2-digit" }).replace("/", "-");
    const label = formatInTimeZone(date, timeZone, { month: "long", year: "numeric" });
    options.push({ key, label });
  }
  return options;
}

export default async function ResidentCouncilPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const context = await requireModulePage("residentCouncil");
  const writable = canWrite(context.role);
  const timeZone = resolveTimeZone(context.timeZone);

  const snapshot = await getResidentCouncilSnapshot(context.facilityId);
  const monthOptions = buildMonthOptions(timeZone, 12);
  const defaultMonth = zonedDateKey(new Date(), timeZone).slice(0, 7);
  const initialMonthKey = /^\d{4}-\d{2}$/.test(first(searchParams?.month)) ? first(searchParams?.month) : defaultMonth;
  const selectedMeetingId = first(searchParams?.meetingId) || snapshot.meetings[0]?.id || null;

  const meetings = snapshot.meetings.map((meeting) => {
    const parsed = meeting.parsed;
    const metadata = parseResidentCouncilMeetingMetadata(parsed?.additionalNotes ?? meeting.notes);
    const departmentsFromUpdates = new Map<string, string>();
    for (const entry of parsed?.departmentUpdates ?? []) {
      const normalizedLabel = normalizeDepartmentLabel(entry.label);
      if (!normalizedLabel) continue;
      departmentsFromUpdates.set(normalizedLabel, entry.notes);
    }
    const departmentsFromBusiness = parseDepartmentLines(parsed?.newBusiness);

    const departmentNotes = DEPARTMENT_MAP.reduce<Record<DepartmentKey, string>>((accumulator, department) => {
      const value = departmentsFromUpdates.get(department.label) ?? departmentsFromBusiness.get(department.label) ?? "";
      accumulator[department.key] = value;
      return accumulator;
    }, {} as Record<DepartmentKey, string>);

    const latestActionUpdate = meeting.actionItems.reduce((latest, item) => {
      const current = +new Date(item.updatedAt);
      return current > latest ? current : latest;
    }, +new Date(meeting.heldAt));

    return {
      id: meeting.id,
      heldAt: meeting.heldAt,
      attendanceCount: meeting.attendanceCount,
      summary: parsed?.summary ?? "",
      oldBusiness: parsed?.oldBusiness ?? "",
      departmentNotes,
      residentsInAttendance: parsed?.residentsInAttendance ?? [],
      unresolvedCount: meeting.unresolvedCount,
      rightsReviewed: metadata.residentRightsReviewed,
      mealOfTheMonth: metadata.mealOfTheMonth ?? RESIDENT_COUNCIL_MEAL_DEFAULT,
      timeIn: metadata.timeIn ?? "",
      timeOut: metadata.timeOut ?? "",
      staffInAttendance: metadata.staffInAttendance,
      policyUpdates: metadata.policyUpdates ?? "",
      additionalContext: metadata.additionalContext ?? "",
      meetingStatus: metadata.meetingStatus ?? (meeting.unresolvedCount > 0 ? "Draft" : "Finalized"),
      actionItems: meeting.actionItems,
      updatedAt: new Date(latestActionUpdate).toISOString()
    };
  });

  return (
    <ResidentCouncilWorkspace
      canEdit={writable}
      timeZone={timeZone}
      monthOptions={monthOptions}
      initialMonthKey={initialMonthKey}
      meetings={meetings}
      residents={snapshot.activeResidents}
      initialSelectedMeetingId={selectedMeetingId}
      createMeetingAction={createResidentCouncilMeetingAction}
      updateMeetingAction={updateResidentCouncilMeetingMinutesAction}
      duplicateMeetingAction={duplicateResidentCouncilMeetingAction}
      createActionItemAction={createResidentCouncilActionItemAction}
      updateActionItemAction={updateResidentCouncilActionItemAction}
    />
  );
}

