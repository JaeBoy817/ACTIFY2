"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ResidentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseResidentTags, type ResidentListRow, type ResidentUpsertPayload } from "@/lib/residents/types";
import { useToast } from "@/lib/use-toast";

const statusOptions: Array<{ value: ResidentUpsertPayload["status"]; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "BED_BOUND", label: "Bed Bound" },
  { value: "HOSPITALIZED", label: "Hospital" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "DISCHARGED", label: "Discharged" },
  { value: "DECEASED", label: "Deceased" },
  { value: "OTHER", label: "Other" }
];

type FormState = {
  firstName: string;
  lastName: string;
  preferredName: string;
  room: string;
  unitId: string;
  status: ResidentUpsertPayload["status"];
  birthDate: string;
  admissionDate: string;
  mdsManualDueDate: string;
  bestTimesOfDay: string;
  preferences: string;
  safetyNotes: string;
  notes: string;
  tags: string;
  followUpFlag: boolean;
};

function emptyFormState(): FormState {
  return {
    firstName: "",
    lastName: "",
    preferredName: "",
    room: "",
    unitId: "none",
    status: ResidentStatus.ACTIVE,
    birthDate: "",
    admissionDate: "",
    mdsManualDueDate: "",
    bestTimesOfDay: "",
    preferences: "",
    safetyNotes: "",
    notes: "",
    tags: "",
    followUpFlag: false
  };
}

export function ResidentFormModal({
  open,
  onOpenChange,
  initialResident,
  units,
  onSave,
  canEdit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialResident: ResidentListRow | null;
  units: Array<{ id: string; name: string }>;
  onSave: (payload: ResidentUpsertPayload, residentId?: string) => Promise<void>;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyFormState);

  const mode = useMemo(() => (initialResident ? "edit" : "create"), [initialResident]);

  useEffect(() => {
    if (!open) return;
    if (!initialResident) {
      setForm(emptyFormState());
      return;
    }

    setForm({
      firstName: initialResident.firstName,
      lastName: initialResident.lastName,
      preferredName: initialResident.preferredName ?? "",
      room: initialResident.room,
      unitId: initialResident.unitId ?? "none",
      status: initialResident.status as FormState["status"],
      birthDate: initialResident.birthDate ? initialResident.birthDate.slice(0, 10) : "",
      admissionDate: initialResident.admissionDate ? initialResident.admissionDate.slice(0, 10) : "",
      mdsManualDueDate: initialResident.mdsManualDueDate ? initialResident.mdsManualDueDate.slice(0, 10) : "",
      bestTimesOfDay: initialResident.bestTimesOfDay ?? "",
      preferences: initialResident.preferences ?? "",
      safetyNotes: initialResident.safetyNotes ?? "",
      notes: initialResident.notes ?? "",
      tags: initialResident.tags.join(", "),
      followUpFlag: initialResident.followUpFlag
    });
  }, [initialResident, open]);

  function submit() {
    if (!canEdit) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.room.trim() || !form.status) {
      toast({
        title: "Missing required fields",
        description: "First name, last name, room, and status are required.",
        variant: "destructive"
      });
      return;
    }

    const payload: ResidentUpsertPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      preferredName: form.preferredName.trim() || null,
      room: form.room.trim(),
      status: form.status,
      unitId: form.unitId !== "none" ? form.unitId : null,
      birthDate: form.birthDate.trim() || null,
      admissionDate: form.admissionDate.trim() || null,
      mdsManualDueDate: form.mdsManualDueDate.trim() || null,
      bestTimesOfDay: form.bestTimesOfDay.trim() || null,
      preferences: form.preferences.trim() || null,
      safetyNotes: form.safetyNotes.trim() || null,
      notes: form.notes.trim() || null,
      tags: parseResidentTags(form.tags),
      followUpFlag: form.followUpFlag
    };

    startTransition(async () => {
      try {
        await onSave(payload, initialResident?.id);
        onOpenChange(false);
        toast({
          title: mode === "create" ? "Resident added" : "Resident updated"
        });
      } catch (error) {
        toast({
          title: mode === "create" ? "Could not add resident" : "Could not update resident",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-[#2b4168] bg-[linear-gradient(180deg,#101c34_0%,#0b1426_100%)] text-[#dbe8ff]">
        <DialogHeader>
          <DialogTitle className="text-white">{mode === "create" ? "Add Resident" : "Edit Resident"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#2f4a77] bg-[#0f1d37] p-3">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#95add8]">Basic Info</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Input
                placeholder="Preferred name"
                value={form.preferredName}
                onChange={(event) => setForm((prev) => ({ ...prev, preferredName: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Input
                placeholder="Room"
                value={form.room}
                onChange={(event) => setForm((prev) => ({ ...prev, room: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Select value={form.unitId} onValueChange={(value) => setForm((prev) => ({ ...prev, unitId: value }))}>
                <SelectTrigger className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]">
                  <SelectValue placeholder="Unit / Hall" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No unit</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as FormState["status"] }))}
              >
                <SelectTrigger className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Input
                type="date"
                value={form.admissionDate}
                onChange={(event) => setForm((prev) => ({ ...prev, admissionDate: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Input
                type="date"
                value={form.mdsManualDueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, mdsManualDueDate: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[#2f4a77] bg-[#0f1d37] p-3">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#95add8]">Activity Profile</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Best time of day"
                value={form.bestTimesOfDay}
                onChange={(event) => setForm((prev) => ({ ...prev, bestTimesOfDay: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Input
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                className="border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Textarea
                rows={3}
                placeholder="Interests and preferences"
                value={form.preferences}
                onChange={(event) => setForm((prev) => ({ ...prev, preferences: event.target.value }))}
                className="sm:col-span-2 border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Textarea
                rows={3}
                placeholder="Safety notes"
                value={form.safetyNotes}
                onChange={(event) => setForm((prev) => ({ ...prev, safetyNotes: event.target.value }))}
                className="sm:col-span-2 border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <Textarea
                rows={3}
                placeholder="Additional resident notes"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="sm:col-span-2 border-[#3b5d90] bg-[#122341] text-[#dbe8ff]"
              />
              <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-[#3b5d90] bg-[#122341] px-3 py-2 text-sm text-[#dbe8ff]">
                <input
                  type="checkbox"
                  checked={form.followUpFlag}
                  onChange={(event) => setForm((prev) => ({ ...prev, followUpFlag: event.target.checked }))}
                />
                Flag follow-up for this resident
              </label>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[#3b5d90] bg-[#10203a] text-[#dbe8ff]">
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || !canEdit} className="border border-cyan-300/55 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30">
            {mode === "create" ? "Create Resident" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
