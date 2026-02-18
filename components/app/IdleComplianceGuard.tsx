"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

type IdleComplianceGuardProps = {
  enabled: boolean;
  autoLogoutMinutes: number;
};

const activityEvents: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll"
];

export function IdleComplianceGuard({ enabled, autoLogoutMinutes }: IdleComplianceGuardProps) {
  const { signOut } = useClerk();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || autoLogoutMinutes <= 0) {
      return;
    }

    const timeoutMs = autoLogoutMinutes * 60 * 1000;
    let isSigningOut = false;

    const clearExisting = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };

    const armTimer = () => {
      if (isSigningOut) return;
      clearExisting();
      timeoutRef.current = window.setTimeout(async () => {
        isSigningOut = true;
        try {
          await signOut({ redirectUrl: "/sign-in?reason=idle-timeout" });
        } catch {
          window.location.href = "/sign-in?reason=idle-timeout";
        }
      }, timeoutMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        armTimer();
      }
    };

    activityEvents.forEach((eventName) => window.addEventListener(eventName, armTimer, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibility);
    armTimer();

    return () => {
      clearExisting();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, armTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, autoLogoutMinutes, signOut]);

  return null;
}
