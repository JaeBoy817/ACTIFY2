"use client";

import { useEffect, useMemo, useState } from "react";
import { Library, PlusCircle, Search, Settings2, Sparkles } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { residentCouncilCategoryOptions } from "@/lib/resident-council/service";
import type { ResidentCouncilTopicTemplate } from "@/lib/resident-council/types";

type ActionFn = (formData: FormData) => Promise<void>;

const DEFAULT_KEY = "actify:resident-council:defaults:v1";

type TemplateDefaults = {
  enabledDepartments: string[];
  standingItems: string[];
  carryForwardUnresolved: boolean;
  carryForwardOldBusiness: boolean;
};

const initialDefaults: TemplateDefaults = {
  enabledDepartments: [...residentCouncilCategoryOptions],
  standingItems: ["Call lights", "Outings", "Menu requests", "Housekeeping staffing"],
  carryForwardUnresolved: true,
  carryForwardOldBusiness: true
};

function loadDefaults(): TemplateDefaults {
  if (typeof window === "undefined") return initialDefaults;
  try {
    const raw = window.localStorage.getItem(DEFAULT_KEY);
    if (!raw) return initialDefaults;
    const parsed = JSON.parse(raw) as TemplateDefaults;
    return {
      enabledDepartments: Array.isArray(parsed.enabledDepartments) ? parsed.enabledDepartments : initialDefaults.enabledDepartments,
      standingItems: Array.isArray(parsed.standingItems) ? parsed.standingItems : initialDefaults.standingItems,
      carryForwardUnresolved: Boolean(parsed.carryForwardUnresolved),
      carryForwardOldBusiness: Boolean(parsed.carryForwardOldBusiness)
    };
  } catch {
    return initialDefaults;
  }
}

