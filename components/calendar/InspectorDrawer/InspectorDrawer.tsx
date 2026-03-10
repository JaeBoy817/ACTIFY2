"use client";

import { CalendarDays, Library, PencilLine, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDrawerTab, CalendarEventLite, CalendarTemplateLite, ScheduleFormState } from "@/components/calendar/types";
import { DayTab } from "@/components/calendar/InspectorDrawer/tabs/DayTab";
import { ActivityTab } from "@/components/calendar/InspectorDrawer/tabs/ActivityTab";
import { TemplatesTab } from "@/components/calendar/InspectorDrawer/tabs/TemplatesTab";

type InspectorDrawerProps = {
  open: boolean;
  tab: CalendarDrawerTab;
  selectedDateKey: string | null;
  selectedActivity: CalendarEventLite | null;
  selectedDayEvents: CalendarEventLite[];
  templates: CalendarTemplateLite[];
  templateSearchValue: string;
  timeZone: string;
  saving: boolean;
  onClose: () => void;
  onTabChange: (tab: CalendarDrawerTab) => void;
  onEditActivity: () => void;
  onDeleteActivity: (activityId: string) => void;
  onOpenActivity: (activityId: string) => void;
  onCreateForDay: (dateKey: string) => void;
  onTemplateSearchChange: (value: string) => void;
  onScheduleFromTemplate: (templateId: string) => void;
  onSaveActivityDraft: (draft: ScheduleFormState) => Promise<void>;
  layout?: "overlay" | "inline";
};

export function InspectorDrawer(props: InspectorDrawerProps) {
  const {
    open,
    tab,
    selectedDateKey,
    selectedActivity,
    selectedDayEvents,
    templates,
    templateSearchValue,
    timeZone,
    saving,
    onClose,
    onTabChange,
    onEditActivity,
    onDeleteActivity,
    onOpenActivity,
    onCreateForDay,
    onTemplateSearchChange,
    onScheduleFromTemplate,
    onSaveActivityDraft,
    layout = "overlay"
  } = props;

  return (
    <aside
      className={cn(
        "rounded-3xl border border-cyan-400/20 bg-slate-950/88 p-4 shadow-[0_30px_72px_-48px_rgba(56,189,248,0.95)]",
        layout === "overlay" &&
          "fixed inset-y-4 right-4 z-40 w-[380px] max-w-[calc(100vw-1.5rem)] transition-transform duration-200 ease-out",
        layout === "overlay" && (open ? "translate-x-0" : "translate-x-[115%]"),
        layout === "inline" && "sticky top-[104px]"
      )}
      aria-hidden={layout === "overlay" ? !open : false}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">Day Context</p>
        {layout === "overlay" ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close inspector drawer"
            className="border-cyan-300/25 bg-slate-900/80 text-slate-100 hover:border-cyan-300/55 hover:bg-slate-800/95"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-1">
        <Button
          type="button"
          size="sm"
          variant={tab === "day" ? "default" : "ghost"}
          className={cn("justify-start text-slate-200", tab === "day" && "bg-cyan-500/80 text-white")}
          onClick={() => onTabChange("day")}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Day
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "activity" ? "default" : "ghost"}
          className={cn("justify-start text-slate-200", tab === "activity" && "bg-cyan-500/80 text-white")}
          onClick={() => onTabChange("activity")}
        >
          <PencilLine className="h-3.5 w-3.5" />
          Activity
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "library" ? "default" : "ghost"}
          className={cn("justify-start text-slate-200", tab === "library" && "bg-cyan-500/80 text-white")}
          onClick={() => onTabChange("library")}
        >
          <Library className="h-3.5 w-3.5" />
          Library
        </Button>
      </div>

      <div className="max-h-[calc(100vh-170px)] overflow-auto pr-1">
        {tab === "day" ? (
          <DayTab
            selectedDateKey={selectedDateKey}
            events={selectedDayEvents}
            timeZone={timeZone}
            onOpenActivity={onOpenActivity}
            onCreateForDay={onCreateForDay}
          />
        ) : null}
        {tab === "activity" ? (
          <ActivityTab
            event={selectedActivity}
            timeZone={timeZone}
            saving={saving}
            onEditActivity={onEditActivity}
            onDeleteActivity={onDeleteActivity}
            onSave={onSaveActivityDraft}
          />
        ) : null}
        {tab === "library" ? (
          <TemplatesTab
            templates={templates}
            searchValue={templateSearchValue}
            onSearchChange={onTemplateSearchChange}
            onScheduleTemplate={onScheduleFromTemplate}
          />
        ) : null}
      </div>
    </aside>
  );
}
