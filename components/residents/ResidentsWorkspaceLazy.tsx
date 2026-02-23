"use client";

import dynamic from "next/dynamic";

import type { ResidentListRow } from "@/lib/residents/types";

const ResidentsWorkspaceClient = dynamic(
  () => import("@/components/residents/ResidentsWorkspace").then((mod) => mod.ResidentsWorkspace),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="glass-panel h-32 animate-pulse rounded-2xl border-white/15" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
          <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
          <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
          <div className="glass-panel h-24 animate-pulse rounded-2xl border-white/15" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="glass-panel h-[580px] animate-pulse rounded-2xl border-white/15" />
          <div className="glass-panel h-[580px] animate-pulse rounded-2xl border-white/15" />
        </div>
      </div>
    )
  }
);

export function ResidentsWorkspaceLazy({
  initialResidents,
  canEdit
}: {
  initialResidents: ResidentListRow[];
  canEdit: boolean;
}) {
  return <ResidentsWorkspaceClient initialResidents={initialResidents} canEdit={canEdit} />;
}

