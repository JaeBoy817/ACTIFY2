"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, FileCheck2, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { VolunteerDetailPayload, VolunteerSummary } from "@/lib/volunteers/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

const PERMISSION_OPTIONS = [
  "Schedule shifts",
  "Log hours",
  "Approve timesheets",
  "Assist activities"
];

function complianceBadgeClass(status: VolunteerDetailPayload["compliance"]["items"][number]["status"]) {
  if (status === "EXPIRED") return "border-rose-200 bg-rose-100 text-rose-800";
  if (status === "EXPIRING_30") return "border-orange-200 bg-orange-100 text-orange-900";
  if (status === "EXPIRING_60") return "border-amber-200 bg-amber-100 text-amber-900";
  return "border-emerald-200 bg-emerald-100 text-emerald-800";
}

export function VolunteerDetailDrawer({
  open,
  volunteerId,
  summary,
  canEdit,
  onOpenChange,
  onDataChanged
}: {
  open: boolean;
  volunteerId: string | null;
  summary: VolunteerSummary | null;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<VolunteerDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    if (!open || !volunteerId) return;
    setLoading(true);
    void fetch(`/api/volunteers/${encodeURIComponent(volunteerId)}/details`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Could not load volunteer details.");
        return body as VolunteerDetailPayload;
      })
      .then((payload) => {
        setDetail(payload);
        setName(payload.volunteer.name);
        setPhone(payload.volunteer.phone ?? "");
        setRequirementsText(payload.volunteer.requirements.join("\n"));
        setCapabilities(payload.permissions.capabilities);
      })
      .catch((error) => {
        toast({
          title: "Could not load volunteer details",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      })
      .finally(() => setLoading(false));
  }, [open, volunteerId, toast]);

  const requirementLines = useMemo(
    () =>
      requirementsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [requirementsText]
  );

  async function saveProfile() {
    if (!volunteerId) return;
    setSaving(true);
    try {
      const nonPermissionLines = requirementLines.filter((line) => !line.toLowerCase().startsWith("permission:"));
      const permissionLine = capabilities.length > 0 ? `permission: ${capabilities.join(", ")}` : null;
      const requirements = permissionLine ? [...nonPermissionLines, permissionLine] : nonPermissionLines;

      const response = await fetch(`/api/volunteers/${encodeURIComponent(volunteerId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone.trim() || null,
          requirements
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save volunteer.");
      }

      toast({ title: "Volunteer updated" });
      onDataChanged?.();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 h-[100dvh] w-full max-w-xl translate-x-0 translate-y-0 rounded-none border-l border-white/25 bg-white/95 p-0 backdrop-blur-md">
        <DialogHeader className="border-b border-white/35 px-5 py-4 text-left">
          <DialogTitle className="inline-flex items-center gap-2 font-[var(--font-display)] text-xl">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-200 bg-gradient-to-br from-violet-200/75 to-cyan-100/65 text-violet-700">
              <UserRound className="h-4 w-4" />
            </span>
            {summary?.name ?? detail?.volunteer.name ?? "Volunteer details"}
          </DialogTitle>
          {summary ? (
            <p className="text-sm text-muted-foreground">
              {summary.status === "ON_SHIFT" ? "On shift" : summary.status === "INACTIVE" ? "Inactive" : "Active"} ·{" "}
              {summary.phone ?? "No phone"}
            </p>
          ) : null}
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 px-5 py-4">
            <div className="skeleton shimmer h-8 w-full rounded-lg" />
            <div className="skeleton shimmer h-40 w-full rounded-xl" />
            <div className="skeleton shimmer h-28 w-full rounded-xl" />
          </div>
        ) : detail ? (
          <div className="flex h-[calc(100dvh-82px)] flex-col">
            <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
              <TabsList className="mx-5 mt-3 grid grid-cols-4 bg-white/70">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="compliance">Onboarding</TabsTrigger>
                <TabsTrigger value="hours">Hours</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <TabsContent value="profile" className="space-y-3">
                  <label className="space-y-1 text-sm">
                    Name
                    <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="space-y-1 text-sm">
                    Phone
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="space-y-1 text-sm">
                    Profile / requirements
                    <Textarea
                      value={requirementsText}
                      onChange={(event) => setRequirementsText(event.target.value)}
                      rows={10}
                      disabled={!canEdit}
                    />
                  </label>
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4">
                  <section className="space-y-2 rounded-xl border border-white/45 bg-white/80 p-3">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <BadgeCheck className="h-4 w-4 text-emerald-700" />
                      Onboarding checklist
                    </p>
                    {detail.profile.onboardingChecklist.length === 0 ? (
                      <p className="text-sm text-foreground/70">No onboarding checklist items found.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detail.profile.onboardingChecklist.map((item, index) => (
                          <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-lg border border-white/45 bg-white/70 px-3 py-2 text-sm">
                            <span>{item.label}</span>
                            <Badge className={cn("border text-[11px]", item.done ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-amber-200 bg-amber-100 text-amber-900")}>
                              {item.done ? "Done" : "Pending"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-2 rounded-xl border border-white/45 bg-white/80 p-3">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <FileCheck2 className="h-4 w-4 text-violet-700" />
                      Compliance checks
                    </p>
                    {detail.compliance.items.length === 0 ? (
                      <p className="text-sm text-foreground/70">No compliance checks documented.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.compliance.items.map((item, index) => (
                          <div key={`${item.label}-${index}`} className="rounded-lg border border-white/45 bg-white/70 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-foreground">{item.label}</p>
                              <Badge className={cn("border text-[11px]", complianceBadgeClass(item.status))}>
                                {item.status.replace("_", " ")}
                              </Badge>
                            </div>
                            {item.expiresAt ? (
                              <p className="text-xs text-foreground/65">
                                Expires {new Date(item.expiresAt).toLocaleDateString()} ·{" "}
                                {item.daysUntilExpiry !== null ? `${item.daysUntilExpiry} day(s)` : "No timeline"}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </TabsContent>

                <TabsContent value="hours" className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/45 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-foreground/60">Last 30 days</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{detail.hours.totalHours30Days.toFixed(2)}h</p>
                    </div>
                    <div className="rounded-xl border border-white/45 bg-white/80 p-3">
                      <p className="text-xs uppercase tracking-wide text-foreground/60">This month</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{detail.hours.totalHoursMonth.toFixed(2)}h</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {detail.hours.entries.slice(0, 20).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-white/45 bg-white/80 p-3">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(entry.startAt).toLocaleString()}
                          {entry.endAt ? ` - ${new Date(entry.endAt).toLocaleTimeString()}` : ""}
                        </p>
                        <p className="text-xs text-foreground/65">
                          {entry.assignedLocation} · {entry.durationHours.toFixed(2)}h
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="permissions" className="space-y-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-indigo-700" />
                    Volunteer capabilities
                  </p>
                  <p className="text-xs text-foreground/65">
                    Uses existing role guardrails. Toggle capabilities to store volunteer-specific preferences.
                  </p>
                  <div className="space-y-2">
                    {PERMISSION_OPTIONS.map((option) => {
                      const checked = capabilities.includes(option);
                      return (
                        <label key={option} className="flex items-center justify-between rounded-lg border border-white/45 bg-white/80 px-3 py-2 text-sm">
                          <span>{option}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canEdit}
                            onChange={(event) =>
                              setCapabilities((current) =>
                                event.target.checked ? [...current, option] : current.filter((item) => item !== option)
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex items-center justify-end gap-2 border-t border-white/35 px-5 py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canEdit ? (
                <Button type="button" onClick={() => void saveProfile()} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 text-sm text-foreground/70">Select a volunteer to view details.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
