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
  Layers,
  LayoutDashboard,
  Users,
  UsersRound
} from "lucide-react";

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
    accentGradientClasses: "from-sky-500/35 to-indigo-500/10 text-sky-700",
    description: "Run your activity program from one calm workspace.",
    sidebarGroup: "daily-workflow"
  },
  {
    key: "calendar",
    title: "Calendar",
    href: "/app/calendar",
    icon: CalendarDays,
    accentGradientClasses: "from-blue-500/35 to-indigo-500/10 text-blue-700",
    description: "Build schedules from templates and keep your day organized.",
    sidebarGroup: "daily-workflow",
    moduleFlagKey: "calendar"
  },
  {
    key: "templates",
    title: "Templates",
    href: "/app/templates",
    icon: Layers,
    accentGradientClasses: "from-violet-500/35 to-fuchsia-500/10 text-violet-700",
    description: "Reuse your best activities in one click.",
    sidebarGroup: "daily-workflow",
    moduleFlagKey: "templates"
  },
  {
    key: "attendance",
    title: "Attendance Tracker",
    href: "/app/attendance",
    icon: ClipboardCheck,
    accentGradientClasses: "from-emerald-500/35 to-teal-500/10 text-emerald-700",
    description: "Track who attended and why residents missed.",
    sidebarGroup: "daily-workflow",
    moduleFlagKey: "calendar"
  },
  {
    key: "notes",
    title: "Notes",
    href: "/app/notes",
    icon: ClipboardPenLine,
    accentGradientClasses: "from-rose-500/35 to-orange-400/10 text-rose-700",
    description: "Capture progress and 1:1 outcomes quickly.",
    sidebarGroup: "daily-workflow",
    moduleFlagKey: "notes"
  },
  {
    key: "residents",
    title: "Residents",
    href: "/app/residents",
    icon: Users,
    accentGradientClasses: "from-fuchsia-500/35 to-rose-500/10 text-fuchsia-700",
    description: "Keep census, preferences, and follow-up context in one workspace.",
    sidebarGroup: "residents-outcomes"
  },
  {
    key: "care-plan",
    title: "Care Plans",
    href: "/app/care-plans",
    icon: ClipboardList,
    accentGradientClasses: "from-cyan-500/35 to-blue-500/10 text-cyan-700",
    description: "Track goals, barriers, and engagement outcomes.",
    sidebarGroup: "residents-outcomes",
    moduleFlagKey: "carePlan"
  },
  {
    key: "analytics",
    title: "Analytics",
    href: "/app/analytics",
    icon: BarChart3,
    accentGradientClasses: "from-indigo-500/35 to-violet-500/10 text-indigo-700",
    description: "Monitor attendance trends, barriers, and participation outcomes.",
    sidebarGroup: "residents-outcomes",
    moduleFlagKey: "analyticsHeatmaps"
  },
  {
    key: "volunteers",
    title: "Volunteers",
    href: "/app/volunteers",
    icon: Handshake,
    accentGradientClasses: "from-emerald-500/35 to-cyan-500/10 text-emerald-700",
    description: "Manage volunteer scheduling, visits, and hours.",
    sidebarGroup: "operations",
    moduleFlagKey: "volunteers"
  },
  {
    key: "budget-stock",
    title: "Budget + Stock",
    href: "/app/dashboard/budget-stock",
    icon: Landmark,
    accentGradientClasses: "from-amber-500/35 to-orange-500/10 text-amber-700",
    description: "Track inventory, prize sales, and monthly spending.",
    sidebarGroup: "operations",
    moduleFlagKey: "inventory"
  },
  {
    key: "resident-council",
    title: "Resident Council",
    href: "/app/resident-council",
    icon: UsersRound,
    accentGradientClasses: "from-orange-500/35 to-rose-500/10 text-orange-700",
    description: "Track meetings, action items, and departmental updates.",
    sidebarGroup: "operations",
    moduleFlagKey: "residentCouncil"
  },
  {
    key: "reports",
    title: "Reports",
    href: "/app/reports",
    icon: FileText,
    accentGradientClasses: "from-slate-500/35 to-indigo-400/10 text-slate-700",
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
    moduleKeys: ["dashboard", "calendar", "templates", "attendance", "notes"]
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

