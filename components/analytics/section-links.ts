import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileDown,
  HandHeart,
  HeartPulse,
  Sparkles,
  UsersRound
} from "lucide-react";

export type AnalyticsSectionKey =
  | "hub"
  | "attendance"
  | "engagement"
  | "one-on-one"
  | "care-plan"
  | "programs"
  | "staff-volunteers"
  | "exports";

export type AnalyticsSectionLink = {
  key: AnalyticsSectionKey;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accentClass: string;
};

export const ANALYTICS_SECTION_LINKS: AnalyticsSectionLink[] = [
  {
    key: "hub",
    href: "/app/analytics",
    label: "Hub",
    description: "Cross-metric summary",
    icon: Sparkles,
    accentClass: "from-violet-500/35 to-sky-500/10 text-violet-700"
  },
  {
    key: "attendance",
    href: "/app/analytics/attendance",
    label: "Attendance",
    description: "Participation and barriers",
    icon: ClipboardCheck,
    accentClass: "from-emerald-500/35 to-cyan-500/10 text-emerald-700"
  },
  {
    key: "engagement",
    href: "/app/analytics/engagement",
    label: "Engagement",
    description: "Scoring and response trends",
    icon: HeartPulse,
    accentClass: "from-sky-500/35 to-indigo-500/10 text-sky-700"
  },
  {
    key: "one-on-one",
    href: "/app/analytics/one-on-one",
    label: "1:1",
    description: "Resident specific notes",
    icon: UsersRound,
    accentClass: "from-rose-500/35 to-pink-500/10 text-rose-700"
  },
  {
    key: "care-plan",
    href: "/app/analytics/care-plan",
    label: "Care Plan",
    description: "Reviews and plan coverage",
    icon: Activity,
    accentClass: "from-indigo-500/35 to-cyan-500/10 text-indigo-700"
  },
  {
    key: "programs",
    href: "/app/analytics/programs",
    label: "Programs",
    description: "Category and location performance",
    icon: BarChart3,
    accentClass: "from-amber-500/35 to-orange-500/10 text-amber-700"
  },
  {
    key: "staff-volunteers",
    href: "/app/analytics/staff-volunteers",
    label: "Staff + Volunteers",
    description: "Activity and visit load",
    icon: HandHeart,
    accentClass: "from-teal-500/35 to-emerald-500/10 text-teal-700"
  },
  {
    key: "exports",
    href: "/app/analytics/exports",
    label: "Exports",
    description: "Report handoff",
    icon: FileDown,
    accentClass: "from-slate-500/35 to-violet-500/10 text-slate-700"
  }
];
