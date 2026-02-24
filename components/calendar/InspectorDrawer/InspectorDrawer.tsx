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
    onSaveActivityDraft
  } = props;

  return (
    <aside
      className={cn(
        "fixed inset-y-4 right-4 z-40 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/35 bg-white/65 p-3 shadow-xl shadow-black/20 backdrop-blur-md transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "translate-x-[115%]"
      )}
      aria-hidden={!open}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
        <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Close inspector drawer">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-white/35 bg-white/65 p-1">
        <Button
          type="button"
          size="sm"
          variant={tab === "day" ? "default" : "ghost"}
          className="justify-start"
          onClick={() => onTabChange("day")}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Day
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "activity" ? "default" : "ghost"}
          className="justify-start"
          onClick={() => onTabChange("activity")}
        >
          <PencilLine className="h-3.5 w-3.5" />
          Activity
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "templates" ? "default" : "ghost"}
          className="justify-start"
          onClick={() => onTabChange("templates")}
        >
          <Library className="h-3.5 w-3.5" />
          Templates
        </Button>
      </div>

      <div className="max-h-[calc(100vh-150px)] overflow-auto pr-1">
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
        {tab === "templates" ? (
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
