import type { ReactNode } from "react";

import { WorkspaceLayoutShell } from "@/components/workspace/WorkspaceLayoutShell";
import { redirectIfNoAppAccessForUser } from "@/lib/access-control";
import { ensureUserAndFacility } from "@/lib/auth";

const FALLBACK_TIMEZONE = "America/Chicago";

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
      timeZone: timeZone || FALLBACK_TIMEZONE
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

function isNextControlFlowError(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND") || digest === "DYNAMIC_SERVER_USAGE")
  );
}

export async function SafeWorkspaceShell({
  children,
  label
}: {
  children: ReactNode;
  label: string;
}) {
  try {
    const user = await ensureUserAndFacility();
    await redirectIfNoAppAccessForUser(user, { blockedRedirectPath: "/subscribe" });

    return (
      <WorkspaceLayoutShell firstName={firstNameFromName(user.name)} todayLabel={formatToday(user.facility.timezone)}>
        {children}
      </WorkspaceLayoutShell>
    );
  } catch (error) {
    if (isNextControlFlowError(error)) {
      throw error;
    }

    console.error(`[workspace] rendering fallback shell for ${label}`, error);

    return (
      <WorkspaceLayoutShell firstName="there" todayLabel={formatToday(FALLBACK_TIMEZONE)}>
        {children}
      </WorkspaceLayoutShell>
    );
  }
}
