"use client";

import { useMemo, useState } from "react";
import { Sparkles, Search, PlusCircle, Library } from "lucide-react";

import { TopicCard } from "@/components/resident-council/TopicCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { residentCouncilCategoryOptions } from "@/lib/resident-council/service";
import type { ResidentCouncilMeetingDTO, ResidentCouncilSection, ResidentCouncilTopicEntry, ResidentCouncilTopicTemplate } from "@/lib/resident-council/types";

type ActionFn = (formData: FormData) => Promise<void>;

function formatMeetingLabel(meeting: Pick<ResidentCouncilMeetingDTO, "id" | "heldAt">) {
  return `${new Date(meeting.heldAt).toLocaleString()}`;
}

export function TopicTemplatesPanel({
  templates,
  topicEntries,
  meetings,
  selectedMeetingId,
  canEdit,
  onApplyTemplate,
  onCreateTopicFromLibrary
}: {
  templates: ResidentCouncilTopicTemplate[];
  topicEntries: ResidentCouncilTopicEntry[];
  meetings: Array<Pick<ResidentCouncilMeetingDTO, "id" | "heldAt" | "status">>;
  selectedMeetingId: string | null;
  canEdit: boolean;
  onApplyTemplate: ActionFn;
  onCreateTopicFromLibrary: ActionFn;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | (typeof residentCouncilCategoryOptions)[number]>("ALL");
  const [sectionFilter, setSectionFilter] = useState<"ALL" | ResidentCouncilSection>("ALL");
  const [meetingTargetId, setMeetingTargetId] = useState<string>(selectedMeetingId ?? meetings[0]?.id ?? "");

  const filteredTemplates = useMemo(() => {
    const token = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (categoryFilter !== "ALL" && template.category !== categoryFilter) return false;
      if (sectionFilter !== "ALL" && template.section !== sectionFilter) return false;
      if (!token) return true;
      const haystack = [template.title, template.prompt, template.category].join(" ").toLowerCase();
      return haystack.includes(token);
    });
  }, [templates, search, categoryFilter, sectionFilter]);

  const filteredTopics = useMemo(() => {
    if (categoryFilter === "ALL") return topicEntries;
    return topicEntries.filter((topic) => topic.category === categoryFilter);
  }, [topicEntries, categoryFilter]);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
              <Library className="h-4 w-4 text-actifyBlue" />
              Topics Library
            </p>
            <p className="text-xs text-foreground/65">Reusable prompts for common council concerns.</p>
          </div>
          <Badge variant="outline" className="bg-white/80">
            {filteredTemplates.length} templates
          </Badge>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_140px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search template title or prompt"
              className="bg-white/80 pl-8 shadow-lg shadow-black/10"
            />
          </label>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as "ALL" | (typeof residentCouncilCategoryOptions)[number])}
            className="h-10 rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
          >
            <option value="ALL">All categories</option>
            {residentCouncilCategoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value as "ALL" | ResidentCouncilSection)}
            className="h-10 rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
          >
            <option value="ALL">All sections</option>
            <option value="OLD">Old business</option>
            <option value="NEW">New business</option>
          </select>
        </div>

        <label className="block text-sm">
          <span className="text-xs text-foreground/65">Target meeting</span>
          <select
            value={meetingTargetId}
            onChange={(event) => setMeetingTargetId(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-white/35 bg-white/80 px-2.5 text-sm shadow-lg shadow-black/10"
            disabled={!canEdit || meetings.length === 0}
          >
            {meetings.length === 0 ? <option value="">No meetings available</option> : null}
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>{formatMeetingLabel(meeting)}</option>
            ))}
          </select>
        </label>

        <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
          {filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/40 bg-white/70 px-3 py-8 text-center text-sm text-foreground/70">
              No templates match your filters.
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <article key={template.id} className="rounded-xl border border-white/40 bg-white/80 p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{template.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="bg-white/90 text-[10px]">{template.category}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{template.section === "OLD" ? "Old Business" : "New Business"}</Badge>
                    </div>
                  </div>
                  {canEdit ? (
                    <form action={onApplyTemplate}>
                      <input type="hidden" name="meetingId" value={meetingTargetId} />
                      <input type="hidden" name="templateId" value={template.id} />
                      <GlassButton type="submit" size="sm" disabled={!meetingTargetId}>
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        Add
                      </GlassButton>
                    </form>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-foreground/75">{template.prompt}</p>
              </article>
            ))
          )}
        </div>

        {canEdit ? (
          <form action={onCreateTopicFromLibrary} className="rounded-xl border border-white/40 bg-white/80 p-3">
            <input type="hidden" name="meetingId" value={meetingTargetId} />
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <PlusCircle className="h-4 w-4 text-actifyBlue" />
              Quick Add Custom Topic
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="text-xs">
                Category
                <select name="category" defaultValue="Other" className="mt-1 h-8 w-full rounded-md border border-white/35 bg-white/95 px-2 text-xs">
                  {residentCouncilCategoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Section
                <select name="section" defaultValue="NEW" className="mt-1 h-8 w-full rounded-md border border-white/35 bg-white/95 px-2 text-xs">
                  <option value="OLD">Old Business</option>
                  <option value="NEW">New Business</option>
                </select>
              </label>
            </div>
            <label className="mt-2 block text-xs">
              Topic prompt
              <Textarea name="text" rows={2} required className="mt-1 bg-white/95 text-xs" placeholder="Type a reusable concern or talking point" />
            </label>
            <GlassButton type="submit" size="sm" className="mt-2" disabled={!meetingTargetId}>
              Add Topic to Meeting
            </GlassButton>
          </form>
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">Topic History</p>
            <p className="text-xs text-foreground/65">Recent old/new business entries across meetings.</p>
          </div>
          <Badge variant="outline" className="bg-white/80">{filteredTopics.length}</Badge>
        </div>

        <div className="max-h-[74vh] space-y-2 overflow-y-auto pr-1">
          {filteredTopics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/40 bg-white/70 px-3 py-8 text-center text-sm text-foreground/70">
              No topic entries yet.
            </div>
          ) : (
            filteredTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} section={topic.section} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
