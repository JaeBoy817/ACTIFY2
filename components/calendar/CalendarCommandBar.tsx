"use client";

import { ChevronLeft, ChevronRight, Layers, Plus, Search, Settings2, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CalendarViewMode } from "@/components/calendar/types";

type CalendarCommandBarProps = {
  rangeLabel: string;
  viewMode: CalendarViewMode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onViewChange: (view: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenQuickAdd: () => void;
  onOpenTemplates: () => void;
  onOpenFilters: () => void;
  onOpenSettings: () => void;
};

export function CalendarCommandBar(props: CalendarCommandBarProps) {
  const {
    rangeLabel,
    viewMode,
    searchValue,
    onSearchChange,
    onViewChange,
    onPrev,
    onNext,
    onToday,
    onOpenQuickAdd,
    onOpenTemplates,
    onOpenFilters,
    onOpenSettings
  } = props;

  return (
    <section className="sticky top-[14px] z-30 rounded-2xl border border-white/35 bg-white/55 p-3 shadow-xl shadow-black/10 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={onPrev} aria-label="Previous range">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={onNext} aria-label="Next range">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="bg-white/80 px-3 py-1 text-sm font-semibold">
            {rangeLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/35 bg-white/65 p-1">
          {(["month", "week", "day", "agenda"] as CalendarViewMode[]).map((view) => (
            <Button
              key={view}
              type="button"
              size="sm"
              variant={viewMode === view ? "default" : "ghost"}
              className={cn("capitalize", viewMode === view && "shadow-lg shadow-actifyBlue/30")}
              onClick={() => onViewChange(view)}
              aria-label={`Switch to ${view} view`}
            >
              {view}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[220px] max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search events and templates"
              className="bg-white/80 pl-9"
              aria-label="Search calendar and templates"
            />
          </div>
          <Button type="button" variant="outline" onClick={onOpenFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button type="button" variant="outline" onClick={onOpenTemplates}>
            <Layers className="h-4 w-4" />
            Templates
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={onOpenSettings} aria-label="Calendar settings">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button type="button" onClick={onOpenQuickAdd} className="shadow-lg shadow-actifyBlue/35">
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>
    </section>
  );
}
