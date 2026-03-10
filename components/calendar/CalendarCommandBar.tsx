"use client";

import { CalendarPlus2, ChevronLeft, ChevronRight, Library, Search, Settings2, SlidersHorizontal } from "lucide-react";

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
  onOpenLibrary: () => void;
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
    onOpenLibrary,
    onOpenFilters,
    onOpenSettings
  } = props;

  return (
    <section className="sticky top-[14px] z-30 overflow-hidden rounded-3xl border border-cyan-400/25 bg-slate-950/90 p-4 shadow-[0_26px_70px_-40px_rgba(56,189,248,0.75)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.18),transparent_46%),radial-gradient(circle_at_83%_32%,rgba(99,102,241,0.18),transparent_48%)]" />
      <div className="relative grid gap-3 xl:grid-cols-[auto_auto_minmax(280px,1fr)_auto] xl:items-center">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onPrev}
            aria-label="Previous range"
            className="border-cyan-300/30 bg-slate-900/85 text-slate-100 hover:border-cyan-300/55 hover:bg-slate-800/95"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToday}
            className="border-cyan-300/30 bg-slate-900/85 text-slate-100 hover:border-cyan-300/55 hover:bg-slate-800/95"
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onNext}
            aria-label="Next range"
            className="border-cyan-300/30 bg-slate-900/85 text-slate-100 hover:border-cyan-300/55 hover:bg-slate-800/95"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-100">
            {rangeLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-cyan-300/25 bg-slate-900/80 p-1.5">
          {(["month", "week", "day", "agenda"] as CalendarViewMode[]).map((view) => (
            <Button
              key={view}
              type="button"
              size="sm"
              variant={viewMode === view ? "default" : "ghost"}
              className={cn(
                "capitalize text-slate-200 hover:text-white",
                viewMode === view &&
                  "bg-gradient-to-r from-cyan-500/80 to-indigo-500/80 text-white shadow-[0_10px_22px_-15px_rgba(56,189,248,0.9)]"
              )}
              onClick={() => onViewChange(view)}
              aria-label={`Switch to ${view} view`}
            >
              {view}
            </Button>
          ))}
        </div>

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/70" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search activities, locations, and saved patterns"
            className="h-11 border-cyan-300/20 bg-slate-900/80 pl-9 text-slate-100 placeholder:text-slate-400"
            aria-label="Search calendar and saved patterns"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenFilters}
            className="border-cyan-300/25 bg-slate-900/80 text-slate-100 hover:border-cyan-300/55 hover:bg-slate-800/95"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenLibrary}
            className="border-cyan-300/25 bg-slate-900/80 text-slate-100 hover:border-cyan-300/55 hover:bg-slate-800/95"
          >
            <Library className="h-4 w-4" />
            Saved Patterns
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenSettings}
            aria-label="Calendar settings"
            className="border-cyan-300/25 bg-slate-900/80 text-slate-100 hover:border-cyan-300/55 hover:bg-slate-800/95"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onOpenQuickAdd}
            className="bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-[0_16px_34px_-18px_rgba(56,189,248,0.9)] hover:brightness-105"
          >
            <CalendarPlus2 className="h-4 w-4" />
            New Activity
          </Button>
        </div>
      </div>
    </section>
  );
}
