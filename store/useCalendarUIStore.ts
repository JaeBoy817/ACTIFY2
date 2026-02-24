"use client";

import { create } from "zustand";

export type CalendarViewMode = "week" | "day" | "month" | "agenda";
export type CalendarSubsection = "schedule" | "create" | "templates" | "settings";
export type CalendarDrawerTab = "day" | "activity" | "templates";

type CalendarFilterState = {
  location: string;
  categories: string[];
  showOnlyMine: boolean;
};

type CalendarUIState = {
  viewMode: CalendarViewMode;
  subsection: CalendarSubsection;
  anchorDateKey: string;
  selectedDateKey: string | null;
  selectedActivityId: string | null;
  drawerOpen: boolean;
  drawerTab: CalendarDrawerTab;
  templateDockOpen: boolean;
  templateDockMobileOpen: boolean;
  commandSearch: string;
  templateSearch: string;
  filters: CalendarFilterState;
  initialize: (payload: { initialView: CalendarViewMode; initialDateKey: string; initialSection: CalendarSubsection }) => void;
  setViewMode: (view: CalendarViewMode) => void;
  setSubsection: (section: CalendarSubsection) => void;
  setAnchorDateKey: (dateKey: string) => void;
  setSelectedDateKey: (dateKey: string | null) => void;
  setSelectedActivityId: (activityId: string | null) => void;
  openDrawer: (tab?: CalendarDrawerTab) => void;
  closeDrawer: () => void;
  setDrawerTab: (tab: CalendarDrawerTab) => void;
  setTemplateDockOpen: (open: boolean) => void;
  toggleTemplateDockOpen: () => void;
  setTemplateDockMobileOpen: (open: boolean) => void;
  setCommandSearch: (value: string) => void;
  setTemplateSearch: (value: string) => void;
  setFilters: (next: Partial<CalendarFilterState>) => void;
  resetFilters: () => void;
};

const defaultFilters: CalendarFilterState = {
  location: "ALL",
  categories: [],
  showOnlyMine: false
};

export const useCalendarUIStore = create<CalendarUIState>((set, get) => ({
  viewMode: "week",
  subsection: "schedule",
  anchorDateKey: "",
  selectedDateKey: null,
  selectedActivityId: null,
  drawerOpen: false,
  drawerTab: "day",
  templateDockOpen: true,
  templateDockMobileOpen: false,
  commandSearch: "",
  templateSearch: "",
  filters: defaultFilters,
  initialize: (payload) => {
    const current = get();
    if (!current.anchorDateKey) {
      set({
        viewMode: payload.initialView,
        subsection: payload.initialSection,
        anchorDateKey: payload.initialDateKey
      });
    }
  },
  setViewMode: (viewMode) => set({ viewMode }),
  setSubsection: (subsection) => set({ subsection }),
  setAnchorDateKey: (anchorDateKey) => set({ anchorDateKey }),
  setSelectedDateKey: (selectedDateKey) => set({ selectedDateKey }),
  setSelectedActivityId: (selectedActivityId) => set({ selectedActivityId }),
  openDrawer: (drawerTab = "day") =>
    set({
      drawerOpen: true,
      drawerTab
    }),
  closeDrawer: () =>
    set({
      drawerOpen: false
    }),
  setDrawerTab: (drawerTab) => set({ drawerTab }),
  setTemplateDockOpen: (templateDockOpen) => set({ templateDockOpen }),
  toggleTemplateDockOpen: () => set((state) => ({ templateDockOpen: !state.templateDockOpen })),
  setTemplateDockMobileOpen: (templateDockMobileOpen) => set({ templateDockMobileOpen }),
  setCommandSearch: (commandSearch) => set({ commandSearch }),
  setTemplateSearch: (templateSearch) => set({ templateSearch }),
  setFilters: (next) => set((state) => ({ filters: { ...state.filters, ...next } })),
  resetFilters: () => set({ filters: defaultFilters })
}));
