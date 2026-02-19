"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ListFilter, SlidersHorizontal } from "lucide-react";

import { ResidentListItem } from "@/components/residents/ResidentListItem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RESIDENT_FILTER_OPTIONS,
  RESIDENT_SORT_OPTIONS,
  type ResidentFilterKey,
  type ResidentListRow,
  type ResidentSortKey
} from "@/lib/residents/types";

export function ResidentList({
  residents,
  selectedResidentId,
  filter,
  sortBy,
  onSelectResident,
  onFilterChange,
  onSortChange
}: {
  residents: ResidentListRow[];
  selectedResidentId: string | null;
  filter: ResidentFilterKey;
  sortBy: ResidentSortKey;
  onSelectResident: (residentId: string) => void;
  onFilterChange: (value: ResidentFilterKey) => void;
  onSortChange: (value: ResidentSortKey) => void;
}) {
  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: residents.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 104,
    overscan: 6
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <section className="glass-panel rounded-2xl border-white/15 p-4 shadow-xl shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <ListFilter className="h-4 w-4 text-actifyBlue" />
          Residents List
          <Badge variant="outline" className="bg-white/70">
            {residents.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-foreground/70">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Sort
          </span>
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as ResidentSortKey)}>
            <SelectTrigger className="h-9 w-[170px] bg-white/80 shadow-lg shadow-black/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESIDENT_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {RESIDENT_FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={filter === option.value ? "default" : "outline"}
            className={filter === option.value ? "shadow-lg shadow-actifyBlue/25" : "bg-white/70 shadow-lg shadow-black/10"}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div ref={scrollParentRef} className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
        {residents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/40 bg-white/50 p-6 text-center text-sm text-muted-foreground">
            No residents match these filters.
          </div>
        ) : (
          <div
            className="relative"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`
            }}
          >
            {virtualRows.map((virtualRow) => {
              const resident = residents[virtualRow.index];
              if (!resident) return null;
              return (
                <div
                  key={resident.id}
                  className="absolute left-0 top-0 w-full pb-2"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <ResidentListItem
                    resident={resident}
                    selected={resident.id === selectedResidentId}
                    onSelectResident={onSelectResident}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
