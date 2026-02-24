"use client";

import { useDeferredValue, useMemo } from "react";
import { Search } from "lucide-react";
import Link from "next/link";

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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
        <Input value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search templates" className="bg-white/80 pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/35 bg-white/60 px-3 py-4 text-sm text-foreground/65">
            No templates found.
          </p>
        ) : (
          filtered.map((template) => (
            <div key={template.id} className="rounded-xl border border-white/35 bg-white/75 p-3">
              <p className="text-sm font-semibold text-foreground">{template.title}</p>
              <p className="text-xs text-foreground/65">
                {template.category} · {template.difficulty}
              </p>
              <Button type="button" size="sm" className="mt-2" onClick={() => onScheduleTemplate(template.id)}>
                Schedule
              </Button>
            </div>
          ))
        )}
      </div>

      <Button asChild type="button" variant="outline" className="w-full">
        <Link href="/app/templates">Manage templates</Link>
      </Button>
    </section>
  );
}
