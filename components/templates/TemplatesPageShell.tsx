"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FolderArchive, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { TemplateDetailsPanel } from "@/components/templates/TemplateDetailsPanel";
import {
  TemplateLibraryPanel,
  type TemplateSortKey,
  type TemplateStatusFilter
} from "@/components/templates/TemplateLibraryPanel";
import { TemplateTypeSegmentedControl } from "@/components/templates/TemplateTypeSegmentedControl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TEMPLATE_TYPE_OPTIONS, type TemplateType, type UnifiedTemplate } from "@/lib/templates/types";
import { useToast } from "@/lib/use-toast";

function compareByRecentlyEdited(a: UnifiedTemplate, b: UnifiedTemplate) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function compareByMostUsed(a: UnifiedTemplate, b: UnifiedTemplate) {
  if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
  return compareByRecentlyEdited(a, b);
}

function compareAlphabetical(a: UnifiedTemplate, b: UnifiedTemplate) {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function sortTemplates(templates: UnifiedTemplate[], sortBy: TemplateSortKey) {
  const cloned = [...templates];
  if (sortBy === "used") return cloned.sort(compareByMostUsed);
  if (sortBy === "az") return cloned.sort(compareAlphabetical);
  return cloned.sort(compareByRecentlyEdited);
}

export function TemplatesPageShell({
  initialTemplates,
  canEdit,
  initialSelectedId
}: {
  initialTemplates: UnifiedTemplate[];
  canEdit: boolean;
  initialSelectedId?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState(initialTemplates);
  const [activeType, setActiveType] = useState<TemplateType>("activity");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<TemplateSortKey>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (activeType !== "activity") return;
    const hasActivity = templates.some((template) => template.type === "activity");
    const hasNote = templates.some((template) => template.type === "note");
    if (!hasActivity && hasNote) {
      setActiveType("note");
    }
  }, [activeType, templates]);

  const typeCounts = useMemo(() => {
    const counts = new Map<TemplateType, number>();
    for (const template of templates) {
      counts.set(template.type, (counts.get(template.type) ?? 0) + 1);
    }
    return counts;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const byType = templates.filter((template) => template.type === activeType);
    const filtered = byType.filter((template) => {
      if (statusFilter !== "all" && template.status !== statusFilter) return false;
      if (categoryFilter !== "all" && (template.category ?? "") !== categoryFilter) return false;
      if (tagFilter !== "all" && !template.tags.includes(tagFilter)) return false;
      if (!debouncedSearch) return true;
      const searchable = [
        template.title,
        template.category ?? "",
        template.tags.join(" "),
        template.type
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(debouncedSearch);
    });
    return sortTemplates(filtered, sortBy);
  }, [activeType, categoryFilter, debouncedSearch, sortBy, statusFilter, tagFilter, templates]);

  useEffect(() => {
    if (filteredTemplates.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredTemplates.some((template) => template.id === selectedId)) {
      setSelectedId(filteredTemplates[0].id);
    }
  }, [filteredTemplates, selectedId]);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((template) => template.id === selectedId) ?? null,
    [filteredTemplates, selectedId]
  );

  function handleSelectTemplate(id: string) {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileDetailsOpen(true);
    }
  }

  function updateTemplate(templateId: string, updater: (template: UnifiedTemplate) => UnifiedTemplate) {
    setTemplates((previous) => previous.map((template) => (template.id === templateId ? updater(template) : template)));
  }

  function handleToggleFavorite(templateId: string) {
    updateTemplate(templateId, (template) => ({
      ...template,
      isFavorite: !template.isFavorite
    }));
  }

  async function handleDuplicate(templateId: string) {
    if (!canEdit) return;

    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(templateId)}/duplicate`, {
        method: "POST"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not duplicate template.");
      }
      const duplicated = body.template as UnifiedTemplate;
      setTemplates((previous) => [duplicated, ...previous]);
      setSelectedId(duplicated.id);
      toast({
        title: "Template duplicated",
        description: `${duplicated.title} is ready to edit.`
      });
    } catch (error) {
      toast({
        title: "Duplicate failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    }
  }

  function handleArchive(templateId: string) {
    updateTemplate(templateId, (template) => ({
      ...template,
      status: template.status === "archived" ? "active" : "archived"
    }));
  }

  async function handleDelete(templateId: string) {
    if (!canEdit) return;
    const target = templates.find((template) => template.id === templateId);
    if (!target) return;

    const confirmed = window.confirm(`Delete "${target.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(templateId)}`, {
        method: "DELETE"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not delete template.");
      }
      setTemplates((previous) => previous.filter((template) => template.id !== templateId));
      toast({
        title: "Template deleted",
        description: `${target.title} was removed.`
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    }
  }

  async function handleUseActivityTemplate(params: {
    templateId: string;
    startAt: string;
    endAt: string;
    location: string;
  }) {
    const response = await fetch("/api/templates/use", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params)
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not schedule template.");
    }

    toast({
      title: "Activity created",
      description: "Template was added to your calendar."
    });
    router.push("/app/calendar");
    router.refresh();
  }

  function handleUseNoteTemplate(templateId: string) {
    router.push(`/app/notes/new?templateId=${encodeURIComponent(templateId)}`);
  }

  function handleEditTemplate(template: UnifiedTemplate) {
    router.push(`/app/templates/${encodeURIComponent(template.id)}/edit`);
  }

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/15">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">Templates</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep this simple: find a template fast, preview it, and edit in a dedicated workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="shadow-lg shadow-black/15">
                <Link href="/app/templates/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Template
                </Link>
              </Button>
              <Button type="button" variant="outline" className="bg-white/70" onClick={() => toast({ title: "Import", description: "Import flow is coming next." })}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" className="bg-white/70" onClick={() => toast({ title: "Export", description: "Export flow is coming next." })}>
                <Download className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" className="bg-white/70" onClick={() => setStatusFilter("archived")}>
                <FolderArchive className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TemplateTypeSegmentedControl
            value={activeType}
            onChange={(next) => {
              setActiveType(next);
              setCategoryFilter("all");
              setTagFilter("all");
            }}
            segments={TEMPLATE_TYPE_OPTIONS.filter((option) => option.enabled).map((option) => ({
              value: option.value,
              label: option.label,
              enabled: option.enabled,
              count: typeCounts.get(option.value) ?? 0
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <TemplateLibraryPanel
          templates={filteredTemplates}
          selectedId={selectedId}
          search={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelectTemplate={handleSelectTemplate}
          onToggleFavorite={handleToggleFavorite}
          onDuplicate={handleDuplicate}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />

        <div className="hidden xl:block">
          <TemplateDetailsPanel
            template={selectedTemplate}
            canEdit={canEdit}
            onUseActivityTemplate={handleUseActivityTemplate}
            onUseNoteTemplate={handleUseNoteTemplate}
            onEdit={handleEditTemplate}
            onDuplicate={handleDuplicate}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
      </div>

      <Dialog open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <DialogContent className="max-w-[95vw] p-0 sm:max-w-[92vw] xl:hidden">
          <div className="p-4">
            <TemplateDetailsPanel
              template={selectedTemplate}
              canEdit={canEdit}
              onUseActivityTemplate={handleUseActivityTemplate}
              onUseNoteTemplate={handleUseNoteTemplate}
              onEdit={handleEditTemplate}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
