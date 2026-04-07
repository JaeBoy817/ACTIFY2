"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  UserCheck2,
  UserCog2,
  UserRoundPlus,
  Users
} from "lucide-react";

import { TopContentHeader } from "@/components/app/TopContentHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { VolunteerDetailPayload, VolunteerHourEntry, VolunteerHubPayload, VolunteerShift, VolunteerSummary } from "@/lib/volunteers/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

type VolunteerTabKey = "directory" | "schedule" | "hours";
type ProfileTab = "overview" | "availability" | "assignments" | "hours" | "notes" | "status";
type DirectoryStatusFilter = "ALL" | "ACTIVE" | "ON_SHIFT" | "PENDING" | "INACTIVE" | "FOLLOW_UP";
type DirectorySort = "scheduled" | "name" | "hours" | "recent" | "status";

type EnrichedVolunteer = VolunteerSummary & {
  email: string | null;
  preferredRole: string | null;
  displayStatus: "ACTIVE" | "ON_SHIFT" | "PENDING" | "INACTIVE";
  followUpNeeded: boolean;
  scheduledThisWeek: boolean;
  lastVisitMs: number | null;
};

const PANEL =
  "rounded-[1.35rem] border border-[#2f4e47]/85 bg-[linear-gradient(180deg,#0b1a1a_0%,#0b1717_52%,#091212_100%)] shadow-[0_28px_48px_-36px_rgba(16,185,129,0.58)]";
const PANEL_SOFT =
  "rounded-2xl border border-[#365a53]/85 bg-[linear-gradient(180deg,rgba(18,42,39,0.86)_0%,rgba(11,25,23,0.9)_100%)]";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ec7be]";
const EMPTY_LABEL = "text-sm text-[#a7ccc4]";

const PROFILE_TABS: Array<{ key: ProfileTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "availability", label: "Availability & Schedule" },
  { key: "assignments", label: "Assignments & Activities" },
  { key: "hours", label: "Hours & Participation" },
  { key: "notes", label: "Notes & Communication" },
  { key: "status", label: "Status / Onboarding" }
];

function requirementValue(requirements: string[], key: string) {
  const prefix = `${key.toLowerCase()}:`;
  const line = requirements.find((item) => item.trim().toLowerCase().startsWith(prefix));
  if (!line) return null;
  const value = line.slice(line.indexOf(":") + 1).trim();
  return value || null;
}

function requirementNotes(requirements: string[]) {
  return requirements.filter((item) => !/^(tag|availability|permission|onboarding|check|status|email|role)\s*:/i.test(item));
}

function toDateSafe(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateTime(value: string | null, timeZone: string) {
  const parsed = toDateSafe(value);
  if (!parsed) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function formatDateOnly(value: string | null, timeZone: string) {
  const parsed = toDateSafe(value);
  if (!parsed) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function dayKey(value: string | null, timeZone: string) {
  const parsed = toDateSafe(value);
  if (!parsed) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(parsed)
    .replaceAll("/", "-");
}

function statusChipClass(status: EnrichedVolunteer["displayStatus"]) {
  if (status === "ON_SHIFT") return "border-cyan-300/45 bg-cyan-500/16 text-cyan-100";
  if (status === "PENDING") return "border-amber-300/45 bg-amber-500/16 text-amber-100";
  if (status === "INACTIVE") return "border-slate-300/35 bg-slate-500/14 text-slate-200";
  return "border-emerald-300/45 bg-emerald-500/16 text-emerald-100";
}

function followUpChipClass(needsFollowUp: boolean) {
  return needsFollowUp
    ? "border-rose-300/40 bg-rose-500/14 text-rose-100"
    : "border-emerald-300/40 bg-emerald-500/16 text-emerald-100";
}

function approvalChipClass(approval: VolunteerHourEntry["approval"]) {
  if (approval === "APPROVED") return "border-emerald-300/45 bg-emerald-500/16 text-emerald-100";
  if (approval === "DENIED") return "border-rose-300/45 bg-rose-500/16 text-rose-100";
  return "border-amber-300/45 bg-amber-500/16 text-amber-100";
}

function shiftChipClass(status: VolunteerShift["status"]) {
  if (status === "IN_PROGRESS") return "border-cyan-300/45 bg-cyan-500/16 text-cyan-100";
  if (status === "COMPLETE") return "border-emerald-300/45 bg-emerald-500/16 text-emerald-100";
  return "border-blue-300/45 bg-blue-500/16 text-blue-100";
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
        return `"${text.replaceAll("\"", "\"\"")}"`;
      }
      return text;
    })
    .join(",");
}

function exportCsv(filename: string, rows: string[]) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function profileTabFromInitial(initialTab: VolunteerTabKey): ProfileTab {
  if (initialTab === "schedule") return "assignments";
  if (initialTab === "hours") return "hours";
  return "overview";
}

