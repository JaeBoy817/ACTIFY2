"use client";

import dynamic from "next/dynamic";

import type { ResidentListRow } from "@/lib/residents/types";
import { LoadingSkeleton } from "@/components/resident-snapshots/LoadingSkeleton";

const ResidentsWorkspaceClient = dynamic(
  () => import("@/components/resident-snapshots/ResidentsTabWorkspace").then((mod) => mod.ResidentsTabWorkspace),
  {
    loading: () => <LoadingSkeleton />
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
