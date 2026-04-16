import { WorkspaceLayoutShell } from "@/components/workspace/WorkspaceLayoutShell";
import { redirectIfNoAppAccessForUser } from "@/lib/access-control";
import { ensureUserAndFacility } from "@/lib/auth";

function firstNameFromName(name: string | null | undefined) {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function formatToday(timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timeZone || "America/Chicago"
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }
}

export default async function CalendarCreationLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureUserAndFacility();
  await redirectIfNoAppAccessForUser(user, { blockedRedirectPath: "/subscribe" });

  return (
    <WorkspaceLayoutShell firstName={firstNameFromName(user.name)} todayLabel={formatToday(user.facility.timezone)}>
      {children}
    </WorkspaceLayoutShell>
  );
}
