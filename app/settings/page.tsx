import Link from "next/link";

import { SafeSettingsWorkspace } from "@/app/settings/safe-settings-workspace";

export const dynamic = "force-dynamic";

type SettingsSearchParams = {
  section?: string;
  tab?: string;
};

function normalizeSection(value?: string | null) {
  const section = value === "tab" ? null : value;
  if (
    section === "profile" ||
    section === "facility" ||
    section === "assistant" ||
    section === "reports" ||
    section === "notifications" ||
    section === "subscription" ||
    section === "security"
  ) {
    return section;
  }
  return "profile";
}

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago"
  }).format(new Date());
}

const navItems = [
  { href: "/app", label: "AI Assistant" },
  { href: "/residents", label: "Residents" },
  { href: "/calendar-creation", label: "Calendar" },
  { href: "/app/attendance", label: "Attendance" },
  { href: "/settings", label: "Settings" }
];

export default function SettingsPage({ searchParams }: { searchParams?: SettingsSearchParams }) {
  const initialSection = normalizeSection(searchParams?.section ?? searchParams?.tab);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_8%,rgba(186,230,253,0.45),transparent_35%),radial-gradient(circle_at_88%_15%,rgba(187,247,208,0.36),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-4 text-slate-900 md:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col">
        <header className="mb-5 rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_28px_58px_-42px_rgba(15,23,42,0.5)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/app" className="group flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-sm">A</span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actify Workspace</span>
                <span className="block text-sm font-semibold text-slate-900">Settings</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 md:inline-flex">{formatToday()}</span>
              <Link href="/app" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Back to Actify</Link>
            </div>
          </div>
          <nav aria-label="Primary workspace tabs" className="mt-4">
            <ul className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={item.href === "/settings" ? "inline-flex rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm" : "inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <SafeSettingsWorkspace initialSection={initialSection} />
      </div>
    </div>
  );
}
