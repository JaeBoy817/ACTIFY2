"use client";

import { useMemo, useRef } from "react";
import { Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { TemplateListItem } from "@/components/templates/TemplateListItem";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { UnifiedTemplate } from "@/lib/templates/types";
import { cn } from "@/lib/utils";

export type TemplateSortKey = "recent" | "used" | "az";
export type TemplateStatusFilter = "all" | "active" | "archived";

export function TemplateLibraryPanel({
  templates,
  selectedId,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  tagFilter,
  onTagFilterChange,
  sortBy,
  onSortChange,
  onSelectTemplate,
  onToggleFavorite,
  onDuplicate,
  onArchive,
  onDelete
}: {
  templates: UnifiedTemplate[];
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TemplateStatusFilter;
  onStatusFilterChange: (value: TemplateStatusFilter) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  sortBy: TemplateSortKey;
  onSortChange: (value: TemplateSortKey) => void;
  onSelectTemplate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(templates.map((template) => template.category?.trim()).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const tagOptions = useMemo(() => {
    return Array.from(new Set(templates.flatMap((template) => template.tags))).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: templates.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 96,
    overscan: 10
  });

  return (
    <section className="glass-panel rounded-2xl border-white/15 p-3">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-[var(--font-display)] text-lg text-foreground">Template Library</h2>
          <Badge variant="outline" className="border-white/40 bg-white/70">
            {templates.length} shown
          </Badge>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search templates"
            className="pl-9"
            aria-label="Search templates"
          />
        </label>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "active", "archived"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onStatusFilterChange(status)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium capitalize transition",
                  statusFilter === status
                    ? "border-transparent bg-[color:var(--actify-accent)] text-white"
                    : "border-white/40 bg-white/65 text-foreground/80 hover:bg-white/85"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-medium text-foreground/70">
              Category
              <select
                value={categoryFilter}
                onChange={(event) => onCategoryFilterChange(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-white/35 bg-white/70 px-2 text-xs"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-foreground/70">
              Tags
              <select
                value={tagFilter}
                onChange={(event) => onTagFilterChange(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-white/35 bg-white/70 px-2 text-xs"
              >
                <option value="all">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-foreground/70">
              Sort
              <select
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value as TemplateSortKey)}
                className="mt-1 h-9 w-full rounded-md border border-white/35 bg-white/70 px-2 text-xs"
              >
                <option value="recent">Recently Edited</option>
                <option value="used">Most Used</option>
                <option value="az">A–Z</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="mt-3 h-[62vh] min-h-[360px] overflow-auto rounded-xl border border-white/20 bg-white/30 p-2">
        {templates.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/35 bg-white/45 p-6 text-sm text-muted-foreground">
            No templates matched your filters.
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative"
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const template = templates[virtualRow.index];
              if (!template) return null;
              return (
                <div
                  key={template.id}
                  className="px-1 py-1"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <TemplateListItem
                    template={template}
                    selected={selectedId === template.id}
                    onSelect={() => onSelectTemplate(template.id)}
                    onToggleFavorite={() => onToggleFavorite(template.id)}
                    onDuplicate={() => onDuplicate(template.id)}
                    onArchive={() => onArchive(template.id)}
                    onDelete={() => onDelete(template.id)}
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

