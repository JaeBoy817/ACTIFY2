"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CopyPlus,
  Download,
  FileText,
  Filter,
  ListChecks,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { RESIDENT_COUNCIL_MEAL_DEFAULT } from "@/lib/resident-council/meeting-metadata";

type MeetingSaveResult = {
  meetingId: string;
};

type ResidentOption = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  status: string;
};

type MeetingActionItem = {
  id: string;
  meetingId: string;
  section: "OLD" | "NEW";
  category: string;
  concern: string;
  followUp: string | null;
  owner: string | null;
  dueDate: string | null;
  status: "RESOLVED" | "UNRESOLVED";
  updatedAt: string;
};

type WorkspaceMeeting = {
  id: string;
  heldAt: string;
  attendanceCount: number;
  summary: string;
  oldBusiness: string;
  departmentNotes: Record<DepartmentKey, string>;
  residentsInAttendance: string[];
  unresolvedCount: number;
  rightsReviewed: boolean;
  mealOfTheMonth: string;
  timeIn: string;
  timeOut: string;
  staffInAttendance: string[];
  policyUpdates: string;
  additionalContext: string;
  meetingStatus: "Draft" | "Finalized";
  actionItems: MeetingActionItem[];
  updatedAt: string;
};

type MonthOption = {
  key: string;
  label: string;
};

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

type DepartmentDefinition = {
  key: DepartmentKey;
  label: string;
  fieldName: string;
};

const DEPARTMENTS: DepartmentDefinition[] = [
  { key: "administration", label: "Administration", fieldName: "departmentAdministrator" },
  { key: "therapy", label: "Therapy", fieldName: "departmentTherapy" },
  { key: "dietary", label: "Dietary", fieldName: "departmentDietary" },
  { key: "activities", label: "Activities", fieldName: "departmentActivities" },
  { key: "nursing", label: "Nursing", fieldName: "departmentNursing" },
  { key: "housekeeping", label: "Housekeeping", fieldName: "departmentHousekeeping" },
  { key: "laundry", label: "Laundry", fieldName: "departmentLaundry" },
  { key: "maintenance", label: "Maintenance", fieldName: "departmentMaintenance" },
  { key: "socialServices", label: "Social Services", fieldName: "departmentSocialServices" }
];

type MeetingFormState = {
  meetingId: string | null;
  heldAt: string;
  timeIn: string;
  timeOut: string;
  attendanceCountOverride: string;
  residentAttendanceSearch: string;
  residentIds: string[];
  residentsInAttendanceManual: string;
  staffInAttendance: string;
  summary: string;
  oldBusiness: string;
  departmentNotes: Record<DepartmentKey, string>;
  rightsReviewed: boolean;
  policyUpdates: string;
  mealOfMonth: string;
  additionalContext: string;
  meetingStatus: "DRAFT" | "FINALIZED";
};

type FollowUpState = {
  category: string;
  concern: string;
  owner: string;
  dueDate: string;
  note: string;
};

const PANEL =
  "rounded-[1.35rem] border border-[#3f4f69]/85 bg-[linear-gradient(180deg,#0f1827_0%,#0d1522_55%,#0a101a_100%)] shadow-[0_28px_50px_-34px_rgba(121,139,176,0.66)]";
const PANEL_SOFT =
  "rounded-2xl border border-[#445a79]/85 bg-[linear-gradient(180deg,rgba(23,35,55,0.84)_0%,rgba(15,24,39,0.92)_100%)]";
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9fb3d5]";
const INPUT =
  "border-[#4e6182] bg-[#17263f] text-[#dce8ff] placeholder:text-[#8da2c7] focus-visible:ring-[#6f8fc9]";

