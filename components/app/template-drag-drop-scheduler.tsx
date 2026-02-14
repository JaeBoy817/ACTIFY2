"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TemplateLite = {
  id: string;
  title: string;
  category: string;
};

type CalendarDropDay = {
  dateKey: string;
  dayName: string;
  dayNumber: string;
  detailHref?: string;
  outsideMonth: boolean;
  today: boolean;
  activityCount: number;
  previewItems: string[];
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

export function TemplateDragDropScheduler({
  templates,
  days,
  scheduleFromTemplateAction
}: TemplateDragDropSchedulerProps) {
  const templateById = useMemo(
    () =>
      new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const [draggingTemplateId, setDraggingTemplateId] = useState<string | null>(null);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("Activity Room");
  const [templateSearch, setTemplateSearch] = useState("");

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

    setPendingDrop({
      templateId: droppedTemplateId,
      dateKey: day.dateKey
    });
    setStartTime("10:00");
    setEndTime("11:00");
    setLocation("Activity Room");
    setHoveredDateKey(null);
    setOpen(true);
  }

  const startAt = pendingDrop ? `${pendingDrop.dateKey}T${startTime}` : "";
  const endAt = pendingDrop ? `${pendingDrop.dateKey}T${endTime}` : "";

  return (
    <section className="space-y-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Month View + Drag & Drop Templates</h2>
          <p className="text-sm text-foreground/70">
            Use this as your main month calendar. Drag a template onto any day, then open day details when needed.
          </p>
        </div>
        <Badge variant="outline">
          {filteredTemplates.length} of {templates.length} templates
        </Badge>
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
            className={cn(
              "cursor-grab rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-left text-sm transition active:cursor-grabbing",
              draggingTemplateId === template.id && "opacity-65"
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
            {days.map((day) => (
              <div
                key={day.dateKey}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHoveredDateKey(day.dateKey);
                }}
                onDragLeave={() => setHoveredDateKey((current) => (current === day.dateKey ? null : current))}
                onDrop={(event) => handleDrop(day, event)}
                className={cn(
                  "min-h-[128px] rounded-lg border border-white/70 bg-white/75 p-2 transition",
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
                <div className="mt-2 space-y-1">
                  {day.previewItems.slice(0, 2).map((item) => (
                    <p key={item} className="truncate rounded bg-muted/40 px-2 py-1 text-xs text-foreground/80">
                      {item}
                    </p>
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
    </section>
  );
}
