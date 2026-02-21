"use client";

import dynamic from "next/dynamic";

import type { AttendanceQuickTakePayload } from "@/lib/attendance-tracker/types";

const AttendanceQuickTakeWorkspaceClient = dynamic(
  () => import("@/components/attendance/AttendanceQuickTakeWorkspace").then((mod) => mod.AttendanceQuickTakeWorkspace),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="skeleton shimmer h-20 w-full rounded-2xl" />
        <div className="skeleton shimmer h-[520px] w-full rounded-2xl" />
      </div>
    )
  }
);

export function AttendanceQuickTakeWorkspaceLazy({
  initialData,
  canEdit
}: {
  initialData: AttendanceQuickTakePayload;
  canEdit: boolean;
}) {
  return <AttendanceQuickTakeWorkspaceClient initialData={initialData} canEdit={canEdit} />;
}

