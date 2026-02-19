"use client";

import { useMemo, useState } from "react";
import { FilePlus2, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { noteTemplateUpsertSchema, type NoteTemplateUpsertPayload } from "@/lib/notes/schema";
import type { NoteTemplateLite } from "@/lib/notes/types";
import { useToast } from "@/lib/use-toast";

function getTemplateType(template: NoteTemplateLite): "general" | "1on1" {
  return template.tags.includes("type:1on1") ? "1on1" : "general";
}

function toEditorModel(template?: NoteTemplateLite): NoteTemplateUpsertPayload {
  return {
    id: template?.id,
    title: template?.title ?? "",
    noteType: template ? getTemplateType(template) : "general",
    category: template?.category ?? "Progress Note",
    quickPhrases: template?.quickPhrases ?? [],
    narrativeStarter: template?.narrativeStarter ?? "",
    tags: template?.tags.filter((tag) => !tag.startsWith("type:")) ?? []
  };
}

function normalizeTag(value: string) {
  return value.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
}

export function NotesTemplatesWorkspace({
  initialTemplates,
  canEdit
}: {
  initialTemplates: NoteTemplateLite[];
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplates[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) => {
      const text = `${template.title} ${template.category ?? ""} ${template.tags.join(" ")}`.toLowerCase();
      return text.includes(query);
    });
  }, [search, templates]);

  const selected = useMemo(() => {
    return templates.find((template) => template.id === selectedId) ?? null;
  }, [selectedId, templates]);

  const [editor, setEditor] = useState<NoteTemplateUpsertPayload>(toEditorModel(initialTemplates[0]));

  function selectTemplate(template: NoteTemplateLite | null) {
    setSelectedId(template?.id ?? "");
    setEditor(toEditorModel(template ?? undefined));
    setTagInput("");
  }

  async function refreshTemplates() {
    const response = await fetch("/api/templates", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not load templates");

    const noteTemplates = (body.templates as Array<{ type: string; payload?: unknown; id: string; title: string; category?: string; tags: string[] }> )
      .filter((template) => template.type === "note")
      .map((template) => {
        const payload = (template.payload ?? {}) as { quickPhrases?: string[]; defaultTextBlocks?: { body?: string } };
        return {
          id: template.id,
          title: template.title,
          category: template.category,
          tags: template.tags,
          quickPhrases: payload.quickPhrases ?? [],
          narrativeStarter: payload.defaultTextBlocks?.body ?? ""
        } satisfies NoteTemplateLite;
      });

    setTemplates(noteTemplates);
    if (selectedId) {
      const nextSelected = noteTemplates.find((template) => template.id === selectedId) ?? null;
      setEditor(toEditorModel(nextSelected ?? undefined));
    }
  }

  async function saveTemplate() {
    if (!canEdit) return;

    const parsed = noteTemplateUpsertSchema.safeParse({
      ...editor,
      tags: editor.tags.map(normalizeTag).filter(Boolean)
    });

    if (!parsed.success) {
      toast({ title: "Invalid template", description: "Please fill in the required fields.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: "note",
        title: parsed.data.title,
        category: parsed.data.category,
        tags: [...parsed.data.tags, `type:${parsed.data.noteType}`],
        payload: {
          fieldsEnabled: {
            mood: true,
            cues: true,
            participation: true,
            response: true,
            followUp: true
          },
          defaultTextBlocks: {
            body: parsed.data.narrativeStarter
          },
          quickPhrases: parsed.data.quickPhrases
        }
      };

      const endpoint = parsed.data.id ? `/api/templates/${parsed.data.id}` : "/api/templates";
      const method = parsed.data.id ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not save template");

      await refreshTemplates();
      setSelectedId(body.template.id);
      toast({ title: parsed.data.id ? "Template updated" : "Template created" });
    } catch (error) {
      toast({
        title: "Template save failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeTemplate() {
    if (!selected?.id || !canEdit) return;
    if (!window.confirm("Delete this template?")) return;

    try {
      const response = await fetch(`/api/templates/${selected.id}`, {
        method: "DELETE"
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not delete template");

      const remaining = templates.filter((template) => template.id !== selected.id);
      setTemplates(remaining);
      selectTemplate(remaining[0] ?? null);
      toast({ title: "Template deleted" });
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="glass-panel rounded-2xl border-white/20 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" className="pl-9" />
        </div>

        <div className="mt-3 space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start bg-white/80"
            onClick={() => selectTemplate(null)}
            disabled={!canEdit}
          >
            <FilePlus2 className="mr-1.5 h-4 w-4" />
            New Template
          </Button>

          <div className="max-h-[65vh] space-y-2 overflow-auto pr-1">
            {filtered.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${selectedId === template.id ? "border-[color:var(--actify-accent)] bg-[color:var(--actify-accent)]/12" : "border-white/30 bg-white/75 hover:bg-white"}`}
              >
                <p className="font-semibold">{template.title}</p>
                <p className="text-xs text-muted-foreground">{template.category ?? "Progress Note"} · {getTemplateType(template) === "1on1" ? "1:1" : "General"}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-2xl border-white/20 p-4">
        <h2 className="font-[var(--font-display)] text-2xl">{editor.id ? "Edit Template" : "Create Template"}</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Template name
            <Input value={editor.title} onChange={(event) => setEditor((previous) => ({ ...previous, title: event.target.value }))} className="mt-1" disabled={!canEdit} />
          </label>

          <label className="text-sm">
            Note type
            <select
              value={editor.noteType}
              onChange={(event) => setEditor((previous) => ({ ...previous, noteType: event.target.value as "general" | "1on1" }))}
              className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
              disabled={!canEdit}
            >
              <option value="general">General</option>
              <option value="1on1">1:1</option>
            </select>
          </label>

          <label className="text-sm">
            Category
            <Input value={editor.category} onChange={(event) => setEditor((previous) => ({ ...previous, category: event.target.value }))} className="mt-1" disabled={!canEdit} />
          </label>

          <label className="text-sm">
            Quick phrases (comma separated)
            <Input
              value={editor.quickPhrases.join(", ")}
              onChange={(event) => setEditor((previous) => ({
                ...previous,
                quickPhrases: event.target.value.split(",").map((value) => value.trim()).filter(Boolean)
              }))}
              className="mt-1"
              disabled={!canEdit}
            />
          </label>

          <label className="text-sm md:col-span-2">
            Narrative starter
            <Textarea
              rows={7}
              value={editor.narrativeStarter}
              onChange={(event) => setEditor((previous) => ({ ...previous, narrativeStarter: event.target.value }))}
              className="mt-1"
              disabled={!canEdit}
            />
          </label>

          <label className="text-sm md:col-span-2">
            Tags
            <div className="mt-1 flex gap-2">
              <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Add tag" disabled={!canEdit} />
              <Button
                type="button"
                onClick={() => {
                  const normalized = normalizeTag(tagInput);
                  if (!normalized) return;
                  if (!editor.tags.includes(normalized)) {
                    setEditor((previous) => ({ ...previous, tags: [...previous.tags, normalized] }));
                  }
                  setTagInput("");
                }}
                disabled={!canEdit}
              >
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {editor.tags.length > 0 ? (
                editor.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-full border border-pink-300 bg-pink-100 px-2 py-0.5 text-xs text-pink-700"
                    onClick={() => setEditor((previous) => ({ ...previous, tags: previous.tags.filter((value) => value !== tag) }))}
                    disabled={!canEdit}
                  >
                    #{tag}
                  </button>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No tags yet.</span>
              )}
            </div>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void saveTemplate()} disabled={!canEdit || saving}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
          {editor.id ? (
            <Button type="button" variant="outline" className="bg-white/80" onClick={() => void removeTemplate()} disabled={!canEdit}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
