"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

type TemplateLite = {
  id: string;
  title: string;
  category: string;
};

type DayPreviewItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  timeLabel: string;
};

type CalendarDropDay = {
  dateKey: string;
  dayName: string;
  dayNumber: string;
  detailHref?: string;
  outsideMonth: boolean;
  today: boolean;
  activityCount: number;
  previewItems: DayPreviewItem[];
};

interface TemplateDragDropSchedulerProps {
  templates: TemplateLite[];
  days: CalendarDropDay[];
  scheduleFromTemplateAction: (formData: FormData) => void;
}

type PendingDrop = {
  templateId: string;
  dateKey: string;
};

type EditState = {
  dayKey: string;
  activityId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
};

function isoToTime(isoString: string) {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toIso(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00`).toISOString();
}

function formatPreviewTimeLabel(startAtIso: string) {
  return format(new Date(startAtIso), "h:mm a");
}

export function TemplateDragDropScheduler({
  templates,
  days,
  scheduleFromTemplateAction
}: TemplateDragDropSchedulerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const templateById = useMemo(
    () =>
      new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const [calendarDays, setCalendarDays] = useState<CalendarDropDay[]>(days);
  const [draggingTemplateId, setDraggingTemplateId] = useState<string | null>(null);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("Activity Room");
  const [templateSearch, setTemplateSearch] = useState("");
  const [keyboardTemplateId, setKeyboardTemplateId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setCalendarDays(days);
  }, [days]);

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) => {
      const title = template.title.toLowerCase();
      const category = template.category.toLowerCase();
      return title.includes(query) || category.includes(query);
    });
  }, [templateSearch, templates]);

  const selectedTemplate = pendingDrop ? templateById.get(pendingDrop.templateId) : null;
  const selectedDate = pendingDrop ? parseISO(pendingDrop.dateKey) : null;

  function handleTemplateDragStart(templateId: string, event: React.DragEvent<HTMLButtonElement>) {
    setDraggingTemplateId(templateId);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/template-id", templateId);
  }

  function handleTemplateDragEnd() {
    setDraggingTemplateId(null);
    setHoveredDateKey(null);
  }

  function handleDrop(day: CalendarDropDay, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const droppedTemplateId = draggingTemplateId || event.dataTransfer.getData("text/template-id");
    if (!droppedTemplateId || !templateById.has(droppedTemplateId)) return;

    setKeyboardTemplateId(null);
    openTemplateScheduleForDay(droppedTemplateId, day.dateKey);
  }

  function openTemplateScheduleForDay(templateId: string, dateKey: string) {
    setPendingDrop({
      templateId,
      dateKey
    });
    setStartTime("10:00");
    setEndTime("11:00");
    setLocation("Activity Room");
    setHoveredDateKey(null);
    setOpen(true);
  }

  function armTemplateForKeyboard(templateId: string) {
    setKeyboardTemplateId(templateId);
    const template = templateById.get(templateId);
    if (template) {
      toast({
        title: "Template armed",
        description: `Press Enter on a day cell to schedule “${template.title}”.`
      });
    }
  }

  function openEditDialog(dayKey: string, item: DayPreviewItem) {
    setEditState({
      dayKey,
      activityId: item.id,
      title: item.title,
      startTime: isoToTime(item.startAt),
      endTime: isoToTime(item.endAt),
      location: item.location
    });
    setEditOpen(true);
  }

  async function saveInlineEdit() {
    if (!editState) return;

    const startAt = toIso(editState.dayKey, editState.startTime);
    const endAt = toIso(editState.dayKey, editState.endTime);

    if (new Date(endAt) <= new Date(startAt)) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/calendar/activities/${editState.activityId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: editState.title,
          location: editState.location,
          startAt,
          endAt,
          scope: "instance"
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Could not update activity.");
      }

      setCalendarDays((current) =>
        current.map((day) => {
          if (day.dateKey !== editState.dayKey) return day;
          const previewItems = day.previewItems
            .map((item) =>
              item.id === editState.activityId
                ? {
                    ...item,
                    title: editState.title,
                    startAt,
                    endAt,
                    location: editState.location,
                    timeLabel: formatPreviewTimeLabel(startAt)
                  }
                : item
            )
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
          return {
            ...day,
            previewItems
          };
        })
      );

      toast({ title: "Activity updated" });
      setEditOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteInlineActivity(dayKey: string, activityId: string) {
    const response = await fetch(`/api/calendar/activities/${activityId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast({
        title: "Delete failed",
        description: typeof payload?.error === "string" ? payload.error : "Could not delete activity.",
        variant: "destructive"
      });
      return;
    }

    setCalendarDays((current) =>
      current.map((day) =>
        day.dateKey === dayKey
          ? {
              ...day,
              activityCount: Math.max(0, day.activityCount - 1),
              previewItems: day.previewItems.filter((item) => item.id !== activityId)
            }
          : day
      )
    );

    toast({ title: "Activity deleted" });
    router.refresh();
  }

  const startAt = pendingDrop ? `${pendingDrop.dateKey}T${startTime}` : "";
  const endAt = pendingDrop ? `${pendingDrop.dateKey}T${endTime}` : "";

  return (
    <section className="space-y-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Month View + Drag & Drop Templates</h2>
          <p className="text-sm text-foreground/70">
            Drag templates onto days, then edit or remove scheduled activities directly from each day cell.
          </p>
          <p className="mt-1 text-xs text-foreground/60">
            Keyboard: focus a template and press Enter to arm it, then focus a day cell and press Enter to drop.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {keyboardTemplateId ? (
            <Badge className="border border-actifyBlue/35 bg-actifyBlue/10 text-actifyBlue">
              Armed: {templateById.get(keyboardTemplateId)?.title ?? "Template"}
            </Badge>
          ) : null}
          <Badge variant="outline">
            {filteredTemplates.length} of {templates.length} templates
          </Badge>
          {keyboardTemplateId ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setKeyboardTemplateId(null)}>
              Clear armed
            </Button>
          ) : null}
        </div>
      </div>

      <div className="max-w-md">
        <Input
          value={templateSearch}
          onChange={(event) => setTemplateSearch(event.target.value)}
          placeholder="Search templates by title or category"
          aria-label="Search templates"
          className="bg-white/85"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            draggable
            onDragStart={(event) => handleTemplateDragStart(template.id, event)}
            onDragEnd={handleTemplateDragEnd}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                armTemplateForKeyboard(template.id);
              }
            }}
            aria-label={`Template ${template.title}. Press Enter to arm for keyboard drop.`}
            className={cn(
              "cursor-grab rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-left text-sm transition active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actifyBlue/45",
              draggingTemplateId === template.id && "opacity-65",
              keyboardTemplateId === template.id && "border-actifyBlue/45 bg-actifyBlue/10"
            )}
          >
            <p className="font-medium text-foreground">{template.title}</p>
            <p className="text-xs text-foreground/65">{template.category}</p>
          </button>
        ))}
        {filteredTemplates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/70 bg-white/70 px-3 py-2 text-sm text-foreground/65">
            No templates match your search.
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px] space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div key={label} className="rounded-lg border border-white/70 bg-white/75 px-2 py-2 text-center text-xs font-medium text-foreground/75">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => (
              <div
                key={day.dateKey}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHoveredDateKey(day.dateKey);
                }}
                onDragLeave={() => setHoveredDateKey((current) => (current === day.dateKey ? null : current))}
                onDrop={(event) => handleDrop(day, event)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  if ((event.target as HTMLElement).closest("button,a,input,select,textarea")) return;
                  event.preventDefault();
                  if (keyboardTemplateId) {
                    openTemplateScheduleForDay(keyboardTemplateId, day.dateKey);
                    return;
                  }
                  if (day.detailHref) {
                    router.push(day.detailHref);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={
                  keyboardTemplateId
                    ? `Schedule armed template on ${day.dayName} ${day.dayNumber}`
                    : `Open day details for ${day.dayName} ${day.dayNumber}`
                }
                className={cn(
                  "min-h-[150px] rounded-lg border border-white/70 bg-white/75 p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actifyBlue/45",
                  day.outsideMonth && "opacity-55",
                  day.today && "ring-2 ring-actifyBlue/35",
                  hoveredDateKey === day.dateKey && "bg-actifyMint/20 ring-2 ring-actifyMint/40"
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-foreground/65">{day.dayName}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{day.dayNumber}</p>
                    {day.detailHref ? (
                      <Link
                        href={day.detailHref}
                        className="rounded border border-white/70 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground/70 hover:bg-white"
                      >
                        View
                      </Link>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-foreground/70">{day.activityCount} scheduled</p>
                <div className="mt-2 space-y-1.5">
                  {day.previewItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="group rounded border border-white/60 bg-muted/35 px-2 py-1">
                      <p className="truncate text-xs text-foreground/80">{item.timeLabel} {item.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1 opacity-100 sm:pointer-events-none sm:opacity-0 sm:transition sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-white/70 bg-white/85 px-1.5 py-0.5 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actifyBlue/45"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDialog(day.dateKey, item);
                          }}
                          aria-label={`Edit ${item.title}`}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-white/70 bg-white/85 px-1.5 py-0.5 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actifyBlue/45"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteInlineActivity(day.dateKey, item.id);
                          }}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule template</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? `Create "${selectedTemplate.title}" on ${selectedDate ? format(selectedDate, "PPP") : "selected day"}.`
                : "Select a template and day to schedule."}
            </DialogDescription>
          </DialogHeader>
          <form action={scheduleFromTemplateAction} className="space-y-3">
            <input type="hidden" name="templateId" value={pendingDrop?.templateId ?? ""} />
            <input type="hidden" name="startAt" value={startAt} />
            <input type="hidden" name="endAt" value={endAt} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/70">Start time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/70">End time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">Location</label>
              <Input
                name="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <GlassButton
                type="button"
                variant="dense"
                onClick={() => setOpen(false)}
              >
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="warm">
                Save to calendar
              </GlassButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit scheduled activity</DialogTitle>
            <DialogDescription>Update the selected activity directly from month view.</DialogDescription>
          </DialogHeader>
          {editState ? (
            <div className="space-y-3">
              <label className="space-y-1 text-sm">
                Title
                <Input
                  value={editState.title}
                  onChange={(event) => setEditState((current) => (current ? { ...current, title: event.target.value } : null))}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  Start time
                  <Input
                    type="time"
                    value={editState.startTime}
                    onChange={(event) => setEditState((current) => (current ? { ...current, startTime: event.target.value } : null))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  End time
                  <Input
                    type="time"
                    value={editState.endTime}
                    onChange={(event) => setEditState((current) => (current ? { ...current, endTime: event.target.value } : null))}
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm">
                Location
                <Input
                  value={editState.location}
                  onChange={(event) => setEditState((current) => (current ? { ...current, location: event.target.value } : null))}
                />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void saveInlineEdit()} disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
