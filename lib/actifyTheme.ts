import type { ModuleRegistryKey } from "@/lib/moduleRegistry";
import { MODULE_VISUAL_TOKENS } from "@/lib/design-system/tokens";

export type ActifyTabKey =
  | "dashboard"
  | "calendar"
  | "templates"
  | "attendance-tracker"
  | "notes"
  | "care-plan"
  | "analytics"
  | "volunteers"
  | "budget-stock"
  | "resident-council"
  | "reports";

export interface ActifyTheme {
  key: ActifyTabKey;
  label: string;
  routes: string[];
  primaryGradient: string;
  softWash: string;
  accent: string;
}

function buildTheme(
  key: ActifyTabKey,
  label: string,
  routes: string[],
  tokenKey: ModuleRegistryKey
): ActifyTheme {
  const token = MODULE_VISUAL_TOKENS[tokenKey];
  return {
    key,
    label,
    routes,
    primaryGradient: token.primaryGradient,
    softWash: token.softWashGradient,
    accent: token.accentHex
  };
}

const DASHBOARD_THEME = buildTheme("dashboard", "Dashboard", ["/dashboard", "/app/dashboard", "/app"], "dashboard");

export const ACTIFY_THEMES: ActifyTheme[] = [
  buildTheme("calendar", "Calendar", ["/calendar", "/app/calendar"], "calendar"),
  buildTheme("templates", "Templates", ["/templates", "/app/templates"], "templates"),
  buildTheme("attendance-tracker", "Attendance Tracker", ["/attendance", "/app/attendance"], "attendance"),
  buildTheme(
    "notes",
    "Documentation",
    [
      "/documentation",
      "/app/documentation",
      "/documentation/overview",
      "/app/documentation/overview",
      "/documentation/progress-notes",
      "/app/documentation/progress-notes",
      "/documentation/one-to-one",
      "/app/documentation/one-to-one",
      "/documentation/uda",
      "/app/documentation/uda",
      "/documentation/mds",
      "/app/documentation/mds",
      "/notes",
      "/app/notes",
      "/notes/new",
      "/app/notes/new",
      "/notes/templates",
      "/app/notes/templates",
      "/notes/one-on-one",
      "/app/notes/one-on-one",
      "/app/notes/one-to-one",
      "/notes/1-1",
      "/app/notes/1-1"
    ],
    "notes"
  ),
  buildTheme("care-plan", "Care Plan", ["/care-plan", "/care-plans", "/app/care-plan", "/app/care-plans"], "care-plan"),
  buildTheme("analytics", "Analytics", ["/analytics", "/app/analytics"], "analytics"),
  buildTheme("volunteers", "Volunteers", ["/volunteers", "/app/volunteers"], "volunteers"),
  buildTheme(
    "budget-stock",
    "Budget/Stock",
    ["/budget-stock", "/app/budget-stock", "/dashboard/budget-stock", "/app/dashboard/budget-stock"],
    "budget-stock"
  ),
  buildTheme("resident-council", "Resident Council", ["/resident-council", "/app/resident-council"], "resident-council"),
  buildTheme("reports", "Reports", ["/reports", "/app/reports"], "reports"),
  DASHBOARD_THEME
];

function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function routeMatches(pathname: string, route: string): boolean {
  if (pathname === route) {
    return true;
  }

  if (route.endsWith("/")) {
    return pathname.startsWith(route);
  }

  return pathname.startsWith(`${route}/`);
}

export function getActifyThemeFromPath(pathname: string): ActifyTheme {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/app" || normalizedPathname === "/dashboard" || normalizedPathname === "/app/dashboard") {
    return DASHBOARD_THEME;
  }

  for (const theme of ACTIFY_THEMES) {
    if (theme.routes.some((route) => routeMatches(normalizedPathname, route))) {
      return theme;
    }
  }

  return DASHBOARD_THEME;
}
