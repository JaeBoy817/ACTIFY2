"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileDown, FileText } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type PdfView = "daily" | "weekly" | "monthly";

function buildPdfHref(params: {
  view: PdfView;
  dateKey: string;
  weekStartKey: string;
  monthKey: string;
  preview: boolean;
}) {
  const base = "/app/calendar/pdf";
  const search = new URLSearchParams();
  search.set("view", params.view);

  if (params.view === "daily") search.set("date", params.dateKey);
  if (params.view === "weekly") search.set("weekStart", params.weekStartKey);
  if (params.view === "monthly") search.set("month", params.monthKey);
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

  const previewHref = useMemo(
    () =>
      buildPdfHref({
        view,
        dateKey,
        weekStartKey,
        monthKey,
        preview: true
      }),
    [dateKey, monthKey, view, weekStartKey]
  );

  const downloadHref = useMemo(
    () =>
      buildPdfHref({
        view,
        dateKey,
        weekStartKey,
        monthKey,
        preview: false
      }),
    [dateKey, monthKey, view, weekStartKey]
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
            Preview the same PDF bytes used for download. Switch Daily, Weekly, or Monthly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/60 bg-white/85 px-5 py-3">
          <label className="text-xs uppercase tracking-wide text-foreground/65">
            View
            <select
              value={view}
              onChange={(event) => setView(event.target.value as PdfView)}
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

