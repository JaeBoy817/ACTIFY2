"use client";

import { useMemo, useState } from "react";
import { LayoutTemplate, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { NoteBuilderType, NoteTemplateLite } from "@/lib/notes/types";

function getTemplateType(template: NoteTemplateLite): NoteBuilderType {
  return template.tags.includes("type:1on1") ? "1on1" : "general";
}

export function TemplateDrawer({
  templates,
  currentType,
  onApply
}: {
  templates: NoteTemplateLite[];
  currentType: NoteBuilderType;
  onApply: (template: NoteTemplateLite) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (getTemplateType(template) !== currentType) return false;
      if (!query) return true;
      const text = `${template.title} ${template.category ?? ""} ${template.tags.join(" ")}`.toLowerCase();
      return text.includes(query);
    });
  }, [currentType, search, templates]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="bg-white/85">
          <LayoutTemplate className="mr-1.5 h-4 w-4" />
          Apply Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-2xl border-white/25 bg-white/90 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-[var(--font-display)] text-2xl">Notes Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates"
              className="pl-9"
            />
          </div>

          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/35 bg-white/70 p-4 text-sm text-muted-foreground">
                No templates found for this note type.
              </p>
            ) : (
              filtered.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onApply(template);
                    setOpen(false);
                  }}
                  className="w-full rounded-xl border border-white/30 bg-white/75 p-3 text-left transition hover:bg-white"
                >
                  <p className="font-semibold text-foreground">{template.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{template.category ?? "Progress Note"}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{template.narrativeStarter || "No narrative starter"}</p>
                  {template.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {template.tags.filter((tag) => !tag.startsWith("type:")).slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-pink-300 bg-pink-100 px-2 py-0.5 text-[11px] text-pink-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
