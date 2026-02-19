"use client";

import { useMemo, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Button } from "@/components/ui/button";
import { RightDrawerDetails, type DrawerDetailItem } from "@/components/analytics/RightDrawerDetails";

type DrilldownRow = {
  id: string;
  title: string;
  subtitle?: string;
  metric: string;
  metricLabel?: string;
  details?: DrawerDetailItem[];
};

export function DrilldownListCard({
  title,
  description,
  rows,
  emptyLabel = "No records available."
}: {
  title: string;
  description?: string;
  rows: DrilldownRow[];
  emptyLabel?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<DrilldownRow | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 74,
    overscan: 8
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const drawerItems = useMemo(() => selected?.details ?? [], [selected?.details]);

  return (
    <section className="glass-panel rounded-2xl border-white/20 p-4">
      <div className="mb-3">
        <h3 className="font-[var(--font-display)] text-lg">{title}</h3>
        {description ? <p className="text-xs text-foreground/70">{description}</p> : null}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/35 bg-white/40 p-5 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div ref={parentRef} className="max-h-[420px] overflow-auto rounded-xl border border-white/30 bg-white/50">
          <div className="relative w-full" style={{ height: totalSize }}>
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              return (
                <div
                  key={row.id}
                  className="absolute left-0 top-0 w-full border-b border-white/25 px-3 py-3 last:border-none"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                      {row.subtitle ? <p className="truncate text-xs text-foreground/70">{row.subtitle}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{row.metric}</p>
                        {row.metricLabel ? <p className="text-[11px] text-foreground/65">{row.metricLabel}</p> : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white/70"
                        onClick={() => setSelected(row)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RightDrawerDetails
        open={Boolean(selected)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelected(null);
        }}
        title={selected?.title ?? "Details"}
        subtitle={selected?.subtitle}
        items={drawerItems}
      />
    </section>
  );
}
