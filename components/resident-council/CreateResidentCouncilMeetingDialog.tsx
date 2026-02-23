"use client";

import { useMemo, useState } from "react";
import { CalendarPlus2, Search } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TemplateOption = {
  id: string;
  title: string;
};

type ResidentOption = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
};

export function CreateResidentCouncilMeetingDialog({
  action,
  templates,
  residents
}: {
  action: (formData: FormData) => Promise<void>;
  templates: TemplateOption[];
  residents: ResidentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [residentSearch, setResidentSearch] = useState("");

  const filteredResidents = useMemo(() => {
    const token = residentSearch.trim().toLowerCase();
    if (!token) return residents;
    return residents.filter((resident) => {
      const haystack = `${resident.lastName} ${resident.firstName} ${resident.room}`.toLowerCase();
      return haystack.includes(token);
    });
  }, [residentSearch, residents]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GlassButton type="button">
          <CalendarPlus2 className="mr-1.5 h-4 w-4" />
          New Meeting
        </GlassButton>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/20 bg-[#f7f8fb]/95 backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Resident Council Meeting</DialogTitle>
        </DialogHeader>

        <form
          action={async (formData: FormData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-foreground/70">Date & Time</span>
              <Input
                name="heldAt"
                type="datetime-local"
                defaultValue={toLocalDateTimeValue(new Date())}
                required
                className="bg-white/85 shadow-md shadow-black/10"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-foreground/70">Template</span>
              <select
                name="templateId"
                defaultValue=""
                className="h-10 w-full rounded-xl border border-white/35 bg-white/85 px-3 text-sm shadow-md shadow-black/10"
              >
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-foreground/70">Location</span>
              <Input
                name="location"
                placeholder="Main Lounge"
                className="bg-white/85 shadow-md shadow-black/10"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-foreground/70">Facilitator</span>
              <Input
                name="facilitator"
                placeholder="Activities Director"
                className="bg-white/85 shadow-md shadow-black/10"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-foreground/70">Attendance Count Override</span>
              <Input
                name="attendanceCountOverride"
                type="number"
                min={0}
                placeholder="Optional"
                className="bg-white/85 shadow-md shadow-black/10"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block text-foreground/70">Quick Summary</span>
            <Textarea
              name="summary"
              rows={2}
              placeholder="Resident concerns and main outcomes for this meeting."
              className="bg-white/85 shadow-md shadow-black/10"
            />
          </label>

          <details className="rounded-xl border border-white/30 bg-white/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Add Residents In Attendance (optional)
            </summary>
            <div className="mt-2 space-y-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                <Input
                  value={residentSearch}
                  onChange={(event) => setResidentSearch(event.target.value)}
                  placeholder="Search resident name or room"
                  className="bg-white/85 pl-8 shadow-md shadow-black/10"
                />
              </label>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-white/25 bg-white/60 p-2">
                {filteredResidents.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-foreground/65">No residents match this search.</p>
                ) : (
                  <div className="grid gap-1 sm:grid-cols-2">
                    {filteredResidents.map((resident) => (
                      <label
                        key={resident.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/75 px-2 py-1.5 text-xs"
                      >
                        <input type="checkbox" name="residentsAttendedIds" value={resident.id} className="h-4 w-4" />
                        <span>
                          {resident.lastName}, {resident.firstName}
                          <span className="text-foreground/65"> • Room {resident.room}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-foreground/70">Old Business</span>
              <Textarea
                name="oldBusiness"
                rows={4}
                placeholder="Carryover concerns from prior meetings."
                className="bg-white/85 shadow-md shadow-black/10"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-foreground/70">New Business</span>
              <Textarea
                name="newBusiness"
                rows={4}
                placeholder="New concerns and requests."
                className="bg-white/85 shadow-md shadow-black/10"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block text-foreground/70">Additional Notes</span>
            <Textarea
              name="additionalNotes"
              rows={3}
              placeholder="Optional notes, motion outcomes, or reminders."
              className="bg-white/85 shadow-md shadow-black/10"
            />
          </label>

          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="dense" onClick={() => setOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit">Create Meeting</GlassButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toLocalDateTimeValue(input: Date) {
  const local = new Date(input.getTime() - input.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
