"use client";

import dynamic from "next/dynamic";

import type { VolunteerHubPayload } from "@/lib/volunteers/types";

const VolunteersHubClient = dynamic(
  () => import("@/components/volunteers/VolunteersHub").then((mod) => mod.VolunteersHub),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="glass-panel h-36 animate-pulse rounded-2xl border-white/15" />
        <div className="glass-panel h-[640px] animate-pulse rounded-2xl border-white/15" />
      </div>
    )
  }
);

export function VolunteersHubLazy({
  initialPayload,
  initialTab,
  canEdit
}: {
  initialPayload: VolunteerHubPayload;
  initialTab: "directory" | "schedule" | "hours";
  canEdit: boolean;
}) {
  return <VolunteersHubClient initialPayload={initialPayload} initialTab={initialTab} canEdit={canEdit} />;
}

