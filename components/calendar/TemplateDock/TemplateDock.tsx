"use client";

import { useDeferredValue, useMemo, useRef, useState, type DragEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Filter, GripVertical, Layers, Search, Star, StarOff } from "lucide-react";
import Link from "next/link";

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

type DockTab = "templates" | "filters";

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

  const [activeTab, setActiveTab] = useState<DockTab>("templates");
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
    estimateSize: () => 104,
    overscan: 10
  });

  if (!open) return null;

  return (
    <aside className="hidden rounded-2xl border border-white/20 bg-white/45 p-3 shadow-lg shadow-black/10 lg:block">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-actifyBlue" />
        <h2 className="text-sm font-semibold text-foreground">Template Dock</h2>
        <Badge variant="outline" className="bg-white/75">
          {filteredTemplates.length}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" size="sm" variant={activeTab === "templates" ? "default" : "outline"} onClick={() => setActiveTab("templates")}>
          Templates
        </Button>
        <Button type="button" size="sm" variant={activeTab === "filters" ? "default" : "outline"} onClick={() => setActiveTab("filters")}>
          Filters
        </Button>
      </div>

      {activeTab === "templates" ? (
        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search templates"
              className="bg-white/80 pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant={selectedCategory === "ALL" ? "default" : "outline"} onClick={() => onSelectCategory("ALL")}>
              All
            </Button>
            {templateCategories.map((category) => (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => onSelectCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <div ref={scrollRef} className="max-h-[62vh] overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/40 bg-white/55 px-3 py-4 text-xs text-foreground/65">
                No templates found. Try another keyword.
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
                        className="rounded-xl border border-white/35 bg-white/82 p-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{template.title}</p>
                            <p className="text-xs text-foreground/65">
                              {template.category} · {template.difficulty}
                            </p>
                          </div>
                          <GripVertical className="h-4 w-4 text-foreground/55" />
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <Button type="button" size="sm" variant="outline" onClick={() => onScheduleTemplate(template.id)}>
                            Schedule
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => onToggleFavorite(template.id)}
                            aria-label={isFavorite ? "Remove favorite" : "Mark favorite"}
                          >
                            {isFavorite ? <Star className="h-4 w-4 text-amber-500" /> : <StarOff className="h-4 w-4 text-foreground/60" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Button asChild type="button" variant="outline" size="sm" className="w-full">
            <Link href="/app/templates">Manage Templates</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/70">
              <Filter className="h-3.5 w-3.5" />
              Location
            </span>
            <select
              value={locationFilter}
              onChange={(event) => onLocationFilterChange(event.target.value)}
              className="h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
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
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {templateCategories.map((category) => {
                const active = categoryFilters.includes(category);
                return (
                  <Button
                    key={`event-filter-${category}`}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => onToggleEventCategoryFilter(category)}
                  >
                    {category}
                  </Button>
                );
              })}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-white/70 px-3 py-2 text-sm">
            <input type="checkbox" checked={showOnlyMine} onChange={(event) => onShowOnlyMineChange(event.target.checked)} />
            Show only my events
          </label>

          <Button type="button" variant="outline" onClick={onResetFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </aside>
  );
}
