import type { LucideIcon } from "lucide-react";

export type SidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  accentGradientClasses: string;
  moduleKey?: string;
};

export type SidebarGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  links: SidebarLink[];
};
