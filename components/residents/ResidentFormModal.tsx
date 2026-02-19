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
  { value: "DISCHARGED", label: "Discharged" }
];

type FormState = {
  firstName: string;
  lastName: string;
  room: string;
  status: ResidentUpsertPayload["status"];
  birthDate: string;
  preferences: string;
  safetyNotes: string;
  tags: string;
  followUpFlag: boolean;
};

function emptyFormState(): FormState {
  return {
    firstName: "",
    lastName: "",
    room: "",
    status: ResidentStatus.ACTIVE,
    birthDate: "",
    preferences: "",
    safetyNotes: "",
    tags: "",
    followUpFlag: false
  };
}

export function ResidentFormModal({
  open,
  onOpenChange,
  initialResident,
  onSave,
  canEdit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialResident: ResidentListRow | null;
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
      room: initialResident.room,
      status: initialResident.status as FormState["status"],
      birthDate: initialResident.birthDate ? initialResident.birthDate.slice(0, 10) : "",
      preferences: initialResident.preferences ?? "",
      safetyNotes: initialResident.safetyNotes ?? "",
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
      room: form.room.trim(),
      status: form.status,
      birthDate: form.birthDate.trim() || null,
      preferences: form.preferences.trim() || null,
      safetyNotes: form.safetyNotes.trim() || null,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Resident" : "Edit Resident"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="First name"
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            className="shadow-lg shadow-black/10"
          />
          <Input
            placeholder="Last name"
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            className="shadow-lg shadow-black/10"
          />
          <Input
            placeholder="Room"
            value={form.room}
            onChange={(event) => setForm((prev) => ({ ...prev, room: event.target.value }))}
            className="shadow-lg shadow-black/10"
          />
          <Input
            type="date"
            value={form.birthDate}
            onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
            className="shadow-lg shadow-black/10"
          />
          <Select
            value={form.status}
            onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as FormState["status"] }))}
          >
            <SelectTrigger className="shadow-lg shadow-black/10">
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
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            className="sm:col-span-2 shadow-lg shadow-black/10"
          />
          <Textarea
            rows={3}
            placeholder="Preferences"
            value={form.preferences}
            onChange={(event) => setForm((prev) => ({ ...prev, preferences: event.target.value }))}
            className="sm:col-span-2 shadow-lg shadow-black/10"
          />
          <Textarea
            rows={3}
            placeholder="Safety notes"
            value={form.safetyNotes}
            onChange={(event) => setForm((prev) => ({ ...prev, safetyNotes: event.target.value }))}
            className="sm:col-span-2 shadow-lg shadow-black/10"
          />
          <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-white/30 bg-white/60 px-3 py-2 text-sm shadow-lg shadow-black/10">
            <input
              type="checkbox"
              checked={form.followUpFlag}
              onChange={(event) => setForm((prev) => ({ ...prev, followUpFlag: event.target.checked }))}
            />
            Flag follow-up for this resident
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || !canEdit} className="shadow-lg shadow-actifyBlue/25">
            {mode === "create" ? "Create Resident" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
