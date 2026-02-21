"use client";

import dynamic from "next/dynamic";

type QueueState = {
  queueDateKey: string;
  queueSize: number;
  dueTodayCount: number;
  missingThisMonthCount: number;
  residentsWithNoteThisMonth: number;
  totalEligibleResidents: number;
  items: Array<{
    id: string;
    residentId: string;
    residentName: string;
    room: string;
    statusLabel: string;
    reason: string;
    lastOneOnOneAt: string | null;
    daysSinceLastOneOnOne: number | null;
    href: string;
  }>;
  viewAllHref: string;
};

type RecentNote = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  createdAt: string;
  createdBy: string;
  continueHref: string;
  duplicateHref: string;
};

const OneToOneNotesCardClient = dynamic(
  () => import("@/components/dashboard/OneToOneNotesCardClient").then((mod) => mod.OneToOneNotesCardClient),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="skeleton shimmer h-24 rounded-2xl" />
        <div className="space-y-2">
          <div className="skeleton shimmer h-14 rounded-xl" />
          <div className="skeleton shimmer h-14 rounded-xl" />
          <div className="skeleton shimmer h-14 rounded-xl" />
        </div>
      </div>
    )
  }
);

export function OneToOneNotesCardClientLazy({
  initialState,
  recentNotes
}: {
  initialState: QueueState;
  recentNotes: RecentNote[];
}) {
  return <OneToOneNotesCardClient initialState={initialState} recentNotes={recentNotes} />;
}