function toLocalDateTimeValue(input: Date) {
  const local = new Date(input.getTime() - input.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function formatDate(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function getMonthKey(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit"
  }).format(parsed);
  return formatted.replaceAll("/", "-").slice(0, 7);
}

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function flattenDepartmentEntries(departmentNotes: Record<DepartmentKey, string>) {
  const lines: string[] = [];
  for (const department of DEPARTMENTS) {
    const value = departmentNotes[department.key]?.trim();
    if (!value) continue;
    lines.push(`${department.label}: ${value.replace(/\n+/g, " ")}`);
  }
  return lines.length > 0 ? lines.join("\n") : "Not discussed.";
}

function createDefaultDepartmentState() {
  return DEPARTMENTS.reduce<Record<DepartmentKey, string>>((accumulator, department) => {
    accumulator[department.key] = "";
    return accumulator;
  }, {} as Record<DepartmentKey, string>);
}

function createEmptyFormState(defaultHeldAt?: string): MeetingFormState {
  return {
    meetingId: null,
    heldAt: defaultHeldAt ?? toLocalDateTimeValue(new Date()),
    timeIn: "",
    timeOut: "",
    attendanceCountOverride: "",
    residentAttendanceSearch: "",
    residentIds: [],
    residentsInAttendanceManual: "",
    staffInAttendance: "",
    summary: "",
    oldBusiness: "",
    departmentNotes: createDefaultDepartmentState(),
    rightsReviewed: true,
    policyUpdates: "",
    mealOfMonth: RESIDENT_COUNCIL_MEAL_DEFAULT,
    additionalContext: "",
    meetingStatus: "DRAFT"
  };
}

function mapMeetingToFormState(meeting: WorkspaceMeeting): MeetingFormState {
  const heldAt = new Date(meeting.heldAt);
  const heldAtValue = Number.isNaN(heldAt.getTime()) ? toLocalDateTimeValue(new Date()) : toLocalDateTimeValue(heldAt);
  return {
    meetingId: meeting.id,
    heldAt: heldAtValue,
    timeIn: meeting.timeIn,
    timeOut: meeting.timeOut,
    attendanceCountOverride: "",
    residentAttendanceSearch: "",
    residentIds: [],
    residentsInAttendanceManual: meeting.residentsInAttendance.join("\n"),
    staffInAttendance: meeting.staffInAttendance.join("\n"),
    summary: meeting.summary,
    oldBusiness: meeting.oldBusiness,
    departmentNotes: {
      administration: meeting.departmentNotes.administration ?? "",
      therapy: meeting.departmentNotes.therapy ?? "",
      dietary: meeting.departmentNotes.dietary ?? "",
      activities: meeting.departmentNotes.activities ?? "",
      nursing: meeting.departmentNotes.nursing ?? "",
      housekeeping: meeting.departmentNotes.housekeeping ?? "",
      laundry: meeting.departmentNotes.laundry ?? "",
      maintenance: meeting.departmentNotes.maintenance ?? "",
      socialServices: meeting.departmentNotes.socialServices ?? ""
    },
    rightsReviewed: meeting.rightsReviewed,
    policyUpdates: meeting.policyUpdates,
    mealOfMonth: meeting.mealOfTheMonth || RESIDENT_COUNCIL_MEAL_DEFAULT,
    additionalContext: meeting.additionalContext,
    meetingStatus: meeting.meetingStatus === "Finalized" ? "FINALIZED" : "DRAFT"
  };
}

function buildMeetingStatusTone(status: "Draft" | "Finalized") {
  return status === "Finalized"
    ? "border-emerald-300/45 bg-emerald-500/15 text-emerald-100"
    : "border-amber-300/45 bg-amber-500/15 text-amber-100";
}

function buildFollowUpStatusTone(status: "RESOLVED" | "UNRESOLVED") {
  return status === "RESOLVED"
    ? "border-emerald-300/45 bg-emerald-500/15 text-emerald-100"
    : "border-rose-300/45 bg-rose-500/15 text-rose-100";
}

export function ResidentCouncilWorkspace({
  canEdit,
  timeZone,
  monthOptions,
  initialMonthKey,
  meetings,
  residents,
  initialSelectedMeetingId,
  createMeetingAction,
  updateMeetingAction,
  duplicateMeetingAction,
  createActionItemAction,
  updateActionItemAction
}: {
  canEdit: boolean;
  timeZone: string;
  monthOptions: MonthOption[];
  initialMonthKey: string;
  meetings: WorkspaceMeeting[];
  residents: ResidentOption[];
  initialSelectedMeetingId?: string | null;
  createMeetingAction: (formData: FormData) => Promise<void>;
  updateMeetingAction: (formData: FormData) => Promise<void>;
  duplicateMeetingAction: (formData: FormData) => Promise<MeetingSaveResult | void>;
  createActionItemAction: (formData: FormData) => Promise<void>;
  updateActionItemAction: (formData: FormData) => Promise<void>;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [monthFilter, setMonthFilter] = useState(initialMonthKey);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "FINALIZED">("ALL");
  const [rightsFilter, setRightsFilter] = useState<"ALL" | "YES" | "NO">("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "OPEN_FIRST">("NEWEST");

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    initialSelectedMeetingId ?? meetings[0]?.id ?? null
  );
  const [isNewMeeting, setIsNewMeeting] = useState<boolean>((initialSelectedMeetingId ?? "").length < 1);
  const [formState, setFormState] = useState<MeetingFormState>(createEmptyFormState());
  const [lastHydratedMeetingId, setLastHydratedMeetingId] = useState<string | null>(null);

  const [followUpForm, setFollowUpForm] = useState<FollowUpState>({
    category: "Activities",
    concern: "",
    owner: "",
    dueDate: "",
    note: ""
  });

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null,
    [meetings, selectedMeetingId]
  );

  useEffect(() => {
    if (isNewMeeting) return;
    if (!selectedMeeting) return;
    if (lastHydratedMeetingId === selectedMeeting.id) return;
    setFormState(mapMeetingToFormState(selectedMeeting));
    setLastHydratedMeetingId(selectedMeeting.id);
  }, [isNewMeeting, lastHydratedMeetingId, selectedMeeting]);

  useEffect(() => {
    if (isNewMeeting) return;
    if (selectedMeetingId && meetings.some((meeting) => meeting.id === selectedMeetingId)) return;
    if (meetings[0]) {
      setSelectedMeetingId(meetings[0].id);
      setLastHydratedMeetingId(null);
      return;
    }
    setSelectedMeetingId(null);
  }, [isNewMeeting, meetings, selectedMeetingId]);

  const filteredMeetings = useMemo(() => {
    const token = search.trim().toLowerCase();
    const rows = meetings
      .filter((meeting) => (monthFilter === "ALL" ? true : getMonthKey(meeting.heldAt, timeZone) === monthFilter))
      .filter((meeting) => {
        if (statusFilter === "ALL") return true;
        if (statusFilter === "DRAFT") return meeting.meetingStatus === "Draft";
        return meeting.meetingStatus === "Finalized";
      })
      .filter((meeting) => {
        if (rightsFilter === "ALL") return true;
        return rightsFilter === "YES" ? meeting.rightsReviewed : !meeting.rightsReviewed;
      })
      .filter((meeting) => {
        if (!token) return true;
        const departmentsText = DEPARTMENTS.map((department) => meeting.departmentNotes[department.key]).join(" ");
        const attendanceText = meeting.residentsInAttendance.join(" ");
        return (
          formatDate(meeting.heldAt, timeZone).toLowerCase().includes(token) ||
          meeting.summary.toLowerCase().includes(token) ||
          meeting.oldBusiness.toLowerCase().includes(token) ||
          departmentsText.toLowerCase().includes(token) ||
          attendanceText.toLowerCase().includes(token) ||
          meeting.mealOfTheMonth.toLowerCase().includes(token)
        );
      });

    rows.sort((left, right) => {
      if (sortBy === "OPEN_FIRST") {
        if (left.unresolvedCount !== right.unresolvedCount) return right.unresolvedCount - left.unresolvedCount;
        return +new Date(right.heldAt) - +new Date(left.heldAt);
      }
      if (sortBy === "OLDEST") return +new Date(left.heldAt) - +new Date(right.heldAt);
      return +new Date(right.heldAt) - +new Date(left.heldAt);
    });

    return rows;
  }, [meetings, monthFilter, rightsFilter, search, sortBy, statusFilter, timeZone]);

  const unresolvedItemsAcrossMeetings = useMemo(
    () =>
      meetings
        .flatMap((meeting) => meeting.actionItems)
        .filter((item) => item.status === "UNRESOLVED")
        .sort((left, right) => {
          const leftDue = left.dueDate ? +new Date(`${left.dueDate}T00:00:00.000Z`) : Number.POSITIVE_INFINITY;
          const rightDue = right.dueDate ? +new Date(`${right.dueDate}T00:00:00.000Z`) : Number.POSITIVE_INFINITY;
          if (leftDue !== rightDue) return leftDue - rightDue;
          return +new Date(right.updatedAt) - +new Date(left.updatedAt);
        }),
    [meetings]
  );

  const monthMeetings = useMemo(
    () => meetings.filter((meeting) => getMonthKey(meeting.heldAt, timeZone) === monthFilter),
    [meetings, monthFilter, timeZone]
  );

  const latestMeeting = meetings[0] ?? null;
  const meetingsThisMonth = monthMeetings.length;
  const lastMeetingDate = latestMeeting ? formatDate(latestMeeting.heldAt, timeZone) : "No meetings yet";
  const residentRightsSummary = latestMeeting ? (latestMeeting.rightsReviewed ? "Yes" : "No") : "N/A";
  const mealOfMonthSummary = latestMeeting?.mealOfTheMonth || RESIDENT_COUNCIL_MEAL_DEFAULT;

  const selectedMeetingActionItems = selectedMeeting?.actionItems ?? [];

  const residentDirectoryRows = useMemo(() => {
    const token = formState.residentAttendanceSearch.trim().toLowerCase();
    if (!token) return residents;
    return residents.filter((resident) => {
      const haystack = `${resident.lastName} ${resident.firstName} ${resident.room}`.toLowerCase();
      return haystack.includes(token);
    });
  }, [formState.residentAttendanceSearch, residents]);

  const residentSelectionCount = formState.residentIds.length + splitLines(formState.residentsInAttendanceManual).length;
  const staffSelectionCount = splitLines(formState.staffInAttendance).length;

  function onSelectMeeting(meetingId: string) {
    setSelectedMeetingId(meetingId);
    setIsNewMeeting(false);
    setLastHydratedMeetingId(null);
  }

  function resetNewMeetingForm() {
    setIsNewMeeting(true);
    setSelectedMeetingId(null);
    setLastHydratedMeetingId(null);
    setFormState(createEmptyFormState());
  }

  function duplicateFromSelectedMeeting() {
    if (!selectedMeeting || !canEdit) return;
    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set("sourceMeetingId", selectedMeeting.id);
        payload.set("heldAt", formState.heldAt || toLocalDateTimeValue(new Date()));
        const result = await duplicateMeetingAction(payload);
        if (!result?.meetingId) {
          throw new Error("Duplicate succeeded but no meeting id was returned.");
        }
        setIsNewMeeting(false);
        setSelectedMeetingId(result.meetingId);
        setLastHydratedMeetingId(null);
        toast({ title: "Meeting duplicated", description: "Unresolved items were carried into old business." });
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not duplicate meeting",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  function toggleResident(residentId: string) {
    setFormState((current) => {
      const exists = current.residentIds.includes(residentId);
      return {
        ...current,
        residentIds: exists
          ? current.residentIds.filter((id) => id !== residentId)
          : [...current.residentIds, residentId]
      };
    });
  }

  function buildSavePayload(nextStatus: "DRAFT" | "FINALIZED") {
    const payload = new FormData();
    if (formState.meetingId) payload.set("meetingId", formState.meetingId);
    payload.set("heldAt", formState.heldAt);
    if (formState.attendanceCountOverride.trim()) {
      payload.set("attendanceCountOverride", formState.attendanceCountOverride.trim());
    }
    for (const residentId of formState.residentIds) {
      payload.append("residentsAttendedIds", residentId);
    }
    payload.set("residentsInAttendanceManual", formState.residentsInAttendanceManual);
    payload.set("staffInAttendance", formState.staffInAttendance);
    payload.set("timeIn", formState.timeIn);
    payload.set("timeOut", formState.timeOut);
    payload.set("residentRightsReviewed", formState.rightsReviewed ? "true" : "false");
    payload.set("policyUpdates", formState.policyUpdates);
    payload.set("mealOfMonth", formState.mealOfMonth || RESIDENT_COUNCIL_MEAL_DEFAULT);
    payload.set("meetingStatus", nextStatus);
    payload.set("summary", formState.summary);
    payload.set("oldBusiness", formState.oldBusiness);
    payload.set("newBusiness", flattenDepartmentEntries(formState.departmentNotes));
    payload.set("additionalNotes", formState.additionalContext);
    for (const department of DEPARTMENTS) {
      payload.set(department.fieldName, formState.departmentNotes[department.key] ?? "");
    }
    return payload;
  }

  function saveMeeting(nextStatus: "DRAFT" | "FINALIZED") {
    if (!canEdit) return;
    if (!formState.heldAt.trim()) {
      toast({
        title: "Meeting date is required",
        description: "Add a meeting date before saving.",
        variant: "destructive"
      });
      return;
    }

    startTransition(async () => {
      try {
        const payload = buildSavePayload(nextStatus);
        const existingMeetingId = formState.meetingId;
        if (existingMeetingId) {
          await updateMeetingAction(payload);
        } else {
          await createMeetingAction(payload);
        }
        setFormState((current) => ({
          ...current,
          meetingId: existingMeetingId,
          meetingStatus: nextStatus
        }));
        setIsNewMeeting(false);
        setSelectedMeetingId(existingMeetingId);
        setLastHydratedMeetingId(null);
        toast({
          title: nextStatus === "FINALIZED" ? "Meeting finalized" : "Draft saved",
          description: "Resident council notes were updated successfully."
        });
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not save meeting",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  function submitFollowUp() {
    if (!canEdit) return;
    if (!formState.meetingId) {
      toast({
        title: "Save meeting first",
        description: "Create or save the meeting before adding follow-up items.",
        variant: "destructive"
      });
      return;
    }
    if (followUpForm.concern.trim().length < 3) {
      toast({
        title: "Concern is required",
        description: "Add a clear follow-up concern before saving.",
        variant: "destructive"
      });
      return;
    }
    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set("meetingId", formState.meetingId ?? "");
        payload.set("section", "NEW");
        payload.set("category", followUpForm.category);
        payload.set("concern", followUpForm.concern.trim());
        payload.set("owner", followUpForm.owner.trim());
        payload.set("followUp", followUpForm.note.trim());
        payload.set("dueDate", followUpForm.dueDate);
        payload.set("status", "UNRESOLVED");
        await createActionItemAction(payload);
        setFollowUpForm({
          category: "Activities",
          concern: "",
          owner: "",
          dueDate: "",
          note: ""
        });
        toast({ title: "Follow-up item added" });
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not create follow-up",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  function updateFollowUpStatus(itemId: string, status: "RESOLVED" | "UNRESOLVED") {
    if (!canEdit) return;
    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set("itemId", itemId);
        payload.set("status", status);
        await updateActionItemAction(payload);
        toast({ title: status === "RESOLVED" ? "Follow-up resolved" : "Follow-up reopened" });
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not update follow-up",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className={cn(PANEL, "relative overflow-hidden p-4 md:p-5")}>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-violet-300/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className={LABEL}>Resident Council Workspace</p>
            <h1 className="text-2xl font-extrabold text-white md:text-3xl">Resident Council</h1>
            <p className="max-w-3xl text-sm text-[#b8c8e4]">
              Document resident council meetings clearly and keep department follow-up organized.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 rounded-full bg-[#3e8aa9] px-3 text-xs text-white hover:bg-[#4ca0c2]"
              onClick={resetNewMeetingForm}
              disabled={!canEdit}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Council Meeting
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full border-[#4e6385] bg-[#1b2a42] px-3 text-xs text-[#dbe8ff] hover:bg-[#223754]"
              onClick={duplicateFromSelectedMeeting}
              disabled={!canEdit || !selectedMeeting}
            >
              <CopyPlus className="mr-1.5 h-3.5 w-3.5" />
              Duplicate Last Meeting
            </Button>
            {selectedMeeting ? (
              <>
                <Link
                  href={`/app/resident-council/pdf?meetingId=${encodeURIComponent(selectedMeeting.id)}&preview=1`}
                  target="_blank"
                  className="inline-flex h-9 items-center rounded-full border border-[#4e6385] bg-[#1b2a42] px-3 text-xs text-[#dbe8ff] hover:bg-[#223754]"
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Print Minutes
                </Link>
                <Link
                  href={`/app/resident-council/pdf?meetingId=${encodeURIComponent(selectedMeeting.id)}`}
                  className="inline-flex h-9 items-center rounded-full border border-[#4e6385] bg-[#1b2a42] px-3 text-xs text-[#dbe8ff] hover:bg-[#223754]"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export PDF
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Meetings This Month"
            value={String(meetingsThisMonth)}
            helper={monthOptions.find((option) => option.key === monthFilter)?.label ?? monthFilter}
            icon={<CalendarDays className="h-4 w-4 text-sky-100" />}
            accent="from-sky-300/28 to-cyan-300/20"
          />
          <SummaryCard
            label="Open Follow-Ups"
            value={String(unresolvedItemsAcrossMeetings.length)}
            helper="Across all meetings"
            icon={<ListChecks className="h-4 w-4 text-rose-100" />}
            accent="from-rose-300/28 to-orange-300/20"
          />
          <SummaryCard
            label="Last Meeting Date"
            value={lastMeetingDate}
            helper="Most recent council note"
            icon={<Clock3 className="h-4 w-4 text-violet-100" />}
            accent="from-violet-300/28 to-indigo-300/20"
          />
          <SummaryCard
            label="Resident Rights Reviewed"
            value={residentRightsSummary}
            helper="Latest meeting status"
            icon={<ShieldCheck className="h-4 w-4 text-emerald-100" />}
            accent="from-emerald-300/28 to-teal-300/20"
          />
          <SummaryCard
            label="Meal of the Month"
            value={mealOfMonthSummary}
            helper="Latest recorded meal"
            icon={<Users className="h-4 w-4 text-amber-100" />}
            accent="from-amber-300/28 to-yellow-300/20"
          />
        </div>
      </section>

      <section className={cn(PANEL, "p-4")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className={LABEL}>Meeting History Filters</p>
            <h2 className="mt-1 text-base font-bold text-white">Search and filter meetings quickly</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-full border-[#4e6385] bg-[#1b2a42] px-3 text-xs text-[#dbe8ff] hover:bg-[#223754]"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setRightsFilter("ALL");
              setSortBy("NEWEST");
              setMonthFilter(initialMonthKey);
            }}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
        </div>
        <div className="grid gap-2 xl:grid-cols-[190px_170px_170px_170px_minmax(0,1fr)]">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b7d4]">
            Month
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="mt-1 h-10 w-full rounded-full border border-[#4e6385] bg-[#17263f] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="ALL">All months</option>
              {monthOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b7d4]">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | "DRAFT" | "FINALIZED")}
              className="mt-1 h-10 w-full rounded-full border border-[#4e6385] bg-[#17263f] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="ALL">All</option>
              <option value="DRAFT">Draft</option>
              <option value="FINALIZED">Finalized</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b7d4]">
            Rights Reviewed
            <select
              value={rightsFilter}
              onChange={(event) => setRightsFilter(event.target.value as "ALL" | "YES" | "NO")}
              className="mt-1 h-10 w-full rounded-full border border-[#4e6385] bg-[#17263f] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="ALL">All</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b7d4]">
            Sort
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "NEWEST" | "OLDEST" | "OPEN_FIRST")}
              className="mt-1 h-10 w-full rounded-full border border-[#4e6385] bg-[#17263f] px-3 text-sm normal-case text-[#dbe8ff]"
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="OPEN_FIRST">Open follow-up first</option>
            </select>
          </label>
          <label className="relative flex h-10 items-center rounded-full border border-[#4e6385] bg-[#17263f] px-3 text-sm text-[#dbe8ff]">
            <Search className="h-4 w-4 text-[#98acd1]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search date, attendance, department, meal..."
              className="h-full w-full bg-transparent px-2 placeholder:text-[#8ca2c8] focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <aside className={cn(PANEL, "space-y-3 p-4")}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className={LABEL}>Meeting History</p>
              <h2 className="mt-1 text-base font-bold text-white">Past Resident Council Meetings</h2>
            </div>
            <Badge className="border border-[#4e6385] bg-[#1b2a42] text-xs text-[#dbe8ff]">
              {filteredMeetings.length}
            </Badge>
          </div>

          {filteredMeetings.length < 1 ? (
            <div className="rounded-xl border border-dashed border-[#4e6385] bg-[#17263f] px-3 py-8 text-center text-sm text-[#a8b8d4]">
              No resident council meetings matched your filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMeetings.map((meeting) => {
                const active = !isNewMeeting && selectedMeetingId === meeting.id;
                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => onSelectMeeting(meeting.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      active
                        ? "border-[#70a7d4] bg-[#233856]"
                        : "border-[#4b5f7f] bg-[#17263f] hover:bg-[#1f3350]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{formatDate(meeting.heldAt, timeZone)}</p>
                      <Badge className={cn("border text-[11px]", buildMeetingStatusTone(meeting.meetingStatus))}>
                        {meeting.meetingStatus}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#afc1df]">
                      {meeting.timeIn || "No Time In"} - {meeting.timeOut || "No Time Out"} · Attendance {meeting.attendanceCount}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#95abd2]">
                      {meeting.summary || "No summary added yet."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#c7d5ef]">
                      <Badge className="border border-[#4e6385] bg-[#1d2f49] text-[11px] text-[#dbe8ff]">
                        Rights: {meeting.rightsReviewed ? "Yes" : "No"}
                      </Badge>
                      <Badge className="border border-[#4e6385] bg-[#1d2f49] text-[11px] text-[#dbe8ff]">
                        Meal: {meeting.mealOfTheMonth}
                      </Badge>
                      <Badge className="border border-[#4e6385] bg-[#1d2f49] text-[11px] text-[#dbe8ff]">
                        Open Follow-ups: {meeting.unresolvedCount}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className={cn(PANEL, "space-y-4 p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={LABEL}>Active Meeting Editor</p>
              <h2 className="mt-1 text-lg font-extrabold text-white">
                {isNewMeeting ? "New Resident Council Meeting" : "Edit Resident Council Meeting"}
              </h2>
              <p className="text-sm text-[#aebfdb]">
                Structured council template with attendance, old/new business, department notes, rights review, policies, and meal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-[#4e6385] bg-[#1b2a42] px-3 text-xs text-[#dbe8ff] hover:bg-[#223754]"
                onClick={() => saveMeeting("DRAFT")}
                disabled={!canEdit || isPending}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Draft
              </Button>
              <Button
                type="button"
                className="h-9 rounded-full bg-[#3d8b8d] px-3 text-xs text-white hover:bg-[#4aa4a8]"
                onClick={() => saveMeeting("FINALIZED")}
                disabled={!canEdit || isPending}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Finalize Minutes
              </Button>
            </div>
          </div>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <h3 className="text-sm font-bold text-white">Meeting Header</h3>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Meeting Date">
                <Input
                  type="datetime-local"
                  value={formState.heldAt}
                  onChange={(event) => setFormState((current) => ({ ...current, heldAt: event.target.value }))}
                  className={INPUT}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Time In:">
                <Input
                  value={formState.timeIn}
                  onChange={(event) => setFormState((current) => ({ ...current, timeIn: event.target.value }))}
                  placeholder="2:00 PM"
                  className={INPUT}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Time Out:">
                <Input
                  value={formState.timeOut}
                  onChange={(event) => setFormState((current) => ({ ...current, timeOut: event.target.value }))}
                  placeholder="2:34 PM"
                  className={INPUT}
                  disabled={!canEdit}
                />
              </Field>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="Meeting Status">
                <select
                  value={formState.meetingStatus}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      meetingStatus: event.target.value as "DRAFT" | "FINALIZED"
                    }))
                  }
                  className="h-10 w-full rounded-md border border-[#4e6182] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
                  disabled={!canEdit}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="FINALIZED">Finalized</option>
                </select>
              </Field>
              <Field label="Attendance Count Override">
                <Input
                  type="number"
                  min="0"
                  value={formState.attendanceCountOverride}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      attendanceCountOverride: event.target.value
                    }))
                  }
                  placeholder="Optional"
                  className={INPUT}
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <h3 className="text-sm font-bold text-white">Residents in attendance:</h3>
            <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea3c8]" />
                  <Input
                    value={formState.residentAttendanceSearch}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        residentAttendanceSearch: event.target.value
                      }))
                    }
                    placeholder="Search resident name or room"
                    className={cn(INPUT, "pl-8")}
                    disabled={!canEdit}
                  />
                </label>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[#4e6182] bg-[#152338] p-2">
                  {residentDirectoryRows.length < 1 ? (
                    <p className="px-2 py-3 text-xs text-[#a5b8d8]">No residents matched this search.</p>
                  ) : (
                    residentDirectoryRows.map((resident) => {
                      const checked = formState.residentIds.includes(resident.id);
                      return (
                        <label
                          key={resident.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#3f5577] bg-[#1a2b45] px-2 py-1.5 text-xs text-[#dce8ff]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleResident(resident.id)}
                            disabled={!canEdit}
                            className="h-4 w-4"
                          />
                          <span>
                            {resident.lastName}, {resident.firstName}
                            <span className="text-[#9fb4d8]"> · Room {resident.room}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              <Field label="Residents in attendance (manual list)">
                <Textarea
                  rows={7}
                  value={formState.residentsInAttendanceManual}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      residentsInAttendanceManual: event.target.value
                    }))
                  }
                  placeholder={"Martha Hill\nJames Carter\nLouise Bryant"}
                  className={INPUT}
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <h3 className="text-sm font-bold text-white">Staff In Attendance:</h3>
            <Textarea
              rows={4}
              value={formState.staffInAttendance}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  staffInAttendance: event.target.value
                }))
              }
              placeholder={"Jae Walker, Activities Director\nSusan Green, Social Services"}
              className={INPUT}
              disabled={!canEdit}
            />
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <h3 className="text-sm font-bold text-white">Old Business:</h3>
            <Textarea
              rows={5}
              value={formState.oldBusiness}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  oldBusiness: event.target.value
                }))
              }
              placeholder="Residents requested more afternoon group options and asked for an update on courtyard seating."
              className={INPUT}
              disabled={!canEdit}
            />
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <h3 className="text-sm font-bold text-white">New Business:</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {DEPARTMENTS.map((department) => (
                <Field key={department.key} label={`${department.label}:`}>
                  <Textarea
                    rows={4}
                    value={formState.departmentNotes[department.key]}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        departmentNotes: {
                          ...current.departmentNotes,
                          [department.key]: event.target.value
                        }
                      }))
                    }
                    placeholder={`Document ${department.label.toLowerCase()} concerns and responses...`}
                    className={INPUT}
                    disabled={!canEdit}
                  />
                </Field>
              ))}
            </div>
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <h3 className="text-sm font-bold text-white">Resident Rights</h3>
            <label className="inline-flex items-center gap-2 rounded-xl border border-[#4f6283] bg-[#17263f] px-3 py-2 text-sm text-[#dce8ff]">
              <input
                type="checkbox"
                checked={formState.rightsReviewed}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    rightsReviewed: event.target.checked
                  }))
                }
                disabled={!canEdit}
                className="h-4 w-4"
              />
              [x] Resident Rights Reviewed
            </label>
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <h3 className="text-sm font-bold text-white">
              Facility Policies and Procedures Developed/Revised/Updated in the past 30 Days:
            </h3>
            <Textarea
              rows={4}
              value={formState.policyUpdates}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  policyUpdates: event.target.value
                }))
              }
              placeholder="No policy updates discussed."
              className={INPUT}
              disabled={!canEdit}
            />
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <Field label="Meal of the Month: Fried Chicken & Pizza">
              <Input
                value={formState.mealOfMonth}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    mealOfMonth: event.target.value
                  }))
                }
                className={INPUT}
                disabled={!canEdit}
              />
            </Field>
          </section>

          <section className={cn(PANEL_SOFT, "space-y-3 p-3")}>
            <Field label="Meeting Summary">
              <Textarea
                rows={3}
                value={formState.summary}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    summary: event.target.value
                  }))
                }
                placeholder="Key updates and outcomes from this resident council meeting."
                className={INPUT}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Additional Context">
              <Textarea
                rows={3}
                value={formState.additionalContext}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    additionalContext: event.target.value
                  }))
                }
                placeholder="Optional additional notes, signatures, or contextual details."
                className={INPUT}
                disabled={!canEdit}
              />
            </Field>
          </section>
        </main>

        <aside className="space-y-4">
          <article className={cn(PANEL, "space-y-3 p-4")}>
            <p className={LABEL}>Meeting Summary</p>
            <h3 className="text-base font-bold text-white">
              {isNewMeeting ? "New draft in progress" : selectedMeeting ? formatDate(selectedMeeting.heldAt, timeZone) : "No meeting selected"}
            </h3>
            <div className="space-y-2">
              <MetricRow label="Date" value={formState.heldAt ? formatDateTime(formState.heldAt, timeZone) : "Not set"} />
              <MetricRow label="Time In / Out" value={`${formState.timeIn || "--"} / ${formState.timeOut || "--"}`} />
              <MetricRow label="Attendance" value={`${residentSelectionCount} resident(s), ${staffSelectionCount} staff`} />
              <MetricRow label="Rights Reviewed" value={formState.rightsReviewed ? "Yes" : "No"} />
              <MetricRow label="Meal" value={formState.mealOfMonth || RESIDENT_COUNCIL_MEAL_DEFAULT} />
              <MetricRow
                label="Status"
                value={formState.meetingStatus === "FINALIZED" ? "Finalized" : "Draft"}
              />
            </div>
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-full border-[#4e6385] bg-[#1b2a42] px-3 text-xs text-[#dbe8ff] hover:bg-[#223754]"
                onClick={() => saveMeeting("DRAFT")}
                disabled={!canEdit || isPending}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                className="h-8 rounded-full bg-[#3d8b8d] px-3 text-xs text-white hover:bg-[#4aa4a8]"
                onClick={() => saveMeeting("FINALIZED")}
                disabled={!canEdit || isPending}
              >
                Finalize Minutes
              </Button>
            </div>
          </article>

          <article className={cn(PANEL, "space-y-3 p-4")}>
            <p className={LABEL}>Department Issues Snapshot</p>
            <h3 className="text-base font-bold text-white">Department sections with notes</h3>
            <div className="space-y-2">
              {DEPARTMENTS.map((department) => {
                const hasNote = formState.departmentNotes[department.key].trim().length > 0;
                return (
                  <div key={department.key} className={cn(PANEL_SOFT, "flex items-center justify-between px-3 py-2 text-sm")}>
                    <span className="text-[#dce8ff]">{department.label}</span>
                    <Badge
                      className={cn(
                        "border text-[11px]",
                        hasNote
                          ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                          : "border-[#4e6385] bg-[#1b2a42] text-[#a8bcdf]"
                      )}
                    >
                      {hasNote ? "Entered" : "Not entered"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </article>

          <article className={cn(PANEL, "space-y-3 p-4")}>
            <p className={LABEL}>Open Follow-Up Items</p>
            <h3 className="text-base font-bold text-white">Department follow-through tracker</h3>

            {!formState.meetingId ? (
              <div className="rounded-xl border border-dashed border-[#4e6385] bg-[#17263f] px-3 py-6 text-center text-sm text-[#a8b8d4]">
                Save this meeting first to add follow-up items.
              </div>
            ) : null}

            <div className="space-y-2">
              <Field label="Department">
                <select
                  value={followUpForm.category}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      category: event.target.value
                    }))
                  }
                  className="h-10 w-full rounded-md border border-[#4e6182] bg-[#17263f] px-3 text-sm text-[#dce8ff]"
                  disabled={!canEdit || !formState.meetingId}
                >
                  {DEPARTMENTS.map((department) => (
                    <option key={department.key} value={department.label}>
                      {department.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Issue Summary">
                <Textarea
                  rows={2}
                  value={followUpForm.concern}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      concern: event.target.value
                    }))
                  }
                  className={INPUT}
                  disabled={!canEdit || !formState.meetingId}
                />
              </Field>
              <Field label="Assigned Follow-Up">
                <Input
                  value={followUpForm.owner}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      owner: event.target.value
                    }))
                  }
                  className={INPUT}
                  disabled={!canEdit || !formState.meetingId}
                />
              </Field>
              <Field label="Due Date">
                <Input
                  type="date"
                  value={followUpForm.dueDate}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      dueDate: event.target.value
                    }))
                  }
                  className={INPUT}
                  disabled={!canEdit || !formState.meetingId}
                />
              </Field>
              <Field label="Note">
                <Textarea
                  rows={2}
                  value={followUpForm.note}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      note: event.target.value
                    }))
                  }
                  className={INPUT}
                  disabled={!canEdit || !formState.meetingId}
                />
              </Field>
              <Button
                type="button"
                className="h-8 w-full rounded-full bg-[#3d8b8d] px-3 text-xs text-white hover:bg-[#4aa4a8]"
                onClick={submitFollowUp}
                disabled={!canEdit || !formState.meetingId || isPending}
              >
                Add Follow-Up
              </Button>
            </div>

            <div className="space-y-2">
              {selectedMeetingActionItems.length < 1 ? (
                <div className="rounded-xl border border-dashed border-[#4e6385] bg-[#17263f] px-3 py-5 text-center text-sm text-[#a8b8d4]">
                  No follow-up items for this meeting.
                </div>
              ) : (
                selectedMeetingActionItems.slice(0, 8).map((item) => (
                  <article key={item.id} className="rounded-xl border border-[#4e6385] bg-[#17263f] px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.concern}</p>
                        <p className="mt-1 text-xs text-[#a9bcdd]">
                          {item.category}
                          {item.owner ? ` · ${item.owner}` : ""}
                          {item.dueDate ? ` · Due ${item.dueDate}` : ""}
                        </p>
                      </div>
                      <Badge className={cn("border text-[11px]", buildFollowUpStatusTone(item.status))}>
                        {item.status === "RESOLVED" ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    {canEdit ? (
                      <div className="mt-2">
                        <select
                          value={item.status}
                          onChange={(event) =>
                            updateFollowUpStatus(
                              item.id,
                              event.target.value as "RESOLVED" | "UNRESOLVED"
                            )
                          }
                          className="h-7 w-full rounded-full border border-[#4e6385] bg-[#1b2a42] px-2 text-[11px] text-[#dce8ff]"
                        >
                          <option value="UNRESOLVED">Open</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </article>

          <article className={cn(PANEL, "space-y-3 p-4")}>
            <p className={LABEL}>Global Open Follow-Ups</p>
            <h3 className="text-base font-bold text-white">Unresolved from recent meetings</h3>
            {unresolvedItemsAcrossMeetings.length < 1 ? (
              <div className="rounded-xl border border-dashed border-[#4e6385] bg-[#17263f] px-3 py-6 text-center text-sm text-[#a8b8d4]">
                No open follow-up items right now.
              </div>
            ) : (
              <div className="space-y-2">
                {unresolvedItemsAcrossMeetings.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsNewMeeting(false);
                      setSelectedMeetingId(item.meetingId);
                      setLastHydratedMeetingId(null);
                    }}
                    className="w-full rounded-xl border border-[#4e6385] bg-[#17263f] px-3 py-2 text-left transition hover:bg-[#1f3350]"
                  >
                    <p className="text-sm font-semibold text-white">{item.concern}</p>
                    <p className="mt-1 text-xs text-[#a8bcdd]">
                      {item.category}
                      {item.dueDate ? ` · Due ${item.dueDate}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>

      {isPending ? (
        <div className="rounded-xl border border-[#4e6385] bg-[#152338] px-3 py-2 text-sm text-[#c5d5ef]">
          Saving updates...
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
  accent
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <article className={cn(PANEL_SOFT, "relative overflow-hidden p-3")}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-7 bg-gradient-to-r", accent)} />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className={LABEL}>{label}</p>
          <p className="mt-1 text-xl font-black text-white">{value}</p>
          <p className="mt-1 text-xs text-[#a8b8d5]">{helper}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#4f6384] bg-[#1b2a42]">
          {icon}
        </span>
      </div>
    </article>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb2d8]">{label}</span>
      {children}
    </label>
  );
}

function MetricRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={cn(PANEL_SOFT, "flex items-center justify-between px-3 py-2 text-sm")}>
      <span className="text-[#c5d6f1]">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