export function VolunteersHub({
  initialPayload,
  initialTab,
  canEdit,
  timeZone
}: {
  initialPayload: VolunteerHubPayload;
  initialTab: VolunteerTabKey;
  canEdit: boolean;
  timeZone: string;
}) {
  const { toast } = useToast();
  const [payload, setPayload] = useState(initialPayload);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(
    initialPayload.volunteers[0]?.id ?? null
  );
  const [profileTab, setProfileTab] = useState<ProfileTab>(profileTabFromInitial(initialTab));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DirectoryStatusFilter>("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [scheduledThisWeekOnly, setScheduledThisWeekOnly] = useState(false);
  const [sortBy, setSortBy] = useState<DirectorySort>("scheduled");

  const [addVolunteerOpen, setAddVolunteerOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [logHoursOpen, setLogHoursOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingMoreHours, setLoadingMoreHours] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [detailsByVolunteer, setDetailsByVolunteer] = useState<Record<string, VolunteerDetailPayload>>({});
  const [noteText, setNoteText] = useState("");

  const [volunteerForm, setVolunteerForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    availability: "",
    status: "active",
    onboarding: ""
  });

  const [assignForm, setAssignForm] = useState({
    volunteerId: "",
    activityTitle: "",
    role: "",
    startAt: "",
    endAt: "",
    assignedLocation: "",
    notes: ""
  });

  const [hoursForm, setHoursForm] = useState({
    volunteerId: "",
    activityTitle: "",
    startAt: "",
    endAt: "",
    assignedLocation: "",
    notes: ""
  });

  const nowMs = Date.now();
  const weekAheadMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  const thirtyFiveDaysMs = 35 * 24 * 60 * 60 * 1000;

  const volunteers = useMemo<EnrichedVolunteer[]>(() => {
    return payload.volunteers.map((volunteer) => {
      const email = requirementValue(volunteer.requirements, "email");
      const preferredRole = requirementValue(volunteer.requirements, "role");
      const lastVisit = toDateSafe(volunteer.lastVisitAt);
      const nextShift = toDateSafe(volunteer.nextShiftAt);
      const pending = volunteer.pendingOnboardingCount > 0;

      const displayStatus: EnrichedVolunteer["displayStatus"] =
        volunteer.status === "INACTIVE"
          ? "INACTIVE"
          : volunteer.status === "ON_SHIFT"
            ? "ON_SHIFT"
            : pending
              ? "PENDING"
              : "ACTIVE";

      const scheduledThisWeek =
        Boolean(nextShift) && nextShift!.getTime() >= nowMs && nextShift!.getTime() <= weekAheadMs;
      const noRecentVisit = !lastVisit || nowMs - lastVisit.getTime() > thirtyFiveDaysMs;
      const followUpNeeded =
        pending ||
        volunteer.expiringChecksCount > 0 ||
        (displayStatus !== "INACTIVE" && noRecentVisit && !scheduledThisWeek);

      return {
        ...volunteer,
        email,
        preferredRole,
        displayStatus,
        followUpNeeded,
        scheduledThisWeek,
        lastVisitMs: lastVisit ? lastVisit.getTime() : null
      };
    });
  }, [nowMs, payload.volunteers, thirtyFiveDaysMs, weekAheadMs]);

  const allTags = useMemo(
    () => Array.from(new Set(volunteers.flatMap((volunteer) => volunteer.tags))).sort((a, b) => a.localeCompare(b)),
    [volunteers]
  );

  const allAvailability = useMemo(
    () =>
      Array.from(
        new Set(volunteers.map((volunteer) => volunteer.availability).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b)),
    [volunteers]
  );

  const filteredVolunteers = useMemo(() => {
    const searchToken = search.trim().toLowerCase();

    const rows = volunteers
      .filter((volunteer) => {
        if (statusFilter === "ALL") return true;
        if (statusFilter === "FOLLOW_UP") return volunteer.followUpNeeded;
        return volunteer.displayStatus === statusFilter;
      })
      .filter((volunteer) => (scheduledThisWeekOnly ? volunteer.scheduledThisWeek : true))
      .filter((volunteer) => (availabilityFilter === "ALL" ? true : volunteer.availability === availabilityFilter))
      .filter((volunteer) => (tagFilter === "ALL" ? true : volunteer.tags.includes(tagFilter)))
      .filter((volunteer) => {
        if (!searchToken) return true;
        return (
          volunteer.name.toLowerCase().includes(searchToken) ||
          (volunteer.phone ?? "").toLowerCase().includes(searchToken) ||
          (volunteer.email ?? "").toLowerCase().includes(searchToken) ||
          (volunteer.preferredRole ?? "").toLowerCase().includes(searchToken) ||
          volunteer.tags.join(" ").toLowerCase().includes(searchToken) ||
          requirementNotes(volunteer.requirements).join(" ").toLowerCase().includes(searchToken)
        );
      });

    rows.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      if (sortBy === "hours") {
        if (a.monthlyHours === b.monthlyHours) {
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }
        return b.monthlyHours - a.monthlyHours;
      }
      if (sortBy === "recent") {
        const aMs = a.lastVisitMs ?? 0;
        const bMs = b.lastVisitMs ?? 0;
        if (aMs === bMs) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        return bMs - aMs;
      }
      if (sortBy === "status") {
        const rank = (status: EnrichedVolunteer["displayStatus"]) => {
          if (status === "ON_SHIFT") return 0;
          if (status === "ACTIVE") return 1;
          if (status === "PENDING") return 2;
          return 3;
        };
        const delta = rank(a.displayStatus) - rank(b.displayStatus);
        if (delta !== 0) return delta;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }

      const aNext = toDateSafe(a.nextShiftAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bNext = toDateSafe(b.nextShiftAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aNext === bNext) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return aNext - bNext;
    });

    return rows;
  }, [availabilityFilter, scheduledThisWeekOnly, search, sortBy, statusFilter, tagFilter, volunteers]);

  useEffect(() => {
    if (filteredVolunteers.length === 0) {
      setSelectedVolunteerId(null);
      return;
    }
    if (!selectedVolunteerId || !filteredVolunteers.some((volunteer) => volunteer.id === selectedVolunteerId)) {
      setSelectedVolunteerId(filteredVolunteers[0].id);
    }
  }, [filteredVolunteers, selectedVolunteerId]);

  const selectedVolunteer = useMemo(
    () => (selectedVolunteerId ? volunteers.find((volunteer) => volunteer.id === selectedVolunteerId) ?? null : null),
    [selectedVolunteerId, volunteers]
  );

  const selectedDetail = selectedVolunteerId ? detailsByVolunteer[selectedVolunteerId] ?? null : null;

  useEffect(() => {
    if (!selectedVolunteerId || detailsByVolunteer[selectedVolunteerId]) return;
    setLoadingDetail(true);
    void fetch(`/api/volunteers/${encodeURIComponent(selectedVolunteerId)}/details`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Could not load volunteer profile.");
        return body as VolunteerDetailPayload;
      })
      .then((body) => {
        setDetailsByVolunteer((current) => ({ ...current, [selectedVolunteerId]: body }));
      })
      .catch((error) => {
        toast({
          title: "Profile load failed",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      })
      .finally(() => setLoadingDetail(false));
  }, [detailsByVolunteer, selectedVolunteerId, toast]);

  const selectedShifts = useMemo(() => {
    if (!selectedVolunteerId) return [];
    return payload.shifts
      .filter((shift) => shift.volunteerId === selectedVolunteerId)
      .sort((a, b) => (toDateSafe(a.startAt)?.getTime() ?? 0) - (toDateSafe(b.startAt)?.getTime() ?? 0));
  }, [payload.shifts, selectedVolunteerId]);

  const selectedHours = useMemo(() => {
    if (selectedDetail) return selectedDetail.hours.entries;
    if (!selectedVolunteerId) return [];
    return payload.hours.filter((entry) => entry.volunteerId === selectedVolunteerId);
  }, [payload.hours, selectedDetail, selectedVolunteerId]);

  const upcomingShifts = useMemo(
    () =>
      [...payload.shifts]
        .filter((shift) => (toDateSafe(shift.startAt)?.getTime() ?? 0) >= nowMs)
        .sort((a, b) => (toDateSafe(a.startAt)?.getTime() ?? 0) - (toDateSafe(b.startAt)?.getTime() ?? 0))
        .slice(0, 10),
    [nowMs, payload.shifts]
  );

  const followUpVolunteers = useMemo(
    () =>
      volunteers
        .filter((volunteer) => volunteer.followUpNeeded)
        .sort((a, b) => {
          if (a.pendingOnboardingCount !== b.pendingOnboardingCount) {
            return b.pendingOnboardingCount - a.pendingOnboardingCount;
          }
          if (a.expiringChecksCount !== b.expiringChecksCount) {
            return b.expiringChecksCount - a.expiringChecksCount;
          }
          return (a.lastVisitMs ?? 0) - (b.lastVisitMs ?? 0);
        })
        .slice(0, 8),
    [volunteers]
  );

  const counts = useMemo(() => {
    return {
      active: volunteers.filter((volunteer) => volunteer.displayStatus === "ACTIVE" || volunteer.displayStatus === "ON_SHIFT").length,
      pending: volunteers.filter((volunteer) => volunteer.displayStatus === "PENDING").length,
      inactive: volunteers.filter((volunteer) => volunteer.displayStatus === "INACTIVE").length,
      scheduledThisWeek: volunteers.filter((volunteer) => volunteer.scheduledThisWeek).length,
      followUp: volunteers.filter((volunteer) => volunteer.followUpNeeded).length,
      availabilityThisWeek: volunteers.filter(
        (volunteer) => volunteer.displayStatus !== "INACTIVE" && Boolean(volunteer.availability)
      ).length
    };
  }, [volunteers]);

  async function refreshHub(options: { hoursOffset?: number; appendHours?: boolean } = {}) {
    const query = new URLSearchParams();
    if (typeof options.hoursOffset === "number") query.set("hoursOffset", String(options.hoursOffset));
    if (typeof options.hoursOffset === "number") query.set("hoursLimit", String(payload.hoursPagination.limit));

    const response = await fetch(`/api/volunteers/hub?${query.toString()}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not refresh volunteers.");
    const next = body as VolunteerHubPayload;

    if (options.appendHours) {
      setPayload((current) => ({
        ...next,
        hours: [...current.hours, ...next.hours]
      }));
      return;
    }

    setPayload(next);
  }

  async function loadMoreHours() {
    if (loadingMoreHours || !payload.hoursPagination.hasMore) return;
    setLoadingMoreHours(true);
    try {
      await refreshHub({
        hoursOffset: payload.hoursPagination.offset,
        appendHours: true
      });
    } catch (error) {
      toast({
        title: "Could not load more hours",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingMoreHours(false);
    }
  }

  async function createVolunteer() {
    setSaving(true);
    try {
      const requirements: string[] = [];
      if (volunteerForm.email.trim()) requirements.push(`email: ${volunteerForm.email.trim()}`);
      if (volunteerForm.role.trim()) requirements.push(`role: ${volunteerForm.role.trim()}`);
      if (volunteerForm.availability.trim()) requirements.push(`availability: ${volunteerForm.availability.trim()}`);
      if (volunteerForm.status === "pending") requirements.push("status: pending");
      if (volunteerForm.status === "inactive") requirements.push("status: inactive");
      const onboardingLines = volunteerForm.onboarding
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `onboarding: ${line}`);
      requirements.push(...onboardingLines);

      const response = await fetch("/api/volunteers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: volunteerForm.name.trim(),
          phone: volunteerForm.phone.trim() || null,
          requirements
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not add volunteer.");

      setAddVolunteerOpen(false);
      setVolunteerForm({
        name: "",
        phone: "",
        email: "",
        role: "",
        availability: "",
        status: "active",
        onboarding: ""
      });
      await refreshHub();
      toast({ title: "Volunteer added" });
    } catch (error) {
      toast({
        title: "Add volunteer failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  function openAssign(volunteerId?: string) {
    setAssignForm((current) => ({ ...current, volunteerId: volunteerId ?? current.volunteerId }));
    setAssignOpen(true);
  }

  function openLogHours(volunteerId?: string) {
    setHoursForm((current) => ({ ...current, volunteerId: volunteerId ?? current.volunteerId }));
    setLogHoursOpen(true);
  }

  async function createVisitFromForm(input: {
    volunteerId: string;
    activityTitle?: string;
    role?: string;
    startAt: string;
    endAt?: string;
    assignedLocation: string;
    notes?: string;
  }) {
    const notes = [
      input.activityTitle?.trim() ? `Activity: ${input.activityTitle.trim()}` : null,
      input.role?.trim() ? `Role: ${input.role.trim()}` : null,
      input.notes?.trim() ? input.notes.trim() : null
    ]
      .filter(Boolean)
      .join(" | ");

    const response = await fetch("/api/volunteers/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        volunteerId: input.volunteerId,
        startAt: input.startAt,
        endAt: input.endAt?.trim() ? input.endAt : null,
        assignedLocation: input.assignedLocation.trim(),
        notes: notes || null
      })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not save volunteer shift.");
  }

  async function assignVolunteer() {
    setSaving(true);
    try {
      await createVisitFromForm(assignForm);
      setAssignOpen(false);
      setAssignForm({
        volunteerId: "",
        activityTitle: "",
        role: "",
        startAt: "",
        endAt: "",
        assignedLocation: "",
        notes: ""
      });
      await refreshHub();
      toast({ title: "Volunteer assigned" });
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  async function submitHours() {
    setSaving(true);
    try {
      await createVisitFromForm(hoursForm);
      setLogHoursOpen(false);
      setHoursForm({
        volunteerId: "",
        activityTitle: "",
        startAt: "",
        endAt: "",
        assignedLocation: "",
        notes: ""
      });
      await refreshHub();
      toast({ title: "Hours logged" });
    } catch (error) {
      toast({
        title: "Log hours failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  async function updateVisit(visitId: string, patch: Record<string, unknown>, successTitle: string) {
    try {
      const response = await fetch(`/api/volunteers/visits/${encodeURIComponent(visitId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not update volunteer visit.");
      await refreshHub();
      toast({ title: successTitle });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    }
  }

  async function saveVolunteerNote() {
    if (!selectedVolunteer) return;
    const note = noteText.trim();
    if (!note) return;

    setSaving(true);
    try {
      const existingRequirements = selectedDetail?.volunteer.requirements ?? selectedVolunteer.requirements;
      const response = await fetch(`/api/volunteers/${encodeURIComponent(selectedVolunteer.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requirements: [...existingRequirements, `note: ${note}`]
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not save note.");

      setAddNoteOpen(false);
      setNoteText("");
      setDetailsByVolunteer((current) => {
        const next = { ...current };
        delete next[selectedVolunteer.id];
        return next;
      });
      await refreshHub();
      toast({ title: "Volunteer note added" });
    } catch (error) {
      toast({
        title: "Could not add note",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  function exportDirectory() {
    const rows = [
      csvRow(["Volunteer", "Status", "Phone", "Email", "Availability", "Preferred Role", "Monthly Hours", "Next Assignment"]),
      ...filteredVolunteers.map((volunteer) =>
        csvRow([
          volunteer.name,
          volunteer.displayStatus,
          volunteer.phone ?? "",
          volunteer.email ?? "",
          volunteer.availability ?? "",
          volunteer.preferredRole ?? "",
          volunteer.monthlyHours,
          formatDateTime(volunteer.nextShiftAt, timeZone)
        ])
      )
    ];
    exportCsv("actify-volunteer-directory.csv", rows);
  }

  function exportSchedule() {
    const rows = [
      csvRow(["Volunteer", "Start", "End", "Location", "Status", "Role/Notes"]),
      ...upcomingShifts.map((shift) =>
        csvRow([shift.volunteerName, shift.startAt, shift.endAt ?? "", shift.assignedLocation, shift.status, shift.notes ?? ""])
      )
    ];
    exportCsv("actify-volunteer-schedule.csv", rows);
  }

  function exportHours() {
    const rows = [
      csvRow(["Volunteer", "Start", "End", "Location", "Duration Hours", "Approval", "Notes"]),
      ...payload.hours.map((entry) =>
        csvRow([entry.volunteerName, entry.startAt, entry.endAt ?? "", entry.assignedLocation, entry.durationHours, entry.approval, entry.notes ?? ""])
      )
    ];
    exportCsv("actify-volunteer-hours.csv", rows);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setAvailabilityFilter("ALL");
    setTagFilter("ALL");
    setScheduledThisWeekOnly(false);
    setSortBy("scheduled");
  }

  const selectedAvailabilityTokens =
    selectedVolunteer?.availability
      ?.split(/[;,/]/)
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

  const selectedNotes = selectedDetail ? selectedDetail.profile.notes : selectedVolunteer ? requirementNotes(selectedVolunteer.requirements) : [];
  const onboardingChecklist = selectedDetail?.profile.onboardingChecklist ?? [];
  const complianceItems = selectedDetail?.compliance.items ?? [];

  return (
    <div className="space-y-4">
      <TopContentHeader
        eyebrow="Volunteer Coordination Hub"
        title="Volunteers"
        subtitle="Manage volunteer people, availability, assignments, and logged hours in one clear operational workspace."
        icon={Users}
        accentGradientClasses="from-emerald-300 via-teal-300 to-cyan-400"
        actions={
          <>
            <Button type="button" className="h-9 rounded-full bg-[#1f6f62] px-3 text-xs text-white hover:bg-[#258271]" onClick={() => setAddVolunteerOpen(true)} disabled={!canEdit}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Add Volunteer
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-full border-[#456f67] bg-[#16342f] px-3 text-xs text-[#d3f2ea] hover:bg-[#1b453e]" onClick={() => openAssign()} disabled={!canEdit}>
              <CalendarClock className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Assign to Activity
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-full border-[#456f67] bg-[#16342f] px-3 text-xs text-[#d3f2ea] hover:bg-[#1b453e]" onClick={() => openLogHours()} disabled={!canEdit}>
              <Clock3 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Log Hours
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-full border-[#456f67] bg-[#16342f] px-3 text-xs text-[#d3f2ea] hover:bg-[#1b453e]" onClick={exportDirectory}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Export
            </Button>
          </>
        }
      >
        <div className={cn(PANEL_SOFT, "grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5")}>
          <SummaryCard
            label="Active Volunteers"
            value={counts.active}
            detail={`${volunteers.length} total records`}
            icon={<UserCheck2 className="h-4 w-4 text-emerald-100" />}
            accent="from-emerald-300/28 to-teal-400/20"
          />
          <SummaryCard
            label="Scheduled This Week"
            value={counts.scheduledThisWeek}
            detail="Upcoming assignments in next 7 days"
            icon={<CalendarDays className="h-4 w-4 text-cyan-100" />}
            accent="from-cyan-300/28 to-blue-400/20"
          />
          <SummaryCard
            label="Hours Logged This Month"
            value={Number(payload.kpis.hoursThisMonth.toFixed(1))}
            detail="Across all volunteer visits"
            icon={<Clock3 className="h-4 w-4 text-amber-100" />}
            accent="from-amber-300/28 to-orange-400/20"
          />
          <SummaryCard
            label="Follow-Up Needed"
            value={counts.followUp}
            detail="Outreach, onboarding, or expiration flags"
            icon={<RefreshCcw className="h-4 w-4 text-rose-100" />}
            accent="from-rose-300/28 to-orange-300/20"
          />
          <SummaryCard
            label="Pending Onboarding"
            value={counts.pending}
            detail={`${counts.availabilityThisWeek} available this week`}
            icon={<UserRoundPlus className="h-4 w-4 text-violet-100" />}
            accent="from-violet-300/28 to-fuchsia-300/20"
          />
        </div>
      </TopContentHeader>

      <section className={cn(PANEL, "p-4")}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={META_LABEL}>Directory Controls</p>
            <h2 className="mt-1 text-base font-bold text-white">Search, filter, and sort volunteers quickly</h2>
          </div>
          <Button type="button" variant="outline" className="h-9 rounded-full border-[#456f67] bg-[#16342f] px-3 text-xs text-[#d3f2ea] hover:bg-[#1b453e]" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_180px_190px_190px_160px_auto]">
          <label className="relative flex h-10 items-center rounded-full border border-[#3a6159] bg-[#102823] px-3 text-sm text-[#dcf4ef]">
            <Search className="h-4 w-4 text-[#8ec9bc]" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, email, role, notes"
              className="h-full w-full bg-transparent px-2 text-sm placeholder:text-[#7fb4a9] focus:outline-none"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as DirectoryStatusFilter)}
            className="h-10 rounded-full border border-[#3a6159] bg-[#102823] px-3 text-sm text-[#dcf4ef]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_SHIFT">On Shift</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
            <option value="FOLLOW_UP">Follow-Up Needed</option>
          </select>

          <select
            value={availabilityFilter}
            onChange={(event) => setAvailabilityFilter(event.target.value)}
            className="h-10 rounded-full border border-[#3a6159] bg-[#102823] px-3 text-sm text-[#dcf4ef]"
          >
            <option value="ALL">Any Availability</option>
            {allAvailability.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="h-10 rounded-full border border-[#3a6159] bg-[#102823] px-3 text-sm text-[#dcf4ef]"
          >
            <option value="ALL">Any Skill Tag</option>
            {allTags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as DirectorySort)}
            className="h-10 rounded-full border border-[#3a6159] bg-[#102823] px-3 text-sm text-[#dcf4ef]"
          >
            <option value="scheduled">Scheduled Soonest</option>
            <option value="name">Name</option>
            <option value="hours">Hours Logged</option>
            <option value="recent">Recently Active</option>
            <option value="status">Status Priority</option>
          </select>

          <label className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#3a6159] bg-[#112c26] px-3 text-xs font-semibold text-[#d3f3ec]">
            <input
              type="checkbox"
              checked={scheduledThisWeekOnly}
              onChange={(event) => setScheduledThisWeekOnly(event.target.checked)}
              className="h-4 w-4"
            />
            Scheduled this week
          </label>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <aside className={cn(PANEL, "p-3")}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className={META_LABEL}>Volunteer Directory</p>
              <h2 className="mt-1 text-base font-bold text-white">People roster</h2>
            </div>
            <Badge className="border-[#457067] bg-[#173730] text-[#d4f0ea]">{filteredVolunteers.length}</Badge>
          </div>

          {filteredVolunteers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#456c64] bg-[#102721] p-8 text-center">
              <p className="text-base font-semibold text-white">No volunteers matched your filters.</p>
              <p className="mt-2 text-sm text-[#9ac8be]">Adjust search and filters to show volunteer records.</p>
            </div>
          ) : (
            <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
              {filteredVolunteers.map((volunteer) => (
                <button
                  key={volunteer.id}
                  type="button"
                  onClick={() => {
                    setSelectedVolunteerId(volunteer.id);
                    setProfileTab("overview");
                  }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selectedVolunteerId === volunteer.id
                      ? "border-emerald-300/60 bg-emerald-500/12"
                      : "border-[#375d56] bg-[#0f2520] hover:border-[#4a7d73]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{volunteer.name}</p>
                      <p className="mt-1 truncate text-[11px] text-[#a5cfc6]">
                        {volunteer.phone ?? "No phone"}
                        {volunteer.email ? ` · ${volunteer.email}` : ""}
                      </p>
                    </div>
                    <Badge className={cn("border text-[11px]", statusChipClass(volunteer.displayStatus))}>
                      {volunteer.displayStatus === "ON_SHIFT"
                        ? "On Shift"
                        : volunteer.displayStatus === "PENDING"
                          ? "Pending"
                          : volunteer.displayStatus === "INACTIVE"
                            ? "Inactive"
                            : "Active"}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge className={cn("border text-[11px]", followUpChipClass(volunteer.followUpNeeded))}>
                      {volunteer.followUpNeeded ? "Follow-Up Needed" : "Current"}
                    </Badge>
                    {volunteer.preferredRole ? (
                      <Badge className="border-[#4a7b72] bg-[#163831] text-[11px] text-[#d6efe9]">
                        {volunteer.preferredRole}
                      </Badge>
                    ) : null}
                    {volunteer.scheduledThisWeek ? (
                      <Badge className="border-[#4d79a1] bg-[#1d3957] text-[11px] text-[#dbe9ff]">Scheduled This Week</Badge>
                    ) : null}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#9bc5bc]">
                    <span>Next: {formatDateTime(volunteer.nextShiftAt, timeZone)}</span>
                    <span>Hours: {volunteer.monthlyHours.toFixed(1)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={cn(PANEL, "p-4")}>
          {!selectedVolunteer ? (
            <div className="rounded-xl border border-dashed border-[#456c64] bg-[#102721] p-10 text-center">
              <p className="text-base font-semibold text-white">Select a volunteer to view profile details.</p>
              <p className="mt-2 text-sm text-[#a1c9bf]">Availability, assignments, hours, notes, and onboarding status appear here.</p>
            </div>
          ) : (
            <>
              <header className={cn(PANEL_SOFT, "p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/45 bg-emerald-500/15 text-sm font-black text-emerald-100">
                      {selectedVolunteer.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part.charAt(0))
                        .join("")}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-black text-white">{selectedVolunteer.name}</h3>
                        <Badge className={cn("border", statusChipClass(selectedVolunteer.displayStatus))}>
                          {selectedVolunteer.displayStatus === "ON_SHIFT"
                            ? "On Shift"
                            : selectedVolunteer.displayStatus === "PENDING"
                              ? "Pending"
                              : selectedVolunteer.displayStatus === "INACTIVE"
                                ? "Inactive"
                                : "Active"}
                        </Badge>
                        <Badge className={cn("border", followUpChipClass(selectedVolunteer.followUpNeeded))}>
                          {selectedVolunteer.followUpNeeded ? "Follow-Up Needed" : "No Follow-Up Flag"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#badfd7]">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                          {selectedVolunteer.phone ?? "No phone"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" aria-hidden />
                          {selectedVolunteer.email ?? "No email"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserCog2 className="h-3.5 w-3.5" aria-hidden />
                          {selectedVolunteer.preferredRole ?? "Role not set"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#a8cfc7]">
                        Next assignment: {formatDateTime(selectedVolunteer.nextShiftAt, timeZone)} · Hours this month:{" "}
                        {selectedVolunteer.monthlyHours.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" className="h-8 rounded-full bg-[#238572] px-3 text-xs text-white hover:bg-[#2b997f]" onClick={() => openAssign(selectedVolunteer.id)} disabled={!canEdit}>
                      Assign to Activity
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4a7a70] bg-[#173730] px-3 text-xs text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => openLogHours(selectedVolunteer.id)} disabled={!canEdit}>
                      Log Hours
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4a7a70] bg-[#173730] px-3 text-xs text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => setAddNoteOpen(true)} disabled={!canEdit}>
                      Add Note
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4a7a70] bg-[#173730] px-3 text-xs text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={exportSchedule}>
                      Export Schedule
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <MiniMetric label="Monthly Hours" value={`${selectedVolunteer.monthlyHours.toFixed(1)}h`} helper="current month" />
                  <MiniMetric label="Next Shift" value={selectedVolunteer.nextShiftAt ? formatDateOnly(selectedVolunteer.nextShiftAt, timeZone) : "None"} helper="upcoming date" />
                  <MiniMetric label="Pending Items" value={String(selectedVolunteer.pendingOnboardingCount)} helper="onboarding checks" />
                  <MiniMetric label="Expiring Checks" value={String(selectedVolunteer.expiringChecksCount)} helper="30/60 day windows" />
                </div>
              </header>

              <div className="mt-4 flex flex-wrap gap-2">
                {PROFILE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setProfileTab(tab.key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      profileTab === tab.key
                        ? "border-emerald-300/60 bg-emerald-500/14 text-emerald-100"
                        : "border-[#3f6a60] bg-[#17332d] text-[#cdebe4] hover:bg-[#1f443c]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {profileTab === "overview" ? (
                  <section className="grid gap-3 md:grid-cols-2">
                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <p className={META_LABEL}>Reliability Summary</p>
                      <h4 className="mt-1 text-sm font-semibold text-white">Recent contribution and consistency</h4>
                      <ul className="mt-2 space-y-1.5 text-sm text-[#cce9e2]">
                        <li>
                          Last recorded visit:{" "}
                          <strong className="text-white">{formatDateTime(selectedVolunteer.lastVisitAt, timeZone)}</strong>
                        </li>
                        <li>
                          Shifts currently scheduled: <strong className="text-white">{selectedShifts.length}</strong>
                        </li>
                        <li>
                          Hours logged entries loaded: <strong className="text-white">{selectedHours.length}</strong>
                        </li>
                        <li>
                          Availability: <strong className="text-white">{selectedVolunteer.availability ?? "Not documented"}</strong>
                        </li>
                      </ul>
                    </div>
                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <p className={META_LABEL}>Recommended Next Action</p>
                      <h4 className="mt-1 text-sm font-semibold text-white">
                        {selectedVolunteer.followUpNeeded ? "Outreach recommended" : "Volunteer is current"}
                      </h4>
                      <p className="mt-2 text-sm text-[#c3e4dc]">
                        {selectedVolunteer.followUpNeeded
                          ? "Review onboarding and compliance items, then schedule a follow-up assignment."
                          : "Keep assignment cadence steady and recognize this volunteer in upcoming programming."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" className="h-8 rounded-full bg-[#1f6f62] px-3 text-xs text-white hover:bg-[#258271]" onClick={() => openAssign(selectedVolunteer.id)} disabled={!canEdit}>
                          Assign
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4a7a70] bg-[#173730] px-3 text-xs text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => setProfileTab("status")}>
                          Review Status
                        </Button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {profileTab === "availability" ? (
                  <section className="space-y-3">
                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <p className={META_LABEL}>Availability</p>
                      <h4 className="mt-1 text-sm font-semibold text-white">Preferred schedule windows</h4>
                      {selectedAvailabilityTokens.length === 0 ? (
                        <p className={cn("mt-2", EMPTY_LABEL)}>No availability preferences documented.</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedAvailabilityTokens.map((token) => (
                            <Badge key={token} className="border-[#4a7d73] bg-[#173a32] text-[#d7efe9]">
                              {token}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <p className={META_LABEL}>Upcoming Shifts</p>
                      {selectedShifts.length === 0 ? (
                        <p className={cn("mt-2", EMPTY_LABEL)}>No upcoming shifts assigned yet.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {selectedShifts.map((shift) => (
                            <article key={shift.id} className="rounded-xl border border-[#426e65] bg-[#12302a] px-3 py-2">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                                    <CalendarClock className="h-3.5 w-3.5 text-[#8bc5b9]" />
                                    {formatDateTime(shift.startAt, timeZone)}
                                  </p>
                                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#b3dcd2]">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {shift.assignedLocation}
                                  </p>
                                </div>
                                <Badge className={cn("border text-[11px]", shiftChipClass(shift.status))}>
                                  {shift.status === "IN_PROGRESS"
                                    ? "In Progress"
                                    : shift.status === "COMPLETE"
                                      ? "Complete"
                                      : "Scheduled"}
                                </Badge>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}

                {profileTab === "assignments" ? (
                  <section className={cn(PANEL_SOFT, "p-3")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className={META_LABEL}>Assignments & Activities</p>
                        <h4 className="mt-1 text-sm font-semibold text-white">Volunteer activity assignments</h4>
                      </div>
                      <Button type="button" size="sm" className="h-8 rounded-full bg-[#238572] px-3 text-xs text-white hover:bg-[#2b997f]" onClick={() => openAssign(selectedVolunteer.id)} disabled={!canEdit}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </div>
                    {selectedShifts.length === 0 ? (
                      <p className={cn("mt-3", EMPTY_LABEL)}>This volunteer has no assignments yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedShifts.map((shift) => (
                          <article key={shift.id} className="rounded-xl border border-[#426e65] bg-[#12302a] px-3 py-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-white">{shift.assignedLocation}</p>
                                <p className="mt-1 text-xs text-[#b8dfd6]">{formatDateTime(shift.startAt, timeZone)}</p>
                                {shift.notes ? <p className="mt-1 text-xs text-[#9dc9bf]">{shift.notes}</p> : null}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={cn("border text-[11px]", shiftChipClass(shift.status))}>
                                  {shift.status === "IN_PROGRESS"
                                    ? "In Progress"
                                    : shift.status === "COMPLETE"
                                      ? "Complete"
                                      : "Scheduled"}
                                </Badge>
                                <Link
                                  href={`/app/calendar?date=${dayKey(shift.startAt, timeZone) ?? ""}`}
                                  className="rounded-full border border-[#4a7a70] bg-[#173730] px-2 py-1 text-[11px] font-semibold text-[#d8f1eb] hover:bg-[#1f4a42]"
                                >
                                  Open Calendar
                                </Link>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-2 rounded-full border border-[#456f67] bg-[#183b33] px-2 py-1 text-[11px] text-[#cdebe4]">
                                Reassign
                                <select
                                  className="bg-transparent text-[11px] focus:outline-none"
                                  defaultValue={shift.volunteerId}
                                  onChange={(event) => void updateVisit(shift.id, { action: "reassign", volunteerId: event.target.value }, "Assignment updated")}
                                  disabled={!canEdit}
                                >
                                  {volunteers.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {shift.status !== "COMPLETE" ? (
                                <Button type="button" size="sm" variant="outline" className="h-7 rounded-full border-[#4a7a70] bg-[#173730] px-2 text-[11px] text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => void updateVisit(shift.id, { action: "signOut" }, "Shift signed out")} disabled={!canEdit}>
                                  Sign Out
                                </Button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}

                {profileTab === "hours" ? (
                  <section className={cn(PANEL_SOFT, "p-3")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className={META_LABEL}>Hours & Participation</p>
                        <h4 className="mt-1 text-sm font-semibold text-white">Logged contribution and approvals</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" variant="outline" className="h-8 rounded-full border-[#4a7a70] bg-[#173730] px-3 text-xs text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={exportHours}>
                          Export Hours
                        </Button>
                        <Button type="button" size="sm" className="h-8 rounded-full bg-[#238572] px-3 text-xs text-white hover:bg-[#2b997f]" onClick={() => openLogHours(selectedVolunteer.id)} disabled={!canEdit}>
                          Log Hours
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <MiniMetric
                        label="This Month"
                        value={`${(selectedDetail?.hours.totalHoursMonth ?? selectedVolunteer.monthlyHours).toFixed(1)}h`}
                        helper="logged"
                      />
                      <MiniMetric
                        label="Last 30 Days"
                        value={`${(selectedDetail?.hours.totalHours30Days ?? selectedVolunteer.monthlyHours).toFixed(1)}h`}
                        helper="rolling window"
                      />
                      <MiniMetric
                        label="Entries"
                        value={String(selectedHours.length)}
                        helper="records loaded"
                      />
                    </div>
                    {selectedHours.length === 0 ? (
                      <p className={cn("mt-3", EMPTY_LABEL)}>No hours have been logged for this volunteer yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedHours.slice(0, 20).map((entry) => (
                          <article key={entry.id} className="rounded-xl border border-[#426e65] bg-[#12302a] px-3 py-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-white">{formatDateTime(entry.startAt, timeZone)}</p>
                                <p className="text-xs text-[#b6ded5]">{entry.assignedLocation}</p>
                                {entry.notes ? <p className="mt-1 text-xs text-[#9bc8be]">{entry.notes}</p> : null}
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge className={cn("border text-[11px]", approvalChipClass(entry.approval))}>{entry.approval}</Badge>
                                <Badge className="border-[#4a7a70] bg-[#173730] text-[11px] text-[#d9eee8]">
                                  {entry.durationHours.toFixed(2)}h
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" className="h-7 rounded-full border-[#4a7a70] bg-[#173730] px-2 text-[11px] text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => void updateVisit(entry.id, { action: "approve" }, "Hours approved")} disabled={!canEdit || entry.approval === "APPROVED"}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button type="button" size="sm" variant="outline" className="h-7 rounded-full border-[#4a7a70] bg-[#173730] px-2 text-[11px] text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => void updateVisit(entry.id, { action: "deny", denialReason: "Needs correction" }, "Hours denied")} disabled={!canEdit || entry.approval === "DENIED"}>
                                Deny
                              </Button>
                            </div>
                          </article>
                        ))}
                        {payload.hoursPagination.hasMore ? (
                          <div className="pt-2 text-center">
                            <Button type="button" variant="outline" className="rounded-full border-[#4a7a70] bg-[#173730] text-xs text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => void loadMoreHours()} disabled={loadingMoreHours}>
                              {loadingMoreHours ? "Loading..." : "Load More Hours"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </section>
                ) : null}

                {profileTab === "notes" ? (
                  <section className="grid gap-3 md:grid-cols-2">
                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <div className="flex items-center justify-between">
                        <p className={META_LABEL}>Notes & Communication</p>
                        <Button type="button" size="sm" className="h-7 rounded-full bg-[#238572] px-2 text-[11px] text-white hover:bg-[#2b997f]" onClick={() => setAddNoteOpen(true)} disabled={!canEdit}>
                          <MessageSquare className="mr-1 h-3.5 w-3.5" />
                          Add Note
                        </Button>
                      </div>
                      {selectedNotes.length === 0 ? (
                        <p className={cn("mt-2", EMPTY_LABEL)}>No communication notes available yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-sm text-[#cde9e2]">
                          {selectedNotes.slice(0, 10).map((note, index) => (
                            <li key={`${note}-${index}`} className="rounded-lg border border-[#426e65] bg-[#12302a] px-3 py-2">
                              {note}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <p className={META_LABEL}>Volunteer Preferences</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-[#cde9e2]">
                        <li>
                          Preferred role: <strong className="text-white">{selectedVolunteer.preferredRole ?? "Not set"}</strong>
                        </li>
                        <li>
                          Availability: <strong className="text-white">{selectedVolunteer.availability ?? "Not set"}</strong>
                        </li>
                        <li>
                          Skill tags: <strong className="text-white">{selectedVolunteer.tags.length > 0 ? selectedVolunteer.tags.join(", ") : "None"}</strong>
                        </li>
                        <li>
                          Contact:{" "}
                          <strong className="text-white">
                            {selectedVolunteer.phone ?? "No phone"}
                            {selectedVolunteer.email ? ` · ${selectedVolunteer.email}` : ""}
                          </strong>
                        </li>
                      </ul>
                    </div>
                  </section>
                ) : null}

                {profileTab === "status" ? (
                  <section className="grid gap-3 md:grid-cols-2">
                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <p className={META_LABEL}>Onboarding Checklist</p>
                      {loadingDetail && !selectedDetail ? (
                        <p className={cn("mt-2", EMPTY_LABEL)}>Loading onboarding details...</p>
                      ) : onboardingChecklist.length === 0 ? (
                        <p className={cn("mt-2", EMPTY_LABEL)}>No onboarding checklist entries found.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {onboardingChecklist.map((item, index) => (
                            <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-lg border border-[#426e65] bg-[#12302a] px-3 py-2 text-sm text-[#d2ece6]">
                              <span>{item.label}</span>
                              <Badge className={cn("border text-[11px]", item.done ? "border-emerald-300/45 bg-emerald-500/16 text-emerald-100" : "border-amber-300/45 bg-amber-500/16 text-amber-100")}>
                                {item.done ? "Done" : "Pending"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={cn(PANEL_SOFT, "p-3")}>
                      <p className={META_LABEL}>Compliance & Next Steps</p>
                      {loadingDetail && !selectedDetail ? (
                        <p className={cn("mt-2", EMPTY_LABEL)}>Loading compliance details...</p>
                      ) : complianceItems.length === 0 ? (
                        <p className={cn("mt-2", EMPTY_LABEL)}>No compliance items documented.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {complianceItems.map((item, index) => (
                            <div key={`${item.label}-${index}`} className="rounded-lg border border-[#426e65] bg-[#12302a] px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-[#d2ece6]">{item.label}</p>
                                <Badge className={cn("border text-[11px]", item.status === "EXPIRED" ? "border-rose-300/45 bg-rose-500/16 text-rose-100" : item.status === "EXPIRING_30" ? "border-orange-300/45 bg-orange-500/16 text-orange-100" : item.status === "EXPIRING_60" ? "border-amber-300/45 bg-amber-500/16 text-amber-100" : "border-emerald-300/45 bg-emerald-500/16 text-emerald-100")}>
                                  {item.status.replaceAll("_", " ")}
                                </Badge>
                              </div>
                              {item.expiresAt ? (
                                <p className="mt-1 text-xs text-[#9ec7be]">
                                  Expires {formatDateOnly(item.expiresAt, timeZone)}
                                  {item.daysUntilExpiry != null ? ` · ${item.daysUntilExpiry} day(s)` : ""}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Upcoming Shifts</p>
            <h3 className="mt-1 text-base font-bold text-white">Who is scheduled next</h3>
            {upcomingShifts.length === 0 ? (
              <p className={cn("mt-3", EMPTY_LABEL)}>No upcoming volunteer assignments yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {upcomingShifts.map((shift) => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => {
                      setSelectedVolunteerId(shift.volunteerId);
                      setProfileTab("assignments");
                    }}
                    className="w-full rounded-xl border border-[#436f66] bg-[#112d27] px-3 py-2 text-left transition hover:border-[#5f9b8f]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{shift.volunteerName}</p>
                      <Badge className={cn("border text-[11px]", shiftChipClass(shift.status))}>
                        {shift.status === "IN_PROGRESS" ? "In Progress" : shift.status === "COMPLETE" ? "Complete" : "Scheduled"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#a8d2c8]">{formatDateTime(shift.startAt, timeZone)}</p>
                    <p className="mt-1 text-xs text-[#9bc6bc]">{shift.assignedLocation}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Follow-Up Queue</p>
            <h3 className="mt-1 text-base font-bold text-white">Volunteers needing outreach</h3>
            {followUpVolunteers.length === 0 ? (
              <p className={cn("mt-3", EMPTY_LABEL)}>No follow-up items are active right now.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {followUpVolunteers.map((volunteer) => (
                  <button
                    key={volunteer.id}
                    type="button"
                    onClick={() => {
                      setSelectedVolunteerId(volunteer.id);
                      setProfileTab("status");
                    }}
                    className="w-full rounded-xl border border-[#436f66] bg-[#112d27] px-3 py-2 text-left transition hover:border-[#5f9b8f]"
                  >
                    <p className="text-sm font-semibold text-white">{volunteer.name}</p>
                    <p className="mt-1 text-xs text-[#a8d2c8]">
                      Pending: {volunteer.pendingOnboardingCount} · Expiring: {volunteer.expiringChecksCount}
                    </p>
                    <p className="mt-1 text-xs text-[#9bc6bc]">Last visit: {formatDateTime(volunteer.lastVisitAt, timeZone)}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Quick Actions</p>
            <h3 className="mt-1 text-base font-bold text-white">Move fast across modules</h3>
            <div className="mt-3 grid gap-2">
              <QuickActionButton label="Add Volunteer" icon={<Plus className="h-4 w-4" />} onClick={() => setAddVolunteerOpen(true)} />
              <QuickActionButton label="Assign to Activity" icon={<CalendarClock className="h-4 w-4" />} onClick={() => openAssign(selectedVolunteer?.id)} />
              <QuickActionButton label="Log Hours" icon={<Clock3 className="h-4 w-4" />} onClick={() => openLogHours(selectedVolunteer?.id)} />
              <QuickActionLink href="/app/calendar" label="Open Calendar" icon={<CalendarDays className="h-4 w-4" />} />
              <QuickActionLink href="/app/documentation" label="Open Documentation" icon={<FileClock className="h-4 w-4" />} />
              <QuickActionButton label="Export Volunteer List" icon={<Download className="h-4 w-4" />} onClick={exportDirectory} />
            </div>
          </section>
        </aside>
      </section>

      <Dialog open={addVolunteerOpen} onOpenChange={setAddVolunteerOpen}>
        <DialogContent className="border-[#456f67] bg-[#0f2521] text-[#d9f0eb] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Add Volunteer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <Input
                value={volunteerForm.name}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, name: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Volunteer name"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={volunteerForm.phone}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, phone: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Phone"
              />
            </Field>
            <Field label="Email">
              <Input
                value={volunteerForm.email}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, email: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Email"
              />
            </Field>
            <Field label="Preferred Role">
              <Input
                value={volunteerForm.role}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, role: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Bingo helper, music support..."
              />
            </Field>
            <Field label="Availability" className="sm:col-span-2">
              <Input
                value={volunteerForm.availability}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, availability: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Mon/Wed/Fri afternoons"
              />
            </Field>
            <Field label="Status">
              <select
                value={volunteerForm.status}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, status: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#456f67] bg-[#132f29] px-3 text-sm text-[#d9f0eb]"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Onboarding / Next Steps" className="sm:col-span-2">
              <Textarea
                value={volunteerForm.onboarding}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, onboarding: event.target.value }))}
                rows={4}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Orientation pending&#10;Background check in progress"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#456f67] bg-[#173730] text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => setAddVolunteerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#238572] text-white hover:bg-[#2b997f]"
              onClick={() => void createVolunteer()}
              disabled={saving || volunteerForm.name.trim().length < 2}
            >
              {saving ? "Saving..." : "Add Volunteer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="border-[#456f67] bg-[#0f2521] text-[#d9f0eb] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Assign Volunteer to Activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Volunteer" required className="sm:col-span-2">
              <select
                value={assignForm.volunteerId}
                onChange={(event) => setAssignForm((current) => ({ ...current, volunteerId: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#456f67] bg-[#132f29] px-3 text-sm text-[#d9f0eb]"
              >
                <option value="">Select volunteer</option>
                {volunteers.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Activity Title" required>
              <Input
                value={assignForm.activityTitle}
                onChange={(event) => setAssignForm((current) => ({ ...current, activityTitle: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Bingo Social"
              />
            </Field>
            <Field label="Role">
              <Input
                value={assignForm.role}
                onChange={(event) => setAssignForm((current) => ({ ...current, role: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Helper / escort"
              />
            </Field>
            <Field label="Start" required>
              <Input
                type="datetime-local"
                value={assignForm.startAt}
                onChange={(event) => setAssignForm((current) => ({ ...current, startAt: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
              />
            </Field>
            <Field label="End">
              <Input
                type="datetime-local"
                value={assignForm.endAt}
                onChange={(event) => setAssignForm((current) => ({ ...current, endAt: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
              />
            </Field>
            <Field label="Location" required>
              <Input
                value={assignForm.assignedLocation}
                onChange={(event) => setAssignForm((current) => ({ ...current, assignedLocation: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Activity room"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={assignForm.notes}
                onChange={(event) => setAssignForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Any prep details or reminders"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#456f67] bg-[#173730] text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#238572] text-white hover:bg-[#2b997f]"
              onClick={() => void assignVolunteer()}
              disabled={saving || !assignForm.volunteerId || !assignForm.startAt || !assignForm.activityTitle.trim() || !assignForm.assignedLocation.trim()}
            >
              {saving ? "Saving..." : "Assign Volunteer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logHoursOpen} onOpenChange={setLogHoursOpen}>
        <DialogContent className="border-[#456f67] bg-[#0f2521] text-[#d9f0eb] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Log Volunteer Hours</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Volunteer" required className="sm:col-span-2">
              <select
                value={hoursForm.volunteerId}
                onChange={(event) => setHoursForm((current) => ({ ...current, volunteerId: event.target.value }))}
                className="h-10 w-full rounded-md border border-[#456f67] bg-[#132f29] px-3 text-sm text-[#d9f0eb]"
              >
                <option value="">Select volunteer</option>
                {volunteers.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Activity" required>
              <Input
                value={hoursForm.activityTitle}
                onChange={(event) => setHoursForm((current) => ({ ...current, activityTitle: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Craft social"
              />
            </Field>
            <Field label="Location" required>
              <Input
                value={hoursForm.assignedLocation}
                onChange={(event) => setHoursForm((current) => ({ ...current, assignedLocation: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Dining room"
              />
            </Field>
            <Field label="Start" required>
              <Input
                type="datetime-local"
                value={hoursForm.startAt}
                onChange={(event) => setHoursForm((current) => ({ ...current, startAt: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
              />
            </Field>
            <Field label="End" required>
              <Input
                type="datetime-local"
                value={hoursForm.endAt}
                onChange={(event) => setHoursForm((current) => ({ ...current, endAt: event.target.value }))}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={hoursForm.notes}
                onChange={(event) => setHoursForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
                placeholder="Contribution notes"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#456f67] bg-[#173730] text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => setLogHoursOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#238572] text-white hover:bg-[#2b997f]"
              onClick={() => void submitHours()}
              disabled={saving || !hoursForm.volunteerId || !hoursForm.startAt || !hoursForm.endAt || !hoursForm.activityTitle.trim() || !hoursForm.assignedLocation.trim()}
            >
              {saving ? "Saving..." : "Save Hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
        <DialogContent className="border-[#456f67] bg-[#0f2521] text-[#d9f0eb] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Add Volunteer Note</DialogTitle>
          </DialogHeader>
          <Field label="Note" required>
            <Textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={4}
              className="border-[#456f67] bg-[#132f29] text-[#d9f0eb]"
              placeholder="Follow-up reminder, communication update, or recognition note"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#456f67] bg-[#173730] text-[#d8f1eb] hover:bg-[#1f4a42]" onClick={() => setAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#238572] text-white hover:bg-[#2b997f]" onClick={() => void saveVolunteerNote()} disabled={saving || noteText.trim().length < 2}>
              {saving ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  accent
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <article className={cn(PANEL, "relative overflow-hidden p-3")}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r", accent)} />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className={META_LABEL}>{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-xs text-[#a8cfc7]">{detail}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#4a7b72] bg-[#173730]">
          {icon}
        </span>
      </div>
    </article>
  );
}

function MiniMetric({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className={cn(PANEL_SOFT, "p-3")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#96c2b8]">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-[#9fcac0]">{helper}</p>
    </div>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-between rounded-xl border border-[#456f67] bg-[#173730] px-3 py-2 text-sm font-semibold text-[#d8f1eb] transition hover:bg-[#1f4a42]"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span aria-hidden>→</span>
    </button>
  );
}

function QuickActionLink({
  href,
  label,
  icon
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between rounded-xl border border-[#456f67] bg-[#173730] px-3 py-2 text-sm font-semibold text-[#d8f1eb] transition hover:bg-[#1f4a42]"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}

function Field({
  label,
  required,
  className,
  children
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("space-y-1 text-sm", className)}>
      <span className="inline-flex items-center gap-1 text-[#cbe8e1]">
        {label}
        {required ? <span className="text-rose-300">*</span> : null}
      </span>
      {children}
    </label>
  );
}
