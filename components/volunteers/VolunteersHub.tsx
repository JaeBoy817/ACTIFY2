"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  Download,
  Plus,
  ShieldAlert,
  UserRoundPlus,
  Users,
  UsersRound
} from "lucide-react";

import { VolunteerDetailDrawer } from "@/components/volunteers/VolunteerDetailDrawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import type { VolunteerHourEntry, VolunteerHubPayload } from "@/lib/volunteers/types";

const DirectoryTab = dynamic(() => import("@/components/volunteers/DirectoryTab").then((mod) => mod.DirectoryTab), {
  loading: () => <div className="skeleton shimmer h-52 rounded-xl" />
});
const ScheduleTab = dynamic(() => import("@/components/volunteers/ScheduleTab").then((mod) => mod.ScheduleTab), {
  loading: () => <div className="skeleton shimmer h-52 rounded-xl" />
});
const HoursTab = dynamic(() => import("@/components/volunteers/HoursTab").then((mod) => mod.HoursTab), {
  loading: () => <div className="skeleton shimmer h-52 rounded-xl" />
});
const DailyMotivationCard = dynamic(
  () => import("@/components/dashboard/DailyMotivationCard").then((mod) => mod.DailyMotivationCard),
  { loading: () => <div className="skeleton shimmer h-32 rounded-2xl" /> }
);

type VolunteerTabKey = "directory" | "schedule" | "hours";

const TAB_ITEMS: Array<{ key: VolunteerTabKey; label: string; icon: typeof UsersRound }> = [
  { key: "directory", label: "Directory", icon: UsersRound },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "hours", label: "Hours", icon: Clock3 }
];

