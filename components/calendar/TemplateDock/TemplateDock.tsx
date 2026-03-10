"use client";

import { useDeferredValue, useMemo, useRef, useState, type DragEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Filter, GripVertical, Library, Search, Sparkles, Star, StarOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CalendarTemplateLite } from "@/components/calendar/types";

type TemplateDockProps = {
  open: boolean;
  templates: CalendarTemplateLite[];
  searchValue: string;
  selectedCategory: string;
  favoriteTemplateIds: string[];
  locationFilter: string;
  eventLocations: string[];
  categoryFilters: string[];
  showOnlyMine: boolean;
  onSearchChange: (value: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleFavorite: (templateId: string) => void;
  onScheduleTemplate: (templateId: string) => void;
  onDragTemplateStart: (templateId: string, event: DragEvent<HTMLElement>) => void;
  onLocationFilterChange: (location: string) => void;
  onToggleEventCategoryFilter: (category: string) => void;
  onShowOnlyMineChange: (value: boolean) => void;
  onResetFilters: () => void;
};

type DockTab = "library" | "filters";

export function TemplateDock(props: TemplateDockProps) {
  const {
    open,
    templates,
    searchValue,
    selectedCategory,
    favoriteTemplateIds,
    locationFilter,
    eventLocations,
    categoryFilters,
    showOnlyMine,
    onSearchChange,
    onSelectCategory,
    onToggleFavorite,
    onScheduleTemplate,
    onDragTemplateStart,
    onLocationFilterChange,
    onToggleEventCategoryFilter,
    onShowOnlyMineChange,
    onResetFilters
  } = props;

  const [activeTab, setActiveTab] = useState<DockTab>("library");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());

  const templateCategories = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category))).sort((a, b) => a.localeCompare(b)),
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (selectedCategory !== "ALL" && template.category !== selectedCategory) return false;
      if (!deferredSearch) return true;
      return `${template.title} ${template.category} ${template.difficulty}`.toLowerCase().includes(deferredSearch);
    });
  }, [deferredSearch, selectedCategory, templates]);

  const virtualizer = useVirtualizer({
    count: filteredTemplates.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 110,
    overscan: 10
  });

  if (!open) return null;

  return (
    <aside className="hidden rounded-3xl border border-cyan-400/20 bg-slate-950/78 p-4 shadow-[0_24px_70px_-45px_rgba(56,189,248,0.9)] lg:block">
      <div className="flex items-center gap-2">
        <Library className="h-4 w-4 text-cyan-300" />
        <h2 className="text-sm font-semibold text-slate-100">Saved Patterns</h2>
        <Badge variant="outline" className="border-cyan-300/30 bg-cyan-500/10 text-cyan-100">
          {filteredTemplates.length}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "library" ? "default" : "outline"}
          className={activeTab === "library" ? "bg-gradient-to-r from-cyan-500/80 to-indigo-500/80 text-white" : "border-cyan-300/25 bg-slate-900/80 text-slate-200"}
          onClick={() => setActiveTab("library")}
        >
          Library
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "filters" ? "default" : "outline"}
          className={activeTab === "filters" ? "bg-gradient-to-r from-cyan-500/80 to-indigo-500/80 text-white" : "border-cyan-300/25 bg-slate-900/80 text-slate-200"}
          onClick={() => setActiveTab("filters")}
        >
          Filters
        </Button>
      </div>

      {activeTab === "library" ? (
        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/70" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search saved patterns"
              className="border-cyan-300/20 bg-slate-900/85 pl-9 text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={selectedCategory === "ALL" ? "default" : "outline"}
              className={selectedCategory === "ALL" ? "bg-cyan-500/80 text-white" : "border-cyan-300/25 bg-slate-900/75 text-slate-200"}
              onClick={() => onSelectCategory("ALL")}
            >
              All
            </Button>
            {templateCategories.map((category) => (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={selectedCategory === category ? "default" : "outline"}
                className={selectedCategory === category ? "bg-cyan-500/80 text-white" : "border-cyan-300/25 bg-slate-900/75 text-slate-200"}
                onClick={() => onSelectCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <div ref={scrollRef} className="max-h-[62vh] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-cyan-300/25 bg-slate-900/60 px-3 py-4 text-xs text-slate-300">
                No saved patterns found. Try another keyword.
              </p>
            ) : (
              <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const template = filteredTemplates[virtualRow.index];
                  if (!template) return null;
                  const isFavorite = favoriteTemplateIds.includes(template.id);
                  return (
                    <div
                      key={template.id}
                      className="absolute left-0 top-0 w-full pb-2"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <div
                        draggable
                        onDragStart={(event) => onDragTemplateStart(template.id, event)}
                        className="rounded-2xl border border-cyan-300/20 bg-slate-900/86 p-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{template.title}</p>
                            <p className="text-xs text-slate-300/90">
                              {template.category} · {template.difficulty}
                            </p>
                          </div>
                          <GripVertical className="h-4 w-4 text-cyan-200/70" />
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-gradient-to-r from-cyan-500/85 to-indigo-500/85 text-white"
                            onClick={() => onScheduleTemplate(template.id)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Schedule
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => onToggleFavorite(template.id)}
                            aria-label={isFavorite ? "Remove favorite" : "Mark favorite"}
                            className="text-slate-200 hover:bg-cyan-500/15"
                          >
                            {isFavorite ? <Star className="h-4 w-4 text-amber-400" /> : <StarOff className="h-4 w-4 text-slate-400" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
              <Filter className="h-3.5 w-3.5" />
              Location
            </span>
            <select
              value={locationFilter}
              onChange={(event) => onLocationFilterChange(event.target.value)}
              className="h-10 w-full rounded-md border border-cyan-300/20 bg-slate-900/80 px-3 text-sm text-slate-100"
            >
              <option value="ALL">All locations</option>
              {eventLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-300/90">Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {templateCategories.map((category) => {
                const active = categoryFilters.includes(category);
                return (
                  <Button
                    key={`event-filter-${category}`}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={active ? "bg-cyan-500/85 text-white" : "border-cyan-300/25 bg-slate-900/75 text-slate-200"}
                    onClick={() => onToggleEventCategoryFilter(category)}
                  >
                    {category}
                  </Button>
                );
              })}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={showOnlyMine} onChange={(event) => onShowOnlyMineChange(event.target.checked)} />
            Show only my events
          </label>

          <Button type="button" variant="outline" onClick={onResetFilters} className="border-cyan-300/25 bg-slate-900/80 text-slate-100">
            Clear filters
          </Button>
        </div>
      )}
    </aside>
  );
}
