"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileDown, FileText } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type PdfView = "daily" | "weekly" | "monthly";
type PdfAudience = "internal" | "resident";

function buildPdfHref(params: {
  view: PdfView;
  audience: PdfAudience;
  dateKey: string;
  weekStartKey: string;
  monthKey: string;
  preview: boolean;
}) {
  const base = "/app/calendar/pdf";
  const search = new URLSearchParams();
  const effectiveView = params.audience === "resident" ? "monthly" : params.view;
  search.set("view", effectiveView);

  if (effectiveView === "daily") search.set("date", params.dateKey);
  if (effectiveView === "weekly") search.set("weekStart", params.weekStartKey);
  if (effectiveView === "monthly") search.set("month", params.monthKey);
  if (params.audience === "resident") search.set("audience", "resident");
  if (params.preview) search.set("preview", "1");

  return `${base}?${search.toString()}`;
}

export function CalendarPdfPreviewDialog({
  dateKey,
  weekStartKey,
  monthKey,
  defaultView = "weekly"
}: {
  dateKey: string;
  weekStartKey: string;
  monthKey: string;
  defaultView?: PdfView;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PdfView>(defaultView);
  const [audience, setAudience] = useState<PdfAudience>("internal");

  const previewHref = useMemo(
    () =>
      buildPdfHref({
        view,
        audience,
        dateKey,
        weekStartKey,
        monthKey,
        preview: true
      }),
    [audience, dateKey, monthKey, view, weekStartKey]
  );

  const downloadHref = useMemo(
    () =>
      buildPdfHref({
        view,
        audience,
        dateKey,
        weekStartKey,
        monthKey,
        preview: false
      }),
    [audience, dateKey, monthKey, view, weekStartKey]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GlassButton size="sm" variant="dense">
          <FileText className="mr-1.5 h-4 w-4" />
          Preview PDF
        </GlassButton>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden border-white/60 bg-white/95 p-0 backdrop-blur">
        <DialogHeader className="border-b border-white/60 bg-white/90 px-5 py-4">
          <DialogTitle>Calendar PDF Preview</DialogTitle>
          <DialogDescription>
            Preview the same PDF bytes used for download. Use Resident-Facing for the redesigned monthly handout layout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/60 bg-white/85 px-5 py-3">
          <label className="text-xs uppercase tracking-wide text-foreground/65">
            Format
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value as PdfAudience)}
              className="ml-2 h-9 rounded-md border border-white/70 bg-white/90 px-3 text-sm"
              aria-label="Select PDF audience"
            >
              <option value="internal">Internal PDF</option>
              <option value="resident">Resident-Facing Monthly</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-wide text-foreground/65">
            View
            <select
              value={view}
              onChange={(event) => setView(event.target.value as PdfView)}
              disabled={audience === "resident"}
              className="ml-2 h-9 rounded-md border border-white/70 bg-white/90 px-3 text-sm"
              aria-label="Select PDF view"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <p className="text-xs text-foreground/65">
            Daily: {dateKey} · Weekly: {weekStartKey} · Monthly: {monthKey}
          </p>
          {audience === "resident" ? (
            <p className="text-xs font-medium text-rose-600">Resident format exports the redesigned monthly landscape calendar.</p>
          ) : null}
        </div>

        <div className="h-[68vh] bg-white">
          <iframe
            src={previewHref}
            title="Calendar PDF Preview"
            className="h-full w-full"
          />
        </div>

        <DialogFooter className="border-t border-white/60 bg-white/90 px-5 py-3">
          <GlassButton asChild size="sm" variant="dense">
            <a href={downloadHref}>
              <FileDown className="mr-1.5 h-4 w-4" />
              Download PDF
            </a>
          </GlassButton>
          <GlassButton asChild size="sm" variant="dense">
            <a href={previewHref} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open in new tab
            </a>
          </GlassButton>
          <GlassButton type="button" size="sm" onClick={() => setOpen(false)}>
            Close
          </GlassButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
