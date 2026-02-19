"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Copy, Edit3, Heart, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ActivityTemplatePayload, NoteTemplatePayload, UnifiedTemplate } from "@/lib/templates/types";

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function toDateTimeLocal(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function TemplateDetailsPanel({
  template,
  canEdit,
  onUseActivityTemplate,
  onUseNoteTemplate,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onToggleFavorite
}: {
  template: UnifiedTemplate | null;
  canEdit: boolean;
  onUseActivityTemplate: (params: { templateId: string; startAt: string; endAt: string; location: string }) => Promise<void>;
  onUseNoteTemplate: (templateId: string) => void;
  onEdit: (template: UnifiedTemplate) => void;
  onDuplicate: (templateId: string) => void;
  onArchive: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onToggleFavorite: (templateId: string) => void;
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("Activity Room");
  const [isUsing, setIsUsing] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    setStartAt(toDateTimeLocal(now));
    setEndAt(toDateTimeLocal(end));
  }, [template?.id]);

  const activityPayload = template?.type === "activity" ? (template.payload as ActivityTemplatePayload) : null;
  const notePayload = template?.type === "note" ? (template.payload as NoteTemplatePayload) : null;

  const sections = useMemo(() => {
    if (!template) return [];

    if (template.type === "activity" && activityPayload) {
      return [
        {
          key: "overview",
          title: "Overview",
          content: (
            <div className="grid gap-2 text-sm text-foreground/80 sm:grid-cols-2">
              <p>Difficulty: <strong>{activityPayload.difficulty}</strong></p>
              <p>Duration: <strong>{activityPayload.estimatedMinutes ? `${activityPayload.estimatedMinutes} min` : "Not set"}</strong></p>
              <p className="sm:col-span-2">Category: <strong>{template.category ?? "General"}</strong></p>
            </div>
          )
        },
        {
          key: "supplies",
          title: "Supplies",
          content: (
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
              {activityPayload.supplies.length > 0 ? (
                activityPayload.supplies.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>No supplies listed.</li>
              )}
            </ul>
          )
        },
        {
          key: "setup",
          title: "Setup Steps",
          content: (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/80">
              {activityPayload.setupSteps.length > 0 ? (
                activityPayload.setupSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)
              ) : (
                <li>No setup steps yet.</li>
              )}
            </ol>
          )
        },
        {
          key: "checklist",
          title: "Checklist",
          content: (
            <ul className="space-y-1 text-sm text-foreground/80">
              {activityPayload.checklistItems.length > 0 ? (
                activityPayload.checklistItems.map((item, index) => (
                  <li key={`${index}-${item}`} className="rounded-md border border-white/25 bg-white/50 px-2 py-1">
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No checklist items.</li>
              )}
            </ul>
          )
        },
        {
          key: "adaptations",
          title: "Adaptations",
          content: (
            <ul className="space-y-1 text-sm text-foreground/80">
              <li><strong>Bed-bound:</strong> {activityPayload.adaptations.bedBound || "Not set"}</li>
              <li><strong>Dementia:</strong> {activityPayload.adaptations.dementia || "Not set"}</li>
              <li><strong>Low vision:</strong> {activityPayload.adaptations.lowVision || "Not set"}</li>
              <li><strong>1:1 mini:</strong> {activityPayload.adaptations.oneToOne || "Not set"}</li>
            </ul>
          )
        }
      ];
    }

    if (template.type === "note" && notePayload) {
      return [
        {
          key: "overview",
          title: "Enabled Fields",
          content: (
            <div className="flex flex-wrap gap-1.5 text-sm">
              {Object.entries(notePayload.fieldsEnabled).map(([key, enabled]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className={enabled ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-50 text-slate-500"}
                >
                  {key}
                </Badge>
              ))}
            </div>
          )
        },
        {
          key: "text",
          title: "Default Text Blocks",
          content: (
            <div className="space-y-2 text-sm text-foreground/80">
              <div className="rounded-md border border-white/25 bg-white/55 p-2">
                <p className="text-xs font-semibold uppercase text-foreground/55">Opening</p>
                <p>{notePayload.defaultTextBlocks.opening || "No opening text."}</p>
              </div>
              <div className="rounded-md border border-white/25 bg-white/55 p-2">
                <p className="text-xs font-semibold uppercase text-foreground/55">Body</p>
                <p>{notePayload.defaultTextBlocks.body || "No body text."}</p>
              </div>
              <div className="rounded-md border border-white/25 bg-white/55 p-2">
                <p className="text-xs font-semibold uppercase text-foreground/55">Follow-up</p>
                <p>{notePayload.defaultTextBlocks.followUp || "No follow-up text."}</p>
              </div>
            </div>
          )
        },
        {
          key: "phrases",
          title: "Quick Phrases",
          content: (
            <div className="flex flex-wrap gap-1.5">
              {notePayload.quickPhrases.length > 0 ? (
                notePayload.quickPhrases.map((phrase) => (
                  <Badge key={phrase} variant="outline" className="border-white/35 bg-white/60 text-xs">
                    {phrase}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No quick phrases set.</p>
              )}
            </div>
          )
        }
      ];
    }

    return [];
  }, [activityPayload, notePayload, template]);

  async function handleUseActivityTemplate() {
    if (!template || template.type !== "activity") return;
    setIsUsing(true);
    try {
      await onUseActivityTemplate({
        templateId: template.id,
        startAt,
        endAt,
        location
      });
      setScheduleOpen(false);
    } finally {
      setIsUsing(false);
    }
  }

  if (!template) {
    return (
      <section className="glass-panel rounded-2xl border-white/15 p-6 text-center">
        <h3 className="font-[var(--font-display)] text-xl text-foreground">Template Preview</h3>
        <p className="mt-2 text-sm text-muted-foreground">Select a template from the library to preview details.</p>
      </section>
    );
  }

  return (
    <>
      <section className="glass-panel rounded-2xl border-white/15 p-4">
        <div className="border-b border-white/25 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-[var(--font-display)] text-2xl text-foreground">{template.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {(template.category?.trim() || "Uncategorized")} • Updated {formatDate(template.updatedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(template.id)}
              className="rounded-lg border border-white/35 bg-white/70 p-2 text-foreground/80 transition hover:text-foreground"
              aria-label={template.isFavorite ? "Remove favorite" : "Favorite template"}
            >
              <Heart className={`h-4 w-4 ${template.isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                if (template.type === "activity") {
                  setScheduleOpen(true);
                } else if (template.type === "note") {
                  onUseNoteTemplate(template.id);
                }
              }}
              className="shadow-lg shadow-black/10"
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              Use
            </Button>
            <Button type="button" variant="outline" onClick={() => onEdit(template)} className="bg-white/75" disabled={!canEdit}>
              <Edit3 className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
            <Button type="button" variant="outline" onClick={() => onDuplicate(template.id)} className="bg-white/75" disabled={!canEdit}>
              <Copy className="mr-1.5 h-4 w-4" />
              Duplicate
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-white/35 bg-white/60">
              {template.type.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="border-white/35 bg-white/60">
              Used {template.usageCount}
            </Badge>
            {template.status === "archived" ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                Archived
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 pt-3">
          {sections.map((section, index) => (
            <details key={section.key} open={index === 0} className="rounded-lg border border-white/25 bg-white/55">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-foreground">{section.title}</summary>
              <div className="border-t border-white/20 px-3 py-3">{section.content}</div>
            </details>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/20 pt-3">
          <Button type="button" variant="outline" onClick={() => onArchive(template.id)} className="bg-white/75" disabled={!canEdit}>
            {template.status === "archived" ? "Unarchive" : "Archive"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onDelete(template.id)}
            className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            disabled={!canEdit}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </section>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Activity Template</DialogTitle>
            <DialogDescription>Create a scheduled activity from this template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm">
              Start
              <Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              End
              <Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              Location
              <Input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1" />
            </label>
            <Button type="button" onClick={handleUseActivityTemplate} disabled={isUsing || !canEdit} className="w-full">
              {isUsing ? "Creating..." : "Create Activity"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
