import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  FileText,
  FolderKanban,
  FolderOpen,
  Handshake,
  Landmark,
  LayoutDashboard,
  Users,
  UsersRound
} from "lucide-react";

import { MODULE_VISUAL_TOKENS } from "@/lib/design-system/tokens";
import type { ModuleFlags } from "@/lib/module-flags";

export type ModuleRegistryKey =
  | "dashboard"
  | "calendar"
  | "templates"
  | "attendance"
  | "notes"
  | "residents"
  | "care-plan"
  | "analytics"
  | "volunteers"
  | "budget-stock"
  | "resident-council"
  | "reports";

type SidebarGroupKey = "daily-workflow" | "residents-outcomes" | "operations";

export type ModuleRegistryItem = {
  key: ModuleRegistryKey;
  title: string;
  href: string;
  icon: LucideIcon;
  accentGradientClasses: string;
  description: string;
  sidebarGroup: SidebarGroupKey;
  moduleFlagKey?: keyof ModuleFlags["modules"];
};

export type SidebarModuleGroup = {
  id: SidebarGroupKey;
  label: string;
  icon: LucideIcon;
  moduleKeys: ModuleRegistryKey[];
};

export const MODULE_REGISTRY: readonly ModuleRegistryItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/app",
    icon: LayoutDashboard,
    accentGradientClasses: MODULE_VISUAL_TOKENS.dashboard.accentGradientClasses,
    description: "Run your activity program from one calm workspace.",
    sidebarGroup: "daily-workflow"
  },
  {
    key: "calendar",
    title: "Calendar",
    href: "/app/calendar",
    icon: CalendarDays,
    accentGradientClasses: MODULE_VISUAL_TOKENS.calendar.accentGradientClasses,
    description: "Schedule activities and reuse saved patterns in one workspace.",
    sidebarGroup: "daily-workflow",
    moduleFlagKey: "calendar"
  },
  {
    key: "attendance",
    title: "Attendance",
    href: "/app/attendance",
    icon: ClipboardCheck,
    accentGradientClasses: MODULE_VISUAL_TOKENS.attendance.accentGradientClasses,
    description: "Track participation percentages, 1:1 visits, and state-ready summaries.",
    sidebarGroup: "daily-workflow",
    moduleFlagKey: "calendar"
  },
  {
    key: "notes",
    title: "Documentation",
    href: "/app/documentation",
    icon: ClipboardPenLine,
    accentGradientClasses: MODULE_VISUAL_TOKENS.notes.accentGradientClasses,
    description: "Chart progress, 1:1 visits, UDA, and MDS in one workflow.",
    sidebarGroup: "daily-workflow",
    moduleFlagKey: "notes"
  },
  {
    key: "residents",
    title: "Residents",
    href: "/app/residents",
    icon: Users,
    accentGradientClasses: MODULE_VISUAL_TOKENS.residents.accentGradientClasses,
    description: "Keep census, preferences, and follow-up context in one workspace.",
    sidebarGroup: "residents-outcomes"
  },
  {
    key: "care-plan",
    title: "Care Plans",
    href: "/app/care-plans",
    icon: ClipboardList,
    accentGradientClasses: MODULE_VISUAL_TOKENS["care-plan"].accentGradientClasses,
    description: "Track goals, barriers, and engagement outcomes.",
    sidebarGroup: "residents-outcomes",
    moduleFlagKey: "carePlan"
  },
  {
    key: "analytics",
    title: "Analytics",
    href: "/app/analytics",
    icon: BarChart3,
    accentGradientClasses: MODULE_VISUAL_TOKENS.analytics.accentGradientClasses,
    description: "Monitor attendance trends, barriers, and participation outcomes.",
    sidebarGroup: "residents-outcomes",
    moduleFlagKey: "analyticsHeatmaps"
  },
  {
    key: "volunteers",
    title: "Volunteers",
    href: "/app/volunteers",
    icon: Handshake,
    accentGradientClasses: MODULE_VISUAL_TOKENS.volunteers.accentGradientClasses,
    description: "Manage volunteer scheduling, visits, and hours.",
    sidebarGroup: "operations",
    moduleFlagKey: "volunteers"
  },
  {
    key: "budget-stock",
    title: "Budget + Stock",
    href: "/app/dashboard/budget-stock",
    icon: Landmark,
    accentGradientClasses: MODULE_VISUAL_TOKENS["budget-stock"].accentGradientClasses,
    description: "Track inventory, prize sales, and monthly spending.",
    sidebarGroup: "operations",
    moduleFlagKey: "inventory"
  },
  {
    key: "resident-council",
    title: "Resident Council",
    href: "/app/resident-council",
    icon: UsersRound,
    accentGradientClasses: MODULE_VISUAL_TOKENS["resident-council"].accentGradientClasses,
    description: "Track meetings, action items, and departmental updates.",
    sidebarGroup: "operations",
    moduleFlagKey: "residentCouncil"
  },
  {
    key: "reports",
    title: "Reports",
    href: "/app/reports",
    icon: FileText,
    accentGradientClasses: MODULE_VISUAL_TOKENS.reports.accentGradientClasses,
    description: "Generate clean, export-ready monthly reports quickly.",
    sidebarGroup: "operations",
    moduleFlagKey: "reports"
  }
] as const;

export const SIDEBAR_MODULE_GROUPS: readonly SidebarModuleGroup[] = [
  {
    id: "daily-workflow",
    label: "Daily Workflow",
    icon: FolderOpen,
    moduleKeys: ["dashboard", "calendar", "attendance", "notes"]
  },
  {
    id: "residents-outcomes",
    label: "Residents & Outcomes",
    icon: FolderKanban,
    moduleKeys: ["residents", "care-plan", "analytics"]
  },
  {
    id: "operations",
    label: "Operations",
    icon: FolderOpen,
    moduleKeys: ["volunteers", "budget-stock", "resident-council", "reports"]
  }
] as const;

export function getModuleRegistryItem(key: ModuleRegistryKey) {
  return MODULE_REGISTRY.find((item) => item.key === key);
}
