"use client";

import dynamic from "next/dynamic";

import type { UnifiedTemplate } from "@/lib/templates/types";

const TemplatesPageShellClient = dynamic(
  () => import("@/components/templates/TemplatesPageShell").then((mod) => mod.TemplatesPageShell),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="glass-panel h-40 animate-pulse rounded-2xl border-white/15" />
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="glass-panel h-[640px] animate-pulse rounded-2xl border-white/15" />
          <div className="glass-panel h-[640px] animate-pulse rounded-2xl border-white/15" />
        </div>
      </div>
    )
  }
);

export function TemplatesPageShellLazy({
  initialTemplates,
  canEdit,
  initialSelectedId
}: {
  initialTemplates: UnifiedTemplate[];
  canEdit: boolean;
  initialSelectedId?: string | null;
}) {
  return (
    <TemplatesPageShellClient
      initialTemplates={initialTemplates}
      canEdit={canEdit}
      initialSelectedId={initialSelectedId}
    />
  );
}

