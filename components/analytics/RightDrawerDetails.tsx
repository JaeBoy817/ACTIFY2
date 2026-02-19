"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type DrawerDetailItem = {
  label: string;
  value: string;
};

export function RightDrawerDetails({
  open,
  onOpenChange,
  title,
  subtitle,
  items
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  title: string;
  subtitle?: string;
  items: DrawerDetailItem[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 h-[100dvh] w-full max-w-lg translate-x-0 translate-y-0 rounded-none border-l border-white/25 bg-white/95 p-0 backdrop-blur-md">
        <DialogHeader className="border-b border-white/35 px-5 py-4 text-left">
          <DialogTitle className="font-[var(--font-display)] text-xl">{title}</DialogTitle>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No details available.</p>
          ) : (
            items.map((item) => (
              <div key={`${item.label}:${item.value}`} className="rounded-xl border border-white/35 bg-white/75 p-3">
                <p className="text-xs uppercase tracking-wide text-foreground/65">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
