"use client";

import { useDeferredValue, useMemo } from "react";
import { Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CalendarTemplateLite } from "@/components/calendar/types";

type TemplatesTabProps = {
  templates: CalendarTemplateLite[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onScheduleTemplate: (templateId: string) => void;
};

export function TemplatesTab({ templates, searchValue, onSearchChange, onScheduleTemplate }: TemplatesTabProps) {
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
  const filtered = useMemo(
    () =>
      templates
        .filter((template) => {
          if (!deferredSearch) return true;
          return `${template.title} ${template.category} ${template.difficulty}`.toLowerCase().includes(deferredSearch);
        })
        .slice(0, 40),
    [deferredSearch, templates]
  );

  return (
    <section className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/70" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search saved patterns"
          className="border-cyan-300/25 bg-slate-900/80 pl-9 text-slate-100 placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cyan-300/25 bg-slate-900/55 px-3 py-4 text-sm text-slate-300">
            No saved patterns found.
          </p>
        ) : (
          filtered.map((template) => (
            <div key={template.id} className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-3">
              <p className="text-sm font-semibold text-slate-100">{template.title}</p>
              <p className="text-xs text-slate-300/85">
                {template.category} · {template.difficulty}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2 bg-gradient-to-r from-cyan-500/85 to-indigo-500/85 text-white"
                onClick={() => onScheduleTemplate(template.id)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Schedule
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
