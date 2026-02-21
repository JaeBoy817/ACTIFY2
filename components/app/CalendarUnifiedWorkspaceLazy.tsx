"use client";

import dynamic from "next/dynamic";

type CalendarView = "week" | "day" | "month" | "agenda";
type CalendarSection = "schedule" | "create" | "templates" | "settings";

type CalendarTemplateLite = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  defaultChecklist: unknown;
  adaptations: unknown;
};

const CalendarUnifiedWorkspaceClient = dynamic(
  () => import("@/components/app/calendar-unified-workspace").then((mod) => mod.CalendarUnifiedWorkspace),
  {
    loading: () => (
      <div className="rounded-2xl border border-white/30 bg-white/65 p-4">
        <div className="space-y-2">
          <div className="skeleton shimmer h-6 w-48 rounded" />
          <div className="skeleton shimmer h-4 w-72 rounded" />
          <div className="skeleton shimmer h-[420px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }
);

export function CalendarUnifiedWorkspaceLazy(props: {
  templates: CalendarTemplateLite[];
  initialDateKey: string;
  initialView: CalendarView;
  initialSection: CalendarSection;
  hasExplicitView: boolean;
  timeZone: string;
}) {
  return <CalendarUnifiedWorkspaceClient {...props} />;
}

