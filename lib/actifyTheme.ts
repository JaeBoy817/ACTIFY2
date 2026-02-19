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

const DASHBOARD_THEME: ActifyTheme = {
  key: "dashboard",
  label: "Dashboard",
  routes: ["/dashboard", "/app/dashboard", "/app"],
  primaryGradient: "linear-gradient(135deg, #63E6BE 0%, #4DABF7 55%, #748FFC 100%)",
  softWash: "linear-gradient(135deg, #E6FCF5 0%, #E7F5FF 55%, #EDF2FF 100%)",
  accent: "#4DABF7"
};

export const ACTIFY_THEMES: ActifyTheme[] = [
  {
    key: "calendar",
    label: "Calendar",
    routes: ["/calendar", "/app/calendar"],
    primaryGradient: "linear-gradient(135deg, #74C0FC 0%, #5C7CFA 55%, #B197FC 100%)",
    softWash: "linear-gradient(135deg, #E7F5FF 0%, #EDF2FF 55%, #F3F0FF 100%)",
    accent: "#5C7CFA"
  },
  {
    key: "templates",
    label: "Templates",
    routes: ["/templates", "/app/templates"],
    primaryGradient: "linear-gradient(135deg, #B197FC 0%, #DA77F2 55%, #FFA8A8 100%)",
    softWash: "linear-gradient(135deg, #F3F0FF 0%, #F8F0FC 55%, #FFF0F6 100%)",
    accent: "#DA77F2"
  },
  {
    key: "attendance-tracker",
    label: "Attendance Tracker",
    routes: ["/attendance", "/app/attendance"],
    primaryGradient: "linear-gradient(135deg, #8CE99A 0%, #63E6BE 55%, #38D9A9 100%)",
    softWash: "linear-gradient(135deg, #EBFBEE 0%, #E6FCF5 55%, #E6FFFA 100%)",
    accent: "#38D9A9"
  },
  {
    key: "notes",
    label: "Notes",
    routes: [
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
    primaryGradient: "linear-gradient(135deg, #FFA8A8 0%, #FF8787 55%, #FFC078 100%)",
    softWash: "linear-gradient(135deg, #FFF0F0 0%, #FFE3E3 55%, #FFF4E6 100%)",
    accent: "#FF8787"
  },
  {
    key: "care-plan",
    label: "Care Plan",
    routes: ["/care-plan", "/care-plans", "/app/care-plan", "/app/care-plans"],
    primaryGradient: "linear-gradient(135deg, #4DABF7 0%, #5C7CFA 55%, #3BC9DB 100%)",
    softWash: "linear-gradient(135deg, #E7F5FF 0%, #EDF2FF 55%, #E3FAFC 100%)",
    accent: "#5C7CFA"
  },
  {
    key: "analytics",
    label: "Analytics",
    routes: ["/analytics", "/app/analytics"],
    primaryGradient: "linear-gradient(135deg, #9775FA 0%, #B197FC 55%, #74C0FC 100%)",
    softWash: "linear-gradient(135deg, #F3F0FF 0%, #EFE9FF 55%, #E7F5FF 100%)",
    accent: "#9775FA"
  },
  {
    key: "volunteers",
    label: "Volunteers",
    routes: ["/volunteers", "/app/volunteers"],
    primaryGradient: "linear-gradient(135deg, #69DB7C 0%, #63E6BE 55%, #96F2D7 100%)",
    softWash: "linear-gradient(135deg, #EBFBEE 0%, #E6FCF5 55%, #E6FFFA 100%)",
    accent: "#69DB7C"
  },
  {
    key: "budget-stock",
    label: "Budget/Stock",
    routes: ["/budget-stock", "/app/budget-stock", "/dashboard/budget-stock", "/app/dashboard/budget-stock"],
    primaryGradient: "linear-gradient(135deg, #FFD43B 0%, #FFC078 55%, #FFA94D 100%)",
    softWash: "linear-gradient(135deg, #FFF9DB 0%, #FFF4E6 55%, #FFF0E6 100%)",
    accent: "#FFA94D"
  },
  {
    key: "resident-council",
    label: "Resident Council",
    routes: ["/resident-council", "/app/resident-council"],
    primaryGradient: "linear-gradient(135deg, #FFA94D 0%, #FF8787 55%, #FFA8A8 100%)",
    softWash: "linear-gradient(135deg, #FFF4E6 0%, #FFF0F0 55%, #FFF0F6 100%)",
    accent: "#FF8787"
  },
  {
    key: "reports",
    label: "Reports",
    routes: ["/reports", "/app/reports"],
    primaryGradient: "linear-gradient(135deg, #CED4DA 0%, #A5B4FC 55%, #74C0FC 100%)",
    softWash: "linear-gradient(135deg, #F8F9FA 0%, #EEF2FF 55%, #E7F5FF 100%)",
    accent: "#A5B4FC"
  },
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
