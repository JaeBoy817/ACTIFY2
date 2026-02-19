"use client";

import { MoreHorizontal, Star, StarOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { UnifiedTemplate } from "@/lib/templates/types";

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function TemplateListItem({
  template,
  selected,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  onArchive,
  onDelete
}: {
  template: UnifiedTemplate;
  selected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={cn(
        "group rounded-xl border p-3 transition",
        "border-white/35 bg-white/65 backdrop-blur shadow-sm shadow-black/5",
        selected ? "ring-2 ring-[color:var(--actify-accent)]/45" : "hover:bg-white/80"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className="truncate font-semibold text-foreground">{template.title}</p>
          <p className="mt-1 text-xs text-foreground/70">
            {(template.category?.trim() || "Uncategorized")} • Edited {formatDate(template.updatedAt)}
          </p>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleFavorite}
            className="rounded-md border border-white/35 bg-white/75 p-1.5 text-foreground/70 transition hover:text-foreground"
            aria-label={template.isFavorite ? "Unfavorite template" : "Favorite template"}
          >
            {template.isFavorite ? <Star className="h-4 w-4 fill-current text-amber-500" /> : <StarOff className="h-4 w-4" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-md border border-white/35 bg-white/75 p-1.5 text-foreground/70 transition hover:text-foreground"
                aria-label="Template actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>{template.status === "archived" ? "Unarchive" : "Archive"}</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={onDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="border-white/40 bg-white/70 text-[11px] uppercase tracking-wide">
          {template.type.replace("_", " ")}
        </Badge>
        <Badge variant="outline" className="border-white/40 bg-white/70 text-[11px]">
          Used {template.usageCount}
        </Badge>
        {template.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="border-white/40 bg-white/60 text-[11px]">
            {tag}
          </Badge>
        ))}
      </div>
    </article>
  );
}

