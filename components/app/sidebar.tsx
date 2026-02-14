"use client";

import { useEffect, useMemo, useState } from "react";
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
  MessageSquareText,
  Settings,
  Users,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ActifyLogo } from "@/components/ActifyLogo";
import { GlassSidebar } from "@/components/glass/GlassSidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { asModuleFlags, type ModuleFlags } from "@/lib/module-flags";
import { cn } from "@/lib/utils";

type SidebarLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  moduleKey?: keyof ModuleFlags["modules"];
};

type SidebarGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  links: SidebarLink[];
};

const groupedLinks: SidebarGroup[] = [
  {
    id: "daily-workflow",
    label: "Daily Workflow",
    icon: FolderOpen,
    links: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/calendar", label: "Calendar", icon: CalendarDays, moduleKey: "calendar" },
      { href: "/app/templates", label: "Templates", icon: Layers, moduleKey: "templates" },
      { href: "/app/attendance", label: "Attendance Tracker", icon: ClipboardCheck, moduleKey: "calendar" },
      { href: "/app/notes/new", label: "New Note", icon: ClipboardPenLine, moduleKey: "notes" },
      { href: "/app/notes/one-to-one", label: "1:1 Notes", icon: MessageSquareText, moduleKey: "notes" }
    ]
  },
  {
    id: "residents-outcomes",
    label: "Residents & Outcomes",
    icon: FolderKanban,
    links: [
      { href: "/app/residents", label: "Residents", icon: Users },
      { href: "/app/care-plans", label: "Care Plans", icon: ClipboardList, moduleKey: "carePlan" },
      { href: "/app/analytics", label: "Analytics", icon: BarChart3, moduleKey: "analyticsHeatmaps" }
    ]
  },
  {
    id: "operations",
    label: "Operations",
    icon: FolderOpen,
    links: [
      { href: "/app/volunteers", label: "Volunteers", icon: Handshake, moduleKey: "volunteers" },
      { href: "/app/budget", label: "Budget + Stock", icon: Landmark, moduleKey: "inventory" },
      { href: "/app/resident-council", label: "Resident Council", icon: UsersRound, moduleKey: "residentCouncil" },
      { href: "/app/reports", label: "Reports", icon: FileText, moduleKey: "reports" }
    ]
  }
];

const settingsLink = { href: "/app/settings", label: "Settings", icon: Settings };

export function AppSidebar({ moduleFlagsRaw }: { moduleFlagsRaw?: unknown }) {
  const pathname = usePathname();
  const moduleFlags = useMemo(() => asModuleFlags(moduleFlagsRaw), [moduleFlagsRaw]);

  const visibleGroups = useMemo(
    () =>
      groupedLinks
        .map((group) => ({
          ...group,
          links: group.links.filter((link) => (link.moduleKey ? moduleFlags.modules[link.moduleKey] : true))
        }))
        .filter((group) => group.links.length > 0),
    [moduleFlags]
  );

  const activeGroupId = useMemo(
    () =>
      visibleGroups.find((group) =>
        group.links.some((link) =>
          link.href === "/app" ? pathname === "/app" : pathname === link.href || pathname.startsWith(`${link.href}/`)
        )
      )?.id ?? "",
    [pathname, visibleGroups]
  );
  const [openGroup, setOpenGroup] = useState<string>(activeGroupId || visibleGroups[0]?.id || "");

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroup(activeGroupId);
  }, [activeGroupId]);

  return (
    <GlassSidebar variant="dense" className="liquid-enter flex h-full w-full flex-col">
      <Link href="/app" className="mb-4 inline-flex items-center">
        <ActifyLogo variant="lockup" size={34} />
      </Link>
      <nav className="space-y-1.5">
        <Accordion type="single" collapsible value={openGroup} onValueChange={setOpenGroup} className="space-y-1">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = group.links.some((link) =>
              link.href === "/app" ? pathname === "/app" : pathname === link.href || pathname.startsWith(`${link.href}/`)
            );

            return (
              <AccordionItem key={group.id} value={group.id} className="border-none">
                <AccordionTrigger
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm hover:no-underline",
                    groupActive
                      ? "bg-white/80 text-foreground"
                      : "text-muted-foreground hover:bg-white/65 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{group.label}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="sidebar-dropdown-content pb-1 pt-1">
                  <div className="space-y-1">
                    {group.links.map((link) => {
                      const active =
                        link.href === "/app"
                          ? pathname === "/app"
                          : pathname === link.href || pathname.startsWith(`${link.href}/`);
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "bg-actify-brand text-white shadow-sm"
                              : "text-muted-foreground hover:bg-white/65 hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </nav>
      <div className="mt-auto border-t border-white/60 pt-3">
        {(() => {
          const Icon = settingsLink.icon;
          const active = pathname === settingsLink.href || pathname.startsWith(`${settingsLink.href}/`);
          return (
            <Link
              href={settingsLink.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-actify-brand text-white shadow-sm"
                  : "text-muted-foreground hover:bg-white/65 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{settingsLink.label}</span>
            </Link>
          );
        })()}
      </div>
    </GlassSidebar>
  );
}