function toCsvRow(values: Array<string | number | null | undefined>) {
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
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function VolunteersHub({
  initialPayload,
  initialTab,
  canEdit
}: {
  initialPayload: VolunteerHubPayload;
  initialTab: VolunteerTabKey;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<VolunteerTabKey>(initialTab);
  const [payload, setPayload] = useState(initialPayload);
  const [loadingHoursMore, setLoadingHoursMore] = useState(false);
  const [drawerVolunteerId, setDrawerVolunteerId] = useState<string | null>(null);
  const [addVolunteerOpen, setAddVolunteerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [logHoursOpen, setLogHoursOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [volunteerForm, setVolunteerForm] = useState({
    name: "",
    phone: "",
    requirements: ""
  });
  const [scheduleForm, setScheduleForm] = useState({
    volunteerId: "",
    startAt: "",
    endAt: "",
    assignedLocation: "",
    notes: ""
  });
  const [hoursForm, setHoursForm] = useState({
    volunteerId: "",
    startAt: "",
    endAt: "",
    assignedLocation: "",
    notes: ""
  });

  const selectedVolunteer = useMemo(
    () => payload.volunteers.find((volunteer) => volunteer.id === drawerVolunteerId) ?? null,
    [drawerVolunteerId, payload.volunteers]
  );

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested === "directory" || requested === "schedule" || requested === "hours") {
      setActiveTab(requested);
    }
  }, [searchParams]);

  useEffect(() => {
    const idleId = window.setTimeout(() => {
      const run = () => {
        void import("@/components/volunteers/DirectoryTab");
        void import("@/components/volunteers/ScheduleTab");
        void import("@/components/volunteers/HoursTab");
      };
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(run);
      } else {
        run();
      }
    }, 320);
    return () => window.clearTimeout(idleId);
  }, []);

  function switchTab(tab: VolunteerTabKey) {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  async function refreshHub(options: { hoursOffset?: number; appendHours?: boolean } = {}) {
    const query = new URLSearchParams();
    if (typeof options.hoursOffset === "number") query.set("hoursOffset", String(options.hoursOffset));
    if (typeof options.hoursOffset === "number") query.set("hoursLimit", String(payload.hoursPagination.limit));
    const response = await fetch(`/api/volunteers/hub?${query.toString()}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not refresh volunteer hub.");

    const nextPayload = body as VolunteerHubPayload;
    if (options.appendHours) {
      setPayload((current) => ({
        ...nextPayload,
        hours: [...current.hours, ...nextPayload.hours]
      }));
      return;
    }
    setPayload(nextPayload);
  }

  async function createVolunteer() {
    setSaving(true);
    try {
      const response = await fetch("/api/volunteers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: volunteerForm.name,
          phone: volunteerForm.phone || null,
          requirements: volunteerForm.requirements
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not add volunteer.");

      await refreshHub();
      setAddVolunteerOpen(false);
      setVolunteerForm({ name: "", phone: "", requirements: "" });
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

  async function createShiftFromForm(form: typeof scheduleForm) {
    const response = await fetch("/api/volunteers/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not schedule shift.");
  }

  async function scheduleShift() {
    setSaving(true);
    try {
      await createShiftFromForm(scheduleForm);
      await refreshHub();
      setScheduleOpen(false);
      setScheduleForm({ volunteerId: "", startAt: "", endAt: "", assignedLocation: "", notes: "" });
      toast({ title: "Shift scheduled" });
    } catch (error) {
      toast({
        title: "Schedule failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  async function logHours() {
    setSaving(true);
    try {
      await createShiftFromForm(hoursForm);
      await refreshHub();
      setLogHoursOpen(false);
      setHoursForm({ volunteerId: "", startAt: "", endAt: "", assignedLocation: "", notes: "" });
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

  async function updateVisit(visitId: string, payloadPatch: Record<string, unknown>, successTitle: string) {
    try {
      const response = await fetch(`/api/volunteers/visits/${encodeURIComponent(visitId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payloadPatch)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not update visit.");
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

  async function loadMoreHours() {
    if (loadingHoursMore || !payload.hoursPagination.hasMore) return;
    setLoadingHoursMore(true);
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
      setLoadingHoursMore(false);
    }
  }

  function openScheduleModal(volunteerId?: string) {
    const nextVolunteerId = volunteerId ?? "";
    setScheduleForm((current) => ({ ...current, volunteerId: nextVolunteerId }));
    setScheduleOpen(true);
  }

  function openHoursModal(volunteerId?: string) {
    const nextVolunteerId = volunteerId ?? "";
    setHoursForm((current) => ({ ...current, volunteerId: nextVolunteerId }));
    setLogHoursOpen(true);
  }

  function exportCurrentTab() {
    if (activeTab === "directory") {
      const rows = [
        toCsvRow(["Name", "Phone", "Status", "Availability", "Tags", "Monthly Hours"]),
        ...payload.volunteers.map((volunteer) =>
          toCsvRow([
            volunteer.name,
            volunteer.phone,
            volunteer.status,
            volunteer.availability,
            volunteer.tags.join("; "),
            volunteer.monthlyHours
          ])
        )
      ];
      exportCsv("volunteers-directory.csv", rows);
      return;
    }

    if (activeTab === "schedule") {
      const rows = [
        toCsvRow(["Volunteer", "Start", "End", "Location", "Status", "Notes"]),
        ...payload.shifts.map((shift) =>
          toCsvRow([
            shift.volunteerName,
            shift.startAt,
            shift.endAt,
            shift.assignedLocation,
            shift.status,
            shift.notes
          ])
        )
      ];
      exportCsv("volunteers-schedule.csv", rows);
      return;
    }

    const rows = [
      toCsvRow(["Volunteer", "Start", "End", "Location", "Duration Hours", "Approval", "Notes"]),
      ...payload.hours.map((entry: VolunteerHourEntry) =>
        toCsvRow([
          entry.volunteerName,
          entry.startAt,
          entry.endAt,
          entry.assignedLocation,
          entry.durationHours,
          entry.approval,
          entry.notes
        ])
      )
    ];
    exportCsv("volunteers-hours.csv", rows);
  }

  const kpiItems = [
    {
      key: "active",
      label: "Active Volunteers",
      value: payload.kpis.activeVolunteers,
      icon: Users,
      tone: "from-emerald-400/35 to-teal-300/10 text-emerald-800",
      onClick: () => switchTab("directory")
    },
    {
      key: "scheduled",
      label: "Scheduled Next 7 Days",
      value: payload.kpis.scheduledNext7Days,
      icon: CalendarClock,
      tone: "from-sky-400/35 to-indigo-300/10 text-sky-800",
      onClick: () => switchTab("schedule")
    },
    {
      key: "hours",
      label: "Hours This Month",
      value: payload.kpis.hoursThisMonth.toFixed(2),
      icon: Clock3,
      tone: "from-amber-400/35 to-orange-300/10 text-amber-800",
      onClick: () => switchTab("hours")
    },
    {
      key: "onboarding",
      label: "Pending Onboarding",
      value: payload.kpis.pendingOnboarding,
      icon: UserRoundPlus,
      tone: "from-violet-400/35 to-fuchsia-300/10 text-violet-800",
      onClick: () => setAddVolunteerOpen(true)
    },
    {
      key: "expiring",
      label: "Expiring Checks (30/60d)",
      value: `${payload.kpis.expiringChecks30Days}/${payload.kpis.expiringChecks60Days}`,
      icon: ShieldAlert,
      tone: "from-rose-400/35 to-orange-300/10 text-rose-800",
      onClick: () => setDrawerVolunteerId(payload.volunteers[0]?.id ?? null)
    }
  ];

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl border-white/20 p-4 shadow-xl shadow-black/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">Volunteers</h1>
            <p className="text-sm text-foreground/75">Simple volunteer hub for directory, scheduling, hours, and compliance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => setAddVolunteerOpen(true)} disabled={!canEdit}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Volunteer
            </Button>
            <Button type="button" variant="outline" onClick={() => openScheduleModal()} disabled={!canEdit}>
              <CalendarClock className="mr-1.5 h-4 w-4" />
              Schedule Shift
            </Button>
            <Button type="button" variant="outline" onClick={() => openHoursModal()} disabled={!canEdit}>
              <Clock3 className="mr-1.5 h-4 w-4" />
              Log Hours
            </Button>
            <Button type="button" variant="outline" onClick={exportCurrentTab}>
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {kpiItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className="glass-panel rounded-2xl border-white/20 p-3 text-left shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
            >
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/65">
                <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/40 bg-gradient-to-br", item.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
            </button>
          );
        })}
      </section>

      <section className="glass-panel rounded-2xl border-white/20 p-4 shadow-xl shadow-black/15">
        <div className="mb-3 inline-flex items-center gap-1 rounded-xl border border-white/45 bg-white/70 p-1">
          {TAB_ITEMS.map((tabItem) => {
            const Icon = tabItem.icon;
            const active = activeTab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                type="button"
                onMouseEnter={() => {
                  if (tabItem.key === "schedule") void import("@/components/volunteers/ScheduleTab");
                  if (tabItem.key === "hours") void import("@/components/volunteers/HoursTab");
                }}
                onFocus={() => {
                  if (tabItem.key === "schedule") void import("@/components/volunteers/ScheduleTab");
                  if (tabItem.key === "hours") void import("@/components/volunteers/HoursTab");
                }}
                onClick={() => switchTab(tabItem.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition",
                  active ? "bg-actifyBlue text-white shadow-md shadow-actifyBlue/30" : "text-foreground/75 hover:bg-white/80"
                )}
              >
                <Icon className="h-4 w-4" />
                {tabItem.label}
              </button>
            );
          })}
        </div>

        {activeTab === "directory" ? (
          <DirectoryTab
            volunteers={payload.volunteers}
            onView={(volunteerId) => setDrawerVolunteerId(volunteerId)}
            onSchedule={(volunteerId) => openScheduleModal(volunteerId)}
            onLogHours={(volunteerId) => openHoursModal(volunteerId)}
          />
        ) : null}

        {activeTab === "schedule" ? (
          <ScheduleTab
            shifts={payload.shifts}
            volunteers={payload.volunteers}
            onOpenVolunteer={(volunteerId) => setDrawerVolunteerId(volunteerId)}
            onOpenSchedule={() => openScheduleModal()}
            onReassign={(visitId, volunteerId) => void updateVisit(visitId, { action: "reassign", volunteerId }, "Shift reassigned")}
            onSignOut={(visitId) => void updateVisit(visitId, { action: "signOut" }, "Volunteer signed out")}
          />
        ) : null}

        {activeTab === "hours" ? (
          <HoursTab
            entries={payload.hours}
            hasMore={payload.hoursPagination.hasMore}
            canEdit={canEdit}
            loadingMore={loadingHoursMore}
            onLoadMore={() => void loadMoreHours()}
            onOpenLogHours={() => openHoursModal()}
            onExport={exportCurrentTab}
            onApprove={(visitId) => void updateVisit(visitId, { action: "approve" }, "Hours approved")}
            onDeny={(visitId) => void updateVisit(visitId, { action: "deny", denialReason: "Needs correction" }, "Hours denied")}
          />
        ) : null}
      </section>

      <section className="pt-1">
        <DailyMotivationCard />
      </section>

      <VolunteerDetailDrawer
        open={Boolean(drawerVolunteerId)}
        volunteerId={drawerVolunteerId}
        summary={selectedVolunteer}
        canEdit={canEdit}
        onOpenChange={(open) => {
          if (!open) setDrawerVolunteerId(null);
        }}
        onDataChanged={() => void refreshHub()}
      />

      <Dialog open={addVolunteerOpen} onOpenChange={setAddVolunteerOpen}>
        <DialogContent className="border-white/60 bg-white/95">
          <DialogHeader>
            <DialogTitle>Add volunteer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="space-y-1 text-sm">
              Name
              <Input
                value={volunteerForm.name}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Volunteer name"
              />
            </label>
            <label className="space-y-1 text-sm">
              Phone
              <Input
                value={volunteerForm.phone}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone"
              />
            </label>
            <label className="space-y-1 text-sm">
              Onboarding / requirements
              <Textarea
                value={volunteerForm.requirements}
                onChange={(event) => setVolunteerForm((current) => ({ ...current, requirements: event.target.value }))}
                rows={6}
                placeholder="One requirement per line"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddVolunteerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void createVolunteer()}
              disabled={saving || volunteerForm.name.trim().length < 2}
            >
              {saving ? "Saving..." : "Add Volunteer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="border-white/60 bg-white/95">
          <DialogHeader>
            <DialogTitle>Schedule shift</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              Volunteer
              <select
                value={scheduleForm.volunteerId}
                onChange={(event) => setScheduleForm((current) => ({ ...current, volunteerId: event.target.value }))}
                className="h-10 w-full rounded-md border border-white/45 bg-white/85 px-3 text-sm"
              >
                <option value="">Select volunteer</option>
                {payload.volunteers.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Start
              <Input
                type="datetime-local"
                value={scheduleForm.startAt}
                onChange={(event) => setScheduleForm((current) => ({ ...current, startAt: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              End (optional)
              <Input
                type="datetime-local"
                value={scheduleForm.endAt}
                onChange={(event) => setScheduleForm((current) => ({ ...current, endAt: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              Location
              <Input
                value={scheduleForm.assignedLocation}
                onChange={(event) => setScheduleForm((current) => ({ ...current, assignedLocation: event.target.value }))}
                placeholder="Location"
              />
            </label>
            <label className="space-y-1 text-sm">
              Notes
              <Input
                value={scheduleForm.notes}
                onChange={(event) => setScheduleForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notes"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void scheduleShift()}
              disabled={saving || !scheduleForm.volunteerId || !scheduleForm.startAt || !scheduleForm.assignedLocation}
            >
              {saving ? "Saving..." : "Schedule Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logHoursOpen} onOpenChange={setLogHoursOpen}>
        <DialogContent className="border-white/60 bg-white/95">
          <DialogHeader>
            <DialogTitle>Log hours</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              Volunteer
              <select
                value={hoursForm.volunteerId}
                onChange={(event) => setHoursForm((current) => ({ ...current, volunteerId: event.target.value }))}
                className="h-10 w-full rounded-md border border-white/45 bg-white/85 px-3 text-sm"
              >
                <option value="">Select volunteer</option>
                {payload.volunteers.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Start
              <Input
                type="datetime-local"
                value={hoursForm.startAt}
                onChange={(event) => setHoursForm((current) => ({ ...current, startAt: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              End
              <Input
                type="datetime-local"
                value={hoursForm.endAt}
                onChange={(event) => setHoursForm((current) => ({ ...current, endAt: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              Location
              <Input
                value={hoursForm.assignedLocation}
                onChange={(event) => setHoursForm((current) => ({ ...current, assignedLocation: event.target.value }))}
                placeholder="Location"
              />
            </label>
            <label className="space-y-1 text-sm">
              Notes
              <Input
                value={hoursForm.notes}
                onChange={(event) => setHoursForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notes"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLogHoursOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void logHours()}
              disabled={saving || !hoursForm.volunteerId || !hoursForm.startAt || !hoursForm.endAt || !hoursForm.assignedLocation}
            >
              {saving ? "Saving..." : "Log Hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