export function TemplateSettingsPanel({
  templates,
  meetings,
  canEdit,
  onApplyTemplate,
  onCreateTopicFromLibrary
}: {
  templates: ResidentCouncilTopicTemplate[];
  meetings: Array<{ id: string; heldAt: string; title: string }>;
  canEdit: boolean;
  onApplyTemplate: ActionFn;
  onCreateTopicFromLibrary: ActionFn;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [targetMeetingId, setTargetMeetingId] = useState<string>(meetings[0]?.id ?? "");
  const [defaults, setDefaults] = useState<TemplateDefaults>(initialDefaults);
  const [customTopic, setCustomTopic] = useState("");
  const [customSection, setCustomSection] = useState<"OLD" | "NEW">("NEW");
  const [customCategory, setCustomCategory] = useState<string>("Other");

  useEffect(() => {
    setDefaults(loadDefaults());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DEFAULT_KEY, JSON.stringify(defaults));
  }, [defaults]);

  const filteredTemplates = useMemo(() => {
    const token = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (category !== "ALL" && template.category !== category) return false;
      if (!token) return true;
      return `${template.title} ${template.prompt} ${template.category}`.toLowerCase().includes(token);
    });
  }, [category, search, templates]);

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => +new Date(b.heldAt) - +new Date(a.heldAt));
  }, [meetings]);

  function toggleDepartment(value: string) {
    setDefaults((current) => {
      if (current.enabledDepartments.includes(value)) {
        return { ...current, enabledDepartments: current.enabledDepartments.filter((item) => item !== value) };
      }
      return { ...current, enabledDepartments: [...current.enabledDepartments, value] };
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-4 rounded-2xl border border-white/30 bg-white/55 p-4 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Library className="h-4 w-4 text-actifyBlue" />
              Topics Library
            </p>
            <p className="text-xs text-foreground/65">Reusable prompts that can be inserted into active meetings.</p>
          </div>
          <Badge variant="outline" className="bg-white/70">
            {filteredTemplates.length}
          </Badge>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_190px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search template title or prompt"
              className="bg-white/80 pl-8 shadow-md shadow-black/10"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
          >
            <option value="ALL">All categories</option>
            {residentCouncilCategoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-foreground/70">Target meeting</span>
          <select
            value={targetMeetingId}
            onChange={(event) => setTargetMeetingId(event.target.value)}
            className="h-10 w-full rounded-xl border border-white/35 bg-white/80 px-3 text-sm shadow-md shadow-black/10"
            disabled={!canEdit || sortedMeetings.length === 0}
          >
            {sortedMeetings.length === 0 ? <option value="">No meetings available</option> : null}
            {sortedMeetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {new Date(meeting.heldAt).toLocaleString()} — {meeting.title}
              </option>
            ))}
          </select>
        </label>

        <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
          {filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/35 bg-white/65 px-3 py-8 text-center text-sm text-foreground/70">
              No templates match this filter.
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <article key={template.id} className="rounded-xl border border-white/35 bg-white/75 p-3 shadow-md shadow-black/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{template.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="bg-white/80 text-[10px]">
                        {template.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.section === "OLD" ? "Old Business" : "New Business"}
                      </Badge>
                    </div>
                  </div>
                  {canEdit ? (
                    <form action={onApplyTemplate}>
                      <input type="hidden" name="meetingId" value={targetMeetingId} />
                      <input type="hidden" name="templateId" value={template.id} />
                      <GlassButton size="sm" disabled={!targetMeetingId}>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Add
                      </GlassButton>
                    </form>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-foreground/74">{template.prompt}</p>
              </article>
            ))
          )}
        </div>

        {canEdit ? (
          <form
            action={async (formData: FormData) => {
              await onCreateTopicFromLibrary(formData);
              setCustomTopic("");
            }}
            className="rounded-xl border border-white/35 bg-white/70 p-3"
          >
            <input type="hidden" name="meetingId" value={targetMeetingId} />
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <PlusCircle className="h-4 w-4 text-actifyBlue" />
              Quick Add Custom Topic
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="text-xs">
                Category
                <select
                  name="category"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-white/35 bg-white/90 px-2 text-xs"
                >
                  {residentCouncilCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Section
                <select
                  name="section"
                  value={customSection}
                  onChange={(event) => setCustomSection(event.target.value as "OLD" | "NEW")}
                  className="mt-1 h-8 w-full rounded-lg border border-white/35 bg-white/90 px-2 text-xs"
                >
                  <option value="OLD">Old Business</option>
                  <option value="NEW">New Business</option>
                </select>
              </label>
            </div>
            <label className="mt-2 block text-xs">
              Topic text
              <Textarea
                name="text"
                rows={2}
                required
                value={customTopic}
                onChange={(event) => setCustomTopic(event.target.value)}
                className="mt-1 bg-white/90 text-xs"
                placeholder="Add a concise topic prompt."
              />
            </label>
            <div className="mt-2 flex justify-end">
              <GlassButton size="sm" disabled={!targetMeetingId || !customTopic.trim()}>
                Add to meeting
              </GlassButton>
            </div>
          </form>
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/30 bg-white/55 p-4 shadow-lg shadow-black/10">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Settings2 className="h-4 w-4 text-actifyBlue" />
            Templates / Defaults
          </p>
          <p className="text-xs text-foreground/65">
            Local defaults for department sections and carry-forward behavior. Existing data remains unchanged.
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-white/35 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Enabled departments</p>
          <div className="grid gap-1.5 md:grid-cols-2">
            {residentCouncilCategoryOptions.map((department) => (
              <label
                key={department}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/80 px-2 py-1.5 text-xs text-foreground/75"
              >
                <input
                  type="checkbox"
                  checked={defaults.enabledDepartments.includes(department)}
                  onChange={() => toggleDepartment(department)}
                  className="h-4 w-4"
                />
                {department}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-white/35 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Standing items</p>
          {defaults.standingItems.map((item, index) => (
            <Input
              key={index}
              value={item}
              onChange={(event) =>
                setDefaults((current) => ({
                  ...current,
                  standingItems: current.standingItems.map((entry, idx) => (idx === index ? event.target.value : entry))
                }))
              }
              className="bg-white/90 shadow-sm"
            />
          ))}
        </div>

        <div className="space-y-2 rounded-xl border border-white/35 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Carry-forward rules</p>
          <label className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/80 px-2 py-1.5 text-xs text-foreground/75">
            <input
              type="checkbox"
              checked={defaults.carryForwardUnresolved}
              onChange={(event) =>
                setDefaults((current) => ({ ...current, carryForwardUnresolved: event.target.checked }))
              }
              className="h-4 w-4"
            />
            Auto-carry unresolved action items
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/80 px-2 py-1.5 text-xs text-foreground/75">
            <input
              type="checkbox"
              checked={defaults.carryForwardOldBusiness}
              onChange={(event) =>
                setDefaults((current) => ({ ...current, carryForwardOldBusiness: event.target.checked }))
              }
              className="h-4 w-4"
            />
            Auto-carry ongoing old business
          </label>
        </div>
      </div>
    </section>
  );
}
